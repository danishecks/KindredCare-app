import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  createClaim,
  createExpense,
  createSettlement,
  getClaimById,
  getWorkspaceSnapshot,
  updateClaim,
  updateExpenseFlags,
  updateMemberSplits,
  updatePlanTier,
} from './server/db';
import {
  auditMedicalDocumentWithAI,
  generateAppealLetterWithAI,
  parseReceiptOrEmailWithAI,
} from './server/gemini';
import type { ClaimStatus, ExpenseCategory } from './src/types';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
]);

const ALLOWED_CLAIM_STATUSES = new Set<ClaimStatus>([
  'Flagged',
  'Appeal Drafted',
  'Submitted',
  'Under Review',
  'Overturned',
  'Denied',
  'Cleared',
]);

const ALLOWED_CATEGORIES = new Set<ExpenseCategory>([
  'Medical',
  'Home Modification',
  'Groceries',
  'Paid Aide',
]);

function isValidIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = 3000;

  app.use(express.json({ limit: '16mb' }));

  // Workspace snapshot (all members, claims, expenses, settlements, calculated balances)
  app.get('/api/workspace', (_req, res) => {
    try {
      const snapshot = getWorkspaceSnapshot();
      res.json(snapshot);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load workspace data';
      res.status(500).json({ error: message });
    }
  });

  // Multimodal AI EOB / Hospital Bill Auditor
  app.post('/api/ai/audit-claim', async (req, res) => {
    try {
      const { fileBase64, mimeType, rawText, uploadedBy } = req.body as {
        fileBase64?: string;
        mimeType?: string;
        rawText?: string;
        uploadedBy?: string;
      };

      if (!fileBase64 && (!rawText || typeof rawText !== 'string' || rawText.trim().length < 20)) {
        res.status(400).json({
          error: 'Please upload a medical bill/EOB image or PDF, or paste bill details (at least 20 characters).',
        });
        return;
      }

      if (fileBase64 && (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType))) {
        res.status(400).json({
          error: 'Unsupported file format. Please upload a PNG, JPEG, WebP, or PDF document.',
        });
        return;
      }

      const snapshot = getWorkspaceSnapshot();
      const memberExists = snapshot.members.some((m) => m.id === uploadedBy);
      const uploaderId = memberExists && uploadedBy ? uploadedBy : snapshot.members[0]?.id ?? 'maya';

      const audited = await auditMedicalDocumentWithAI({
        fileBase64,
        mimeType,
        rawText,
        careRecipient: snapshot.settings.careRecipient,
      });

      const status: ClaimStatus = audited.errors.length > 0 ? 'Flagged' : 'Cleared';
      const newClaim = createClaim({
        id: `claim-${Date.now()}`,
        provider: audited.provider || 'Medical Provider',
        insurer: audited.insurer || 'Health Insurer',
        policyNumber: audited.policyNumber || 'Pending Reference',
        serviceDate: isValidIsoDate(audited.serviceDate)
          ? audited.serviceDate
          : new Date().toISOString().slice(0, 10),
        patientName: audited.patientName || snapshot.settings.careRecipient,
        documentType: audited.documentType || 'Insurance EOB',
        billedAmount: Math.max(0, Number(audited.billedAmount) || 0),
        allowedAmount: Math.max(0, Number(audited.allowedAmount) || 0),
        patientResponsibility: Math.max(0, Number(audited.patientResponsibility) || 0),
        potentialSavings: Math.max(0, Number(audited.potentialSavings) || 0),
        status,
        denialReason: audited.denialReason || 'Parsed via AI EOB Auditor',
        cptCodes: Array.isArray(audited.cptCodes) ? audited.cptCodes : [],
        errors: Array.isArray(audited.errors) ? audited.errors : [],
        appealLetter: '',
        uploadedBy: uploaderId,
        createdAt: new Date().toISOString(),
      });

      res.status(201).json({ claim: newClaim, workspace: getWorkspaceSnapshot() });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to audit medical document';
      res.status(502).json({ error: message });
    }
  });

  // One-click AI Appeal Letter Generator
  app.post('/api/ai/generate-appeal', async (req, res) => {
    try {
      const { claimId, representativeName } = req.body as {
        claimId?: string;
        representativeName?: string;
      };

      if (!claimId || typeof claimId !== 'string') {
        res.status(400).json({ error: 'claimId is required.' });
        return;
      }

      const claim = getClaimById(claimId);
      if (!claim) {
        res.status(404).json({ error: 'Claim not found.' });
        return;
      }

      const repName =
        typeof representativeName === 'string' && representativeName.trim()
          ? representativeName.trim()
          : 'Authorized Family Representative';

      const appealLetter = await generateAppealLetterWithAI(claim, repName);
      const nextStatus: ClaimStatus = claim.status === 'Flagged' ? 'Appeal Drafted' : claim.status;
      const updated = updateClaim(claim.id, { appealLetter, status: nextStatus });

      res.json({ claim: updated, workspace: getWorkspaceSnapshot() });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate appeal letter';
      res.status(502).json({ error: message });
    }
  });

  // Update claim status, submission date, or edited appeal letter
  app.patch('/api/claims/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { status, appealLetter, submittedAt } = req.body as {
        status?: ClaimStatus;
        appealLetter?: string;
        submittedAt?: string | null;
      };

      if (status !== undefined && !ALLOWED_CLAIM_STATUSES.has(status)) {
        res.status(400).json({ error: 'Invalid claim status.' });
        return;
      }
      if (appealLetter !== undefined && typeof appealLetter !== 'string') {
        res.status(400).json({ error: 'appealLetter must be a string.' });
        return;
      }
      if (submittedAt !== undefined && submittedAt !== null && !isValidIsoDate(submittedAt)) {
        res.status(400).json({ error: 'submittedAt must be a YYYY-MM-DD date string.' });
        return;
      }

      const updated = updateClaim(id, { status, appealLetter, submittedAt });
      if (!updated) {
        res.status(404).json({ error: 'Claim not found.' });
        return;
      }
      res.json({ claim: updated, workspace: getWorkspaceSnapshot() });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update claim';
      res.status(500).json({ error: message });
    }
  });

  // AI Receipt or Amazon/Pharmacy Email Parser
  app.post('/api/ai/parse-receipt', async (req, res) => {
    try {
      const { fileBase64, mimeType, emailText } = req.body as {
        fileBase64?: string;
        mimeType?: string;
        emailText?: string;
      };

      if (!fileBase64 && (!emailText || typeof emailText !== 'string' || emailText.trim().length < 8)) {
        res.status(400).json({
          error: 'Upload a receipt image/PDF or paste order email details.',
        });
        return;
      }

      if (fileBase64 && (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType))) {
        res.status(400).json({
          error: 'Unsupported file format. Please upload a PNG, JPEG, WebP, or PDF receipt.',
        });
        return;
      }

      const parsed = await parseReceiptOrEmailWithAI({
        fileBase64,
        mimeType,
        emailText,
      });

      res.json({ parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse receipt';
      res.status(502).json({ error: message });
    }
  });

  // Create a shared caregiving expense
  app.post('/api/expenses', (req, res) => {
    try {
      const {
        vendor,
        description,
        expenseDate,
        amount,
        category,
        paidByMemberId,
        irs502Eligible,
        fsaHsaEligible,
        medicaidLookbackVerified,
        receiptAttached,
        taxNotes,
      } = req.body as {
        vendor?: string;
        description?: string;
        expenseDate?: string;
        amount?: number;
        category?: ExpenseCategory;
        paidByMemberId?: string;
        irs502Eligible?: boolean;
        fsaHsaEligible?: boolean;
        medicaidLookbackVerified?: boolean;
        receiptAttached?: boolean;
        taxNotes?: string;
      };

      if (!vendor || typeof vendor !== 'string' || !vendor.trim()) {
        res.status(400).json({ error: 'Vendor name is required.' });
        return;
      }
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 250000) {
        res.status(400).json({ error: 'Amount must be a valid positive number.' });
        return;
      }
      if (!category || !ALLOWED_CATEGORIES.has(category)) {
        res.status(400).json({ error: 'Valid expense category is required.' });
        return;
      }

      const snapshot = getWorkspaceSnapshot();
      const validMember = snapshot.members.some((m) => m.id === paidByMemberId);
      if (!paidByMemberId || !validMember) {
        res.status(400).json({ error: 'Valid paidByMemberId is required.' });
        return;
      }

      const expense = createExpense({
        id: `exp-${Date.now()}`,
        vendor: vendor.trim(),
        description: (description ?? '').trim() || vendor.trim(),
        expenseDate: isValidIsoDate(expenseDate) ? expenseDate : new Date().toISOString().slice(0, 10),
        amount: Number(numericAmount.toFixed(2)),
        category,
        paidByMemberId,
        irs502Eligible: Boolean(irs502Eligible),
        fsaHsaEligible: Boolean(fsaHsaEligible),
        medicaidLookbackVerified: Boolean(medicaidLookbackVerified),
        receiptAttached: Boolean(receiptAttached),
        taxNotes: (taxNotes ?? '').trim() || `${category} care expense`,
        createdAt: new Date().toISOString(),
      });

      res.status(201).json({ expense, workspace: getWorkspaceSnapshot() });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to log expense';
      res.status(500).json({ error: message });
    }
  });

  // Update tax / Medicaid verification flags on an expense
  app.patch('/api/expenses/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { irs502Eligible, fsaHsaEligible, medicaidLookbackVerified, receiptAttached, taxNotes } =
        req.body as {
          irs502Eligible?: boolean;
          fsaHsaEligible?: boolean;
          medicaidLookbackVerified?: boolean;
          receiptAttached?: boolean;
          taxNotes?: string;
        };

      const updated = updateExpenseFlags(id, {
        irs502Eligible,
        fsaHsaEligible,
        medicaidLookbackVerified,
        receiptAttached,
        taxNotes,
      });

      if (!updated) {
        res.status(404).json({ error: 'Expense not found.' });
        return;
      }

      res.json({ expense: updated, workspace: getWorkspaceSnapshot() });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update expense';
      res.status(500).json({ error: message });
    }
  });

  // Update sibling split percentages (must sum to 100)
  app.put('/api/members/splits', (req, res) => {
    try {
      const { splits, unpaidCareHoursMonthly, localCareOffsetNote } = req.body as {
        splits?: Array<{ id: string; splitPercentage: number }>;
        unpaidCareHoursMonthly?: number;
        localCareOffsetNote?: string;
      };

      if (!Array.isArray(splits) || splits.length === 0) {
        res.status(400).json({ error: 'splits array is required.' });
        return;
      }

      const total = splits.reduce((sum, s) => sum + Number(s.splitPercentage || 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        res.status(400).json({ error: `Sibling split percentages must sum to 100% (currently ${total}%).` });
        return;
      }

      for (const s of splits) {
        const pct = Number(s.splitPercentage);
        if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
          res.status(400).json({ error: 'Each split percentage must be between 0 and 100.' });
          return;
        }
      }

      updateMemberSplits(
        splits.map((s) => ({ id: s.id, splitPercentage: Number(s.splitPercentage) })),
        unpaidCareHoursMonthly !== undefined ? Math.max(0, Number(unpaidCareHoursMonthly)) : undefined,
        typeof localCareOffsetNote === 'string' ? localCareOffsetNote.trim() : undefined
      );

      res.json({ workspace: getWorkspaceSnapshot() });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update split rules';
      res.status(500).json({ error: message });
    }
  });

  // Record a sibling settlement payment
  app.post('/api/settlements', (req, res) => {
    try {
      const { fromMemberId, toMemberId, amount, method, note } = req.body as {
        fromMemberId?: string;
        toMemberId?: string;
        amount?: number;
        method?: 'Venmo' | 'Zelle' | 'ACH';
        note?: string;
      };

      const snapshot = getWorkspaceSnapshot();
      const validFrom = snapshot.members.some((m) => m.id === fromMemberId);
      const validTo = snapshot.members.some((m) => m.id === toMemberId);

      if (!fromMemberId || !toMemberId || !validFrom || !validTo || fromMemberId === toMemberId) {
        res.status(400).json({ error: 'Valid distinct fromMemberId and toMemberId are required.' });
        return;
      }

      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        res.status(400).json({ error: 'Settlement amount must be greater than 0.' });
        return;
      }

      const paymentMethod = method === 'Venmo' || method === 'Zelle' || method === 'ACH' ? method : 'Venmo';

      const settlement = createSettlement({
        id: `settle-${Date.now()}`,
        fromMemberId,
        toMemberId,
        amount: Number(numericAmount.toFixed(2)),
        method: paymentMethod,
        settledAt: new Date().toISOString(),
        note: (note ?? '').trim() || `Monthly care reimbursement via ${paymentMethod}`,
      });

      res.status(201).json({ settlement, workspace: getWorkspaceSnapshot() });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record settlement';
      res.status(500).json({ error: message });
    }
  });

  // Update Family Plan Tier
  app.patch('/api/settings/plan', (req, res) => {
    try {
      const { planTier } = req.body as { planTier?: 'free' | 'family_care' };
      if (planTier !== 'free' && planTier !== 'family_care') {
        res.status(400).json({ error: 'Invalid plan tier.' });
        return;
      }
      updatePlanTier(planTier);
      res.json({ workspace: getWorkspaceSnapshot() });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update plan tier';
      res.status(500).json({ error: message });
    }
  });

  // Vite integration in dev vs static serving in prod
  const distDir = path.resolve(process.cwd(), 'dist');
  if (process.env.NODE_ENV === 'production' && fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`KindredCare server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

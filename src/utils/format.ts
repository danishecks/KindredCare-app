import type { CareExpense, FamilyMember } from '../types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate) return '—';
  const parsed = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function escapeCsvField(value: string | number | boolean): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadVaultCsv(
  expenses: CareExpense[],
  members: FamilyMember[],
  careRecipient: string
): void {
  const memberMap = new Map(members.map((m) => [m.id, m.name]));
  const headers = [
    'Date',
    'Care Recipient',
    'Vendor',
    'Description',
    'Category',
    'Amount (USD)',
    'Paid By',
    'IRS Pub 502 Eligible',
    'FSA/HSA Eligible',
    'Medicaid 60-Mo Verified',
    'Receipt Attached',
    'Tax & Audit Notes',
  ];

  const rows = expenses.map((e) => [
    e.expenseDate,
    careRecipient,
    e.vendor,
    e.description,
    e.category,
    e.amount.toFixed(2),
    memberMap.get(e.paidByMemberId) ?? e.paidByMemberId,
    e.irs502Eligible ? 'Yes' : 'No',
    e.fsaHsaEligible ? 'Yes' : 'No',
    e.medicaidLookbackVerified ? 'Yes' : 'No',
    e.receiptAttached ? 'Yes' : 'No',
    e.taxNotes,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCsvField).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `KindredCare_Tax_Medicaid_Vault_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const SAMPLE_MEDICAL_BILL_TEXT = `EXPLANATION OF BENEFITS — AETNA MEDICARE ADVANTAGE PPO
Patient: Eleanor Vance | Member ID: AET-9920148 | Date of Service: 2026-11-09
Facility: Northwestern Memorial Outpatient Surgery (IN-NETWORK)

Line 1: CPT 45380 — Diagnostic/therapeutic colonoscopy (In-Network) | Billed: $2,150.00 | Plan Allowed: $1,180.00 | Patient Copay: $150.00
Line 2: CPT 00812 — Anesthesia Services — Dr. K. Patel (OUT-OF-NETWORK ANESTHESIOLOGIST) | Billed: $1,640.00 | Plan Allowed: $490.00 | Balance Bill to Patient: $1,150.00
Line 3: CPT 99213 — Pre-procedure evaluation | Billed: $240.00 | Plan Allowed: $110.00 | Patient Resp: $0.00
Line 4: CPT 99213 — Pre-procedure evaluation (duplicate entry same DOS) | Billed: $240.00 | Plan Allowed: $0.00 | Patient Resp: $240.00

Total Billed: $4,270.00 | Total Allowed: $1,780.00 | Total Patient Responsibility Shown: $1,540.00
Notice: Out-of-network anesthesiologist billed patient directly for remaining $1,150.00 balance.`;

export const SAMPLE_AMAZON_RECEIPT_TEXT = `Amazon.com Order Confirmation #114-8829401-3391024
Order Date: 2026-11-20
Items Ordered:
1. Drive Medical Nitro Euro Style Rollator Walker, Red ($219.99)
2. Vive Raised Toilet Seat with Handles - FSA/HSA Eligible ($54.95)
3. Ensure Max Protein Nutrition Shakes, 24 Pack ($42.80)
Shipping & Tax: $24.10
Order Total: $341.84
Payment Method: Personal Visa ending in 4821`;

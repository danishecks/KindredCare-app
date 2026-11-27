import React, { useState } from 'react';
import { FileText, Loader2, Receipt, Sparkles, Upload, X } from 'lucide-react';
import type { CareExpense, ExpenseCategory, FamilyMember, MedicalClaim } from '../types';
import { apiFetch } from '../utils/authClient';
import { SAMPLE_AMAZON_RECEIPT_TEXT, SAMPLE_MEDICAL_BILL_TEXT } from '../utils/format';

interface CaptureModalProps {
  isOpen: boolean;
  initialTab: 'bill' | 'receipt' | 'manual';
  members: FamilyMember[];
  activeMemberId: string;
  onClose: () => void;
  onClaimAudited: (claim: MedicalClaim) => void;
  onExpenseCreated: (expense: CareExpense) => void;
  onRefreshWorkspace: () => Promise<void>;
}

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIndex = result.indexOf(',');
      if (commaIndex === -1) {
        reject(new Error('Could not read file contents.'));
        return;
      }
      resolve({
        base64: result.slice(commaIndex + 1),
        mimeType: file.type || 'application/octet-stream',
      });
    };
    reader.onerror = () => reject(new Error('Failed to read uploaded file.'));
    reader.readAsDataURL(file);
  });
}

export const CaptureModal: React.FC<CaptureModalProps> = ({
  isOpen,
  initialTab,
  members,
  activeMemberId,
  onClose,
  onClaimAudited,
  onExpenseCreated,
  onRefreshWorkspace,
}) => {
  const [tab, setTab] = useState<'bill' | 'receipt' | 'manual'>(initialTab);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [billText, setBillText] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptEmailText, setReceiptEmailText] = useState('');
  const [paidById, setPaidById] = useState(activeMemberId);

  // Manual / Parsed review fields
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Medical');
  const [irs502, setIrs502] = useState(true);
  const [fsaHsa, setFsaHsa] = useState(true);
  const [medicaidVerified, setMedicaidVerified] = useState(true);
  const [taxNotes, setTaxNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setPaidById(activeMemberId);
      setErrorMsg(null);
    }
  }, [isOpen, initialTab, activeMemberId]);

  if (!isOpen) return null;

  const handleAuditBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      let fileBase64: string | undefined;
      let mimeType: string | undefined;
      if (billFile) {
        const converted = await fileToBase64(billFile);
        fileBase64 = converted.base64;
        mimeType = converted.mimeType;
      }

      const res = await apiFetch('/api/ai/audit-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64,
          mimeType,
          rawText: billText,
          uploadedBy: activeMemberId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to audit document');
      }
      await onRefreshWorkspace();
      onClaimAudited(data.claim);
      setBillFile(null);
      setBillText('');
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to audit medical bill');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParseReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      let fileBase64: string | undefined;
      let mimeType: string | undefined;
      if (receiptFile) {
        const converted = await fileToBase64(receiptFile);
        fileBase64 = converted.base64;
        mimeType = converted.mimeType;
      }

      const res = await apiFetch('/api/ai/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64,
          mimeType,
          emailText: receiptEmailText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse receipt');
      }

      const parsed = data.parsed;
      setVendor(parsed.vendor || '');
      setDescription(parsed.description || '');
      setExpenseDate(parsed.expenseDate || new Date().toISOString().slice(0, 10));
      setAmount(String(parsed.amount || ''));
      setCategory(parsed.category || 'Medical');
      setIrs502(Boolean(parsed.irs502Eligible));
      setFsaHsa(Boolean(parsed.fsaHsaEligible));
      setMedicaidVerified(Boolean(parsed.medicaidLookbackVerified));
      setTaxNotes(parsed.taxNotes || '');
      setTab('manual');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to parse receipt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor,
          description,
          expenseDate,
          amount: Number(amount),
          category,
          paidByMemberId: paidById,
          irs502Eligible: irs502,
          fsaHsaEligible: fsaHsa,
          medicaidLookbackVerified: medicaidVerified,
          receiptAttached: Boolean(receiptFile || receiptEmailText.trim()),
          taxNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save expense');
      }
      await onRefreshWorkspace();
      onExpenseCreated(data.expense);
      setVendor('');
      setDescription('');
      setAmount('');
      setReceiptFile(null);
      setReceiptEmailText('');
      setTaxNotes('');
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save expense');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="capture-modal-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-[#E5E2DC] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E5E2DC] px-6 py-4">
          <div>
            <h2 id="capture-modal-title" className="text-lg font-semibold text-[#1C2421]">
              Scan Bill, EOB, or Care Receipt
            </h2>
            <p className="text-xs text-[#5A6662]">
              Multimodal extraction checks billing errors, categorizes splits, and tags tax eligibility
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#5A6662] transition-colors hover:bg-[#F1EFEA] hover:text-[#1C2421]"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-[#E5E2DC] px-6 py-3">
          <div className="inline-flex rounded-lg bg-[#F1EFEA] p-1">
            <button
              type="button"
              onClick={() => {
                setTab('bill');
                setErrorMsg(null);
              }}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === 'bill' ? 'bg-white text-[#1C2421] shadow-xs' : 'text-[#5A6662] hover:text-[#1C2421]'
              }`}
            >
              Audit Medical Bill / EOB
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('receipt');
                setErrorMsg(null);
              }}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === 'receipt' ? 'bg-white text-[#1C2421] shadow-xs' : 'text-[#5A6662] hover:text-[#1C2421]'
              }`}
            >
              Scan Receipt / Order Email
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('manual');
                setErrorMsg(null);
              }}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === 'manual' ? 'bg-white text-[#1C2421] shadow-xs' : 'text-[#5A6662] hover:text-[#1C2421]'
              }`}
            >
              Manual Expense Entry
            </button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          {errorMsg && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {errorMsg}
            </div>
          )}

          {tab === 'bill' && (
            <form onSubmit={handleAuditBill} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#1C2421]">
                  Upload Hospital Bill, Insurance EOB, or Medicare Summary Notice (PNG, JPG, PDF)
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#CFCAC0] bg-[#F8F7F4] px-4 py-6 text-center transition-colors hover:border-[#2D5A4C]">
                  <Upload className="mb-2 h-5 w-5 text-[#2D5A4C]" />
                  <span className="text-sm font-medium text-[#1C2421]">
                    {billFile ? billFile.name : 'Choose bill image or PDF'}
                  </span>
                  <span className="mt-1 text-xs text-[#5A6662]">
                    Checks duplicate charges, NCCI unbundling, coding mismatches & No Surprises Act
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => setBillFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="bill-raw-text" className="text-xs font-medium text-[#1C2421]">
                    Or Paste Bill / EOB Statement Text
                  </label>
                  <button
                    type="button"
                    onClick={() => setBillText(SAMPLE_MEDICAL_BILL_TEXT)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#2D5A4C] hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Load Sample Out-of-Network EOB
                  </button>
                </div>
                <textarea
                  id="bill-raw-text"
                  rows={5}
                  value={billText}
                  onChange={(e) => setBillText(e.target.value)}
                  placeholder="Paste line items, CPT codes, billed/allowed amounts, or denial notes..."
                  className="w-full rounded-lg border border-[#E5E2DC] bg-white px-3 py-2 font-mono text-xs text-[#1C2421] focus:border-[#2D5A4C] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-[#E5E2DC] px-4 py-2 text-xs font-medium text-[#5A6662] hover:bg-[#F1EFEA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (!billFile && billText.trim().length < 20)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#23473C] disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {isLoading ? 'Auditing Line Items...' : 'Run AI Billing Audit'}
                </button>
              </div>
            </form>
          )}

          {tab === 'receipt' && (
            <form onSubmit={handleParseReceipt} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#1C2421]">
                  Upload Pharmacy, Grocery, or Home Modification Receipt (PNG, JPG, PDF)
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#CFCAC0] bg-[#F8F7F4] px-4 py-6 text-center transition-colors hover:border-[#2D5A4C]">
                  <Receipt className="mb-2 h-5 w-5 text-[#2D5A4C]" />
                  <span className="text-sm font-medium text-[#1C2421]">
                    {receiptFile ? receiptFile.name : 'Choose receipt photo or PDF'}
                  </span>
                  <span className="mt-1 text-xs text-[#5A6662]">
                    Automatically categorizes & evaluates IRS Pub 502 and FSA/HSA eligibility
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="receipt-email-text" className="text-xs font-medium text-[#1C2421]">
                    Or Paste Amazon / Pharmacy Order Confirmation Email
                  </label>
                  <button
                    type="button"
                    onClick={() => setReceiptEmailText(SAMPLE_AMAZON_RECEIPT_TEXT)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#2D5A4C] hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Load Sample Amazon Order
                  </button>
                </div>
                <textarea
                  id="receipt-email-text"
                  rows={5}
                  value={receiptEmailText}
                  onChange={(e) => setReceiptEmailText(e.target.value)}
                  placeholder="Paste Amazon, CVS, Walgreens, or home care invoice email text..."
                  className="w-full rounded-lg border border-[#E5E2DC] bg-white px-3 py-2 font-mono text-xs text-[#1C2421] focus:border-[#2D5A4C] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-[#E5E2DC] px-4 py-2 text-xs font-medium text-[#5A6662] hover:bg-[#F1EFEA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (!receiptFile && receiptEmailText.trim().length < 8)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#23473C] disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {isLoading ? 'Extracting & Tagging...' : 'Extract & Review Expense'}
                </button>
              </div>
            </form>
          )}

          {tab === 'manual' && (
            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="exp-vendor" className="mb-1 block text-xs font-medium text-[#1C2421]">
                    Vendor / Provider
                  </label>
                  <input
                    id="exp-vendor"
                    type="text"
                    required
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="e.g., Walgreens Pharmacy"
                    className="w-full rounded-lg border border-[#E5E2DC] px-3 py-2 text-sm text-[#1C2421] focus:border-[#2D5A4C] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="exp-amount" className="mb-1 block text-xs font-medium text-[#1C2421]">
                    Amount (USD)
                  </label>
                  <input
                    id="exp-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-[#E5E2DC] px-3 py-2 font-mono text-sm text-[#1C2421] tabular-nums focus:border-[#2D5A4C] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="exp-desc" className="mb-1 block text-xs font-medium text-[#1C2421]">
                  Itemized Description
                </label>
                <input
                  id="exp-desc"
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Grab bars, rollator walker, monthly prescription copay"
                  className="w-full rounded-lg border border-[#E5E2DC] px-3 py-2 text-sm text-[#1C2421] focus:border-[#2D5A4C] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="exp-date" className="mb-1 block text-xs font-medium text-[#1C2421]">
                    Date
                  </label>
                  <input
                    id="exp-date"
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full rounded-lg border border-[#E5E2DC] px-3 py-2 font-mono text-xs text-[#1C2421] focus:border-[#2D5A4C] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="exp-category" className="mb-1 block text-xs font-medium text-[#1C2421]">
                    Category
                  </label>
                  <select
                    id="exp-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full rounded-lg border border-[#E5E2DC] bg-white px-3 py-2 text-sm text-[#1C2421] focus:border-[#2D5A4C] focus:outline-none"
                  >
                    <option value="Medical">Medical</option>
                    <option value="Home Modification">Home Modification</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Paid Aide">Paid Aide</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="exp-paidby" className="mb-1 block text-xs font-medium text-[#1C2421]">
                    Paid By Sibling
                  </label>
                  <select
                    id="exp-paidby"
                    value={paidById}
                    onChange={(e) => setPaidById(e.target.value)}
                    className="w-full rounded-lg border border-[#E5E2DC] bg-white px-3 py-2 text-sm text-[#1C2421] focus:border-[#2D5A4C] focus:outline-none"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.splitPercentage}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-[#E5E2DC] bg-[#F8F7F4] p-4 space-y-2.5">
                <div className="text-xs font-semibold text-[#1C2421]">Tax, FSA/HSA & Medicaid Spend-Down Tags</div>
                <div className="flex flex-wrap gap-5">
                  <label className="flex items-center gap-2 text-xs text-[#1C2421]">
                    <input
                      type="checkbox"
                      checked={irs502}
                      onChange={(e) => setIrs502(e.target.checked)}
                      className="rounded border-[#CFCAC0] text-[#2D5A4C]"
                    />
                    IRS Pub 502 Medical Deduction
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#1C2421]">
                    <input
                      type="checkbox"
                      checked={fsaHsa}
                      onChange={(e) => setFsaHsa(e.target.checked)}
                      className="rounded border-[#CFCAC0] text-[#2D5A4C]"
                    />
                    FSA / HSA Eligible
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#1C2421]">
                    <input
                      type="checkbox"
                      checked={medicaidVerified}
                      onChange={(e) => setMedicaidVerified(e.target.checked)}
                      className="rounded border-[#CFCAC0] text-[#2D5A4C]"
                    />
                    Medicaid 60-Mo Look-Back Verified
                  </label>
                </div>
                <input
                  type="text"
                  value={taxNotes}
                  onChange={(e) => setTaxNotes(e.target.value)}
                  placeholder="Optional CPA / Medicaid audit note..."
                  className="w-full rounded-lg border border-[#E5E2DC] bg-white px-3 py-1.5 text-xs text-[#1C2421] focus:border-[#2D5A4C] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-[#E5E2DC] px-4 py-2 text-xs font-medium text-[#5A6662] hover:bg-[#F1EFEA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#23473C] disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save to Care Ledger & Vault
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { CheckCircle2, Download, FileWarning, Printer, ShieldCheck } from 'lucide-react';
import type { CareExpense, WorkspaceSnapshot } from '../types';
import { apiFetch } from '../utils/authClient';
import { downloadVaultCsv, formatCurrency, formatShortDate } from '../utils/format';

interface TaxMedicaidVaultViewProps {
  workspace: WorkspaceSnapshot;
  onRefreshWorkspace: () => Promise<void>;
}

type VaultFilter = 'all' | 'irs502' | 'fsa' | 'medicaid_verified' | 'needs_proof';

export const TaxMedicaidVaultView: React.FC<TaxMedicaidVaultViewProps> = ({
  workspace,
  onRefreshWorkspace,
}) => {
  const { expenses, members, settings } = workspace;
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const [filter, setFilter] = useState<VaultFilter>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const irsTotal = expenses.filter((e) => e.irs502Eligible).reduce((s, e) => s + e.amount, 0);
  const fsaTotal = expenses.filter((e) => e.fsaHsaEligible).reduce((s, e) => s + e.amount, 0);
  const medicaidTotal = expenses
    .filter((e) => e.medicaidLookbackVerified)
    .reduce((s, e) => s + e.amount, 0);
  const missingProofCount = expenses.filter(
    (e) => !e.medicaidLookbackVerified || !e.receiptAttached
  ).length;

  const readinessPct = expenses.length
    ? Math.round(((expenses.length - missingProofCount) / expenses.length) * 100)
    : 100;

  const filteredExpenses = expenses.filter((e) => {
    switch (filter) {
      case 'irs502':
        return e.irs502Eligible;
      case 'fsa':
        return e.fsaHsaEligible;
      case 'medicaid_verified':
        return e.medicaidLookbackVerified;
      case 'needs_proof':
        return !e.medicaidLookbackVerified || !e.receiptAttached;
      default:
        return true;
    }
  });

  const handleToggleFlag = async (
    expense: CareExpense,
    field: 'irs502Eligible' | 'fsaHsaEligible' | 'medicaidLookbackVerified' | 'receiptAttached'
  ) => {
    setErrorMsg(null);
    setUpdatingId(expense.id);
    try {
      const res = await apiFetch(`/api/expenses/${expense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !expense[field] }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update vault flags');
      }
      await onRefreshWorkspace();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update vault item');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#1C2421]">
            Tax, FSA/HSA & Medicaid Spend-Down Vault
          </h1>
          <p className="mt-1 text-sm text-[#5A6662]">
            60-Month Look-Back Window ({formatShortDate(settings.medicaidLookbackStart)} – Present) · IRS Publication 502 & FSA/HSA Archive
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={() => downloadVaultCsv(filteredExpenses, members, settings.careRecipient)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#E5E2DC] bg-white px-3.5 py-2 text-xs font-medium text-[#1C2421] hover:bg-[#F1EFEA]"
          >
            <Download className="h-3.5 w-3.5" />
            Export Accountant CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white hover:bg-[#23473C]"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Audit Packet
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#E5E2DC] bg-white p-5">
          <div className="text-xs font-medium text-[#5A6662]">IRS Pub 502 Qualified</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#1C2421] tabular-nums">
            {formatCurrency(irsTotal)}
          </div>
          <div className="mt-1 text-xs text-[#5A6662]">Medical & LTC deductible total</div>
        </div>

        <div className="rounded-xl border border-[#E5E2DC] bg-white p-5">
          <div className="text-xs font-medium text-[#5A6662]">FSA / HSA Reimbursable</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#1C2421] tabular-nums">
            {formatCurrency(fsaTotal)}
          </div>
          <div className="mt-1 text-xs text-[#5A6662]">Eligible OTC, Rx & mobility aids</div>
        </div>

        <div className="rounded-xl border border-[#E5E2DC] bg-white p-5">
          <div className="text-xs font-medium text-[#5A6662]">Medicaid Verified Spend</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#16A34A] tabular-nums">
            {formatCurrency(medicaidTotal)}
          </div>
          <div className="mt-1 text-xs text-[#5A6662]">Audit-ready 5-year documentation</div>
        </div>

        <div className="rounded-xl border border-[#E5E2DC] bg-white p-5">
          <div className="text-xs font-medium text-[#5A6662]">Look-Back Completeness</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#1C2421] tabular-nums">
            {readinessPct}%
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F1EFEA]">
            <div
              className="h-full bg-[#2D5A4C] transition-all"
              style={{ width: `${readinessPct}%` }}
            />
          </div>
          <div className="mt-1.5 text-xs text-[#5A6662]">
            {missingProofCount === 0
              ? 'All items verified for caseworker review'
              : `${missingProofCount} item(s) missing itemized proof`}
          </div>
        </div>
      </div>

      {/* Filter Bar & Table */}
      <div className="rounded-xl border border-[#E5E2DC] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E2DC] p-4 no-print">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#F1EFEA] p-1">
            {[
              { id: 'all', label: 'All Records' },
              { id: 'irs502', label: 'IRS Pub 502' },
              { id: 'fsa', label: 'FSA / HSA' },
              { id: 'medicaid_verified', label: 'Medicaid Verified' },
              { id: 'needs_proof', label: `Needs Proof (${missingProofCount})` },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id as VaultFilter)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === item.id
                    ? 'bg-white text-[#1C2421] shadow-xs'
                    : 'text-[#5A6662] hover:text-[#1C2421]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E2DC] text-[#5A6662]">
                <th className="py-3 pl-6 pr-3 font-medium">Date</th>
                <th className="py-3 px-3 font-medium">Vendor & Audit Notes</th>
                <th className="py-3 px-3 font-medium">Paid By</th>
                <th className="py-3 px-3 text-center font-medium">IRS 502</th>
                <th className="py-3 px-3 text-center font-medium">FSA/HSA</th>
                <th className="py-3 px-3 text-center font-medium">Receipt</th>
                <th className="py-3 px-3 text-center font-medium">Medicaid 5-Yr</th>
                <th className="py-3 pl-3 pr-6 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC]">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-[#F8F7F4]">
                  <td className="py-3 pl-6 pr-3 font-mono text-[#5A6662] tabular-nums whitespace-nowrap">
                    {formatShortDate(exp.expenseDate)}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-[#1C2421]">{exp.vendor}</div>
                    <div className="text-[#5A6662]">{exp.taxNotes}</div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-[#1C2421]">
                    {memberMap.get(exp.paidByMemberId)?.name ?? exp.paidByMemberId}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Toggle IRS 502 for ${exp.vendor}`}
                      disabled={updatingId === exp.id}
                      checked={exp.irs502Eligible}
                      onChange={() => handleToggleFlag(exp, 'irs502Eligible')}
                      className="h-4 w-4 rounded border-[#CFCAC0] accent-[#2D5A4C]"
                    />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Toggle FSA/HSA for ${exp.vendor}`}
                      disabled={updatingId === exp.id}
                      checked={exp.fsaHsaEligible}
                      onChange={() => handleToggleFlag(exp, 'fsaHsaEligible')}
                      className="h-4 w-4 rounded border-[#CFCAC0] accent-[#2D5A4C]"
                    />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      disabled={updatingId === exp.id}
                      onClick={() => handleToggleFlag(exp, 'receiptAttached')}
                      className={`inline-flex items-center gap-1 font-medium ${
                        exp.receiptAttached ? 'text-[#16A34A]' : 'text-[#D97706]'
                      }`}
                    >
                      {exp.receiptAttached ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Attached
                        </>
                      ) : (
                        <>
                          <FileWarning className="h-3.5 w-3.5" />
                          Missing
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      disabled={updatingId === exp.id}
                      onClick={() => handleToggleFlag(exp, 'medicaidLookbackVerified')}
                      className={`inline-flex items-center gap-1 font-medium ${
                        exp.medicaidLookbackVerified ? 'text-[#16A34A]' : 'text-[#D97706]'
                      }`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {exp.medicaidLookbackVerified ? 'Verified' : 'Verify'}
                    </button>
                  </td>
                  <td className="py-3 pl-3 pr-6 text-right font-mono font-semibold text-[#1C2421] tabular-nums whitespace-nowrap">
                    {formatCurrency(exp.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

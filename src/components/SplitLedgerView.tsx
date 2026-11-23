import React, { useState } from 'react';
import { CheckCircle2, Plus, Scale, Search, Send, SlidersHorizontal } from 'lucide-react';
import type {
  ExpenseCategory,
  FamilyMember,
  SuggestedTransfer,
  WorkspaceSnapshot,
} from '../types';
import { formatCurrency, formatShortDate } from '../utils/format';

interface SplitLedgerViewProps {
  workspace: WorkspaceSnapshot;
  activeMember: FamilyMember;
  onOpenReceiptModal: () => void;
  onRefreshWorkspace: () => Promise<void>;
}

const CATEGORY_FILTERS: Array<'All' | ExpenseCategory> = [
  'All',
  'Medical',
  'Home Modification',
  'Groceries',
  'Paid Aide',
];

export const SplitLedgerView: React.FC<SplitLedgerViewProps> = ({
  workspace,
  activeMember,
  onOpenReceiptModal,
  onRefreshWorkspace,
}) => {
  const { members, expenses, settlements, balances, suggestedTransfers, settings } = workspace;
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const [categoryFilter, setCategoryFilter] = useState<'All' | ExpenseCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSplitEditor, setShowSplitEditor] = useState(false);

  const [draftSplits, setDraftSplits] = useState<Record<string, number>>(() =>
    Object.fromEntries(members.map((m) => [m.id, m.splitPercentage]))
  );
  const [unpaidHours, setUnpaidHours] = useState(settings.unpaidCareHoursMonthly);
  const [offsetNote, setOffsetNote] = useState(settings.localCareOffsetNote);

  const [settlingTransfer, setSettlingTransfer] = useState<SuggestedTransfer | null>(null);
  const [settleMethod, setSettleMethod] = useState<'Venmo' | 'Zelle' | 'ACH'>('Venmo');
  const [settleNote, setSettleNote] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  React.useEffect(() => {
    setDraftSplits(Object.fromEntries(members.map((m) => [m.id, m.splitPercentage])));
    setUnpaidHours(settings.unpaidCareHoursMonthly);
    setOffsetNote(settings.localCareOffsetNote);
  }, [members, settings]);

  const totalDraftSplit = Object.values(draftSplits).reduce((sum, v) => sum + Number(v || 0), 0);

  const totalPool = expenses.reduce((sum, e) => sum + e.amount, 0);
  const activeBalance = balances.find((b) => b.memberId === activeMember.id);

  const filteredExpenses = expenses.filter((e) => {
    const matchesCat = categoryFilter === 'All' || e.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      e.vendor.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const handleSaveSplits = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaving(true);
    try {
      const splits = members.map((m) => ({
        id: m.id,
        splitPercentage: Number(draftSplits[m.id] ?? 0),
      }));
      const res = await fetch('/api/members/splits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          splits,
          unpaidCareHoursMonthly: unpaidHours,
          localCareOffsetNote: offsetNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update split rules');
      }
      await onRefreshWorkspace();
      setShowSplitEditor(false);
      setToastMsg('Family split ratios updated and sibling balances recalculated.');
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save split rules');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingTransfer) return;
    setErrorMsg(null);
    setIsSaving(true);
    try {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromMemberId: settlingTransfer.fromMemberId,
          toMemberId: settlingTransfer.toMemberId,
          amount: settlingTransfer.amount,
          method: settleMethod,
          note: settleNote || `Monthly care reimbursement via ${settleMethod}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record settlement');
      }
      await onRefreshWorkspace();
      setSettlingTransfer(null);
      setSettleNote('');
      setToastMsg('Settlement recorded in the shared family ledger.');
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to record settlement');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#1C2421]">
            Family Care Split Ledger
          </h1>
          <p className="mt-1 text-sm text-[#5A6662]">
            Shared caregiving expenses adjusted for {settings.unpaidCareHoursMonthly} unpaid local care hrs/mo
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSplitEditor((v) => !v)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#E5E2DC] bg-white px-3.5 py-2 text-xs font-medium text-[#1C2421] transition-colors hover:bg-[#F1EFEA]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {showSplitEditor ? 'Close Split Rules' : 'Configure Split Rules'}
          </button>
          <button
            type="button"
            onClick={onOpenReceiptModal}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#23473C]"
          >
            <Plus className="h-3.5 w-3.5" />
            Capture Receipt / Expense
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-[#16A34A]/30 bg-[#EEF4F1] px-4 py-2.5 text-xs font-medium text-[#1C2421]">
          <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Configurable Split Rules Panel */}
      {showSplitEditor && (
        <form
          onSubmit={handleSaveSplits}
          className="rounded-xl border border-[#E5E2DC] bg-white p-6 space-y-5"
        >
          <div className="flex flex-col justify-between gap-2 border-b border-[#E5E2DC] pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-semibold text-[#1C2421]">Sibling Split Agreement & Care-Hour Offset</h2>
              <p className="text-xs text-[#5A6662]">
                Adjust cash contribution percentages so out-of-state siblings offset unpaid physical care hours
              </p>
            </div>
            <div
              className={`font-mono text-xs font-semibold tabular-nums ${
                Math.abs(totalDraftSplit - 100) < 0.01 ? 'text-[#16A34A]' : 'text-[#DC2626]'
              }`}
            >
              Total Allocation: {totalDraftSplit}% / 100%
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {members.map((m) => (
              <div key={m.id} className="rounded-lg border border-[#E5E2DC] bg-[#F8F7F4] p-4">
                <div className="flex items-center gap-2.5">
                  <img
                    src={m.avatarUrl}
                    alt={m.name}
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 rounded-full border border-[#E5E2DC] object-cover"
                  />
                  <div>
                    <div className="text-sm font-semibold text-[#1C2421]">{m.name}</div>
                    <div className="text-[11px] text-[#5A6662]">{m.roleLabel}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={draftSplits[m.id] ?? 0}
                    onChange={(e) =>
                      setDraftSplits((prev) => ({ ...prev, [m.id]: Number(e.target.value) }))
                    }
                    className="w-full accent-[#2D5A4C]"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draftSplits[m.id] ?? 0}
                    onChange={(e) =>
                      setDraftSplits((prev) => ({ ...prev, [m.id]: Number(e.target.value) }))
                    }
                    className="w-16 rounded-md border border-[#E5E2DC] bg-white px-2 py-1 text-right font-mono text-xs tabular-nums"
                  />
                  <span className="text-xs text-[#5A6662]">%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C2421]">
                Local Unpaid Care Hours / Month
              </label>
              <input
                type="number"
                min={0}
                max={400}
                value={unpaidHours}
                onChange={(e) => setUnpaidHours(Number(e.target.value))}
                className="w-full rounded-lg border border-[#E5E2DC] px-3 py-2 font-mono text-sm tabular-nums focus:border-[#2D5A4C] focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#1C2421]">
                Agreement Note
              </label>
              <input
                type="text"
                value={offsetNote}
                onChange={(e) => setOffsetNote(e.target.value)}
                className="w-full rounded-lg border border-[#E5E2DC] px-3 py-2 text-sm focus:border-[#2D5A4C] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setDraftSplits({ maya: 20, david: 55, elena: 25 });
              }}
              className="text-xs font-medium text-[#2D5A4C] hover:underline"
            >
              Reset to 20 / 55 / 25 Local Care Offset
            </button>
            <button
              type="submit"
              disabled={isSaving || Math.abs(totalDraftSplit - 100) > 0.01}
              className="rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white hover:bg-[#23473C] disabled:opacity-50"
            >
              Save Split Rules
            </button>
          </div>
        </form>
      )}

      {/* Sibling Balances & Non-Awkward Settlement Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-[#E5E2DC] bg-white p-6 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-4">
            <div>
              <h2 className="text-base font-semibold text-[#1C2421]">Sibling Balance Breakdown</h2>
              <p className="text-xs text-[#5A6662]">
                Total Care Pool: <span className="font-mono font-semibold text-[#1C2421] tabular-nums">{formatCurrency(totalPool)}</span> · Viewing as {activeMember.name}
              </p>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-[#5A6662]">Your Net Position</div>
              <div
                className={`font-mono text-base font-semibold tabular-nums ${
                  (activeBalance?.netBalance ?? 0) >= 0 ? 'text-[#16A34A]' : 'text-[#D97706]'
                }`}
              >
                {(activeBalance?.netBalance ?? 0) > 0.01
                  ? `Owed ${formatCurrency(activeBalance?.netBalance ?? 0)}`
                  : (activeBalance?.netBalance ?? 0) < -0.01
                  ? `Owe ${formatCurrency(Math.abs(activeBalance?.netBalance ?? 0))}`
                  : 'Settled'}
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E2DC] text-[#5A6662]">
                  <th className="py-2 pr-3 font-medium">Family Member</th>
                  <th className="py-2 px-3 text-right font-medium">Agreed Share</th>
                  <th className="py-2 px-3 text-right font-medium">Paid Out</th>
                  <th className="py-2 px-3 text-right font-medium">Share Target</th>
                  <th className="py-2 pl-3 text-right font-medium">Net Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2DC]">
                {members.map((m) => {
                  const bal = balances.find((b) => b.memberId === m.id);
                  const net = bal?.netBalance ?? 0;
                  return (
                    <tr key={m.id} className={m.id === activeMember.id ? 'bg-[#EEF4F1]/60' : ''}>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={m.avatarUrl}
                            alt={m.name}
                            referrerPolicy="no-referrer"
                            className="h-7 w-7 rounded-full border border-[#E5E2DC] object-cover"
                          />
                          <div>
                            <div className="font-medium text-[#1C2421]">{m.name}</div>
                            <div className="text-[11px] text-[#5A6662]">{m.location}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[#1C2421]">
                        {m.splitPercentage}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[#1C2421]">
                        {formatCurrency(bal?.paidTotal ?? 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[#5A6662]">
                        {formatCurrency(bal?.expectedShareTotal ?? 0)}
                      </td>
                      <td
                        className={`py-3 pl-3 text-right font-mono font-semibold tabular-nums ${
                          net > 0.01 ? 'text-[#16A34A]' : net < -0.01 ? 'text-[#D97706]' : 'text-[#5A6662]'
                        }`}
                      >
                        {net > 0.01 ? `+${formatCurrency(net)}` : formatCurrency(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Non-Awkward Monthly Settlement Panel */}
        <div className="rounded-xl border border-[#E5E2DC] bg-white p-6 lg:col-span-5">
          <div className="flex items-center gap-2 border-b border-[#E5E2DC] pb-4">
            <Scale className="h-4 w-4 text-[#2D5A4C]" />
            <div>
              <h2 className="text-base font-semibold text-[#1C2421]">Monthly Reimbursement Summary</h2>
              <p className="text-xs text-[#5A6662]">One-tap Venmo, Zelle, or ACH settlement without awkward asks</p>
            </div>
          </div>

          {suggestedTransfers.length === 0 ? (
            <div className="py-6 text-xs text-[#5A6662]">
              All sibling shares are settled for this period.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {suggestedTransfers.map((t, idx) => {
                const from = memberMap.get(t.fromMemberId);
                const to = memberMap.get(t.toMemberId);
                return (
                  <div
                    key={`${t.fromMemberId}-${t.toMemberId}-${idx}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E2DC] bg-[#F8F7F4] p-3.5"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#1C2421]">
                        {from?.name} pays {to?.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#5A6662]">
                        {to?.paymentMethod}: {to?.paymentHandle}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-sm font-semibold text-[#1C2421] tabular-nums">
                        {formatCurrency(t.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSettlingTransfer(t);
                          setSettleMethod(to?.paymentMethod ?? 'Venmo');
                          setSettleNote(`${new Date().toLocaleString('en-US', { month: 'long' })} care split settlement`);
                        }}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-[#2D5A4C] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#23473C]"
                      >
                        <Send className="h-3 w-3" />
                        Settle
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {settlements.length > 0 && (
            <div className="mt-5 border-t border-[#E5E2DC] pt-4">
              <div className="text-xs font-semibold text-[#1C2421]">Recent Recorded Settlements</div>
              <div className="mt-2 space-y-2">
                {settlements.slice(0, 3).map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs text-[#5A6662]">
                    <span>
                      {memberMap.get(s.fromMemberId)?.name} → {memberMap.get(s.toMemberId)?.name} · {s.method}
                    </span>
                    <span className="font-mono text-[#16A34A] tabular-nums">
                      {formatCurrency(s.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expense Ledger Table */}
      <div className="rounded-xl border border-[#E5E2DC] bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-[#E5E2DC] p-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#F1EFEA] p-1">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-white text-[#1C2421] shadow-xs'
                    : 'text-[#5A6662] hover:text-[#1C2421]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#5A6662]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendor or item..."
              className="w-full rounded-lg border border-[#E5E2DC] bg-[#F8F7F4] py-1.5 pr-3 pl-8 text-xs text-[#1C2421] focus:border-[#2D5A4C] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E2DC] text-[#5A6662]">
                <th className="py-3 pl-6 pr-3 font-medium">Date</th>
                <th className="py-3 px-3 font-medium">Vendor & Item</th>
                <th className="py-3 px-3 font-medium">Category</th>
                <th className="py-3 px-3 font-medium">Paid By</th>
                <th className="py-3 px-3 font-medium">Tax / Medicaid Tags</th>
                <th className="py-3 pl-3 pr-6 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC]">
              {filteredExpenses.map((exp) => {
                const payer = memberMap.get(exp.paidByMemberId);
                const tags: string[] = [];
                if (exp.irs502Eligible) tags.push('IRS Pub 502');
                if (exp.fsaHsaEligible) tags.push('FSA/HSA');
                if (exp.medicaidLookbackVerified) tags.push('Medicaid Verified');
                return (
                  <tr key={exp.id} className="hover:bg-[#F8F7F4]">
                    <td className="py-3 pl-6 pr-3 font-mono text-[#5A6662] tabular-nums whitespace-nowrap">
                      {formatShortDate(exp.expenseDate)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#1C2421]">{exp.vendor}</div>
                      <div className="text-[#5A6662]">{exp.description}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-[#1C2421]">{exp.category}</td>
                    <td className="py-3 px-3 whitespace-nowrap text-[#1C2421]">
                      {payer?.name ?? exp.paidByMemberId}
                    </td>
                    <td className="py-3 px-3 text-[#5A6662]">
                      {tags.length > 0 ? tags.join(' · ') : 'General Care'}
                    </td>
                    <td className="py-3 pl-3 pr-6 text-right font-mono font-semibold text-[#1C2421] tabular-nums whitespace-nowrap">
                      {formatCurrency(exp.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settlement Confirmation Modal */}
      {settlingTransfer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleConfirmSettlement}
            className="w-full max-w-md rounded-xl border border-[#E5E2DC] bg-white p-6 shadow-xl space-y-4"
          >
            <h3 className="text-base font-semibold text-[#1C2421]">Record Sibling Settlement</h3>
            <p className="text-xs text-[#5A6662]">
              Confirm transfer from{' '}
              <strong className="text-[#1C2421]">{memberMap.get(settlingTransfer.fromMemberId)?.name}</strong> to{' '}
              <strong className="text-[#1C2421]">{memberMap.get(settlingTransfer.toMemberId)?.name}</strong> for{' '}
              <span className="font-mono font-semibold text-[#1C2421] tabular-nums">
                {formatCurrency(settlingTransfer.amount)}
              </span>
              .
            </p>

            <div className="rounded-lg bg-[#F8F7F4] p-3 text-xs text-[#1C2421]">
              Recipient Handle ({memberMap.get(settlingTransfer.toMemberId)?.paymentMethod}):{' '}
              <span className="font-mono font-medium">
                {memberMap.get(settlingTransfer.toMemberId)?.paymentHandle}
              </span>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C2421]">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Venmo', 'Zelle', 'ACH'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setSettleMethod(method)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                      settleMethod === method
                        ? 'border-[#2D5A4C] bg-[#EEF4F1] text-[#2D5A4C]'
                        : 'border-[#E5E2DC] text-[#5A6662]'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#1C2421]">Memo / Note</label>
              <input
                type="text"
                value={settleNote}
                onChange={(e) => setSettleNote(e.target.value)}
                className="w-full rounded-lg border border-[#E5E2DC] px-3 py-2 text-xs focus:border-[#2D5A4C] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSettlingTransfer(null)}
                className="rounded-lg border border-[#E5E2DC] px-4 py-2 text-xs font-medium text-[#5A6662] hover:bg-[#F1EFEA]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white hover:bg-[#23473C] disabled:opacity-50"
              >
                Confirm & Record Settlement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

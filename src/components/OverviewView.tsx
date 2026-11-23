import React from 'react';
import { ArrowRight, CheckCircle2, FileWarning, Scale, ShieldCheck } from 'lucide-react';
import type { FamilyMember, MedicalClaim, WorkspaceSnapshot } from '../types';
import { formatCurrency, formatShortDate } from '../utils/format';

interface OverviewViewProps {
  workspace: WorkspaceSnapshot;
  activeMember: FamilyMember;
  onNavigate: (tab: 'auditor' | 'ledger' | 'vault' | 'plan') => void;
  onSelectClaim: (claim: MedicalClaim) => void;
  onOpenCapture: (mode: 'bill' | 'receipt') => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  workspace,
  activeMember,
  onNavigate,
  onSelectClaim,
  onOpenCapture,
}) => {
  const { claims, expenses, members, balances, settings, suggestedTransfers } = workspace;

  const openSavings = claims
    .filter((c) => c.status !== 'Overturned' && c.status !== 'Cleared')
    .reduce((sum, c) => sum + c.potentialSavings, 0);

  const recoveredSavings = claims
    .filter((c) => c.status === 'Overturned')
    .reduce((sum, c) => sum + c.potentialSavings, 0);

  const activeBalance = balances.find((b) => b.memberId === activeMember.id);
  const netBal = activeBalance?.netBalance ?? 0;

  const irsTotal = expenses
    .filter((e) => e.irs502Eligible)
    .reduce((sum, e) => sum + e.amount, 0);

  const verifiedCount = expenses.filter((e) => e.medicaidLookbackVerified).length;
  const unverifiedCount = expenses.length - verifiedCount;
  const readinessPct = expenses.length ? Math.round((verifiedCount / expenses.length) * 100) : 100;

  const activeActionClaims = claims.filter((c) => c.status === 'Flagged' || c.status === 'Appeal Drafted');
  const missingDocExpenses = expenses.filter((e) => !e.medicaidLookbackVerified || !e.receiptAttached);

  const memberMap = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="space-y-8">
      {/* Hero / Contextual Family Status */}
      <section className="flex flex-col justify-between gap-6 rounded-xl border border-[#E5E2DC] bg-white p-6 lg:flex-row lg:items-center">
        <div className="flex items-start gap-4">
          <img
            src={settings.recipientAvatar}
            alt={settings.careRecipient}
            referrerPolicy="no-referrer"
            className="h-14 w-14 shrink-0 rounded-full border border-[#E5E2DC] object-cover"
          />
          <div>
            <p className="text-xs text-[#5A6662]">
              Care Plan for {settings.careRecipient} · Active Perspective: {activeMember.name} ({activeMember.roleLabel})
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-[#1C2421]">
              {netBal > 0.01
                ? `You are owed ${formatCurrency(netBal)} from shared care costs`
                : netBal < -0.01
                ? `Your current share owed is ${formatCurrency(Math.abs(netBal))}`
                : 'Your family care balance is settled'}
            </h1>
            <p className="mt-1 text-sm text-[#5A6662]">
              {activeMember.personaType === 'local_coordinator'
                ? `Local offset active: your ${settings.unpaidCareHoursMonthly} unpaid care hrs/mo adjust your cash split to ${activeMember.splitPercentage}%.`
                : activeMember.personaType === 'out_of_state'
                ? `Remote contribution split (${activeMember.splitPercentage}% cash) offsets Maya's local visits. Review open appeals or settle monthly.`
                : `Quick 10-second receipt scan and automated monthly summary keep your ${activeMember.splitPercentage}% share effortless.`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onOpenCapture('bill')}
            className="whitespace-nowrap rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#23473C]"
          >
            Audit EOB or Bill
          </button>
          <button
            type="button"
            onClick={() => onOpenCapture('receipt')}
            className="whitespace-nowrap rounded-lg border border-[#E5E2DC] bg-white px-4 py-2 text-xs font-medium text-[#1C2421] transition-colors hover:bg-[#F1EFEA]"
          >
            Log Care Receipt
          </button>
        </div>
      </section>

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#E5E2DC] bg-white p-5">
          <div className="text-xs font-medium text-[#5A6662]">Open Billing Recovery</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#1C2421] tabular-nums">
            {formatCurrency(openSavings)}
          </div>
          <div className="mt-1.5 text-xs text-[#5A6662]">
            {activeActionClaims.length} claims flagged · {formatCurrency(recoveredSavings)} already overturned
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E2DC] bg-white p-5">
          <div className="text-xs font-medium text-[#5A6662]">
            {netBal >= 0 ? 'Owed to Active Sibling' : 'Active Sibling Owes'}
          </div>
          <div
            className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${
              netBal >= 0 ? 'text-[#16A34A]' : 'text-[#D97706]'
            }`}
          >
            {formatCurrency(Math.abs(netBal))}
          </div>
          <div className="mt-1.5 text-xs text-[#5A6662]">
            {suggestedTransfers.length} pending transfer{suggestedTransfers.length === 1 ? '' : 's'} across {members.length} siblings
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E2DC] bg-white p-5">
          <div className="text-xs font-medium text-[#5A6662]">IRS Pub 502 Eligible Spend</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#1C2421] tabular-nums">
            {formatCurrency(irsTotal)}
          </div>
          <div className="mt-1.5 text-xs text-[#5A6662]">
            {expenses.filter((e) => e.fsaHsaEligible).length} FSA/HSA qualified receipts archived
          </div>
        </div>

        <div className="rounded-xl border border-[#E5E2DC] bg-white p-5">
          <div className="text-xs font-medium text-[#5A6662]">Medicaid 60-Mo Readiness</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#1C2421] tabular-nums">
            {readinessPct}%
          </div>
          <div className="mt-1.5 text-xs text-[#5A6662]">
            {verifiedCount} verified · {unverifiedCount} missing itemized proof
          </div>
        </div>
      </section>

      {/* Priority Action Queue & Sibling Split Ledger Summary */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Action Queue */}
        <div className="rounded-xl border border-[#E5E2DC] bg-white p-6 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-4">
            <div>
              <h2 className="text-base font-semibold text-[#1C2421]">Priority Insurance & Audit Actions</h2>
              <p className="text-xs text-[#5A6662]">
                Denials and overcharges ready for one-click appeal or receipt verification
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('auditor')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#2D5A4C] hover:underline"
            >
              Open Auditor
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#E5E2DC]">
            {activeActionClaims.map((claim) => (
              <div key={claim.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-[#5A6662]">
                    <FileWarning className="h-3.5 w-3.5 shrink-0 text-[#DC2626]" />
                    <span className="font-medium text-[#DC2626]">{claim.status}</span>
                    <span aria-hidden="true">·</span>
                    <span>{claim.insurer}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{formatShortDate(claim.serviceDate)}</span>
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-[#1C2421]">{claim.provider}</div>
                  <div className="mt-0.5 text-xs text-[#5A6662]">
                    {claim.errors[0]?.title || claim.denialReason}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] text-[#5A6662]">Est. Recovery</div>
                    <div className="font-mono text-sm font-semibold text-[#16A34A] tabular-nums">
                      {formatCurrency(claim.potentialSavings)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectClaim(claim);
                      onNavigate('auditor');
                    }}
                    className="whitespace-nowrap rounded-lg border border-[#E5E2DC] px-3 py-1.5 text-xs font-medium text-[#1C2421] transition-colors hover:bg-[#F1EFEA]"
                  >
                    {claim.appealLetter ? 'Review Appeal' : 'Draft Appeal'}
                  </button>
                </div>
              </div>
            ))}

            {missingDocExpenses.map((exp) => (
              <div key={exp.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-[#5A6662]">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#D97706]" />
                    <span className="font-medium text-[#D97706]">Medicaid Proof Needed</span>
                    <span aria-hidden="true">·</span>
                    <span>{exp.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{formatShortDate(exp.expenseDate)}</span>
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-[#1C2421]">{exp.vendor}</div>
                  <div className="mt-0.5 text-xs text-[#5A6662]">{exp.taxNotes}</div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="font-mono text-sm font-semibold text-[#1C2421] tabular-nums">
                    {formatCurrency(exp.amount)}
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('vault')}
                    className="whitespace-nowrap rounded-lg border border-[#E5E2DC] px-3 py-1.5 text-xs font-medium text-[#1C2421] transition-colors hover:bg-[#F1EFEA]"
                  >
                    Verify in Vault
                  </button>
                </div>
              </div>
            ))}

            {activeActionClaims.length === 0 && missingDocExpenses.length === 0 && (
              <div className="flex items-center gap-3 py-8 text-sm text-[#5A6662]">
                <CheckCircle2 className="h-5 w-5 text-[#16A34A]" />
                <span>All flagged insurance claims and Medicaid receipts are up to date.</span>
              </div>
            )}
          </div>
        </div>

        {/* Sibling Split Snapshot */}
        <div className="rounded-xl border border-[#E5E2DC] bg-white p-6 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-4">
            <div>
              <h2 className="text-base font-semibold text-[#1C2421]">Sibling Split & Settlement</h2>
              <p className="text-xs text-[#5A6662]">Custom cash ratio accounting for unpaid care hours</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ledger')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#2D5A4C] hover:underline"
            >
              Manage Ledger
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {members.map((m) => {
              const bal = balances.find((b) => b.memberId === m.id);
              const net = bal?.netBalance ?? 0;
              return (
                <div key={m.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={m.avatarUrl}
                      alt={m.name}
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 shrink-0 rounded-full border border-[#E5E2DC] object-cover"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[#1C2421]">{m.name}</div>
                      <div className="text-xs text-[#5A6662]">
                        {m.roleLabel} · {m.splitPercentage}% share
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono text-sm font-semibold tabular-nums ${
                        net > 0.01 ? 'text-[#16A34A]' : net < -0.01 ? 'text-[#D97706]' : 'text-[#5A6662]'
                      }`}
                    >
                      {net > 0.01 ? `+${formatCurrency(net)}` : formatCurrency(net)}
                    </div>
                    <div className="text-[11px] text-[#5A6662]">
                      Paid {formatCurrency(bal?.paidTotal ?? 0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-[#E5E2DC] pt-4">
            <div className="flex items-center gap-2 text-xs font-medium text-[#1C2421]">
              <Scale className="h-3.5 w-3.5 text-[#2D5A4C]" />
              <span>Suggested Monthly Transfers</span>
            </div>
            {suggestedTransfers.length === 0 ? (
              <p className="mt-2 text-xs text-[#5A6662]">All sibling balances are currently settled.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {suggestedTransfers.map((t, idx) => {
                  const from = memberMap.get(t.fromMemberId);
                  const to = memberMap.get(t.toMemberId);
                  return (
                    <div
                      key={`${t.fromMemberId}-${t.toMemberId}-${idx}`}
                      className="flex items-center justify-between rounded-lg bg-[#F8F7F4] px-3 py-2 text-xs"
                    >
                      <span className="text-[#1C2421]">
                        {from?.name} → {to?.name}
                      </span>
                      <span className="font-mono font-semibold text-[#1C2421] tabular-nums">
                        {formatCurrency(t.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

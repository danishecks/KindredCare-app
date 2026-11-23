import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  FileCheck2,
  Loader2,
  Printer,
  Search,
  ShieldAlert,
  Sparkles,
  Upload,
} from 'lucide-react';
import type { ClaimStatus, FamilyMember, MedicalClaim } from '../types';
import { getInsurerTimeline } from '../utils/appealTimeline';
import { formatCurrency, formatShortDate } from '../utils/format';
import { AppealProgressTracker } from './AppealProgressTracker';

interface EobAuditorViewProps {
  claims: MedicalClaim[];
  selectedClaimId: string | null;
  activeMember: FamilyMember;
  onSelectClaimId: (id: string) => void;
  onOpenAuditModal: () => void;
  onRefreshWorkspace: () => Promise<void>;
}

const STATUS_FILTERS: Array<'All' | ClaimStatus> = [
  'All',
  'Flagged',
  'Appeal Drafted',
  'Submitted',
  'Under Review',
  'Overturned',
  'Denied',
];

export const EobAuditorView: React.FC<EobAuditorViewProps> = ({
  claims,
  selectedClaimId,
  activeMember,
  onSelectClaimId,
  onOpenAuditModal,
  onRefreshWorkspace,
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | ClaimStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingAppeal, setIsGeneratingAppeal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [appealDraft, setAppealDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [conciergeRequested, setConciergeRequested] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredClaims = claims.filter((c) => {
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.provider.toLowerCase().includes(q) ||
      c.insurer.toLowerCase().includes(q) ||
      c.policyNumber.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const activeClaim =
    filteredClaims.find((c) => c.id === selectedClaimId) ??
    claims.find((c) => c.id === selectedClaimId) ??
    filteredClaims[0] ??
    claims[0] ??
    null;

  React.useEffect(() => {
    setAppealDraft(activeClaim?.appealLetter ?? '');
    setErrorMsg(null);
  }, [activeClaim?.id, activeClaim?.appealLetter]);

  const handleGenerateAppeal = async () => {
    if (!activeClaim) return;
    setErrorMsg(null);
    setIsGeneratingAppeal(true);
    try {
      const res = await fetch('/api/ai/generate-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: activeClaim.id,
          representativeName: activeMember.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to draft appeal letter');
      }
      setAppealDraft(data.claim.appealLetter);
      await onRefreshWorkspace();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to generate appeal letter');
    } finally {
      setIsGeneratingAppeal(false);
    }
  };

  const handleUpdateClaim = async (updates: {
    status?: ClaimStatus;
    appealLetter?: string;
    submittedAt?: string | null;
  }) => {
    if (!activeClaim) return;
    setErrorMsg(null);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/claims/${activeClaim.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update claim');
      }
      await onRefreshWorkspace();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update claim');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLetter = async () => {
    const text = appealDraft ?? activeClaim?.appealLetter ?? '';
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusTextColor = (status: ClaimStatus) => {
    switch (status) {
      case 'Flagged':
      case 'Denied':
        return 'text-[#DC2626]';
      case 'Appeal Drafted':
        return 'text-[#D97706]';
      case 'Submitted':
      case 'Under Review':
        return 'text-[#2D5A4C]';
      case 'Overturned':
      case 'Cleared':
        return 'text-[#16A34A]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#1C2421]">
            AI Explanation of Benefits & Bill Auditor
          </h1>
          <p className="mt-1 text-sm text-[#5A6662]">
            Detects duplicate CPT codes, NCCI unbundling, coding mismatches, and No Surprises Act balance billing
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAuditModal}
          className="inline-flex items-center gap-2 self-start whitespace-nowrap rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#23473C]"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Bill or EOB
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#E5E2DC] bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#F1EFEA] p-1">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-white text-[#1C2421] shadow-xs'
                  : 'text-[#5A6662] hover:text-[#1C2421]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#5A6662]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by provider or insurer..."
            className="w-full rounded-lg border border-[#E5E2DC] bg-[#F8F7F4] py-1.5 pr-3 pl-8 text-xs text-[#1C2421] focus:border-[#2D5A4C] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Split Master-Detail Workspace */}
      {filteredClaims.length === 0 ? (
        <div className="rounded-xl border border-[#E5E2DC] bg-white p-12 text-center">
          <p className="text-sm font-medium text-[#1C2421]">No matching medical bills or EOBs found</p>
          <p className="mt-1 text-xs text-[#5A6662]">
            Adjust your status filter or upload a hospital bill, EOB, or Medicare Summary Notice to audit.
          </p>
          <button
            type="button"
            onClick={onOpenAuditModal}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white hover:bg-[#23473C]"
          >
            Audit First Bill
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Claims Queue */}
          <div className="rounded-xl border border-[#E5E2DC] bg-white lg:col-span-4">
            <div className="border-b border-[#E5E2DC] px-4 py-3 text-xs font-semibold text-[#1C2421]">
              Audited Claims ({filteredClaims.length})
            </div>
            <div className="divide-y divide-[#E5E2DC]">
              {filteredClaims.map((claim) => {
                const isSelected = activeClaim?.id === claim.id;
                const claimTimeline = getInsurerTimeline(claim);
                return (
                  <button
                    key={claim.id}
                    type="button"
                    onClick={() => onSelectClaimId(claim.id)}
                    className={`w-full px-4 py-3.5 text-left transition-colors ${
                      isSelected ? 'bg-[#EEF4F1]' : 'hover:bg-[#F8F7F4]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className={`font-semibold ${statusTextColor(claim.status)}`}>
                        {claim.status}
                      </span>
                      <span className="font-mono text-[#5A6662] tabular-nums">
                        {formatShortDate(claim.serviceDate)}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-[#1C2421]">
                      {claim.provider}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-[#5A6662]">
                      {claim.insurer} · {claim.documentType}
                    </div>
                    {(claim.status === 'Submitted' || claim.status === 'Under Review') &&
                      claimTimeline.submittedDate && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between font-mono text-[11px] text-[#5A6662] tabular-nums">
                            <span>
                              Day {claimTimeline.elapsedDays}/{claimTimeline.slaDays}
                            </span>
                            <span>
                              Est. {formatShortDate(claimTimeline.estimatedDecisionDate || '')}
                            </span>
                          </div>
                          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#E5E2DC]">
                            <div
                              className="h-full bg-[#2D5A4C]"
                              style={{ width: `${claimTimeline.timelineProgressPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-[#5A6662]">
                        {claim.errors.length} {claim.errors.length === 1 ? 'issue' : 'issues'} detected
                      </span>
                      <span
                        className={`font-mono font-semibold tabular-nums ${
                          claim.status === 'Denied' ? 'text-[#DC2626]' : 'text-[#16A34A]'
                        }`}
                      >
                        {claim.potentialSavings > 0
                          ? claim.status === 'Denied'
                            ? `Denied ${formatCurrency(claim.potentialSavings)}`
                            : `Save ${formatCurrency(claim.potentialSavings)}`
                          : 'Verified'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Claim Detail & Appeal Studio */}
          {activeClaim && (
            <div className="space-y-6 lg:col-span-8">
              <AppealProgressTracker
                claim={activeClaim}
                isSaving={isSaving}
                onUpdateClaim={handleUpdateClaim}
              />

              <div className="rounded-xl border border-[#E5E2DC] bg-white p-6">
                <div className="flex flex-col justify-between gap-4 border-b border-[#E5E2DC] pb-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A6662]">
                      <span className={`font-semibold ${statusTextColor(activeClaim.status)}`}>
                        {activeClaim.status}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{activeClaim.documentType}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{activeClaim.policyNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatShortDate(activeClaim.serviceDate)}</span>
                    </div>
                    <h2 className="mt-1.5 text-xl font-semibold text-[#1C2421]">{activeClaim.provider}</h2>
                    <p className="text-xs text-[#5A6662]">
                      Insurer: {activeClaim.insurer} · Patient: {activeClaim.patientName}
                    </p>
                  </div>
                </div>

                {/* 4-Metric Financial Row */}
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <div className="text-xs text-[#5A6662]">Total Billed</div>
                    <div className="mt-1 font-mono text-base font-semibold text-[#1C2421] tabular-nums">
                      {formatCurrency(activeClaim.billedAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#5A6662]">Plan Allowed</div>
                    <div className="mt-1 font-mono text-base font-semibold text-[#1C2421] tabular-nums">
                      {formatCurrency(activeClaim.allowedAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#5A6662]">Patient Liability</div>
                    <div className="mt-1 font-mono text-base font-semibold text-[#DC2626] tabular-nums">
                      {formatCurrency(activeClaim.patientResponsibility)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#5A6662]">Audited Recovery</div>
                    <div className="mt-1 font-mono text-base font-semibold text-[#16A34A] tabular-nums">
                      {formatCurrency(activeClaim.potentialSavings)}
                    </div>
                  </div>
                </div>

                {/* Detected Errors */}
                <div className="mt-6 border-t border-[#E5E2DC] pt-5">
                  <h3 className="text-sm font-semibold text-[#1C2421]">
                    Audited Billing Errors & Policy Violations ({activeClaim.errors.length})
                  </h3>
                  {activeClaim.errors.length === 0 ? (
                    <p className="mt-2 text-xs text-[#5A6662]">
                      No duplicate charges, unbundled CPT edits, or No Surprises Act violations detected.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {activeClaim.errors.map((err, idx) => (
                        <div
                          key={`${err.errorType}-${idx}`}
                          className="rounded-lg border border-[#E5E2DC] bg-[#F8F7F4] p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-[#DC2626]">
                              {err.severity === 'high' ? (
                                <ShieldAlert className="h-4 w-4 shrink-0" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 shrink-0 text-[#D97706]" />
                              )}
                              <span className={err.severity === 'medium' ? 'text-[#D97706]' : ''}>
                                {err.errorType}
                              </span>
                              <span aria-hidden="true" className="text-[#5A6662]">·</span>
                              <span className="font-normal text-[#5A6662]">{err.policyCitation}</span>
                            </div>
                            <span className="font-mono text-xs font-semibold text-[#16A34A] tabular-nums">
                              Est. Overcharge: {formatCurrency(err.estimatedOvercharge)}
                            </span>
                          </div>
                          <div className="mt-1.5 text-sm font-semibold text-[#1C2421]">{err.title}</div>
                          <p className="mt-1 text-xs leading-relaxed text-[#5A6662]">{err.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CPT Line Items */}
                <div className="mt-6 border-t border-[#E5E2DC] pt-5">
                  <h3 className="text-sm font-semibold text-[#1C2421]">Extracted CPT / HCPCS Line Items</h3>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E5E2DC] text-[#5A6662]">
                          <th className="py-2 pr-3 font-medium">Code</th>
                          <th className="py-2 pr-3 font-medium">Procedure Description</th>
                          <th className="py-2 px-3 text-right font-medium">Billed</th>
                          <th className="py-2 px-3 text-right font-medium">Allowed</th>
                          <th className="py-2 pl-3 text-right font-medium">Audit State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E2DC]">
                        {activeClaim.cptCodes.map((line, i) => (
                          <tr key={`${line.code}-${i}`} className="hover:bg-[#F8F7F4]">
                            <td className="py-2.5 pr-3 font-mono font-medium text-[#1C2421]">{line.code}</td>
                            <td className="py-2.5 pr-3 text-[#1C2421]">{line.description}</td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#1C2421]">
                              {formatCurrency(line.billed)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#5A6662]">
                              {formatCurrency(line.allowed)}
                            </td>
                            <td className="py-2.5 pl-3 text-right font-medium">
                              <span
                                className={
                                  line.status === 'denied'
                                    ? 'text-[#DC2626]'
                                    : line.status === 'flagged'
                                    ? 'text-[#D97706]'
                                    : 'text-[#16A34A]'
                                }
                              >
                                {line.status === 'denied'
                                  ? 'Denied'
                                  : line.status === 'flagged'
                                  ? 'Flagged Error'
                                  : 'Valid'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* One-Click Appeal Studio */}
              <div className="rounded-xl border border-[#E5E2DC] bg-white p-6">
                <div className="flex flex-col justify-between gap-4 border-b border-[#E5E2DC] pb-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-base font-semibold text-[#1C2421]">One-Click Insurance Appeal Studio</h3>
                    <p className="text-xs text-[#5A6662]">
                      Drafts appeal letters based on your insurer's published medical policy and federal billing protections
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isGeneratingAppeal}
                      onClick={handleGenerateAppeal}
                      className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#23473C] disabled:opacity-50"
                    >
                      {isGeneratingAppeal ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {isGeneratingAppeal
                        ? 'Drafting Policy-Cited Appeal...'
                        : activeClaim.appealLetter
                        ? 'Regenerate Appeal Draft'
                        : 'Generate Policy-Cited Appeal'}
                    </button>
                  </div>
                </div>

                {appealDraft ? (
                  <div className="mt-4 space-y-4">
                    <textarea
                      rows={14}
                      value={appealDraft}
                      onChange={(e) => setAppealDraft(e.target.value)}
                      className="w-full rounded-lg border border-[#E5E2DC] bg-[#F8F7F4] p-4 font-serif text-sm leading-relaxed text-[#1C2421] focus:border-[#2D5A4C] focus:bg-white focus:outline-none"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyLetter}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E2DC] px-3 py-1.5 text-xs font-medium text-[#1C2421] hover:bg-[#F1EFEA]"
                        >
                          {copied ? <Check className="h-3.5 w-3.5 text-[#16A34A]" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied ? 'Copied to Clipboard' : 'Copy for Portal / Fax'}
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E2DC] px-3 py-1.5 text-xs font-medium text-[#1C2421] hover:bg-[#F1EFEA]"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Print / Save PDF
                        </button>
                        <button
                          type="button"
                          disabled={isSaving || appealDraft === activeClaim.appealLetter}
                          onClick={() => handleUpdateClaim({ appealLetter: appealDraft })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#2D5A4C] px-3 py-1.5 text-xs font-medium text-[#2D5A4C] hover:bg-[#EEF4F1] disabled:opacity-40"
                        >
                          <FileCheck2 className="h-3.5 w-3.5" />
                          Save Edits
                        </button>
                      </div>

                      {activeClaim.billedAmount >= 2500 && (
                        <button
                          type="button"
                          onClick={() => setConciergeRequested(activeClaim.id)}
                          className="whitespace-nowrap rounded-lg border border-[#E5E2DC] bg-[#F8F7F4] px-3 py-1.5 text-xs font-medium text-[#1C2421] hover:bg-[#F1EFEA]"
                        >
                          {conciergeRequested === activeClaim.id
                            ? 'Concierge Advocate Packet Queued ($49)'
                            : 'Escalate via $49 Concierge Advocate Packet'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-[#5A6662]">
                      No appeal letter drafted yet for this claim. Click above to generate a policy-cited draft ready for fax, mail, or insurer portal upload.
                    </p>
                  </div>
                )}

                <p className="mt-4 border-t border-[#E5E2DC] pt-3 text-[11px] text-[#5A6662]">
                  Administrative Drafting Notice: KindredCare drafts appeal letters based on published insurer medical policies and federal billing protections for review by the member or authorized representative. This tool does not provide legal or medical advice.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

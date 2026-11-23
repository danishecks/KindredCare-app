import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileWarning,
  Send,
  ShieldAlert,
} from 'lucide-react';
import type { ClaimStatus, MedicalClaim } from '../types';
import { getInsurerTimeline } from '../utils/appealTimeline';
import { formatCurrency, formatShortDate } from '../utils/format';

interface AppealProgressTrackerProps {
  claim: MedicalClaim;
  isSaving: boolean;
  onUpdateClaim: (updates: { status?: ClaimStatus; submittedAt?: string | null }) => Promise<void>;
}

const STAGE_ORDER: Record<ClaimStatus, number> = {
  Flagged: 0,
  'Appeal Drafted': 1,
  Submitted: 2,
  'Under Review': 3,
  Overturned: 4,
  Denied: 4,
  Cleared: 4,
};

export const AppealProgressTracker: React.FC<AppealProgressTrackerProps> = ({
  claim,
  isSaving,
  onUpdateClaim,
}) => {
  const timeline = getInsurerTimeline(claim);
  const [submissionDateInput, setSubmissionDateInput] = useState(
    claim.submittedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10)
  );

  React.useEffect(() => {
    setSubmissionDateInput(
      claim.submittedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10)
    );
  }, [claim.id, claim.submittedAt]);

  if (claim.status === 'Cleared') {
    return (
      <div className="rounded-xl border border-[#E5E2DC] bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[#16A34A]" />
            <div>
              <h3 className="text-sm font-semibold text-[#1C2421]">Claim Verified — No Appeal Required</h3>
              <p className="text-xs text-[#5A6662]">
                {claim.insurer} line items passed audit checks with no overcharges detected.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-medium text-[#16A34A]">Cleared</span>
        </div>
      </div>
    );
  }

  const currentIndex = STAGE_ORDER[claim.status] ?? 0;
  const isOutcomeOverturned = claim.status === 'Overturned';
  const isOutcomeDenied = claim.status === 'Denied';

  const steps = [
    {
      key: 'flagged',
      label: 'Audit Flagged',
      sub: formatShortDate(claim.createdAt),
      icon: FileWarning,
    },
    {
      key: 'drafted',
      label: 'Appeal Drafted',
      sub: claim.appealLetter ? 'Letter ready' : 'Pending draft',
      icon: FileCheck2,
    },
    {
      key: 'submitted',
      label: 'Submitted',
      sub: timeline.submittedDate ? formatShortDate(timeline.submittedDate) : 'Not filed',
      icon: Send,
    },
    {
      key: 'review',
      label: 'Under Review',
      sub:
        claim.status === 'Under Review'
          ? `Day ${timeline.elapsedDays} of ${timeline.slaDays}`
          : currentIndex > 3
          ? 'Completed'
          : 'Insurer queue',
      icon: Clock,
    },
    {
      key: 'outcome',
      label: isOutcomeDenied ? 'Denied' : isOutcomeOverturned ? 'Overturned' : 'Decision',
      sub:
        (isOutcomeOverturned || isOutcomeDenied) && claim.decisionAt
          ? formatShortDate(claim.decisionAt)
          : timeline.estimatedDecisionDate
          ? `Est. ${formatShortDate(timeline.estimatedDecisionDate)}`
          : `~${timeline.typicalDays}d SLA`,
      icon: isOutcomeDenied ? AlertCircle : CheckCircle2,
    },
  ];

  const fillWidthPct = Math.min(100, Math.round((currentIndex / 4) * 100));

  return (
    <div className="rounded-xl border border-[#E5E2DC] bg-white p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-[#E5E2DC] pb-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[#1C2421]">
              Appeal Progress & Insurer Recovery Timeline
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-[#5A6662]">
            {timeline.insurerGroup} · {timeline.regulatoryRule}
          </p>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <div className="text-[11px] text-[#5A6662]">
            {isOutcomeOverturned
              ? 'Recovered Savings'
              : isOutcomeDenied
              ? 'Disputed Amount (Denied)'
              : 'Estimated Recovery'}
          </div>
          <div
            className={`font-mono text-lg font-semibold tabular-nums ${
              isOutcomeDenied ? 'text-[#DC2626]' : 'text-[#16A34A]'
            }`}
          >
            {formatCurrency(claim.potentialSavings)}
          </div>
        </div>
      </div>

      {/* 5-Stage Horizontal Visual Stepper */}
      <div className="relative pt-1">
        {/* Connector Track (hidden on tiny screens, shown sm+) */}
        <div
          aria-hidden="true"
          className="absolute top-5 right-10 left-10 hidden h-0.5 bg-[#E5E2DC] sm:block"
        >
          <div
            className={`h-full transition-all duration-200 ${
              isOutcomeDenied
                ? 'bg-[#DC2626]'
                : isOutcomeOverturned
                ? 'bg-[#16A34A]'
                : 'bg-[#2D5A4C]'
            }`}
            style={{ width: `${fillWidthPct}%` }}
          />
        </div>

        <div className="relative grid grid-cols-2 gap-4 sm:grid-cols-5 sm:gap-2">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentIndex || (idx === 4 && (isOutcomeOverturned || isOutcomeDenied));
            const isCurrent = idx === currentIndex && !(idx === 4 && (isOutcomeOverturned || isOutcomeDenied));
            const isLastDenied = idx === 4 && isOutcomeDenied;
            const isLastOverturned = idx === 4 && isOutcomeOverturned;
            const StepIcon = step.icon;

            let circleClasses = 'border-[#E5E2DC] bg-white text-[#5A6662]';
            if (isLastDenied) {
              circleClasses = 'border-[#DC2626] bg-[#DC2626] text-white';
            } else if (isLastOverturned) {
              circleClasses = 'border-[#16A34A] bg-[#16A34A] text-white';
            } else if (isCompleted) {
              circleClasses = 'border-[#2D5A4C] bg-[#2D5A4C] text-white';
            } else if (isCurrent) {
              circleClasses = 'border-[#2D5A4C] bg-[#EEF4F1] text-[#2D5A4C] ring-4 ring-[#EEF4F1]';
            }

            return (
              <div key={step.key} className="flex flex-col items-start sm:items-center sm:text-center">
                <div
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${circleClasses}`}
                >
                  {isCompleted && !isLastDenied && !isLastOverturned ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={`mt-2 text-xs font-semibold ${
                    isLastDenied
                      ? 'text-[#DC2626]'
                      : isLastOverturned
                      ? 'text-[#16A34A]'
                      : isCurrent || isCompleted
                      ? 'text-[#1C2421]'
                      : 'text-[#5A6662]'
                  }`}
                >
                  {step.label}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-[#5A6662] tabular-nums">
                  {step.sub}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insurer SLA & Recovery Timeline Box */}
      <div className="rounded-lg border border-[#E5E2DC] bg-[#F8F7F4] p-4 space-y-3">
        {(claim.status === 'Submitted' || claim.status === 'Under Review') && timeline.submittedDate && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="font-semibold text-[#1C2421]">
                Insurer SLA Countdown · Day {timeline.elapsedDays} of {timeline.slaDays}
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-[#5A6662] tabular-nums">
                <span>
                  Est. Decision:{' '}
                  <strong className="text-[#1C2421]">
                    {timeline.estimatedDecisionDate
                      ? formatShortDate(timeline.estimatedDecisionDate)
                      : '—'}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Statutory Deadline:{' '}
                  <strong className="text-[#1C2421]">
                    {timeline.statutoryDeadlineDate
                      ? formatShortDate(timeline.statutoryDeadlineDate)
                      : '—'}
                  </strong>
                </span>
              </div>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5E2DC]">
              <div
                className="h-full bg-[#2D5A4C] transition-all duration-200"
                style={{ width: `${timeline.timelineProgressPct}%` }}
              />
            </div>

            <div className="flex flex-col justify-between gap-3 pt-1 sm:flex-row sm:items-center">
              <p className="text-xs text-[#5A6662]">
                {timeline.daysRemaining > 0
                  ? `${timeline.daysRemaining} calendar days remaining in ${claim.insurer}'s determination window. ${timeline.historicalOverturnNote}.`
                  : `Statutory ${timeline.slaDays}-day deadline reached. Call ${claim.insurer} Appeals to request immediate escalation.`}
              </p>

              <div className="flex items-center gap-2 shrink-0">
                <Calendar className="h-3.5 w-3.5 text-[#5A6662]" />
                <label htmlFor="submitted-date-edit" className="text-[11px] text-[#5A6662]">
                  Filed:
                </label>
                <input
                  id="submitted-date-edit"
                  type="date"
                  value={submissionDateInput}
                  disabled={isSaving}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSubmissionDateInput(val);
                    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                      void onUpdateClaim({ submittedAt: val });
                    }
                  }}
                  className="rounded-md border border-[#E5E2DC] bg-white px-2 py-1 font-mono text-[11px] text-[#1C2421] focus:border-[#2D5A4C] focus:outline-none"
                />
              </div>
            </div>
          </>
        )}

        {(claim.status === 'Flagged' || claim.status === 'Appeal Drafted') && (
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="text-xs font-semibold text-[#1C2421]">
                Projected Turnaround: ~{timeline.typicalDays} days ({timeline.slaDays}-day statutory max)
              </div>
              <p className="mt-0.5 text-xs text-[#5A6662]">
                {timeline.historicalOverturnNote}. Log your submission date once faxed, mailed, or uploaded to {claim.insurer}.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="date"
                aria-label="Appeal submission date"
                value={submissionDateInput}
                onChange={(e) => setSubmissionDateInput(e.target.value)}
                className="rounded-lg border border-[#E5E2DC] bg-white px-2.5 py-1.5 font-mono text-xs text-[#1C2421] focus:border-[#2D5A4C] focus:outline-none"
              />
              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  void onUpdateClaim({
                    status: 'Submitted',
                    submittedAt: submissionDateInput,
                  })
                }
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#2D5A4C] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#23473C] disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Log Submission
              </button>
            </div>
          </div>
        )}

        {isOutcomeOverturned && (
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5 text-xs text-[#1C2421]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" />
              <span>
                Appeal overturned on{' '}
                <strong className="font-mono">{formatShortDate(claim.decisionAt || '')}</strong> ·{' '}
                <strong className="font-mono text-[#16A34A]">{formatCurrency(claim.potentialSavings)}</strong>{' '}
                recovered in{' '}
                <strong className="font-mono tabular-nums">{timeline.elapsedDays} days</strong> (within{' '}
                {timeline.slaDays}-day insurer SLA).
              </span>
            </div>
          </div>
        )}

        {isOutcomeDenied && (
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-2.5 text-xs text-[#1C2421]">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
              <div>
                <div className="font-semibold text-[#DC2626]">
                  Level 1 Appeal Denied on {formatShortDate(claim.decisionAt || '')}
                </div>
                <p className="mt-0.5 text-[#5A6662]">
                  Eligible for Level 2 External Independent Review (QIC / State IRO) within 60 days of denial notice.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void onUpdateClaim({ status: 'Under Review' })}
              className="whitespace-nowrap rounded-lg border border-[#E5E2DC] bg-white px-3 py-1.5 text-xs font-medium text-[#1C2421] hover:bg-[#F1EFEA]"
            >
              Escalate to Level 2 Review
            </button>
          </div>
        )}
      </div>

      {/* Interactive Status Progression Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <span className="text-xs text-[#5A6662]">Update Appeal Stage:</span>
        <div className="flex flex-wrap items-center gap-2">
          {(['Submitted', 'Under Review', 'Overturned', 'Denied'] as ClaimStatus[]).map((targetStatus) => {
            const isCurrent = claim.status === targetStatus;
            return (
              <button
                key={targetStatus}
                type="button"
                disabled={isSaving || isCurrent}
                onClick={() =>
                  void onUpdateClaim({
                    status: targetStatus,
                    ...(targetStatus === 'Submitted' || targetStatus === 'Under Review'
                      ? { submittedAt: claim.submittedAt || submissionDateInput }
                      : {}),
                  })
                }
                className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isCurrent
                    ? targetStatus === 'Overturned'
                      ? 'border-[#16A34A] bg-[#16A34A]/10 text-[#16A34A]'
                      : targetStatus === 'Denied'
                      ? 'border-[#DC2626] bg-red-50 text-[#DC2626]'
                      : 'border-[#2D5A4C] bg-[#EEF4F1] text-[#2D5A4C]'
                    : 'border-[#E5E2DC] bg-white text-[#1C2421] hover:bg-[#F1EFEA]'
                } disabled:cursor-default`}
              >
                {targetStatus}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

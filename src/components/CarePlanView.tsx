import React, { useState } from 'react';
import { Briefcase, Check, Lock, ShieldCheck } from 'lucide-react';
import type { WorkspaceSnapshot } from '../types';

interface CarePlanViewProps {
  workspace: WorkspaceSnapshot;
  onRefreshWorkspace: () => Promise<void>;
}

export const CarePlanView: React.FC<CarePlanViewProps> = ({
  workspace,
  onRefreshWorkspace,
}) => {
  const { settings, members } = workspace;
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePlanChange = async (planTier: 'free' | 'family_care') => {
    setIsUpdating(true);
    try {
      await fetch('/api/settings/plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier }),
      });
      await onRefreshWorkspace();
    } finally {
      setIsUpdating(false);
    }
  };

  const perSiblingMonthly = (19.99 / Math.max(1, members.length)).toFixed(2);
  const perSiblingAnnual = (179 / Math.max(1, members.length)).toFixed(2);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#1C2421]">
            Family Care Plan, Advisors & Compliance
          </h1>
          <p className="mt-1 text-sm text-[#5A6662]">
            Transparent pricing built to split across siblings, plus HIPAA-conscious data & drafting boundaries
          </p>
        </div>

        <div className="inline-flex self-start rounded-lg bg-[#F1EFEA] p-1">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              billingCycle === 'monthly' ? 'bg-white text-[#1C2421] shadow-xs' : 'text-[#5A6662]'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              billingCycle === 'annual' ? 'bg-white text-[#1C2421] shadow-xs' : 'text-[#5A6662]'
            }`}
          >
            Annual (Save 25%)
          </button>
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col justify-between rounded-xl border border-[#E5E2DC] bg-white p-6">
          <div>
            <div className="text-xs font-medium text-[#5A6662]">For Starting Care Teams</div>
            <h2 className="mt-1 text-lg font-semibold text-[#1C2421]">Free Starter</h2>
            <div className="mt-3 font-mono text-2xl font-semibold text-[#1C2421] tabular-nums">
              $0 <span className="font-sans text-xs font-normal text-[#5A6662]">/ month</span>
            </div>
            <ul className="mt-5 space-y-2.5 text-xs text-[#1C2421]">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                <span>Expense logging for up to 2 family members</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                <span>1 complimentary AI EOB & medical bill audit scan</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                <span>Sample policy-cited appeal letter preview</span>
              </li>
            </ul>
          </div>
          <button
            type="button"
            disabled={isUpdating || settings.planTier === 'free'}
            onClick={() => handlePlanChange('free')}
            className="mt-6 w-full rounded-lg border border-[#E5E2DC] px-4 py-2 text-xs font-medium text-[#1C2421] hover:bg-[#F1EFEA] disabled:opacity-50"
          >
            {settings.planTier === 'free' ? 'Current Plan' : 'Switch to Free Starter'}
          </button>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-[#2D5A4C] bg-white p-6">
          <div>
            <div className="text-xs font-medium text-[#2D5A4C]">For Multi-Sibling Care Coordination</div>
            <h2 className="mt-1 text-lg font-semibold text-[#1C2421]">Family Care Plan</h2>
            <div className="mt-3 font-mono text-2xl font-semibold text-[#1C2421] tabular-nums">
              {billingCycle === 'monthly' ? '$19.99' : '$179.00'}{' '}
              <span className="font-sans text-xs font-normal text-[#5A6662]">
                / {billingCycle === 'monthly' ? 'month' : 'year'} (~$
                {billingCycle === 'monthly' ? perSiblingMonthly : perSiblingAnnual} per sibling)
              </span>
            </div>
            <ul className="mt-5 space-y-2.5 text-xs text-[#1C2421]">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                <span>Unlimited family members & custom care-hour split ratios</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                <span>Unlimited AI EOB audits & policy-cited appeal letters</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                <span>Automated monthly sibling settlements (Venmo, Zelle, ACH)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                <span>IRS Pub 502, FSA/HSA & 5-year Medicaid look-back exports</span>
              </li>
            </ul>
          </div>
          <button
            type="button"
            disabled={isUpdating || settings.planTier === 'family_care'}
            onClick={() => handlePlanChange('family_care')}
            className="mt-6 w-full rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white hover:bg-[#23473C] disabled:opacity-60"
          >
            {settings.planTier === 'family_care' ? 'Active Family Care Plan' : 'Activate Family Care Plan'}
          </button>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-[#E5E2DC] bg-white p-6">
          <div>
            <div className="text-xs font-medium text-[#5A6662]">High-Dollar Denials & HR Channels</div>
            <h2 className="mt-1 text-lg font-semibold text-[#1C2421]">Concierge & Employer Benefit</h2>
            <div className="mt-3 font-mono text-2xl font-semibold text-[#1C2421] tabular-nums">
              $49.00 <span className="font-sans text-xs font-normal text-[#5A6662]">/ complex appeal packet</span>
            </div>
            <ul className="mt-5 space-y-2.5 text-xs text-[#1C2421]">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                <span>Human patient advocate review for $5,000+ hospital or rehab denials</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                <span>Elder Law Attorney & Certified Financial Planner (CFP) shared packet access</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                <span>B2B2C Enterprise HR Elder Care Financial Benefit integration</span>
              </li>
            </ul>
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-lg bg-[#F8F7F4] px-3 py-2.5 text-xs text-[#5A6662]">
            <Briefcase className="h-4 w-4 shrink-0 text-[#2D5A4C]" />
            <span>Trigger Concierge Escalation directly on any claim ≥ $2,500 in the EOB Auditor.</span>
          </div>
        </div>
      </div>

      {/* Compliance & Privacy Guardrails */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-[#E5E2DC] bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1C2421]">
            <Lock className="h-4 w-4 text-[#2D5A4C]" />
            <span>HIPAA-Conscious PHI & Server Boundary</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#5A6662]">
            Medical bills and EOBs constitute Protected Health Information (PHI). KindredCare processes multimodal document extractions strictly on the server side with zero model-training retention and parameterized local database storage. Production cloud deployments require encrypted object storage and signed Business Associate Agreements (BAAs).
          </p>
        </div>

        <div className="rounded-xl border border-[#E5E2DC] bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1C2421]">
            <ShieldCheck className="h-4 w-4 text-[#2D5A4C]" />
            <span>Administrative Drafting Scope</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#5A6662]">
            KindredCare operates strictly as an administrative billing and documentation assistant—drafting appeal letters grounded in published insurer medical policies, CMS NCCI edits, and federal No Surprises Act provisions. It does not provide medical diagnoses, clinical recommendations, or legal representation.
          </p>
        </div>
      </div>
    </div>
  );
};

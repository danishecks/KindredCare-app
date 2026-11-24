import React, { useState } from 'react';
import { ArrowRight, Check, FileSearch, FolderArchive, Lock, Scale, ShieldCheck } from 'lucide-react';

export type WorkspaceEntryTab = 'overview' | 'auditor' | 'ledger' | 'vault' | 'plan';

interface WebsiteLandingViewProps {
  onLaunchWorkspace: (tab?: WorkspaceEntryTab) => void;
}

interface EditorialPhotoProps {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}

const EditorialPhoto: React.FC<EditorialPhotoProps> = ({ src, alt, fallbackTitle, className }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-xl border border-[#E5E2DC] bg-[#F1EFEA] p-8 text-center ${
          className ?? ''
        }`}
      >
        <ShieldCheck className="h-8 w-8 text-[#2D5A4C]" />
        <p className="mt-3 font-serif text-base font-semibold text-[#1C2421]">{fallbackTitle}</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const WebsiteLandingView: React.FC<WebsiteLandingViewProps> = ({ onLaunchWorkspace }) => {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#1C2421]">
      {/* Top Navigation Bar — strict 3-zone contract */}
      <header className="sticky top-0 z-40 border-b border-[#E5E2DC] bg-[#F8F7F4]/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4 lg:px-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-lg font-bold tracking-tight text-[#1C2421] whitespace-nowrap shrink-0"
          >
            KindredCare
          </a>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav className="hidden items-center gap-7 text-sm font-medium text-[#5A6662] md:flex" aria-label="Website">
            <a
              href="#problem"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('problem');
              }}
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#1C2421] hover:underline hover:underline-offset-4"
            >
              The Challenge
            </a>
            <a
              href="#module-auditor"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('module-auditor');
              }}
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#1C2421] hover:underline hover:underline-offset-4"
            >
              EOB Auditor
            </a>
            <a
              href="#module-ledger"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('module-ledger');
              }}
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#1C2421] hover:underline hover:underline-offset-4"
            >
              Split Ledger
            </a>
            <a
              href="#module-vault"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('module-vault');
              }}
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#1C2421] hover:underline hover:underline-offset-4"
            >
              Tax & Medicaid Vault
            </a>
            <a
              href="#pricing"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('pricing');
              }}
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#1C2421] hover:underline hover:underline-offset-4"
            >
              Pricing
            </a>
          </nav>

          {/* Zone 3: Primary CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onLaunchWorkspace('overview')}
              className="whitespace-nowrap shrink-0 rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#23473C]"
            >
              Launch Workspace
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Split + 4-Column Evidence Strip */}
        <section className="mx-auto max-w-7xl px-6 pt-12 pb-16 lg:px-8 lg:pt-16 lg:pb-20">
          <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
            <div className="flex flex-col justify-center lg:col-span-6">
              <p className="text-xs font-medium text-[#2D5A4C]">
                Care Split & Insurance Appeal Copilot for US Families
              </p>
              <h1
                className="mt-3 font-serif font-semibold tracking-tight text-[#1C2421]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.45rem)', lineHeight: 1.12, textWrap: 'balance' }}
              >
                Stop paying denied medical bills and carrying caregiving costs alone.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[#5A6662]">
                KindredCare audits hospital bills and insurance EOBs for costly billing errors, drafts policy-cited appeal letters in one click, splits shared caregiving costs fairly among siblings, and keeps every IRS and Medicaid spend-down receipt organized.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onLaunchWorkspace('overview')}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#2D5A4C] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#23473C]"
                >
                  Launch Live Workspace
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('module-auditor')}
                  className="whitespace-nowrap rounded-lg border border-[#E5E2DC] bg-white px-5 py-3 text-sm font-medium text-[#1C2421] transition-colors hover:bg-[#F1EFEA]"
                >
                  Walk Through Modules
                </button>
              </div>
              <p className="mt-4 text-xs text-[#5A6662]">
                Includes pre-loaded demo family workspace · No account signup required to explore
              </p>
            </div>

            <div className="lg:col-span-6">
              <EditorialPhoto
                src="/src/assets/images/hero_family_caregiving_1795550388347.jpg"
                alt="Adult sister and brother calmly reviewing caregiving documents and medical bills together at a sunlit oak table"
                fallbackTitle="Family Care Coordination"
                className="h-full min-h-[300px] w-full rounded-xl border border-[#E5E2DC] object-cover"
              />
            </div>
          </div>

          {/* Full-width 4-Column Evidence Strip */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#E5E2DC] bg-white p-5">
              <div className="font-mono text-2xl font-semibold text-[#2D5A4C] tabular-nums">&gt;50%</div>
              <div className="mt-1 text-xs font-semibold text-[#1C2421]">Appealed Denials Overturned</div>
              <p className="mt-1 text-xs text-[#5A6662]">
                Over half of formally appealed US medical denials are reversed in the patient's favor.
              </p>
            </div>
            <div className="rounded-xl border border-[#E5E2DC] bg-white p-5">
              <div className="font-mono text-2xl font-semibold text-[#1C2421] tabular-nums">&lt;1%</div>
              <div className="mt-1 text-xs font-semibold text-[#1C2421]">Claims Actually Appealed</div>
              <p className="mt-1 text-xs text-[#5A6662]">
                Exhausted caregivers pay out-of-pocket instead of spending hours decoding dense paperwork.
              </p>
            </div>
            <div className="rounded-xl border border-[#E5E2DC] bg-white p-5">
              <div className="font-mono text-2xl font-semibold text-[#1C2421] tabular-nums">60 Months</div>
              <div className="mt-1 text-xs font-semibold text-[#1C2421]">Medicaid Look-Back Period</div>
              <p className="mt-1 text-xs text-[#5A6662]">
                Five years of itemized receipts organized cleanly to avoid costly eligibility delays.
              </p>
            </div>
            <div className="rounded-xl border border-[#E5E2DC] bg-white p-5">
              <div className="font-mono text-2xl font-semibold text-[#1C2421] tabular-nums">IRS Pub 502</div>
              <div className="mt-1 text-xs font-semibold text-[#1C2421]">Tax & FSA/HSA Ready</div>
              <p className="mt-1 text-xs text-[#5A6662]">
                Every prescription, grab bar, and home care shift tagged automatically for tax season.
              </p>
            </div>
          </div>
        </section>

        {/* Section 1: The Challenge */}
        <section id="problem" className="border-t border-[#E5E2DC] bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-[#2D5A4C]">Why Families Lose Savings & Peace of Mind</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#1C2421]">
                Physical care is hard enough. Administrative friction breaks families.
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="border-t border-[#E5E2DC] pt-5">
                <div className="font-mono text-xs font-medium text-[#2D5A4C]">01.</div>
                <h3 className="mt-2 text-base font-semibold text-[#1C2421]">The Insurance Denial Trap</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5A6662]">
                  US insurers and Medicare Advantage plans deny tens of millions of claims every year. Caregivers rarely have four hours to fight duplicate CPT codes, unbundled charges, or balance bills—so savings evaporate silently.
                </p>
              </div>
              <div className="border-t border-[#E5E2DC] pt-5">
                <div className="font-mono text-xs font-medium text-[#2D5A4C]">02.</div>
                <h3 className="mt-2 text-base font-semibold text-[#1C2421]">The Invisible Caregiver Tax</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5A6662]">
                  One sibling living nearby absorbs doctor visits, groceries, co-pays, and home safety gear on a personal card while out-of-state siblings remain unaware—creating quiet resentment and awkward money talks.
                </p>
              </div>
              <div className="border-t border-[#E5E2DC] pt-5">
                <div className="font-mono text-xs font-medium text-[#2D5A4C]">03.</div>
                <h3 className="mt-2 text-base font-semibold text-[#1C2421]">Lost Spend-Down & Tax Proof</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5A6662]">
                  Medicaid long-term care requires up to five years of documented transactions, and families miss thousands in IRS Medical Expense Deductions and FSA/HSA reimbursements when receipts sit in shoeboxes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Product Modules Walkthrough */}
        <section className="border-t border-[#E5E2DC] py-16 lg:py-24">
          <div className="mx-auto max-w-7xl space-y-20 px-6 lg:px-8">
            {/* Module 01: AI EOB & Bill Auditor */}
            <div id="module-auditor" className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <div className="flex items-center gap-2 text-xs font-medium text-[#2D5A4C]">
                  <FileSearch className="h-4 w-4" />
                  <span>Module 01 · AI EOB & Bill Auditor</span>
                </div>
                <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#1C2421]">
                  Spot billing violations and draft policy-cited appeals in minutes.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#5A6662]">
                  Upload a hospital bill, Medicare Summary Notice, or insurance EOB—or paste statement text. KindredCare flags overcharges and tracks insurer determination deadlines through recovery.
                </p>

                <div className="mt-6 space-y-4 border-t border-[#E5E2DC] pt-6">
                  <div>
                    <div className="text-sm font-semibold text-[#1C2421]">Snap & Parse Any Statement</div>
                    <p className="mt-0.5 text-xs text-[#5A6662]">
                      Extracts provider, insurer, policy ID, CPT/HCPCS codes, billed vs. allowed amounts, and denial codes.
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#1C2421]">US Billing Error & Law Checks</div>
                    <p className="mt-0.5 text-xs text-[#5A6662]">
                      Audits for duplicate charges, CMS NCCI unbundled CPT codes, coding mismatches, and No Surprises Act out-of-network balance billing.
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#1C2421]">One-Click Appeal Studio & SLA Tracker</div>
                    <p className="mt-0.5 text-xs text-[#5A6662]">
                      Drafts a formal appeal letter citing Medicare NCDs and federal rules, plus a visual 5-stage tracker with payer turnaround countdowns.
                    </p>
                  </div>
                </div>

                <div className="mt-7">
                  <button
                    type="button"
                    onClick={() => onLaunchWorkspace('auditor')}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#2D5A4C] px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#23473C]"
                  >
                    Try EOB & Bill Auditor
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="lg:col-span-6">
                <EditorialPhoto
                  src="/src/assets/images/module_bill_review_1795550389388.jpg"
                  alt="Caregiver organizing an Explanation of Benefits statement and pharmacy receipt beside a warm mug of tea"
                  fallbackTitle="EOB & Hospital Bill Review"
                  className="w-full rounded-xl border border-[#E5E2DC] object-cover"
                />
              </div>
            </div>

            {/* Module 02: Family Care Split Ledger */}
            <div id="module-ledger" className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="order-2 rounded-xl border border-[#E5E2DC] bg-white p-6 lg:order-1 lg:col-span-6">
                <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-4">
                  <div>
                    <div className="text-xs font-medium text-[#5A6662]">Sample Family Split Agreement</div>
                    <div className="mt-0.5 text-base font-semibold text-[#1C2421]">
                      Vance Family Monthly Pool · $2,580.60
                    </div>
                  </div>
                  <span className="font-mono text-xs font-medium text-[#2D5A4C]">60 Unpaid Care Hrs Offset</span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-[#F8F7F4] px-4 py-3 text-xs">
                    <div>
                      <div className="font-semibold text-[#1C2421]">Maya Chen · Local Coordinator</div>
                      <div className="text-[#5A6662]">Evanston, IL · Handles visits & groceries</div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="font-semibold text-[#1C2421]">20% Cash Share</div>
                      <div className="text-[#16A34A]">Owed +$718.68</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[#F8F7F4] px-4 py-3 text-xs">
                    <div>
                      <div className="font-semibold text-[#1C2421]">David Chen · Out-of-State Sibling</div>
                      <div className="text-[#5A6662]">Seattle, WA · Offsets local labor</div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="font-semibold text-[#1C2421]">55% Cash Share</div>
                      <div className="text-[#D97706]">Owes $299.33</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[#F8F7F4] px-4 py-3 text-xs">
                    <div>
                      <div className="font-semibold text-[#1C2421]">Elena Chen · Sandwich-Gen Sibling</div>
                      <div className="text-[#5A6662]">Denver, CO · Remote coordination</div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="font-semibold text-[#1C2421]">25% Cash Share</div>
                      <div className="text-[#D97706]">Owes $295.25</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-[#E5E2DC] pt-4 text-xs text-[#5A6662]">
                  Includes receipt photo OCR, pasted Amazon/pharmacy order email extraction, and one-tap Venmo, Zelle, or ACH reimbursement tracking.
                </div>
              </div>

              <div className="order-1 lg:order-2 lg:col-span-6">
                <div className="flex items-center gap-2 text-xs font-medium text-[#2D5A4C]">
                  <Scale className="h-4 w-4" />
                  <span>Module 02 · Splitwise for Caregiving</span>
                </div>
                <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#1C2421]">
                  Fair sibling cost-splitting that values unpaid caregiving time.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#5A6662]">
                  Replace awkward family money texts with a transparent shared ledger. Capture pharmacy, grocery, paid aide, and home-modification receipts in seconds and settle balances monthly.
                </p>

                <div className="mt-6 space-y-4 border-t border-[#E5E2DC] pt-6">
                  <div>
                    <div className="text-sm font-semibold text-[#1C2421]">Receipt & Order Email Capture</div>
                    <p className="mt-0.5 text-xs text-[#5A6662]">
                      Snap a receipt or paste an Amazon/Walgreens order confirmation to categorize into Medical, Home Modification, Groceries, or Paid Aide.
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#1C2421]">Custom Care-Hour Split Rules</div>
                    <p className="mt-0.5 text-xs text-[#5A6662]">
                      Agree upfront on 50/50, income-weighted, or offset ratios where out-of-state siblings cover more cash costs.
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#1C2421]">Non-Awkward Monthly Settlement</div>
                    <p className="mt-0.5 text-xs text-[#5A6662]">
                      Calculates exact net transfers with Venmo, Zelle, and ACH handles ready to settle in one click.
                    </p>
                  </div>
                </div>

                <div className="mt-7">
                  <button
                    type="button"
                    onClick={() => onLaunchWorkspace('ledger')}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#2D5A4C] px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#23473C]"
                  >
                    Open Family Split Ledger
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Module 03: Tax, FSA/HSA & Medicaid Spend-Down Vault */}
            <div id="module-vault" className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <div className="flex items-center gap-2 text-xs font-medium text-[#2D5A4C]">
                  <FolderArchive className="h-4 w-4" />
                  <span>Module 03 · Tax, FSA/HSA & Medicaid Vault</span>
                </div>
                <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#1C2421]">
                  Every grab bar, co-pay, and care shift ready for tax season or Medicaid review.
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[#5A6662]">
                  Every logged receipt and paid medical bill flows automatically into an organized compliance archive built for CPAs, FSA/HSA administrators, and elder law attorneys.
                </p>

                <div className="mt-6 space-y-4 border-t border-[#E5E2DC] pt-6">
                  <div>
                    <div className="text-sm font-semibold text-[#1C2421]">IRS Publication 502 & FSA/HSA Tagging</div>
                    <p className="mt-0.5 text-xs text-[#5A6662]">
                      Automatically flags deductible medical care, home safety modifications, prescriptions, and qualified long-term care services.
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#1C2421]">5-Year Medicaid Look-Back Readiness</div>
                    <p className="mt-0.5 text-xs text-[#5A6662]">
                      Tracks completeness across the 60-month window and highlights any items missing itemized vendor proof before a caseworker audit.
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#1C2421]">Accountant CSV & Printable Audit Packets</div>
                    <p className="mt-0.5 text-xs text-[#5A6662]">
                      Generate clean RFC-4180 spreadsheets and formatted print/PDF documentation packets in one click.
                    </p>
                  </div>
                </div>

                <div className="mt-7">
                  <button
                    type="button"
                    onClick={() => onLaunchWorkspace('vault')}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#2D5A4C] px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#23473C]"
                  >
                    Inspect Spend-Down Vault
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="lg:col-span-6">
                <EditorialPhoto
                  src="/src/assets/images/module_home_safety_1795550389175.jpg"
                  alt="Warm sunlit living room and bright hallway with subtle elder-friendly wood handrails"
                  fallbackTitle="Medicaid Spend-Down & Home Safety Records"
                  className="w-full rounded-xl border border-[#E5E2DC] object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Caregiver Personas & Transparent Family Pricing */}
        <section id="pricing" className="border-t border-[#E5E2DC] bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 border-b border-[#E5E2DC] pb-8 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-medium text-[#2D5A4C]">Built for Every Sibling Role</p>
                <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#1C2421]">
                  One shared workspace, priced to split across the family.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onLaunchWorkspace('overview')}
                className="self-start whitespace-nowrap rounded-lg border border-[#E5E2DC] px-4 py-2 text-xs font-medium text-[#1C2421] hover:bg-[#F1EFEA]"
              >
                Switch Between All 3 Personas Live
              </button>
            </div>

            {/* 3 Personas Row */}
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-[#E5E2DC] bg-[#F8F7F4] p-5">
                <div className="text-xs font-medium text-[#5A6662]">Age 42–60 · Lives Nearby</div>
                <h3 className="mt-1 text-base font-semibold text-[#1C2421]">The Local Coordinator</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#5A6662]">
                  Handles doctor visits and day-to-day bills. Stops front-loading $500+/month on personal credit cards and fighting insurance holds alone.
                </p>
              </div>
              <div className="rounded-xl border border-[#E5E2DC] bg-[#F8F7F4] p-5">
                <div className="text-xs font-medium text-[#5A6662]">Age 40–58 · Lives Out of State</div>
                <h3 className="mt-1 text-base font-semibold text-[#1C2421]">The Out-of-State Sibling</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#5A6662]">
                  Wants a transparent, structured way to contribute a higher cash share and take over remote insurance appeals and paperwork.
                </p>
              </div>
              <div className="rounded-xl border border-[#E5E2DC] bg-[#F8F7F4] p-5">
                <div className="text-xs font-medium text-[#5A6662]">Age 35–50 · Raising Kids + Caring</div>
                <h3 className="mt-1 text-base font-semibold text-[#1C2421]">The Sandwich-Generation Parent</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#5A6662]">
                  Needs speed—scans a hospital bill or pharmacy receipt in 10 seconds and lets KindredCare handle categorization and appeal drafting.
                </p>
              </div>
            </div>

            {/* Pricing Grid */}
            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="flex flex-col justify-between rounded-xl border border-[#E5E2DC] bg-white p-6">
                <div>
                  <div className="text-xs font-medium text-[#5A6662]">For Starting Care Teams</div>
                  <h3 className="mt-1 text-lg font-semibold text-[#1C2421]">Free Starter</h3>
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
                      <span>1 free AI bill / EOB audit scan</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                      <span>Sample policy-cited appeal letter preview</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => onLaunchWorkspace('overview')}
                  className="mt-6 w-full rounded-lg border border-[#E5E2DC] px-4 py-2 text-xs font-medium text-[#1C2421] hover:bg-[#F1EFEA]"
                >
                  Open Free Demo Workspace
                </button>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-[#2D5A4C] bg-white p-6">
                <div>
                  <div className="text-xs font-medium text-[#2D5A4C]">For Multi-Sibling Care Coordination</div>
                  <h3 className="mt-1 text-lg font-semibold text-[#1C2421]">Family Care Plan</h3>
                  <div className="mt-3 font-mono text-2xl font-semibold text-[#1C2421] tabular-nums">
                    $19.99 <span className="font-sans text-xs font-normal text-[#5A6662]">/ mo or $179/yr (~$7/sibling)</span>
                  </div>
                  <ul className="mt-5 space-y-2.5 text-xs text-[#1C2421]">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                      <span>Unlimited family members & custom care-hour splits</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                      <span>Unlimited AI EOB audits, appeal letters & SLA tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                      <span>Automated monthly sibling settlements & IRS/Medicaid exports</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => onLaunchWorkspace('plan')}
                  className="mt-6 w-full rounded-lg bg-[#2D5A4C] px-4 py-2 text-xs font-medium text-white hover:bg-[#23473C]"
                >
                  Launch Family Care Workspace
                </button>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-[#E5E2DC] bg-white p-6">
                <div>
                  <div className="text-xs font-medium text-[#5A6662]">High-Dollar Denials & Employer HR</div>
                  <h3 className="mt-1 text-lg font-semibold text-[#1C2421]">Concierge & Partner Channels</h3>
                  <div className="mt-3 font-mono text-2xl font-semibold text-[#1C2421] tabular-nums">
                    $49.00 <span className="font-sans text-xs font-normal text-[#5A6662]">/ complex appeal packet</span>
                  </div>
                  <ul className="mt-5 space-y-2.5 text-xs text-[#1C2421]">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                      <span>Patient advocate escalation for $5,000+ hospital or rehab denials</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                      <span>Elder Law Attorney, CFP & Hospital Discharge Planner ready packets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2D5A4C]" />
                      <span>Enterprise HR Elder Care Financial Benefit deployment</span>
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => onLaunchWorkspace('auditor')}
                  className="mt-6 w-full rounded-lg border border-[#E5E2DC] px-4 py-2 text-xs font-medium text-[#1C2421] hover:bg-[#F1EFEA]"
                >
                  Inspect High-Dollar Claim Example
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-[#E5E2DC] bg-[#F8F7F4] py-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-6 lg:flex-row lg:items-center lg:px-8">
          <div>
            <div className="text-base font-bold text-[#1C2421]">KindredCare</div>
            <p className="mt-1 max-w-xl text-xs text-[#5A6662]">
              Administrative appeal drafting & family caregiving financial ledger. Drafts appeal letters based on published insurer medical policies and federal billing protections—not legal or medical advice.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#5A6662]">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-[#2D5A4C]" />
              Server-Side PHI Processing
            </span>
            <button
              type="button"
              onClick={() => onLaunchWorkspace('overview')}
              className="font-medium text-[#2D5A4C] hover:underline"
            >
              Open Live Workspace →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

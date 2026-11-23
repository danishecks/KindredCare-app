import type { MedicalClaim } from '../types';

export interface InsurerTimelineProfile {
  insurerGroup: string;
  slaDays: number;
  typicalDays: number;
  regulatoryRule: string;
  historicalOverturnNote: string;
  submittedDate: string | null;
  estimatedDecisionDate: string | null;
  statutoryDeadlineDate: string | null;
  elapsedDays: number;
  daysRemaining: number;
  timelineProgressPct: number;
}

function addDaysIso(isoDate: string, days: number): string {
  const base = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(base.getTime())) return isoDate;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function diffDays(fromIso: string, toIso: string): number {
  const start = new Date(`${fromIso.slice(0, 10)}T12:00:00Z`);
  const end = new Date(`${toIso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function getInsurerTimeline(claim: MedicalClaim): InsurerTimelineProfile {
  const insurerLower = claim.insurer.toLowerCase();
  const isMedicareAdvantage =
    insurerLower.includes('medicare advantage') ||
    insurerLower.includes('dual complete') ||
    insurerLower.includes('medicare ppo') ||
    insurerLower.includes('medicare hmo');
  const isTraditionalMedicare =
    (insurerLower.includes('medicare') || claim.documentType === 'Medicare Summary Notice') &&
    !isMedicareAdvantage;

  let insurerGroup = 'Commercial Payer (ACA / ERISA)';
  let slaDays = 30;
  let typicalDays = 26;
  let regulatoryRule = 'ACA / ERISA 29 CFR § 2560.503-1 (30-Day Post-Service Appeal)';
  let historicalOverturnNote = 'Typical insurer resolution in 21–30 days';

  if (isTraditionalMedicare) {
    insurerGroup = 'Traditional Medicare (MAC Redetermination)';
    slaDays = 60;
    typicalDays = 42;
    regulatoryRule = 'CMS 42 CFR § 405.940 (60-Day Level 1 Redetermination)';
    historicalOverturnNote = 'MAC redeterminations typically resolve in 35–48 days';
  } else if (isMedicareAdvantage) {
    insurerGroup = 'Medicare Advantage (Part C Reconsideration)';
    slaDays = 30;
    typicalDays = 24;
    regulatoryRule = 'CMS 42 CFR § 422.590 (30-Day Standard Appeal SLA)';
    historicalOverturnNote = 'Part C plans average 20–26 days (72h if expedited)';
  } else if (insurerLower.includes('united') || insurerLower.includes('uhc')) {
    insurerGroup = 'UnitedHealthcare Commercial';
    slaDays = 30;
    typicalDays = 25;
    regulatoryRule = 'UHC Member Appeals Policy · 30-Day Determination Window';
    historicalOverturnNote = 'Typical UHC electronic portal turnaround: 22–28 days';
  } else if (insurerLower.includes('bluecross') || insurerLower.includes('bcbs') || insurerLower.includes('anthem')) {
    insurerGroup = 'BlueCross BlueShield';
    slaDays = 45;
    typicalDays = 32;
    regulatoryRule = 'BCBS Standard Grievance SLA (30–45 Days)';
    historicalOverturnNote = 'Typical BCBS billing dispute resolution: 28–36 days';
  } else if (insurerLower.includes('aetna')) {
    insurerGroup = 'Aetna Commercial';
    slaDays = 30;
    typicalDays = 26;
    regulatoryRule = 'Aetna Post-Service Appeal Standard (30 Days)';
    historicalOverturnNote = 'Typical Aetna coding correction turnaround: 20–28 days';
  } else if (insurerLower.includes('cigna')) {
    insurerGroup = 'Cigna Healthcare';
    slaDays = 30;
    typicalDays = 27;
    regulatoryRule = 'Cigna Standard Administrative Review (30 Days)';
    historicalOverturnNote = 'Typical Cigna claim reprocessing: 24–30 days';
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const submittedDate = claim.submittedAt ? claim.submittedAt.slice(0, 10) : null;
  const estimatedDecisionDate = submittedDate ? addDaysIso(submittedDate, typicalDays) : null;
  const statutoryDeadlineDate = submittedDate ? addDaysIso(submittedDate, slaDays) : null;

  let elapsedDays = 0;
  let daysRemaining = typicalDays;
  let timelineProgressPct = 0;

  if (submittedDate) {
    const endReference =
      (claim.status === 'Overturned' || claim.status === 'Denied') && claim.decisionAt
        ? claim.decisionAt.slice(0, 10)
        : todayIso;
    elapsedDays = Math.max(0, diffDays(submittedDate, endReference));
    daysRemaining = Math.max(0, slaDays - elapsedDays);
    timelineProgressPct = Math.min(100, Math.max(6, Math.round((elapsedDays / slaDays) * 100)));
  }

  return {
    insurerGroup,
    slaDays,
    typicalDays,
    regulatoryRule,
    historicalOverturnNote,
    submittedDate,
    estimatedDecisionDate,
    statutoryDeadlineDate,
    elapsedDays,
    daysRemaining,
    timelineProgressPct,
  };
}

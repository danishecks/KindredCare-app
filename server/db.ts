import Database from 'better-sqlite3';
import path from 'path';
import type {
  CareExpense,
  CareSettings,
  ClaimError,
  ClaimStatus,
  CptLineItem,
  ExpenseCategory,
  FamilyMember,
  MedicalClaim,
  MemberBalanceSummary,
  SettlementRecord,
  SuggestedTransfer,
  WorkspaceSnapshot,
} from '../src/types';

const DB_PATH = path.resolve(process.cwd(), 'family_care.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS care_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    care_recipient TEXT NOT NULL,
    recipient_avatar TEXT NOT NULL,
    medicaid_lookback_start TEXT NOT NULL,
    unpaid_care_hours_monthly INTEGER NOT NULL,
    local_care_offset_note TEXT NOT NULL,
    plan_tier TEXT NOT NULL DEFAULT 'family_care'
  );

  CREATE TABLE IF NOT EXISTS family_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role_label TEXT NOT NULL,
    persona_type TEXT NOT NULL,
    location TEXT NOT NULL,
    split_percentage REAL NOT NULL,
    payment_handle TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    avatar_url TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS medical_claims (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    insurer TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    service_date TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    billed_amount REAL NOT NULL,
    allowed_amount REAL NOT NULL,
    patient_responsibility REAL NOT NULL,
    potential_savings REAL NOT NULL,
    status TEXT NOT NULL,
    denial_reason TEXT NOT NULL,
    cpt_codes_json TEXT NOT NULL,
    errors_json TEXT NOT NULL,
    appeal_letter TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    submitted_at TEXT,
    decision_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    vendor TEXT NOT NULL,
    description TEXT NOT NULL,
    expense_date TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    paid_by_member_id TEXT NOT NULL,
    irs_502_eligible INTEGER NOT NULL,
    fsa_hsa_eligible INTEGER NOT NULL,
    medicaid_lookback_verified INTEGER NOT NULL,
    receipt_attached INTEGER NOT NULL,
    tax_notes TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (paid_by_member_id) REFERENCES family_members(id)
  );

  CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    from_member_id TEXT NOT NULL,
    to_member_id TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    settled_at TEXT NOT NULL,
    note TEXT NOT NULL,
    FOREIGN KEY (from_member_id) REFERENCES family_members(id),
    FOREIGN KEY (to_member_id) REFERENCES family_members(id)
  );
`);

// Safe column migration for existing SQLite databases
const claimCols = db.prepare('PRAGMA table_info(medical_claims)').all() as Array<{ name: string }>;
const claimColNames = new Set(claimCols.map((c) => c.name));
if (!claimColNames.has('submitted_at')) {
  db.exec('ALTER TABLE medical_claims ADD COLUMN submitted_at TEXT');
}
if (!claimColNames.has('decision_at')) {
  db.exec('ALTER TABLE medical_claims ADD COLUMN decision_at TEXT');
}
// Ensure existing seeded submitted/overturned claims have realistic tracking dates
db.prepare("UPDATE medical_claims SET submitted_at = '2026-11-04' WHERE id = 'claim-3' AND submitted_at IS NULL").run();
db.prepare("UPDATE medical_claims SET submitted_at = '2026-08-29', decision_at = '2026-09-18' WHERE id = 'claim-4' AND submitted_at IS NULL").run();

function seedInitialDataIfEmpty(): void {
  const memberCount = (db.prepare('SELECT COUNT(*) as count FROM family_members').get() as { count: number }).count;
  if (memberCount > 0) {
    return;
  }

  const insertSettings = db.prepare(`
    INSERT INTO care_settings (
      id, care_recipient, recipient_avatar, medicaid_lookback_start,
      unpaid_care_hours_monthly, local_care_offset_note, plan_tier
    ) VALUES (1, ?, ?, ?, ?, ?, ?)
  `);
  insertSettings.run(
    'Eleanor Vance',
    '/src/assets/images/avatar_eleanor_parent_1795393419213.jpg',
    '2022-01-01',
    60,
    'Maya handles ~60 unpaid hrs/month of local visits, rides, and meal prep; cash ratio adjusted to 20% Maya / 55% David / 25% Elena.',
    'family_care'
  );

  const insertMember = db.prepare(`
    INSERT INTO family_members (
      id, name, role_label, persona_type, location, split_percentage, payment_handle, payment_method, avatar_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMember.run(
    'maya',
    'Maya Chen',
    'Local Coordinator',
    'local_coordinator',
    'Evanston, IL',
    20,
    '@maya-chen-care',
    'Venmo',
    '/src/assets/images/avatar_maya_coordinator_1795393417998.jpg'
  );
  insertMember.run(
    'david',
    'David Chen',
    'Out-of-State Sibling',
    'out_of_state',
    'Seattle, WA',
    55,
    'david.chen@familymail.com',
    'Zelle',
    '/src/assets/images/avatar_david_sibling_1795393419536.jpg'
  );
  insertMember.run(
    'elena',
    'Elena Chen',
    'Sandwich-Gen Sibling',
    'sandwich_parent',
    'Denver, CO',
    25,
    '@elena-chen-co',
    'Venmo',
    '/src/assets/images/avatar_elena_sibling_1795393419260.jpg'
  );

  const insertClaim = db.prepare(`
    INSERT INTO medical_claims (
      id, provider, insurer, policy_number, service_date, patient_name, document_type,
      billed_amount, allowed_amount, patient_responsibility, potential_savings, status,
      denial_reason, cpt_codes_json, errors_json, appeal_letter, uploaded_by, submitted_at, decision_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const claim1Cpts: CptLineItem[] = [
    { code: '99214', description: 'Outpatient office visit, established patient (30 min)', billed: 380, allowed: 165, status: 'valid' },
    { code: '99214', description: 'Duplicate charge: Outpatient office visit, same DOS', billed: 380, allowed: 0, status: 'flagged' },
    { code: '97110', description: 'Therapeutic exercises, physical therapy (unbundled)', billed: 920, allowed: 410, status: 'flagged' },
    { code: '97140', description: 'Manual therapy techniques billed separately (NCCI edit)', billed: 740, allowed: 0, status: 'flagged' },
    { code: '71046', description: 'Chest X-ray 2 views — Out-of-Network Radiologist', billed: 2400, allowed: 1365, status: 'denied' },
  ];

  const claim1Errors: ClaimError[] = [
    {
      errorType: 'No Surprises Act Violation',
      severity: 'high',
      title: 'Out-of-network radiology balance bill at in-network hospital',
      description: 'An out-of-network radiologist billed $1,035 above the allowed amount during an in-network hospital visit. Under the federal No Surprises Act (42 U.S.C. § 300gg-111), ancillary out-of-network clinicians at in-network facilities cannot balance bill above in-network cost-sharing.',
      estimatedOvercharge: 1035,
      policyCitation: 'Federal No Surprises Act, 45 CFR § 149.410',
    },
    {
      errorType: 'Unbundled CPT Code',
      severity: 'high',
      title: 'Physical therapy codes 97110 & 97140 improperly unbundled',
      description: 'CMS National Correct Coding Initiative (NCCI) bundles manual therapy (97140) with therapeutic exercise (97110) unless modifier 59 is clinically documented for a distinct anatomic site.',
      estimatedOvercharge: 740,
      policyCitation: 'CMS NCCI Policy Manual Ch. XI, Sec. E',
    },
    {
      errorType: 'Duplicate Charge',
      severity: 'medium',
      title: 'Duplicate CPT 99214 evaluation billed twice on 2026-10-14',
      description: 'Identical established-patient office visit billed twice by the same rendering provider on the same date of service without modifier 25 or separate encounter notes.',
      estimatedOvercharge: 380,
      policyCitation: 'BCBS Medicare Advantage Claim Edit Rule 4.2',
    },
  ];

  insertClaim.run(
    'claim-1',
    'NorthShore Evanston Hospital',
    'BlueCross BlueShield Medicare Advantage',
    'BCBSM-88412904',
    '2026-10-14',
    'Eleanor Vance',
    'Hospital Bill',
    4820,
    1940,
    2880,
    2155,
    'Flagged',
    'Multiple line-item billing discrepancies and out-of-network ancillary balance bill',
    JSON.stringify(claim1Cpts),
    JSON.stringify(claim1Errors),
    '',
    'maya',
    null,
    null,
    '2026-10-19T14:20:00Z'
  );

  const claim2Cpts: CptLineItem[] = [
    { code: 'E0143', description: 'Folding wheeled walker with seat, heavy-duty', billed: 680, allowed: 0, status: 'denied' },
    { code: 'E0247', description: 'Transfer bench for tub or toilet, post-fall safety', billed: 490, allowed: 0, status: 'denied' },
    { code: 'E0243', description: 'Toilet rail attachment, bilateral safety frame', billed: 480, allowed: 330, status: 'valid' },
  ];

  const claim2Errors: ClaimError[] = [
    {
      errorType: 'Medical Necessity Denial',
      severity: 'high',
      title: 'Mobility DME denied despite documented post-hospitalization fall risk',
      description: 'UnitedHealthcare denied E0143 and E0247 as "not medically necessary" because the supplier omitted the attending physician mobility impairment order (ICD-10 R26.89 & Z91.81). Under Medicare NCD 280.1, wheeled walkers and transfer safety equipment are covered when mobility within the home is impaired.',
      estimatedOvercharge: 1170,
      policyCitation: 'Medicare NCD 280.1 & UHC Medicare DME Policy MMG-041',
    },
  ];

  const claim2Appeal = `Date: October 28, 2026
To: UnitedHealthcare Dual Complete — Appeals & Grievances Department
Re: Expedited Medical Necessity Appeal — Claim #UHC-4490218
Member: Eleanor Vance | Policy ID: UHC-77319044 | Date of Service: 2026-10-08

Dear Appeals Coordinator,

I am submitting this administrative appeal on behalf of my mother, Eleanor Vance, regarding the denial of Durable Medical Equipment codes E0143 (wheeled walker with seat) and E0247 (tub transfer bench) from Midwest Mobility & Home Health DME.

Basis for Appeal & Policy Citations:
1. Medicare National Coverage Determination (NCD 280.1 — Mobility Assistive Equipment): Mrs. Vance experienced a documented inpatient fall and gait instability (ICD-10 R26.89, Z91.81) requiring home mobility support to perform Activities of Daily Living safely.
2. Attached Clinical Documentation: Enclosed is the signed Standard Written Order (SWO) from Dr. Helena Sato, MD, and the hospital discharge physical therapy evaluation confirming Mrs. Vance cannot safely ambulate inside the home without a four-wheel walker or transfer in the bathroom without a transfer bench.

Requested Action:
Please overturn the medical necessity denial for CPT/HCPCS E0143 ($680.00) and E0247 ($490.00), reprocess the claim at the in-network benefit rate, and issue a revised Explanation of Benefits within the standard 30-day Medicare Advantage determination window.

Note: This letter was prepared as an administrative appeal draft based on published payer coverage criteria for review by the member or authorized representative.

Sincerely,
David Chen (Authorized Care Representative for Eleanor Vance)`;

  insertClaim.run(
    'claim-2',
    'Midwest Mobility & Home Health DME',
    'UnitedHealthcare Dual Complete',
    'UHC-77319044',
    '2026-10-08',
    'Eleanor Vance',
    'DME / Rehab Claim',
    1650,
    330,
    1320,
    1170,
    'Appeal Drafted',
    'Denied: Not Medically Necessary (missing mobility order linkage)',
    JSON.stringify(claim2Cpts),
    JSON.stringify(claim2Errors),
    claim2Appeal,
    'david',
    null,
    null,
    '2026-10-22T09:45:00Z'
  );

  const claim3Cpts: CptLineItem[] = [
    { code: 'G0439', description: 'Annual wellness visit, subsequent preventive exam', billed: 420, allowed: 0, status: 'denied' },
    { code: '93000', description: 'Electrocardiogram (ECG), complete 12-lead', billed: 820, allowed: 820, status: 'valid' },
  ];

  const claim3Errors: ClaimError[] = [
    {
      errorType: 'Coding Mismatch',
      severity: 'medium',
      title: 'Preventive wellness visit coded under acute AFib diagnosis (I48.91)',
      description: 'Aetna denied G0439 because the clinic billed a zero-cost-share Annual Wellness Visit paired solely with primary diagnosis I48.91 instead of preventive encounter Z00.00.',
      estimatedOvercharge: 420,
      policyCitation: 'ACA Preventive Benefit & CMS Claims Processing Manual Ch. 18 § 140',
    },
  ];

  insertClaim.run(
    'claim-3',
    'Lakefront Cardiology Associates',
    'Aetna Medicare PPO',
    'AET-51902210',
    '2026-09-29',
    'Eleanor Vance',
    'Insurance EOB',
    1240,
    820,
    420,
    420,
    'Submitted',
    'Denied: Diagnosis-to-procedure coding mismatch on preventive wellness visit',
    JSON.stringify(claim3Cpts),
    JSON.stringify(claim3Errors),
    'Formal coding correction request and preventive zero-cost-share appeal submitted to Aetna Provider & Member Appeals portal on Nov 04, 2026.',
    'maya',
    '2026-11-04',
    null,
    '2026-10-05T11:10:00Z'
  );

  const claim4Cpts: CptLineItem[] = [
    { code: '97530', description: 'Therapeutic activities, post-stroke functional recovery (12 sessions)', billed: 3600, allowed: 3600, status: 'valid' },
    { code: '97112', description: 'Neuromuscular re-education, balance & coordination', billed: 2800, allowed: 2200, status: 'valid' },
  ];

  const claim4Errors: ClaimError[] = [
    {
      errorType: 'Medical Necessity Denial',
      severity: 'high',
      title: 'Skilled therapy cap denial overturned under Jimmo v. Sebelius standard',
      description: 'Initially denied for "lack of rapid improvement." Successfully appealed citing Jimmo v. Sebelius maintenance therapy standard—insurer reversed $5,800 patient liability.',
      estimatedOvercharge: 5800,
      policyCitation: 'CMS Jimmo v. Sebelius Settlement Agreement (42 CFR § 409.32)',
    },
  ];

  insertClaim.run(
    'claim-4',
    'Vance Post-Acute Skilled Rehab',
    'Medicare Part B / BCBS Supplement',
    'MCARE-9041827',
    '2026-08-19',
    'Eleanor Vance',
    'Medicare Summary Notice',
    6400,
    5800,
    0,
    5800,
    'Overturned',
    'Initial maintenance therapy denial overturned on Level 1 Redetermination',
    JSON.stringify(claim4Cpts),
    JSON.stringify(claim4Errors),
    'Appeal Letter successfully overturned $5,800 denial under Jimmo v. Sebelius maintenance therapy coverage criteria.',
    'david',
    '2026-08-29',
    '2026-09-18',
    '2026-08-27T16:30:00Z'
  );

  const insertExpense = db.prepare(`
    INSERT INTO expenses (
      id, vendor, description, expense_date, amount, category, paid_by_member_id,
      irs_502_eligible, fsa_hsa_eligible, medicaid_lookback_verified, receipt_attached, tax_notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedExpenses: Array<[string, string, string, string, number, ExpenseCategory, string, number, number, number, number, string, string]> = [
    ['exp-1', 'Walgreens Pharmacy #0412', 'Eliquis 5mg, Lisinopril refill & diabetic test strips', '2026-11-18', 184.50, 'Medical', 'maya', 1, 1, 1, 1, 'IRS Pub 502 Prescription Drugs · Receipt PDF archived', '2026-11-18T15:00:00Z'],
    ['exp-2', 'Home Depot — Evanston', 'Moen stainless bathroom grab bars & non-slip ramp threshold', '2026-11-12', 342.80, 'Home Modification', 'maya', 1, 1, 1, 1, 'IRS Pub 502 Capital Expense (medically required home safety modification)', '2026-11-12T12:15:00Z'],
    ['exp-3', 'ComfortKeepers Home Care', 'In-home personal care aide (16 hrs post-discharge bathing & mobility)', '2026-11-10', 640.00, 'Paid Aide', 'david', 1, 0, 1, 1, 'IRS Pub 502 Qualified Long-Term Care Services (ADL assistance)', '2026-11-10T18:40:00Z'],
    ['exp-4', 'Whole Foods Market', 'Low-sodium meal prep groceries, Ensure nutrition shakes & produce', '2026-11-15', 168.40, 'Groceries', 'maya', 0, 0, 1, 1, 'General living support · Documented for Medicaid spend-down ledger', '2026-11-15T17:20:00Z'],
    ['exp-5', 'NorthShore Outpatient Clinic', 'Cardiology & physical therapy co-pays (3 visits)', '2026-11-04', 150.00, 'Medical', 'maya', 1, 1, 1, 1, 'IRS Pub 502 Medical Care Co-Payments · FSA/HSA eligible', '2026-11-04T11:00:00Z'],
    ['exp-6', 'Amazon Pharmacy & Medical', 'Automatic blood pressure cuff & incontinence briefs (case of 96)', '2026-10-27', 129.90, 'Medical', 'elena', 1, 1, 1, 1, 'FSA/HSA OTC & Diagnostic Equipment eligible · Order email archived', '2026-10-27T09:12:00Z'],
    ['exp-7', 'Evanston Handyman Services', 'Install stair railing & widen bedroom doorway clearance', '2026-10-18', 485.00, 'Home Modification', 'maya', 1, 0, 0, 0, 'Needs itemized contractor invoice uploaded for Medicaid 60-month look-back proof', '2026-10-18T14:05:00Z'],
    ['exp-8', 'ComfortKeepers Home Care', 'Respite caregiver weekend shift (12 hrs)', '2026-10-11', 480.00, 'Paid Aide', 'david', 1, 0, 1, 1, 'IRS Pub 502 Nursing/Personal Care Aide · Bank statement & invoice linked', '2026-10-11T19:00:00Z'],
  ];

  for (const row of seedExpenses) {
    insertExpense.run(...row);
  }

  const insertSettlement = db.prepare(`
    INSERT INTO settlements (id, from_member_id, to_member_id, amount, method, settled_at, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertSettlement.run(
    'settle-1',
    'elena',
    'maya',
    220.00,
    'Venmo',
    '2026-10-31T20:00:00Z',
    'October care split settlement'
  );
}

seedInitialDataIfEmpty();

function parseClaimRow(row: Record<string, unknown>): MedicalClaim {
  return {
    id: String(row.id),
    provider: String(row.provider),
    insurer: String(row.insurer),
    policyNumber: String(row.policy_number),
    serviceDate: String(row.service_date),
    patientName: String(row.patient_name),
    documentType: row.document_type as MedicalClaim['documentType'],
    billedAmount: Number(row.billed_amount),
    allowedAmount: Number(row.allowed_amount),
    patientResponsibility: Number(row.patient_responsibility),
    potentialSavings: Number(row.potential_savings),
    status: row.status as ClaimStatus,
    denialReason: String(row.denial_reason),
    cptCodes: JSON.parse(String(row.cpt_codes_json)) as CptLineItem[],
    errors: JSON.parse(String(row.errors_json)) as ClaimError[],
    appealLetter: String(row.appeal_letter),
    uploadedBy: String(row.uploaded_by),
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    decisionAt: row.decision_at ? String(row.decision_at) : null,
    createdAt: String(row.created_at),
  };
}

function parseExpenseRow(row: Record<string, unknown>): CareExpense {
  return {
    id: String(row.id),
    vendor: String(row.vendor),
    description: String(row.description),
    expenseDate: String(row.expense_date),
    amount: Number(row.amount),
    category: row.category as ExpenseCategory,
    paidByMemberId: String(row.paid_by_member_id),
    irs502Eligible: Boolean(row.irs_502_eligible),
    fsaHsaEligible: Boolean(row.fsa_hsa_eligible),
    medicaidLookbackVerified: Boolean(row.medicaid_lookback_verified),
    receiptAttached: Boolean(row.receipt_attached),
    taxNotes: String(row.tax_notes),
    createdAt: String(row.created_at),
  };
}

function calculateBalances(
  members: FamilyMember[],
  expenses: CareExpense[],
  settlements: SettlementRecord[]
): { balances: MemberBalanceSummary[]; suggestedTransfers: SuggestedTransfer[] } {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const summaryMap = new Map<string, MemberBalanceSummary>();
  for (const m of members) {
    summaryMap.set(m.id, {
      memberId: m.id,
      paidTotal: 0,
      expectedShareTotal: Number(((totalExpenses * m.splitPercentage) / 100).toFixed(2)),
      settlementsSent: 0,
      settlementsReceived: 0,
      netBalance: 0,
    });
  }

  for (const e of expenses) {
    const entry = summaryMap.get(e.paidByMemberId);
    if (entry) {
      entry.paidTotal = Number((entry.paidTotal + e.amount).toFixed(2));
    }
  }

  for (const s of settlements) {
    const fromEntry = summaryMap.get(s.fromMemberId);
    const toEntry = summaryMap.get(s.toMemberId);
    if (fromEntry) {
      fromEntry.settlementsSent = Number((fromEntry.settlementsSent + s.amount).toFixed(2));
    }
    if (toEntry) {
      toEntry.settlementsReceived = Number((toEntry.settlementsReceived + s.amount).toFixed(2));
    }
  }

  const balances: MemberBalanceSummary[] = [];
  for (const entry of summaryMap.values()) {
    entry.netBalance = Number(
      (entry.paidTotal - entry.expectedShareTotal + entry.settlementsSent - entry.settlementsReceived).toFixed(2)
    );
    balances.push(entry);
  }

  // Greedy settlement matching between debtors (netBalance < 0) and creditors (netBalance > 0)
  const debtors = balances
    .filter((b) => b.netBalance < -0.01)
    .map((b) => ({ memberId: b.memberId, remaining: Math.abs(b.netBalance) }))
    .sort((a, b) => b.remaining - a.remaining);

  const creditors = balances
    .filter((b) => b.netBalance > 0.01)
    .map((b) => ({ memberId: b.memberId, remaining: b.netBalance }))
    .sort((a, b) => b.remaining - a.remaining);

  const suggestedTransfers: SuggestedTransfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const payAmount = Number(Math.min(debtors[i].remaining, creditors[j].remaining).toFixed(2));
    if (payAmount >= 0.01) {
      suggestedTransfers.push({
        fromMemberId: debtors[i].memberId,
        toMemberId: creditors[j].memberId,
        amount: payAmount,
      });
    }
    debtors[i].remaining = Number((debtors[i].remaining - payAmount).toFixed(2));
    creditors[j].remaining = Number((creditors[j].remaining - payAmount).toFixed(2));
    if (debtors[i].remaining <= 0.01) i++;
    if (creditors[j].remaining <= 0.01) j++;
  }

  return { balances, suggestedTransfers };
}

export function getWorkspaceSnapshot(): WorkspaceSnapshot {
  const settingsRow = db.prepare('SELECT * FROM care_settings WHERE id = 1').get() as Record<string, unknown>;
  const settings: CareSettings = {
    careRecipient: String(settingsRow.care_recipient),
    recipientAvatar: String(settingsRow.recipient_avatar),
    medicaidLookbackStart: String(settingsRow.medicaid_lookback_start),
    unpaidCareHoursMonthly: Number(settingsRow.unpaid_care_hours_monthly),
    localCareOffsetNote: String(settingsRow.local_care_offset_note),
    planTier: settingsRow.plan_tier as CareSettings['planTier'],
  };

  const memberRows = db.prepare('SELECT * FROM family_members ORDER BY rowid ASC').all() as Array<Record<string, unknown>>;
  const members: FamilyMember[] = memberRows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    roleLabel: String(r.role_label),
    personaType: r.persona_type as FamilyMember['personaType'],
    location: String(r.location),
    splitPercentage: Number(r.split_percentage),
    paymentHandle: String(r.payment_handle),
    paymentMethod: r.payment_method as FamilyMember['paymentMethod'],
    avatarUrl: String(r.avatar_url),
  }));

  const claimRows = db.prepare('SELECT * FROM medical_claims ORDER BY service_date DESC, created_at DESC').all() as Array<Record<string, unknown>>;
  const claims = claimRows.map(parseClaimRow);

  const expenseRows = db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC, created_at DESC').all() as Array<Record<string, unknown>>;
  const expenses = expenseRows.map(parseExpenseRow);

  const settlementRows = db.prepare('SELECT * FROM settlements ORDER BY settled_at DESC').all() as Array<Record<string, unknown>>;
  const settlements: SettlementRecord[] = settlementRows.map((r) => ({
    id: String(r.id),
    fromMemberId: String(r.from_member_id),
    toMemberId: String(r.to_member_id),
    amount: Number(r.amount),
    method: r.method as SettlementRecord['method'],
    settledAt: String(r.settled_at),
    note: String(r.note),
  }));

  const { balances, suggestedTransfers } = calculateBalances(members, expenses, settlements);

  return {
    settings,
    members,
    claims,
    expenses,
    settlements,
    balances,
    suggestedTransfers,
  };
}

export function getClaimById(id: string): MedicalClaim | null {
  const row = db.prepare('SELECT * FROM medical_claims WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? parseClaimRow(row) : null;
}

export function createClaim(claim: MedicalClaim): MedicalClaim {
  db.prepare(`
    INSERT INTO medical_claims (
      id, provider, insurer, policy_number, service_date, patient_name, document_type,
      billed_amount, allowed_amount, patient_responsibility, potential_savings, status,
      denial_reason, cpt_codes_json, errors_json, appeal_letter, uploaded_by, submitted_at, decision_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    claim.id,
    claim.provider,
    claim.insurer,
    claim.policyNumber,
    claim.serviceDate,
    claim.patientName,
    claim.documentType,
    claim.billedAmount,
    claim.allowedAmount,
    claim.patientResponsibility,
    claim.potentialSavings,
    claim.status,
    claim.denialReason,
    JSON.stringify(claim.cptCodes),
    JSON.stringify(claim.errors),
    claim.appealLetter,
    claim.uploadedBy,
    claim.submittedAt ?? null,
    claim.decisionAt ?? null,
    claim.createdAt
  );
  return claim;
}

export function updateClaim(
  id: string,
  updates: Partial<{
    status: ClaimStatus;
    appealLetter: string;
    submittedAt: string | null;
    decisionAt: string | null;
  }>
): MedicalClaim | null {
  const existing = getClaimById(id);
  if (!existing) return null;

  const todayIso = new Date().toISOString().slice(0, 10);
  const nextStatus = updates.status ?? existing.status;
  const nextAppeal = updates.appealLetter !== undefined ? updates.appealLetter : existing.appealLetter;

  let nextSubmittedAt = updates.submittedAt !== undefined ? updates.submittedAt : existing.submittedAt ?? null;
  let nextDecisionAt = updates.decisionAt !== undefined ? updates.decisionAt : existing.decisionAt ?? null;

  if ((nextStatus === 'Submitted' || nextStatus === 'Under Review') && !nextSubmittedAt) {
    nextSubmittedAt = todayIso;
  }
  if (nextStatus === 'Flagged' || nextStatus === 'Appeal Drafted') {
    nextDecisionAt = null;
  }
  if ((nextStatus === 'Overturned' || nextStatus === 'Denied') && !nextDecisionAt) {
    if (!nextSubmittedAt) nextSubmittedAt = todayIso;
    nextDecisionAt = todayIso;
  }

  db.prepare(
    'UPDATE medical_claims SET status = ?, appeal_letter = ?, submitted_at = ?, decision_at = ? WHERE id = ?'
  ).run(nextStatus, nextAppeal, nextSubmittedAt, nextDecisionAt, id);
  return getClaimById(id);
}

export function createExpense(expense: CareExpense): CareExpense {
  db.prepare(`
    INSERT INTO expenses (
      id, vendor, description, expense_date, amount, category, paid_by_member_id,
      irs_502_eligible, fsa_hsa_eligible, medicaid_lookback_verified, receipt_attached, tax_notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    expense.id,
    expense.vendor,
    expense.description,
    expense.expenseDate,
    expense.amount,
    expense.category,
    expense.paidByMemberId,
    expense.irs502Eligible ? 1 : 0,
    expense.fsaHsaEligible ? 1 : 0,
    expense.medicaidLookbackVerified ? 1 : 0,
    expense.receiptAttached ? 1 : 0,
    expense.taxNotes,
    expense.createdAt
  );
  return expense;
}

export function updateExpenseFlags(
  id: string,
  updates: Partial<{
    irs502Eligible: boolean;
    fsaHsaEligible: boolean;
    medicaidLookbackVerified: boolean;
    receiptAttached: boolean;
    taxNotes: string;
  }>
): CareExpense | null {
  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const existing = parseExpenseRow(row);

  const irs502 = updates.irs502Eligible !== undefined ? updates.irs502Eligible : existing.irs502Eligible;
  const fsaHsa = updates.fsaHsaEligible !== undefined ? updates.fsaHsaEligible : existing.fsaHsaEligible;
  const medicaid =
    updates.medicaidLookbackVerified !== undefined
      ? updates.medicaidLookbackVerified
      : existing.medicaidLookbackVerified;
  const receipt = updates.receiptAttached !== undefined ? updates.receiptAttached : existing.receiptAttached;
  const taxNotes = updates.taxNotes !== undefined ? updates.taxNotes : existing.taxNotes;

  db.prepare(`
    UPDATE expenses
    SET irs_502_eligible = ?, fsa_hsa_eligible = ?, medicaid_lookback_verified = ?, receipt_attached = ?, tax_notes = ?
    WHERE id = ?
  `).run(irs502 ? 1 : 0, fsaHsa ? 1 : 0, medicaid ? 1 : 0, receipt ? 1 : 0, taxNotes, id);

  const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as Record<string, unknown>;
  return parseExpenseRow(updated);
}

export function updateMemberSplits(
  splits: Array<{ id: string; splitPercentage: number }>,
  unpaidCareHoursMonthly?: number,
  localCareOffsetNote?: string
): void {
  const tx = db.transaction(() => {
    const updateSplit = db.prepare('UPDATE family_members SET split_percentage = ? WHERE id = ?');
    for (const s of splits) {
      updateSplit.run(s.splitPercentage, s.id);
    }
    if (unpaidCareHoursMonthly !== undefined || localCareOffsetNote !== undefined) {
      const current = db.prepare('SELECT unpaid_care_hours_monthly, local_care_offset_note FROM care_settings WHERE id = 1').get() as {
        unpaid_care_hours_monthly: number;
        local_care_offset_note: string;
      };
      db.prepare('UPDATE care_settings SET unpaid_care_hours_monthly = ?, local_care_offset_note = ? WHERE id = 1').run(
        unpaidCareHoursMonthly ?? current.unpaid_care_hours_monthly,
        localCareOffsetNote ?? current.local_care_offset_note
      );
    }
  });
  tx();
}

export function updatePlanTier(planTier: 'free' | 'family_care'): void {
  db.prepare('UPDATE care_settings SET plan_tier = ? WHERE id = 1').run(planTier);
}

export function createSettlement(settlement: SettlementRecord): SettlementRecord {
  db.prepare(`
    INSERT INTO settlements (id, from_member_id, to_member_id, amount, method, settled_at, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    settlement.id,
    settlement.fromMemberId,
    settlement.toMemberId,
    settlement.amount,
    settlement.method,
    settlement.settledAt,
    settlement.note
  );
  return settlement;
}

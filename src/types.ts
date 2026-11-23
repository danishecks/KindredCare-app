export type PersonaType = 'local_coordinator' | 'out_of_state' | 'sandwich_parent';

export interface FamilyMember {
  id: string;
  name: string;
  roleLabel: string;
  personaType: PersonaType;
  location: string;
  splitPercentage: number;
  paymentHandle: string;
  paymentMethod: 'Venmo' | 'Zelle' | 'ACH';
  avatarUrl: string;
}

export interface CareSettings {
  careRecipient: string;
  recipientAvatar: string;
  medicaidLookbackStart: string;
  unpaidCareHoursMonthly: number;
  localCareOffsetNote: string;
  planTier: 'free' | 'family_care';
}

export interface CptLineItem {
  code: string;
  description: string;
  billed: number;
  allowed: number;
  status: 'valid' | 'flagged' | 'denied';
}

export type BillingErrorType =
  | 'Duplicate Charge'
  | 'Unbundled CPT Code'
  | 'No Surprises Act Violation'
  | 'Coding Mismatch'
  | 'Medical Necessity Denial';

export interface ClaimError {
  errorType: BillingErrorType;
  severity: 'high' | 'medium';
  title: string;
  description: string;
  estimatedOvercharge: number;
  policyCitation: string;
}

export type ClaimStatus =
  | 'Flagged'
  | 'Appeal Drafted'
  | 'Submitted'
  | 'Under Review'
  | 'Overturned'
  | 'Denied'
  | 'Cleared';

export interface MedicalClaim {
  id: string;
  provider: string;
  insurer: string;
  policyNumber: string;
  serviceDate: string;
  patientName: string;
  documentType: 'Hospital Bill' | 'Insurance EOB' | 'Medicare Summary Notice' | 'DME / Rehab Claim';
  billedAmount: number;
  allowedAmount: number;
  patientResponsibility: number;
  potentialSavings: number;
  status: ClaimStatus;
  denialReason: string;
  cptCodes: CptLineItem[];
  errors: ClaimError[];
  appealLetter: string;
  uploadedBy: string;
  submittedAt?: string | null;
  decisionAt?: string | null;
  createdAt: string;
}

export type ExpenseCategory = 'Medical' | 'Home Modification' | 'Groceries' | 'Paid Aide';

export interface CareExpense {
  id: string;
  vendor: string;
  description: string;
  expenseDate: string;
  amount: number;
  category: ExpenseCategory;
  paidByMemberId: string;
  irs502Eligible: boolean;
  fsaHsaEligible: boolean;
  medicaidLookbackVerified: boolean;
  receiptAttached: boolean;
  taxNotes: string;
  createdAt: string;
}

export interface SettlementRecord {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  method: 'Venmo' | 'Zelle' | 'ACH';
  settledAt: string;
  note: string;
}

export interface SuggestedTransfer {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

export interface MemberBalanceSummary {
  memberId: string;
  paidTotal: number;
  expectedShareTotal: number;
  settlementsSent: number;
  settlementsReceived: number;
  netBalance: number; // positive = owed money, negative = owes money
}

export interface WorkspaceSnapshot {
  settings: CareSettings;
  members: FamilyMember[];
  claims: MedicalClaim[];
  expenses: CareExpense[];
  settlements: SettlementRecord[];
  balances: MemberBalanceSummary[];
  suggestedTransfers: SuggestedTransfer[];
}

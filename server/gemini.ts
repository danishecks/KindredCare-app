import { GoogleGenAI, Type } from '@google/genai';
import type { ClaimError, CptLineItem, ExpenseCategory, MedicalClaim } from '../src/types';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please set a valid Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface AuditedClaimResult {
  provider: string;
  insurer: string;
  policyNumber: string;
  serviceDate: string;
  patientName: string;
  documentType: MedicalClaim['documentType'];
  billedAmount: number;
  allowedAmount: number;
  patientResponsibility: number;
  potentialSavings: number;
  denialReason: string;
  cptCodes: CptLineItem[];
  errors: ClaimError[];
}

export async function auditMedicalDocumentWithAI(input: {
  fileBase64?: string;
  mimeType?: string;
  rawText?: string;
  careRecipient: string;
}): Promise<AuditedClaimResult> {
  const ai = getAiClient();

  const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];
  if (input.fileBase64 && input.mimeType) {
    parts.push({
      inlineData: {
        mimeType: input.mimeType,
        data: input.fileBase64,
      },
    });
  }

  const promptText = `Analyze this US medical bill, Explanation of Benefits (EOB), or Medicare Summary Notice for patient ${input.careRecipient}.
${input.rawText ? `\nDocument text:\n${input.rawText}\n` : ''}
Extract all structured billing fields and perform a rigorous US healthcare billing error audit checking for:
1. Duplicate charges (identical CPT codes on the same date of service)
2. Unbundled CPT codes (CMS NCCI edit violations such as billing bundled procedures separately)
3. Out-of-network balance billing violations (federal No Surprises Act protections at in-network facilities)
4. Coding mismatches (diagnosis ICD-10 vs CPT preventive or acute mismatch)
5. Medical necessity denials that can be appealed under Medicare NCDs/LCDs or payer policy.

If no errors are found, return an empty errors array and potentialSavings of 0. Be precise with dollar amounts and cite real federal/CMS or standard payer policy references.`;

  parts.push({ text: promptText });

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: { parts },
    config: {
      systemInstruction:
        'You are a US medical billing auditor and administrative claims specialist. Extract factual data from medical bills/EOBs and identify standard billing errors. Return strictly valid JSON matching the schema.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          provider: { type: Type.STRING },
          insurer: { type: Type.STRING },
          policyNumber: { type: Type.STRING },
          serviceDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
          patientName: { type: Type.STRING },
          documentType: {
            type: Type.STRING,
            enum: ['Hospital Bill', 'Insurance EOB', 'Medicare Summary Notice', 'DME / Rehab Claim'],
          },
          billedAmount: { type: Type.NUMBER },
          allowedAmount: { type: Type.NUMBER },
          patientResponsibility: { type: Type.NUMBER },
          potentialSavings: { type: Type.NUMBER },
          denialReason: { type: Type.STRING },
          cptCodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                code: { type: Type.STRING },
                description: { type: Type.STRING },
                billed: { type: Type.NUMBER },
                allowed: { type: Type.NUMBER },
                status: { type: Type.STRING, enum: ['valid', 'flagged', 'denied'] },
              },
              required: ['code', 'description', 'billed', 'allowed', 'status'],
            },
          },
          errors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                errorType: {
                  type: Type.STRING,
                  enum: [
                    'Duplicate Charge',
                    'Unbundled CPT Code',
                    'No Surprises Act Violation',
                    'Coding Mismatch',
                    'Medical Necessity Denial',
                  ],
                },
                severity: { type: Type.STRING, enum: ['high', 'medium'] },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                estimatedOvercharge: { type: Type.NUMBER },
                policyCitation: { type: Type.STRING },
              },
              required: ['errorType', 'severity', 'title', 'description', 'estimatedOvercharge', 'policyCitation'],
            },
          },
        },
        required: [
          'provider',
          'insurer',
          'policyNumber',
          'serviceDate',
          'patientName',
          'documentType',
          'billedAmount',
          'allowedAmount',
          'patientResponsibility',
          'potentialSavings',
          'denialReason',
          'cptCodes',
          'errors',
        ],
      },
    },
  });

  const text = (response.text ?? '').trim();
  if (!text) {
    throw new Error('Empty response received from Gemini while auditing the medical document.');
  }
  return JSON.parse(text) as AuditedClaimResult;
}

export async function generateAppealLetterWithAI(
  claim: MedicalClaim,
  representativeName: string
): Promise<string> {
  const ai = getAiClient();

  const prompt = `Draft a formal, ready-to-fax/mail/upload administrative insurance appeal or medical billing dispute letter for the following claim.

Claim Details:
- Patient: ${claim.patientName}
- Authorized Family Representative: ${representativeName}
- Provider: ${claim.provider}
- Insurer: ${claim.insurer}
- Policy / Claim Reference: ${claim.policyNumber}
- Date of Service: ${claim.serviceDate}
- Document Type: ${claim.documentType}
- Billed Amount: $${claim.billedAmount.toFixed(2)}
- Patient Responsibility / Disputed Amount: $${claim.patientResponsibility.toFixed(2)}
- Potential Overcharge / Recovery: $${claim.potentialSavings.toFixed(2)}
- Denial / Issue Summary: ${claim.denialReason}
- CPT/HCPCS Line Items: ${JSON.stringify(claim.cptCodes)}
- Audited Errors & Policy Citations: ${JSON.stringify(claim.errors)}

Formatting requirements:
- Formal US business letter layout (Date, Insurer Appeals Dept address placeholder, Subject/Re block with Member & Policy ID, numbered Basis for Appeal citing the exact CPT codes and policy/federal statutes such as No Surprises Act, CMS NCCI, Medicare NCDs, or ACA Preventive rules where relevant, Requested Action with 30-day determination timeline, and Enclosure checklist).
- Keep tone firm, factual, respectful, and authoritative.
- Include a single quiet closing note stating this is an administrative appeal draft based on published insurer medical policy and federal billing protections for review by the member or authorized representative (not legal or medical advice).
- Return plain text only (no markdown backticks).`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are a careful healthcare administrative appeal drafting assistant. Write clear, accurate, policy-cited appeal letters ready for family review and submission.',
    },
  });

  const letter = (response.text ?? '').trim();
  if (!letter) {
    throw new Error('Gemini returned an empty appeal letter.');
  }
  return letter;
}

export interface ParsedReceiptResult {
  vendor: string;
  description: string;
  expenseDate: string;
  amount: number;
  category: ExpenseCategory;
  irs502Eligible: boolean;
  fsaHsaEligible: boolean;
  medicaidLookbackVerified: boolean;
  taxNotes: string;
}

export async function parseReceiptOrEmailWithAI(input: {
  fileBase64?: string;
  mimeType?: string;
  emailText?: string;
}): Promise<ParsedReceiptResult> {
  const ai = getAiClient();
  const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];

  if (input.fileBase64 && input.mimeType) {
    parts.push({
      inlineData: {
        mimeType: input.mimeType,
        data: input.fileBase64,
      },
    });
  }

  parts.push({
    text: `Extract structured caregiving expense details from this receipt or Amazon/pharmacy order email.
${input.emailText ? `\nOrder / Receipt Text:\n${input.emailText}\n` : ''}
Classify into one category: 'Medical', 'Home Modification', 'Groceries', or 'Paid Aide'.
Evaluate IRS Publication 502 medical deduction eligibility, FSA/HSA eligibility, and whether the document contains sufficient itemized proof (vendor, date, amount, item description) for a 60-month Medicaid Look-Back Period spend-down audit.`,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: { parts },
    config: {
      systemInstruction:
        'You are a family caregiving expense and IRS Publication 502 / FSA / Medicaid spend-down documentation specialist. Return valid JSON matching the schema.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          vendor: { type: Type.STRING },
          description: { type: Type.STRING },
          expenseDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
          amount: { type: Type.NUMBER },
          category: {
            type: Type.STRING,
            enum: ['Medical', 'Home Modification', 'Groceries', 'Paid Aide'],
          },
          irs502Eligible: { type: Type.BOOLEAN },
          fsaHsaEligible: { type: Type.BOOLEAN },
          medicaidLookbackVerified: { type: Type.BOOLEAN },
          taxNotes: { type: Type.STRING },
        },
        required: [
          'vendor',
          'description',
          'expenseDate',
          'amount',
          'category',
          'irs502Eligible',
          'fsaHsaEligible',
          'medicaidLookbackVerified',
          'taxNotes',
        ],
      },
    },
  });

  const text = (response.text ?? '').trim();
  if (!text) {
    throw new Error('Empty response received from Gemini while parsing receipt.');
  }
  return JSON.parse(text) as ParsedReceiptResult;
}

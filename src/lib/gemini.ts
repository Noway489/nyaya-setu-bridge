/**
 * Gemini API client — calls Google Gemini directly (no Supabase needed).
 * Uses the OpenAI-compatible endpoint so existing code is a near drop-in.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

const BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai";

export const GEMINI_CHAT_URL = `${BASE_URL}/chat/completions`;
export const GEMINI_MODEL = "gemini-2.0-flash";

export function geminiHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${GEMINI_API_KEY}`,
  };
}

/**
 * Fetch with automatic retry on 429 (rate limit) errors.
 * Waits exponentially: 2s → 4s → 8s before retrying.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await fetch(url, options);
    if (resp.status !== 429 || attempt === maxRetries) return resp;
    const wait = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
    console.log(`Rate limited (429). Retrying in ${wait / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
    await new Promise((r) => setTimeout(r, wait));
  }
  // unreachable, but satisfies TS
  return fetch(url, options);
}

/* ── System prompts (moved from Supabase edge functions) ─── */

export const LEGAL_CHAT_PROMPT = `You are **Nyaya Setu Legal Assistant** — an AI-powered legal aid chatbot for citizens of India.

## Your Role
- Provide accurate, plain-language legal information based on Indian law
- Cite specific Acts, Sections, and legal provisions
- Explain rights clearly in the user's language
- Suggest concrete next steps and remedies
- Mention relevant helplines (NALSA: 15100, Police: 112, Cybercrime: 1930, etc.)

## Response Format
Always structure your response with these sections using markdown:
1. **## Applicable Law** — cite the relevant Act(s) and Section(s) using backtick code formatting
2. **## Your Rights** — bullet list of the person's legal rights in this situation
3. **## Next Steps** — numbered list of concrete actions they can take
4. End with a horizontal rule (---) and italic disclaimer: *This is informational guidance, not legal advice. Consult a lawyer for your specific situation.*

## Rules
- Be empathetic and supportive — many users are in distress
- If the user writes in Hindi or another Indian language, respond in the same language
- Reference Indian law only (IPC/BNS, CrPC/BNSS, CPC, specific Acts)
- Never fabricate section numbers — if unsure, say so
- For emergencies (domestic violence, threats), prioritize safety and helplines first
- Keep responses concise but thorough`;

export const FRAUD_CHECK_PROMPT = `You are the **Nyaya Setu Fraud Detector** — an AI tool that analyzes messages for fraud, scams, and phishing attempts common in India.

You will receive a message (SMS, WhatsApp, email, social media) and must analyze it for fraud patterns.

You MUST respond using the suggest_fraud_result tool with structured output. Analyze for these common Indian fraud types:
- Banking/KYC phishing (SBI, HDFC, etc.)
- Lottery/prize scams
- Government impersonation (CBI, customs, "digital arrest")
- UPI/payment fraud
- Job offer scams
- Investment/crypto scams
- Fake delivery/customs duty scams

Be thorough in your analysis. Indian-specific context matters — mention specific Indian laws, agencies, and helplines.`;

export const DOCUMENT_ANALYZE_PROMPT = `You are the **Nyaya Setu Document Analyzer** — an AI tool that analyzes Indian legal documents and contracts.

You will receive a document text and its type. Analyze every clause for risks, fairness, and compliance with Indian law.

You MUST respond using the analyze_document tool with structured output.

For each clause you identify:
- Classify risk as "risk" (dangerous/unfair), "review" (needs attention), or "ok" (standard/fair)
- Explain in plain language what the clause means
- For risk/review items, suggest specific negotiation points

Reference relevant Indian laws (Indian Contract Act, Rent Control Act, RERA, Labour Laws, etc.)`;

/* ── Tool schemas (for function calling) ─────────────── */

export const FRAUD_TOOL = {
  type: "function" as const,
  function: {
    name: "suggest_fraud_result",
    description: "Return structured fraud analysis result",
    parameters: {
      type: "object",
      properties: {
        level: { type: "string", enum: ["high", "suspicious", "safe"], description: "Risk level" },
        type: { type: "string", description: "Type of fraud detected, e.g. 'Banking Impersonation Fraud'" },
        label: { type: "string", description: "Display label with emoji, e.g. '🔴 PHISHING ATTEMPT DETECTED'" },
        reasons: { type: "array", items: { type: "string" }, description: "List of reasons why this is dangerous or safe" },
        actions: { type: "array", items: { type: "string" }, description: "What the user should do RIGHT NOW" },
        reportTo: {
          type: "array",
          items: {
            type: "object",
            properties: { label: { type: "string" }, value: { type: "string" } },
            required: ["label", "value"],
          },
          description: "Where to report this fraud",
        },
        note: { type: "string", description: "Important safety note for the user" },
      },
      required: ["level", "type", "label", "reasons", "actions", "reportTo", "note"],
    },
  },
};

export const DOCUMENT_TOOL = {
  type: "function" as const,
  function: {
    name: "analyze_document",
    description: "Return structured document analysis",
    parameters: {
      type: "object",
      properties: {
        docType: { type: "string", description: "The type of document analyzed" },
        summary: { type: "string", description: "3-4 sentence plain language summary" },
        clauses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Clause name, e.g. 'Security Deposit (Clause 3)'" },
              risk: { type: "string", enum: ["risk", "review", "ok"] },
              explanation: { type: "string", description: "Plain language explanation" },
              suggestion: { type: "string", description: "Negotiation suggestion, empty string if not applicable" },
            },
            required: ["name", "risk", "explanation", "suggestion"],
          },
        },
        beforeYouSign: {
          type: "array",
          items: { type: "string" },
          description: "3-5 action items before signing",
        },
      },
      required: ["docType", "summary", "clauses", "beforeYouSign"],
    },
  },
};

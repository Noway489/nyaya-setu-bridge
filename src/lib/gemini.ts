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

/* ── Complaint Generator ─────────────────────────────── */

const POLLINATIONS_URL = "https://text.pollinations.ai/openai";

// Words that signal a non-document response (deprecation notice, errors, etc.)
const INVALID_RESPONSE_SIGNALS = [
  "pollinations legacy",
  "being deprecated",
  "migrate to our new service",
  "anonymous requests",
  "important notice",
];

const isValidDraft = (text: string): boolean => {
  if (!text?.trim() || text.length < 300) return false;
  const lower = text.toLowerCase();
  return !INVALID_RESPONSE_SIGNALS.some((signal) => lower.includes(signal));
};

export const COMPLAINT_GENERATE_PROMPT = `You are Nyaya Setu Legal Drafting AI — a specialist in drafting formally structured Indian legal documents.

## Your Task
Generate a COMPLETE, legally worded document based on the complaint type and user-provided details.

## Strict Rules
- Write the FULL document — not a summary or outline
- Use formal Indian legal language and conventions throughout
- Reference applicable Indian laws (IPC/BNS, CrPC/BNSS, RTI Act 2005, Consumer Protection Act 2019, Domestic Violence Act 2005, Labour Laws, etc.)
- Mark EVERY missing/unknown field as [FIELD_NAME] in square brackets so the user knows what to fill in
- Today's date placeholder: [DATE]
- Use correct Indian legal format for each document type:
  - FIR: Include "To, The SIC/Officer-in-Charge", relevant IPC/BNS section numbers, declaration
  - Legal Notice: Include demand clause with a specific deadline (e.g. 15 days)
  - Consumer Complaint: Include forum/commission hierarchy, prayer clause, verification
  - RTI Application: Cite RTI Act 2005 Section 6(1), address to Public Information Officer
  - Grievance Letter: Formal salutation, reference number, escalation clause
  - Labour Complaint: Address to Labour Commissioner, cite relevant labour law sections
  - Domestic Violence: Magistrate court format, DV Act 2005 sections, specific reliefs sought

## Output Format
Output ONLY the document in markdown. Begin directly with the document heading. No preamble, no explanation after.`;

/**
 * Generate a legal complaint draft.
 * Tries in order:
 *   1. Pollinations AI — mistral model (free, anonymous)
 *   2. Pollinations AI — llama model (free, anonymous)
 *   3. Supabase legal-chat edge function (already working in prod)
 *   4. Gemini (if VITE_GEMINI_API_KEY is set)
 */
export async function generateComplaint(
  complaintType: string,
  formData: Record<string, string>
): Promise<string> {
  const fieldLines = Object.entries(formData)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `- **${k}**: ${v}`)
    .join("\n");

  const userMessage = `Please draft a complete **${complaintType}** document using the following details:\n\n${fieldLines}\n\nGenerate the full, formal document now. Use [PLACEHOLDER] for any information not provided above.`;

  const messages = [
    { role: "system", content: COMPLAINT_GENERATE_PROMPT },
    { role: "user", content: userMessage },
  ];

  // ── 1 & 2: Pollinations AI — try multiple free models ──
  const pollinationsModels = ["mistral", "llama", "openai-large"];
  for (const model of pollinationsModels) {
    try {
      const resp = await fetch(POLLINATIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, temperature: 0.25, max_tokens: 2500 }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const draft = data.choices?.[0]?.message?.content as string | undefined;
        if (isValidDraft(draft ?? "")) {
          console.log(`✅ Pollinations [${model}] succeeded`);
          return draft!;
        }
        console.warn(`⚠️ Pollinations [${model}] returned invalid/notice content — trying next...`);
      }
    } catch (err) {
      console.warn(`Pollinations [${model}] error:`, err);
    }
  }

  // ── 3: Supabase legal-chat edge function (robust fallback, already live) ──
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      // Collect the SSE stream into a single string
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/legal-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ messages, language: "English" }),
      });

      if (resp.ok && resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") break;
            try {
              const parsed = JSON.parse(json);
              const chunk = parsed.choices?.[0]?.delta?.content;
              if (chunk) fullText += chunk;
            } catch { /* partial */ }
          }
        }

        if (isValidDraft(fullText)) {
          console.log("✅ Supabase legal-chat fallback succeeded");
          return fullText;
        }
      }
    } catch (err) {
      console.warn("Supabase legal-chat fallback error:", err);
    }
  }

  // ── 4: Gemini (requires VITE_GEMINI_API_KEY) ──
  if (!GEMINI_API_KEY) {
    throw new Error(
      "All AI services are temporarily unavailable. Please wait a moment and try again."
    );
  }

  const resp = await fetchWithRetry(GEMINI_CHAT_URL, {
    method: "POST",
    headers: geminiHeaders(),
    body: JSON.stringify({ model: GEMINI_MODEL, messages, temperature: 0.25, max_tokens: 2500 }),
  });

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({ error: { message: "Unknown API error" } }));
    throw new Error(errBody?.error?.message || `API error ${resp.status}`);
  }

  const data = await resp.json();
  const draft = data.choices?.[0]?.message?.content as string | undefined;
  if (!draft?.trim()) throw new Error("AI returned an empty response. Please try again.");
  return draft;
}

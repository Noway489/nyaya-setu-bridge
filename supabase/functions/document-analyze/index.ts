import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the **Nyaya Setu Document Analyzer** — an AI tool that analyzes Indian legal documents and contracts.

You will receive a document text and its type. Analyze every clause for risks, fairness, and compliance with Indian law.

You MUST respond ONLY with a JSON object. Ensure you follow this exact JSON structure:
{
  "docType": "Type of document analyzed",
  "summary": "3-4 sentence plain language summary",
  "clauses": [
    {
       "name": "Clause Name (e.g. Security Deposit)",
       "risk": "risk" | "review" | "ok",
       "explanation": "Plain language explanation",
       "suggestion": "Negotiation suggestion or empty"
    }
  ],
  "beforeYouSign": [
    "Action item 1",
    "Action item 2"
  ]
}

- Classify risk as "risk" (dangerous/unfair), "review" (needs attention), or "ok" (standard/fair).
- For risk/review items, ALWAYS suggest a specific negotiation point.
- Reference Indian Contract Act, Rent Control Acts, RERA, or Labour Laws appropriately.
Do not output markdown blocks, just the JSON string.
`;

const INVALID_SIGNALS = ["pollinations legacy", "being deprecated", "migrate to our new service"];
const isBadContent = (t: string) => INVALID_SIGNALS.some((s) => t.toLowerCase().includes(s));

const MODELS = ["mistral", "llama", "openai-large", "searchgpt", "openai"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, docType } = await req.json();

    for (const model of MODELS) {
      try {
        const response = await fetch("https://text.pollinations.ai/openai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            jsonMode: true,
            temperature: 0.1,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: `Analyze this ${docType}:\n\n---\n${text}\n---` },
            ],
          }),
        });

        if (!response.ok) continue;

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content || isBadContent(content)) continue;

        try {
            const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
            const result = JSON.parse(cleaned);
            if (result?.docType && result?.clauses && result?.beforeYouSign) {
                return new Response(JSON.stringify(result), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        } catch (e) {
            console.warn(`[document-analyze] Model ${model} JSON parse failed:`, e);
        }
      } catch (err) {
         console.warn(`[document-analyze] Model ${model} fetch failed`, err);
      }
    }

    return new Response(JSON.stringify({ error: "Could not parse AI response from any model." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("document-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

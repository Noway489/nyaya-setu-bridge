import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the **Nyaya Setu Document Analyzer** — an AI tool that analyzes Indian legal documents and contracts.

You will receive a document text and its type. Analyze every clause for risks, fairness, and compliance with Indian law.

You MUST respond using the analyze_document tool with structured output.

For each clause you identify:
- Classify risk as "risk" (dangerous/unfair), "review" (needs attention), or "ok" (standard/fair)
- Explain in plain language what the clause means
- For risk/review items, suggest specific negotiation points

Reference relevant Indian laws (Indian Contract Act, Rent Control Act, RERA, Labour Laws, etc.)`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, docType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze this ${docType}:\n\n---\n${text}\n---` },
        ],
        tools: [
          {
            type: "function",
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
                      additionalProperties: false,
                    },
                  },
                  beforeYouSign: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 action items before signing",
                  },
                },
                required: ["docType", "summary", "clauses", "beforeYouSign"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_document" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Could not parse AI response" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("document-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

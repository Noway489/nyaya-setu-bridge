import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the **Nyaya Setu Fraud Detector** — an AI tool that analyzes messages for fraud, scams, and phishing attempts common in India.

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message } = await req.json();
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
          { role: "user", content: `Analyze this message for fraud:\n\n"${message}"` },
        ],
        tools: [
          {
            type: "function",
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
                      properties: {
                        label: { type: "string" },
                        value: { type: "string" },
                      },
                      required: ["label", "value"],
                      additionalProperties: false,
                    },
                    description: "Where to report this fraud",
                  },
                  note: { type: "string", description: "Important safety note for the user" },
                },
                required: ["level", "type", "label", "reasons", "actions", "reportTo", "note"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_fraud_result" } },
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
    console.error("fraud-check error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

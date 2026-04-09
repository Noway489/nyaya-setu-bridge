import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

const PLAIN_JSON_PROMPT = `You are a fraud detection AI for India. Analyze the given message and return ONLY a JSON object with this EXACT structure (no markdown, no explanation):
{
  "level": "high" or "suspicious" or "safe",
  "type": "Name of fraud type or 'Legitimate Message'",
  "label": "Short label with emoji e.g. '🚨 PHISHING DETECTED' or '✅ APPEARS SAFE'",
  "reasons": ["reason1", "reason2", "reason3"],
  "actions": ["action1", "action2", "action3"],
  "reportTo": [{"label": "Cybercrime Helpline", "value": "1930"}],
  "note": "One sentence safety note"
}`;

const INVALID_SIGNALS = ["pollinations legacy", "being deprecated", "migrate to our new service", "enter.pollinations.ai"];
const isBadContent = (t: string) => INVALID_SIGNALS.some((s) => t.toLowerCase().includes(s));

const MODELS = ["mistral", "llama", "openai-large", "openai"];

const tryExtractResult = (data: any): Record<string, unknown> | null => {
  // Try tool_calls first
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try { return JSON.parse(toolCall.function.arguments); } catch { /* fall through */ }
  }
  // Try plain content JSON
  const content = data.choices?.[0]?.message?.content as string | undefined;
  if (content) {
    try {
      const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned);
    } catch { /* fall through */ }
  }
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, messageType = "SMS" } = await req.json();

    const userContent = `Analyze this ${messageType} message for fraud:\n\n"${message}"`;

    // ── Round 1: tool_calls approach with multiple models ──
    for (const model of MODELS) {
      try {
        const response = await fetch("https://text.pollinations.ai/openai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userContent },
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
                      level: { type: "string", enum: ["high", "suspicious", "safe"] },
                      type: { type: "string" },
                      label: { type: "string" },
                      reasons: { type: "array", items: { type: "string" } },
                      actions: { type: "array", items: { type: "string" } },
                      reportTo: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: { label: { type: "string" }, value: { type: "string" } },
                          required: ["label", "value"],
                        },
                      },
                      note: { type: "string" },
                    },
                    required: ["level", "type", "label", "reasons", "actions", "reportTo", "note"],
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "suggest_fraud_result" } },
          }),
        });

        if (!response.ok) continue;

        const data = await response.json();
        const textContent = data.choices?.[0]?.message?.content as string | undefined;
        if (textContent && isBadContent(textContent)) {
          console.warn(`[fraud-check] Model ${model} returned deprecation notice — trying next`);
          continue;
        }

        const result = tryExtractResult(data);
        if (result) {
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.warn(`[fraud-check] Model ${model} tool_calls approach failed — trying next`);
      } catch (err) {
        console.warn(`[fraud-check] Model ${model} error:`, err);
      }
    }

    // ── Round 2: plain JSON prompt fallback ──
    console.warn("[fraud-check] All tool_calls attempts failed. Trying plain JSON prompt...");
    for (const model of MODELS) {
      try {
        const response = await fetch("https://text.pollinations.ai/openai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: PLAIN_JSON_PROMPT },
              { role: "user", content: userContent },
            ],
            temperature: 0.1,
          }),
        });

        if (!response.ok) continue;

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content as string | undefined;
        if (!content || isBadContent(content)) continue;

        try {
          const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
          const result = JSON.parse(cleaned);
          if (result?.level && result?.reasons) {
            return new Response(JSON.stringify(result), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch { /* next model */ }
      } catch (err) {
        console.warn(`[fraud-check] Plain JSON model ${model} error:`, err);
      }
    }

    return new Response(JSON.stringify({ error: "Could not analyze message. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fraud-check fatal error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

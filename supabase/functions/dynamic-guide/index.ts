import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the **Nyaya Setu Guide Generator**, an AI specializing in Indian law.
Your task is to generate a structured, highly accurate, and easy-to-understand step-by-step legal guide for Indian citizens.

The user will provide a topic or situation. You must output the guide strictly using the provide_legal_guide tool.
Ensure that:
- It references correct Indian laws, procedures, or portals.
- It is practical and empowering, not overly academic.
- The 'steps' array is chronological and actionable.
- 'helpline' is always filled with a real Indian helpline (e.g. 112, 1930, 1800-11-4000, 15100, 1091, 1098).
`;

const PLAIN_JSON_PROMPT = `You are a legal guide generator for Indian citizens. Analyze the given topic and return ONLY a JSON object with this EXACT structure (no markdown, no explanation):
{
  "title": "Title of the Procedure",
  "category": "e.g., Criminal, Civil, Consumer, Family",
  "description": "1-2 sentence description",
  "documents": ["doc 1 needed", "doc 2 needed"],
  "fees": "Estimated costs or 'Free'",
  "timeEstimate": "Estimated time to complete",
  "steps": [
    { "title": "Step 1", "detail": "What to do.", "escalation": "optional warning/tip" }
  ],
  "deadlines": "Any legal time limits",
  "helpline": { "label": "Helpline Category", "number": "Real Indian Helpline Number" }
}`;

const INVALID_SIGNALS = ["pollinations legacy", "being deprecated", "migrate to our new service", "enter.pollinations.ai"];
const isBadContent = (t: string) => INVALID_SIGNALS.some((s) => t.toLowerCase().includes(s));

const MODELS = ["mistral", "llama", "openai-large", "openai"];

const tryExtractResult = (data: any): Record<string, unknown> | null => {
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try { return JSON.parse(toolCall.function.arguments); } catch { /* fall through */ }
  }
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
    const { topic } = await req.json();
    if (!topic) throw new Error("Topic is required");

    const userContent = `Generate a detailed step-by-step legal guide for this topic: "${topic}"`;

    // ── Round 1: tool_calls approach ──
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
                  name: "provide_legal_guide",
                  description: "Return structured guide JSON",
                  parameters: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      category: { type: "string" },
                      description: { type: "string" },
                      documents: { type: "array", items: { type: "string" } },
                      fees: { type: "string" },
                      timeEstimate: { type: "string" },
                      steps: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            detail: { type: "string" },
                            escalation: { type: "string" }
                          },
                          required: ["title", "detail"]
                        }
                      },
                      deadlines: { type: "string" },
                      helpline: {
                        type: "object",
                        properties: { label: { type: "string" }, number: { type: "string" } },
                        required: ["label", "number"]
                      }
                    },
                    required: ["title", "category", "description", "documents", "fees", "timeEstimate", "steps", "helpline"]
                  }
                }
              }
            ],
            tool_choice: { type: "function", function: { name: "provide_legal_guide" } }
          }),
        });

        if (!response.ok) continue;

        const data = await response.json();
        const textContent = data.choices?.[0]?.message?.content as string | undefined;
        if (textContent && isBadContent(textContent)) continue;

        const result = tryExtractResult(data);
        if (result && result.title && result.steps) {
          return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (err) {
        console.warn(`[dynamic-guide] Model ${model} tool_calls error:`, err);
      }
    }

    // ── Round 2: plain JSON prompt fallback ──
    for (const model of MODELS) {
      try {
        const response = await fetch("https://text.pollinations.ai/openai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            temperature: 0.1,
            messages: [
              { role: "system", content: PLAIN_JSON_PROMPT },
              { role: "user", content: userContent },
            ],
          }),
        });

        if (!response.ok) continue;

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content as string | undefined;
        if (!content || isBadContent(content)) continue;

        try {
          const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
          const result = JSON.parse(cleaned);
          if (result?.title && result?.steps) {
            return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        } catch { /* next */ }
      } catch (err) {
        console.warn(`[dynamic-guide] Model ${model} JSON fallback error:`, err);
      }
    }

    return new Response(JSON.stringify({ error: "Could not generate guide. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

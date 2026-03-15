import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are **Nyaya Setu Legal Assistant** — an AI-powered legal aid chatbot for citizens of India.

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langInstruction = language && language !== "English"
      ? `\n\nIMPORTANT: The user prefers ${language}. Respond in ${language} if possible.`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + langInstruction },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("legal-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
1. **## Applicable Law** — cite the relevant Act(s) and Section(s)
2. **## Your Rights** — bullet list of the person's legal rights
3. **## Next Steps** — numbered list of concrete actions they can take
4. End with a horizontal rule (---) and italic disclaimer

## Rules
- Be empathetic and supportive
- If the user writes in Hindi or another Indian language, respond in the same language
- Reference Indian law only (IPC/BNS, CrPC/BNSS, CPC, specific Acts)
- Never fabricate section numbers
- For emergencies, prioritize safety and helplines first
- Keep responses concise but thorough`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, language } = await req.json();

    const langInstruction =
      language && language !== "English"
        ? `\n\nIMPORTANT: The user prefers ${language}. Respond in ${language} if possible.`
        : "";

    const response = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai", // uses a capable open/free model under the hood
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + langInstruction },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const t = await response.text();
      console.error("Pollinations API error:", status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("legal-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

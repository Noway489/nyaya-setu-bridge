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

const INVALID_SIGNALS = [
  "pollinations legacy text api",
  "being deprecated",
  "migrate to our new service",
  "enter.pollinations.ai",
];

const isBadResponse = (text: string): boolean => {
  const lower = text.toLowerCase();
  return INVALID_SIGNALS.some((s) => lower.includes(s));
};

const MODELS = ["mistral", "llama", "openai-large", "openai"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, language } = await req.json();

    const langInstruction =
      language && language !== "English"
        ? `\n\nIMPORTANT: The user prefers ${language}. Respond in ${language} if possible.`
        : "";

    const systemMsg = { role: "system", content: SYSTEM_PROMPT + langInstruction };

    // Try each model in order — use streaming for the first valid response
    for (let i = 0; i < MODELS.length; i++) {
      const model = MODELS[i];
      const isLast = i === MODELS.length - 1;

      try {
        const response = await fetch("https://text.pollinations.ai/openai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            stream: true,
            messages: [systemMsg, ...messages],
          }),
        });

        if (!response.ok) {
          console.warn(`[legal-chat] Model ${model} returned ${response.status} — trying next`);
          if (!isLast) continue;
          return new Response(JSON.stringify({ error: "AI service error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // For all but the last fallback, peek at the first chunk to detect deprecation
        if (!isLast && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          const { value: firstChunk } = await reader.read();
          const firstText = decoder.decode(firstChunk ?? new Uint8Array());

          if (isBadResponse(firstText)) {
            console.warn(`[legal-chat] Model ${model} returned deprecation notice — trying next`);
            continue;
          }

          // Reconstruct valid stream: prepend the peeked chunk + rest
          const prependStream = new ReadableStream({
            start(controller) {
              if (firstChunk) controller.enqueue(firstChunk);
            },
          });
          // Pipe original reader into a new stream after the prefix
          const remainingStream = new ReadableStream({
            async start(controller) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) { controller.close(); break; }
                controller.enqueue(value);
              }
            },
          });

          // Merge: prefix + remaining (simplified — use TransformStream concatenation)
          const { readable, writable } = new TransformStream();
          const writer = writable.getWriter();
          (async () => {
            if (firstChunk) await writer.write(firstChunk);
            const r2 = remainingStream.getReader();
            while (true) {
              const { done, value } = await r2.read();
              if (done) { await writer.close(); break; }
              await writer.write(value);
            }
          })();

          return new Response(readable, {
            headers: {
              ...corsHeaders,
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        }

        // Last resort — stream directly
        return new Response(response.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } catch (fetchErr) {
        console.warn(`[legal-chat] Model ${model} fetch error:`, fetchErr);
        if (isLast) throw fetchErr;
      }
    }

    return new Response(JSON.stringify({ error: "All AI models unavailable" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("legal-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

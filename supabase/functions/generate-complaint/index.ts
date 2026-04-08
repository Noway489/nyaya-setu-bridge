import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { complaintType, formData } = await req.json();

const SYSTEM_PROMPT = `You are an expert Indian legal document drafter with 20 years of experience. 
Generate a formal, legally precise ${complaintType} in English based strictly on the details provided by the user. 
The document must:
- Follow the standard Indian legal format for a ${complaintType}.
- Use proper legal language, structure, and citations if broadly applicable.
- Include all standard sections (To, From, Subject, Body, Date, Signature block).
- Be formal, professional, and complete.

CRITICAL INSTRUCTION: You MUST incorporate the exact details provided by the user into the text. 
Do NOT generate a generic blank template if the user has provided the required information.
If the user provided their name, it must appear in the "From" section and the Signature block.
If the user provided a company name, address, or specific incident details, weave those directly into the body.
Only use placeholder text in [BRACKETS] for information that is explicitly missing from the provided details.

- End the draft with exactly this text on a new line: 'NOTE: This is an AI-generated draft. Please review with a qualified advocate before submission.'
- Return ONLY the exact text of the drafted document. Do NOT include any introductory or concluding conversational text. Just output the document itself formatted in markdown.`;

    // Convert the formData object into a readable string for the prompt
    let userDetails = `Please draft a ${complaintType} using the following details provided by the user:\n\n`;
    for (const [key, value] of Object.entries(formData)) {
       // Convert camelCase keys to readable labels loosely
       const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
       userDetails += `- **${label}**: ${value}\n`;
    }

    const response = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userDetails },
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

    const data = await response.json();
    const draftText = data.choices?.[0]?.message?.content;
    
    if (!draftText) {
      return new Response(JSON.stringify({ error: "Could not generate draft" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ draft: draftText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-complaint error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

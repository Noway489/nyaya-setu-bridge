import { useState, useRef, useEffect } from "react";
import { Send, Mic, RotateCcw } from "lucide-react";
import AshokaChakra from "@/components/AshokaChakra";

type Message = { role: "user" | "assistant"; content: string };

const exampleQuestions = [
  "मेरा मकान मालिक किराया बढ़ा रहा है",
  "My employer is not paying salary",
  "Cheque bounce — what can I do?",
  "How to file RTI?",
  "I was harassed at workplace",
  "Landlord asking me to vacate in 2 days",
];

const languages = ["English", "हिन्दी", "தமிழ்", "తెలుగు", "ಕನ್ನಡ", "বাংলা", "मराठी"];

const mockResponse = (q: string): string => {
  if (q.includes("किराया") || q.toLowerCase().includes("rent") || q.toLowerCase().includes("landlord")) {
    return `## Applicable Law\n\n\`Rent Control Act\` (varies by state) · \`Section 6-8\` — Restrictions on rent increase\n\n## Your Rights\n\n- Your landlord **cannot arbitrarily increase rent** during the tenancy period\n- Any increase must follow the percentage limits set by your state's Rent Control Act\n- You have the right to receive **written notice** (typically 1-3 months) before any increase\n- If you have a registered rental agreement, the terms in it are binding\n\n## Next Steps\n\n1. **Check your rental agreement** — look for clauses about rent revision\n2. **Verify state laws** — each state has different limits (typically 5-10% per year)\n3. **Send a written reply** to your landlord citing the Rent Control Act\n4. **If dispute continues**, approach the **Rent Control Court** in your district\n5. Contact **NALSA helpline: 15100** for free legal aid\n\n---\n*This is informational guidance, not legal advice. Consult a lawyer for your specific situation.*`;
  }
  if (q.toLowerCase().includes("salary") || q.toLowerCase().includes("employer")) {
    return `## Applicable Law\n\n\`Payment of Wages Act, 1936\` · \`Section 5\` — Time of payment\n\`Industrial Disputes Act, 1947\` · \`Section 33C\` — Recovery of money due\n\n## Your Rights\n\n- Employer **must pay wages within 7-10 days** after the wage period\n- Non-payment is a **criminal offence** under the Payment of Wages Act\n- You can claim **compensation** for delayed payment\n\n## Next Steps\n\n1. Send a **formal written notice** to your employer demanding payment\n2. File a complaint with the **Labour Commissioner** of your district\n3. If unresolved, approach the **Labour Court** under Section 33C\n4. Call the **Shram Suvidha Helpline: 1800-11-0039** (toll-free)\n\n---\n*This is informational guidance, not legal advice.*`;
  }
  return `## General Guidance\n\nThank you for your question. Based on your query, here is what you should know:\n\n## Your Rights\n\n- Every Indian citizen has the right to **access justice** under Article 39A\n- **Free legal aid** is available through NALSA for eligible persons\n- You can approach the nearest **District Legal Services Authority**\n\n## Next Steps\n\n1. Describe your situation in more detail for specific guidance\n2. Contact **NALSA helpline: 15100** for free legal consultation\n3. Visit your nearest **Legal Aid Clinic**\n\n---\n*This is informational guidance, not legal advice.*`;
};

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [activeLang, setActiveLang] = useState("English");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    await new Promise((r) => setTimeout(r, 1200));
    const reply = mockResponse(text);
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setIsTyping(false);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden w-72 flex-shrink-0 overflow-y-auto border-r bg-card p-5 md:block">
        <div className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Language</h3>
          <div className="flex flex-wrap gap-1.5">
            {languages.map((l) => (
              <button
                key={l}
                onClick={() => setActiveLang(l)}
                className={`rounded-pill px-3 py-1 text-xs font-medium transition-colors ${
                  activeLang === l
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Example Questions</h3>
          <div className="flex flex-col gap-1.5">
            {exampleQuestions.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="rounded-card border bg-card-warm px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-primary/30"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-card border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs text-primary font-medium">Need urgent help?</p>
          <p className="mt-1 text-xs text-muted-foreground">Call NALSA: <strong className="text-foreground">15100</strong></p>
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Legal Assistant</h2>
            <p className="text-xs text-muted-foreground">AI-powered · Not a lawyer</p>
          </div>
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw size={12} /> New
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <AshokaChakra size={40} className="text-primary/20 mb-4" />
              <p className="text-sm text-muted-foreground">Ask your legal question in any language.</p>
              {/* Mobile examples */}
              <div className="mt-4 flex flex-wrap justify-center gap-2 md:hidden">
                {exampleQuestions.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-pill border px-3 py-1 text-xs text-muted-foreground hover:border-primary/30"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}>
                {m.role === "assistant" && (
                  <div className="mr-2 mt-1 flex-shrink-0">
                    <AshokaChakra size={20} className="text-primary/50" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border bg-card-warm text-foreground"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none">
                      {m.content.split("\n").map((line, j) => {
                        if (line.startsWith("## ")) return <h3 key={j} className="mt-3 mb-1 text-sm font-bold text-foreground first:mt-0">{line.replace("## ", "")}</h3>;
                        if (line.startsWith("- ")) return <p key={j} className="ml-3 text-sm text-foreground">• {renderInline(line.slice(2))}</p>;
                        if (/^\d+\./.test(line)) return <p key={j} className="ml-3 text-sm text-foreground">{renderInline(line)}</p>;
                        if (line.startsWith("---")) return <hr key={j} className="my-2 border-border" />;
                        if (line.startsWith("*")) return <p key={j} className="text-xs italic text-muted-foreground">{line.replace(/\*/g, "")}</p>;
                        if (line.trim() === "") return null;
                        return <p key={j} className="text-sm text-foreground">{renderInline(line)}</p>;
                      })}
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 animate-fade-in-up">
                <AshokaChakra size={20} className="text-primary/50" />
                <div className="flex gap-1 rounded-2xl border bg-card-warm px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-2 w-2 rounded-full bg-muted-foreground/40"
                      style={{ animation: `bounce-dots 1.4s infinite ${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t bg-card px-4 py-3">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center gap-2 rounded-card border bg-background px-3 py-2">
              <button className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors" aria-label="Voice input">
                <Mic size={18} />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                placeholder="Type your question in any language..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className="flex-shrink-0 rounded-md bg-primary p-1.5 text-primary-foreground transition-colors disabled:opacity-40"
                aria-label="Send"
              >
                <Send size={14} />
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Powered by AI · Responses are informational only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function renderInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-secondary">{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  });
}

export default ChatPage;

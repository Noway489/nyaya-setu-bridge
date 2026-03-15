import { useState, useRef, useEffect } from "react";
import { Send, Mic, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import AshokaChakra from "@/components/AshokaChakra";
import { supabase } from "@/integrations/supabase/client";

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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-chat`;

async function streamChat({
  messages,
  language,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  language: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, language }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({ error: "Request failed" }));
    onError(data.error || `Error ${resp.status}`);
    return;
  }

  if (!resp.body) { onError("No response body"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { streamDone = true; break; }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // Flush remaining
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}

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
    if (!text.trim() || isTyping) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: newMessages,
        language: activeLang,
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => setIsTyping(false),
        onError: (err) => {
          toast.error(err);
          setIsTyping(false);
        },
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to get response. Please try again.");
      setIsTyping(false);
    }
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
            {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
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
                disabled={!input.trim() || isTyping}
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

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Mic, MicOff, RotateCcw, Copy, Check,
  MessageSquarePlus, Trash2, Menu, Scale, Shield,
  FileSearch, ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import Markdown from "react-markdown";
import AshokaChakra from "@/components/AshokaChakra";


/* ── Types ─────────────────────────────────────────────── */

type Message = { role: "user" | "assistant"; content: string; ts: number };

type Session = {
  id: string;
  title: string;
  messages: Message[];
  language: string;
  createdAt: number;
  updatedAt: number;
};

/* ── Constants ─────────────────────────────────────────── */

const STORAGE_KEY = "nyaya-setu-sessions";
const ACTIVE_KEY = "nyaya-setu-active";

const languages = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "ta-IN", label: "தமிழ்" },
  { code: "te-IN", label: "తెలుగు" },
  { code: "kn-IN", label: "ಕನ್ನಡ" },
  { code: "bn-IN", label: "বাংলা" },
  { code: "mr-IN", label: "मराठी" },
];

const exampleQuestions = [
  "मेरा मकान मालिक किराया बढ़ा रहा है",
  "My employer is not paying salary",
  "Cheque bounce — what can I do?",
  "How to file RTI?",
  "I was harassed at workplace",
  "Landlord asking me to vacate in 2 days",
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-chat`;

/* ── Helpers ───────────────────────────────────────────── */

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const loadSessions = (): Session[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveSessions = (s: Session[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

const loadActive = (): string | null => localStorage.getItem(ACTIVE_KEY);

const saveActive = (id: string | null) =>
  id
    ? localStorage.setItem(ACTIVE_KEY, id)
    : localStorage.removeItem(ACTIVE_KEY);

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/* ── SSE Streaming ─────────────────────────────────────── */

async function streamChat({
  messages,
  language,
  onDelta,
  onDone,
  onError,
}: {
  messages: { role: string; content: string }[];
  language: string;
  onDelta: (t: string) => void;
  onDone: () => void;
  onError: (e: string) => void;
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
    const d = await resp.json().catch(() => ({ error: "Request failed" }));
    onError(d.error || `Error ${resp.status}`);
    return;
  }
  if (!resp.body) {
    onError("No response body");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") {
        onDone();
        return;
      }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        /* partial chunk — ignore */
      }
    }
  }
  onDone();
}

/* ── Markdown components (react-markdown custom renderers) ── */

const mdComponents = {
  h1: ({ children }: any) => (
    <h3 className="mt-3 mb-1.5 text-sm font-bold text-foreground first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }: any) => (
    <h3 className="mt-3 mb-1.5 text-sm font-bold text-foreground first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }: any) => (
    <h4 className="mt-2 mb-1 text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }: any) => (
    <p className="my-1.5 text-sm leading-relaxed text-foreground">{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul className="my-1.5 ml-4 space-y-0.5 list-disc">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="my-1.5 ml-4 space-y-0.5 list-decimal">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="text-sm text-foreground leading-relaxed">{children}</li>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: any) => (
    <em className="italic text-muted-foreground">{children}</em>
  ),
  pre: ({ children }: any) => (
    <pre className="my-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">
      {children}
    </pre>
  ),
  code: ({ children }: any) => (
    <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">
      {children}
    </code>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="my-2 border-l-2 border-primary/30 pl-3 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  a: ({ href, children }: any) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline decoration-primary/30 hover:decoration-primary"
    >
      {children}
    </a>
  ),
  table: ({ children }: any) => (
    <div className="my-2 overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }: any) => (
    <th className="border-b bg-muted px-3 py-1.5 text-left text-xs font-semibold">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border-b px-3 py-1.5 text-xs">{children}</td>
  ),
};

/* ══════════════════════════════════════════════════════════
   ChatPage Component
   ══════════════════════════════════════════════════════════ */

const ChatPage = () => {
  /* ── State ──────────────────────────────────────────── */
  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [activeId, setActiveId] = useState<string | null>(loadActive);
  const [input, setInput] = useState("");
  const [activeLang, setActiveLang] = useState(languages[0]);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ── Refs ───────────────────────────────────────────── */
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<any>(null);

  /* ── Derived ───────────────────────────────────────── */
  const session = sessions.find((s) => s.id === activeId) || null;
  const messages = session?.messages ?? [];

  /* ── Persist to localStorage ───────────────────────── */
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);
  useEffect(() => {
    saveActive(activeId);
  }, [activeId]);

  /* ── Auto-scroll to bottom on new messages ─────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  /* ── Auto-resize textarea ──────────────────────────── */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  }, [input]);

  /* ── Scroll-to-bottom visibility ───────────────────── */
  const handleScroll = useCallback(() => {
    if (!chatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
    setShowScroll(scrollHeight - scrollTop - clientHeight > 120);
  }, []);

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  /* ── Session management ────────────────────────────── */
  const createSession = (firstMsg?: string): Session => {
    const s: Session = {
      id: uid(),
      title: firstMsg
        ? firstMsg.slice(0, 40) + (firstMsg.length > 40 ? "…" : "")
        : "New Chat",
      messages: [],
      language: activeLang.label,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setSidebarOpen(false);
    return s;
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  /* ── Send message ──────────────────────────────────── */
  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    let currentSession = session;
    if (!currentSession) {
      currentSession = createSession(text);
    }
    const sid = currentSession.id;

    const userMsg: Message = { role: "user", content: text, ts: Date.now() };
    const newMessages = [...currentSession.messages, userMsg];

    // Update title on first message & persist
    if (currentSession.messages.length === 0) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sid
            ? {
                ...s,
                title:
                  text.slice(0, 40) + (text.length > 40 ? "…" : ""),
                messages: newMessages,
                updatedAt: Date.now(),
              }
            : s
        )
      );
    } else {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sid
            ? { ...s, messages: newMessages, updatedAt: Date.now() }
            : s
        )
      );
    }

    setInput("");
    setIsTyping(true);

    let assistantSoFar = "";

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sid) return s;
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = { ...last, content: assistantSoFar };
          } else {
            msgs.push({
              role: "assistant",
              content: assistantSoFar,
              ts: Date.now(),
            });
          }
          return { ...s, messages: msgs, updatedAt: Date.now() };
        })
      );
    };

    try {
      await streamChat({
        messages: newMessages.map(({ role, content }) => ({ role, content })),
        language: activeLang.label,
        onDelta: upsert,
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

  /* ── Copy a message ────────────────────────────────── */
  const copyMessage = (idx: number) => {
    navigator.clipboard.writeText(messages[idx].content);
    setCopiedIdx(idx);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  /* ── Export entire chat ────────────────────────────── */
  const exportChat = () => {
    if (!session) return;
    const text = session.messages
      .map(
        (m) =>
          `${m.role === "user" ? "You" : "Nyaya Setu"}:\n${m.content}`
      )
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Chat copied to clipboard");
  };

  /* ── Voice input (Web Speech API) ──────────────────── */
  const toggleVoice = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }

    if (isRecording && recRef.current) {
      recRef.current.stop();
      setIsRecording(false);
      return;
    }

    const rec = new SR();
    rec.lang = activeLang.code;
    rec.interimResults = false;
    rec.continuous = false;
    recRef.current = rec;

    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " : "") + transcript);
      setIsRecording(false);
    };
    rec.onerror = () => {
      setIsRecording(false);
      toast.error("Voice recognition failed. Try again.");
    };
    rec.onend = () => setIsRecording(false);

    rec.start();
    setIsRecording(true);
  };

  /* ══════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════ */

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* ──────────── Sidebar ──────────── */}
      <aside
        className={`
          fixed inset-y-14 left-0 z-40 w-72 flex-shrink-0 transform border-r bg-card
          transition-transform duration-300 ease-in-out
          md:relative md:inset-auto md:z-auto md:translate-x-0
          ${sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"}
        `}
      >
        <div className="flex h-full flex-col">
          {/* New chat */}
          <div className="border-b p-3">
            <button
              onClick={() => {
                setActiveId(null);
                setSidebarOpen(false);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <MessageSquarePlus size={16} /> New Chat
            </button>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Chats
            </h3>
            {sessions.length === 0 && (
              <p className="text-xs italic text-muted-foreground">
                No conversations yet
              </p>
            )}
            <div className="flex flex-col gap-1">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={`group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer ${
                    activeId === s.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  onClick={() => {
                    setActiveId(s.id);
                    setSidebarOpen(false);
                  }}
                >
                  <span className="flex-1 truncate">{s.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(s.id);
                    }}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    aria-label="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Example questions */}
          <div className="border-t p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Try Asking
            </h3>
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
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

          {/* Helpline */}
          <div className="border-t p-3">
            <div className="rounded-card border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-medium text-primary">
                Need urgent help?
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Call NALSA:{" "}
                <strong className="text-foreground">15100</strong>
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ──────────── Chat Area ──────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b px-4 py-2.5">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground md:hidden transition-colors"
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">
              {session ? session.title : "Legal Assistant"}
            </h2>
            <p className="text-xs text-muted-foreground">
              AI-powered · Not a lawyer
            </p>
          </div>

          {/* Language pills (desktop) */}
          <div className="hidden sm:flex items-center gap-1 overflow-x-auto">
            {languages.map((l) => (
              <button
                key={l.label}
                onClick={() => setActiveLang(l)}
                className={`whitespace-nowrap rounded-pill px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeLang.label === l.label
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          {session && (
            <div className="flex items-center gap-1">
              <button
                onClick={exportChat}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Copy entire chat"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={() => setActiveId(null)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw size={12} /> New
              </button>
            </div>
          )}
        </div>

        {/* Language bar (mobile only) */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b px-4 py-2 sm:hidden scrollbar-hide">
          {languages.map((l) => (
            <button
              key={l.label}
              onClick={() => setActiveLang(l)}
              className={`whitespace-nowrap rounded-pill px-2.5 py-1 text-xs font-medium transition-colors flex-shrink-0 ${
                activeLang.label === l.label
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* ──────────── Messages ──────────── */}
        <div
          ref={chatRef}
          onScroll={handleScroll}
          className="relative flex-1 overflow-y-auto px-4 py-6"
        >
          {/* Welcome screen (no messages) */}
          {messages.length === 0 && !isTyping && (
            <div className="flex h-full flex-col items-center justify-center text-center animate-fade-in-up">
              {/* Glowing Ashoka Chakra */}
              <div className="relative mb-6">
                <div className="absolute inset-0 scale-150 rounded-full bg-primary/10 blur-2xl" />
                <AshokaChakra size={56} className="relative text-primary/30" />
              </div>

              <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
                How can I help you today?
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Ask your legal question in any Indian language. I'll identify
                the applicable law, your rights, and next steps.
              </p>

              {/* Feature cards */}
              <div className="mt-8 grid w-full max-w-lg gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: Scale,
                    title: "Legal Rights",
                    desc: "Know your rights under Indian law",
                  },
                  {
                    icon: Shield,
                    title: "Fraud Alerts",
                    desc: "Detect scams & phishing",
                  },
                  {
                    icon: FileSearch,
                    title: "Documents",
                    desc: "Analyze legal contracts",
                  },
                ].map((f) => (
                  <div
                    key={f.title}
                    className="rounded-card border bg-card-warm p-4 text-center transition-all hover:border-primary/20 hover:shadow-sm"
                  >
                    <f.icon
                      size={20}
                      className="mx-auto mb-2 text-primary/60"
                    />
                    <p className="text-xs font-semibold text-foreground">
                      {f.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {f.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Quick question pills */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {exampleQuestions.slice(0, 4).map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-pill border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          <div className="mx-auto max-w-2xl space-y-5">
            {messages.map((m, i) => (
              <div
                key={`${session?.id}-${i}`}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                } animate-fade-in-up`}
              >
                {/* Assistant avatar */}
                {m.role === "assistant" && (
                  <div className="mr-3 mt-1 flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <AshokaChakra size={18} className="text-primary" />
                    </div>
                  </div>
                )}

                <div className="group relative max-w-[85%]">
                  {/* Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "chat-glass border border-border/60 text-foreground shadow-sm"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose-chat">
                        <Markdown components={mdComponents}>
                          {m.content}
                        </Markdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>

                  {/* Timestamp + actions */}
                  <div
                    className={`mt-1 flex items-center gap-2 ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span className="text-[10px] text-muted-foreground/60">
                      {fmtTime(m.ts)}
                    </span>
                    {m.role === "assistant" && (
                      <button
                        onClick={() => copyMessage(i)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                        aria-label="Copy message"
                      >
                        {copiedIdx === i ? (
                          <Check size={12} className="text-success" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator — shimmer skeleton */}
            {isTyping &&
              messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex items-start gap-3 animate-fade-in-up">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <AshokaChakra
                      size={18}
                      className="text-primary animate-spin-slow"
                    />
                  </div>
                  <div className="flex-1 max-w-[70%] space-y-2.5 rounded-2xl border bg-card p-4">
                    <div className="h-3 w-3/4 rounded shimmer-line" />
                    <div className="h-3 w-1/2 rounded shimmer-line" />
                    <div className="h-3 w-2/3 rounded shimmer-line" />
                  </div>
                </div>
              )}

            <div ref={bottomRef} />
          </div>

          {/* Scroll-to-bottom FAB */}
          {showScroll && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full border bg-card shadow-md transition-all hover:shadow-lg animate-fade-in-up"
              aria-label="Scroll to bottom"
            >
              <ArrowDown size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>

        {/* ──────────── Input area ──────────── */}
        <div className="border-t bg-card px-4 py-3">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-end gap-2 rounded-2xl border bg-background px-3 py-2 focus-within:border-primary/40 transition-colors">
              {/* Voice button */}
              <button
                onClick={toggleVoice}
                className={`flex-shrink-0 rounded-full p-2 transition-all ${
                  isRecording
                    ? "bg-destructive/10 text-destructive voice-pulse"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                }`}
                aria-label={isRecording ? "Stop recording" : "Voice input"}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Text input */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Type your question in any language..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none max-h-32"
                style={{ minHeight: "1.5rem" }}
              />

              {/* Send button */}
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                className="flex-shrink-0 rounded-full bg-primary p-2 text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </div>

            {/* Hints */}
            <div className="mt-1.5 flex items-center justify-between px-1">
              <p className="text-[10px] text-muted-foreground">
                {isRecording ? (
                  <span className="text-destructive font-medium">
                    ● Listening…
                  </span>
                ) : (
                  "Shift+Enter for new line"
                )}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Powered by AI · Responses are informational only
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

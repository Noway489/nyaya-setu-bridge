import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Send, Mic, MicOff, RotateCcw, Copy, Check,
  MessageSquarePlus, Trash2, Menu, Scale, Shield,
  FileSearch, ArrowDown, Square, Search, X,
  ThumbsUp, ThumbsDown, Clock, MessagesSquare,
  Gavel, UserCheck, ShoppingCart, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import AshokaChakra from "@/components/AshokaChakra";
import { LEGAL_CHAT_PROMPT } from "@/lib/gemini";
import { fadeInUp, staggerContainer } from "@/lib/animations";

/* ── Types ─────────────────────────────────────────────── */

type Message = {
  role: "user" | "assistant";
  content: string;
  ts: number;
  reaction?: "up" | "down" | null;
};

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
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-chat`;
const POLLINATIONS_DIRECT = "https://text.pollinations.ai/openai";

const INVALID_SIGNALS = [
  "pollinations legacy",
  "being deprecated",
  "migrate to our new service",
  "enter.pollinations.ai",
  "anonymous requests",
];

const isDeprecationContent = (text: string) => {
  const lower = text.toLowerCase();
  return INVALID_SIGNALS.some((s) => lower.includes(s));
};

const languages = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "ta-IN", label: "தமிழ்" },
  { code: "te-IN", label: "తెలుగు" },
  { code: "kn-IN", label: "ಕನ್ನಡ" },
  { code: "bn-IN", label: "বাংলা" },
  { code: "mr-IN", label: "मराठी" },
];

const legalTopics = [
  { icon: Gavel, title: "FIR & Police", color: "text-destructive", bg: "bg-destructive/10",
    query: "I want to file an FIR at the police station. What is the process and what documents do I need?" },
  { icon: Scale, title: "Tenant Rights", color: "text-primary", bg: "bg-primary/10",
    query: "My landlord is harassing me and not returning my security deposit. What are my rights as a tenant in India?" },
  { icon: UserCheck, title: "Workplace Rights", color: "text-[#8b5cf6]", bg: "bg-[#8b5cf6]/10",
    query: "My employer has not paid my salary for 2 months and is threatening to terminate me. What legal action can I take?" },
  { icon: ShoppingCart, title: "Consumer Rights", color: "text-secondary", bg: "bg-secondary/10",
    query: "I received a defective product and the seller is refusing a refund. How do I file a consumer complaint?" },
  { icon: FileSearch, title: "RTI Application", color: "text-success", bg: "bg-success/10",
    query: "How do I file an RTI application to get information from a government department? Explain the complete process." },
  { icon: BookOpen, title: "Family Law", color: "text-warning", bg: "bg-warning/10",
    query: "What are the legal grounds and process for divorce in India? What are the rights of both parties?" },
];

const followUpSuggestions: Record<string, string[]> = {
  fir: ["What documents do I need to file an FIR?", "Can police legally refuse to file an FIR?", "What happens after the FIR is registered?"],
  rti: ["How much is the RTI application fee?", "What is the deadline for a PIO response?", "What if the PIO doesn't respond?"],
  consumer: ["Where exactly do I file the consumer complaint?", "How long does consumer court usually take?", "What compensation can I claim?"],
  labour: ["How do I file a formal labour complaint?", "What is the law on notice period?", "Can an employer withhold my salary?"],
  rent: ["Can my landlord increase rent without notice?", "What is the legal eviction process?", "What records should I keep as a tenant?"],
  family: ["How long does a mutual divorce take?", "What are the child custody laws in India?", "What is the maintenance allowance law?"],
  default: ["What documents do I need for this?", "Where should I approach first?", "What are my strongest legal options?"],
};

const getFollowUps = (content: string): string[] => {
  const lower = content.toLowerCase();
  if (lower.includes("fir") || lower.includes("police") || lower.includes("cognizable")) return followUpSuggestions.fir;
  if (lower.includes("rti") || lower.includes("right to information") || lower.includes("pio")) return followUpSuggestions.rti;
  if (lower.includes("consumer") || lower.includes("refund") || lower.includes("defective")) return followUpSuggestions.consumer;
  if (lower.includes("employer") || lower.includes("salary") || lower.includes("labour") || lower.includes("termination")) return followUpSuggestions.labour;
  if (lower.includes("landlord") || lower.includes("tenant") || lower.includes("rent") || lower.includes("evict")) return followUpSuggestions.rent;
  if (lower.includes("divorce") || lower.includes("custody") || lower.includes("maintenance") || lower.includes("family")) return followUpSuggestions.family;
  return followUpSuggestions.default;
};

/* ── Helpers ───────────────────────────────────────────── */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const loadSessions = (): Session[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
};
const saveSessions = (s: Session[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
const loadActive = (): string | null => localStorage.getItem(ACTIVE_KEY);
const saveActive = (id: string | null) =>
  id ? localStorage.setItem(ACTIVE_KEY, id) : localStorage.removeItem(ACTIVE_KEY);

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const fmtRelative = (ts: number): string => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
};

/* ── Markdown renderers ─────────────────────────────────── */

const mdComponents = {
  h1: ({ children }: any) => <h3 className="mt-3 mb-1.5 text-sm font-bold text-foreground first:mt-0">{children}</h3>,
  h2: ({ children }: any) => <h3 className="mt-3 mb-1.5 text-sm font-bold text-foreground first:mt-0">{children}</h3>,
  h3: ({ children }: any) => <h4 className="mt-2 mb-1 text-sm font-semibold text-foreground first:mt-0">{children}</h4>,
  p: ({ children }: any) => <p className="my-1.5 text-sm leading-relaxed text-foreground">{children}</p>,
  ul: ({ children }: any) => <ul className="my-1.5 ml-4 space-y-0.5 list-disc">{children}</ul>,
  ol: ({ children }: any) => <ol className="my-1.5 ml-4 space-y-0.5 list-decimal">{children}</ol>,
  li: ({ children }: any) => <li className="text-sm text-foreground leading-relaxed">{children}</li>,
  strong: ({ children }: any) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }: any) => <em className="italic text-muted-foreground">{children}</em>,
  pre: ({ children }: any) => <pre className="my-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">{children}</pre>,
  code: ({ children }: any) => <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-secondary">{children}</code>,
  blockquote: ({ children }: any) => <blockquote className="my-2 border-l-2 border-primary/30 pl-3 italic text-muted-foreground">{children}</blockquote>,
  hr: () => <hr className="my-3 border-border" />,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 hover:decoration-primary">{children}</a>
  ),
};

/* ══════════════════════════════════════════════════════════
   ChatPage Component
   ══════════════════════════════════════════════════════════ */

const ChatPage = () => {
  const location = useLocation();

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
  const [sessionSearch, setSessionSearch] = useState("");
  const [followUps, setFollowUps] = useState<string[]>([]);

  /* ── Refs ───────────────────────────────────────────── */
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ── Derived ───────────────────────────────────────── */
  const session = sessions.find((s) => s.id === activeId) || null;
  const messages = session?.messages ?? [];
  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(sessionSearch.toLowerCase())
  );

  /* ── Persist ──────────────────────────────────────── */
  useEffect(() => { saveSessions(sessions); }, [sessions]);
  useEffect(() => { saveActive(activeId); }, [activeId]);

  /* ── Handle initialMessage from ComplaintResult ─── */
  useEffect(() => {
    const initMsg = (location.state as any)?.initialMessage as string | undefined;
    if (initMsg?.trim()) {
      // Small delay to let component fully mount
      const t = setTimeout(() => sendMessage(initMsg), 300);
      // Clear the navigation state to prevent re-send on refresh
      window.history.replaceState({}, document.title);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-scroll ───────────────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  /* ── Auto-resize textarea ───────────────────────── */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  }, [input]);

  /* ── Scroll-to-bottom visibility ─────────────────── */
  const handleScroll = useCallback(() => {
    if (!chatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
    setShowScroll(scrollHeight - scrollTop - clientHeight > 120);
  }, []);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  /* ── Session management ──────────────────────────── */
  const createSession = (firstMsg?: string): Session => {
    const s: Session = {
      id: uid(),
      title: firstMsg ? firstMsg.slice(0, 40) + (firstMsg.length > 40 ? "…" : "") : "New Chat",
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

  const clearAllSessions = () => {
    setSessions([]);
    setActiveId(null);
    toast.success("All conversations cleared");
  };

  /* ── Reaction ───────────────────────────────────── */
  const addReaction = (msgIdx: number, reaction: "up" | "down") => {
    if (!session) return;
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== session.id) return s;
        const msgs = [...s.messages];
        msgs[msgIdx] = {
          ...msgs[msgIdx],
          reaction: msgs[msgIdx].reaction === reaction ? null : reaction,
        };
        return { ...s, messages: msgs };
      })
    );
  };

  /* ── Direct Pollinations fallback (bypasses edge fn) */
  const streamDirect = useCallback(async ({
    messagesToSend,
    language,
    sid,
    signal,
    onDelta,
    onDone,
    onError,
  }: {
    messagesToSend: { role: string; content: string }[];
    language: string;
    sid: string;
    signal: AbortSignal;
    onDelta: (t: string) => void;
    onDone: () => void;
    onError: (e: string) => void;
  }) => {
    const langInstruction = language !== "English"
      ? `\n\nIMPORTANT: Respond in ${language}.` : "";

    const models = ["mistral", "llama", "openai-large"];
    for (const model of models) {
      if (signal.aborted) return;
      try {
        const resp = await fetch(POLLINATIONS_DIRECT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            model,
            stream: true,
            messages: [
              { role: "system", content: LEGAL_CHAT_PROMPT + langInstruction },
              ...messagesToSend,
            ],
          }),
        });

        if (!resp.ok || !resp.body) continue;

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let textSoFar = "";
        let badDetected = false;

        while (true) {
          if (signal.aborted) { reader.cancel(); return; }
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
            if (json === "[DONE]") { onDone(); return; }
            try {
              const parsed = JSON.parse(json);
              const c = parsed.choices?.[0]?.delta?.content;
              if (c) {
                textSoFar += c;
                if (textSoFar.length < 400 && isDeprecationContent(textSoFar)) {
                  badDetected = true;
                  break;
                }
                onDelta(c);
              }
            } catch { /* partial */ }
          }
          if (badDetected) break;
        }

        if (!badDetected) { onDone(); return; }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.warn(`Direct fallback [${model}] error:`, err);
      }
    }
    onError("Failed to reach AI. Please try again.");
  }, []);

  /* ── Stream via Supabase edge function ────────────── */
  const streamViaEdge = useCallback(async ({
    messagesToSend,
    language,
    signal,
    onDelta,
    onDone,
    onError,
  }: {
    messagesToSend: { role: string; content: string }[];
    language: string;
    signal: AbortSignal;
    onDelta: (t: string) => void;
    onDone: () => void;
    onError: (e: string) => void;
  }): Promise<boolean> => {
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: messagesToSend, language }),
        signal,
      });

      if (!resp.ok || !resp.body) return false;

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let textSoFar = "";
      let badDetected = false;

      while (true) {
        if (signal.aborted) { reader.cancel(); return true; }
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
          if (json === "[DONE]") { onDone(); return true; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              textSoFar += c;
              if (textSoFar.length < 400 && isDeprecationContent(textSoFar)) {
                badDetected = true;
                break;
              }
              onDelta(c);
            }
          } catch { /* partial */ }
        }
        if (badDetected) break;
      }

      if (badDetected) return false; // trigger fallback
      onDone();
      return true;
    } catch (err: any) {
      if (err.name === "AbortError") return true;
      return false;
    }
  }, []);

  /* ── Send message ──────────────────────────────────── */
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    setFollowUps([]);

    let currentSession = sessions.find((s) => s.id === activeId) ?? null;
    if (!currentSession) {
      currentSession = createSession(text);
    }
    const sid = currentSession.id;

    const userMsg: Message = { role: "user", content: text, ts: Date.now() };
    const newMessages = [...currentSession.messages, userMsg];

    setSessions((prev) =>
      prev.map((s) =>
        s.id === sid
          ? {
              ...s,
              title: s.messages.length === 0
                ? text.slice(0, 40) + (text.length > 40 ? "…" : "")
                : s.title,
              messages: newMessages,
              updatedAt: Date.now(),
            }
          : s
      )
    );

    setInput("");
    setIsTyping(true);

    const abort = new AbortController();
    abortRef.current = abort;

    let assistantSoFar = "";
    let deprecationDetected = false;

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
            msgs.push({ role: "assistant", content: assistantSoFar, ts: Date.now() });
          }
          return { ...s, messages: msgs, updatedAt: Date.now() };
        })
      );
    };

    const wipeAssistantMsg = () => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sid) return s;
          const msgs = s.messages.filter((m) => !(m.role === "assistant" && m.content === assistantSoFar));
          return { ...s, messages: msgs };
        })
      );
      assistantSoFar = "";
    };

    const onDone = () => {
      setIsTyping(false);
      if (assistantSoFar) setFollowUps(getFollowUps(assistantSoFar));
    };

    const onError = (err: string) => {
      toast.error(err);
      setIsTyping(false);
    };

    const msgPayload = newMessages.map(({ role, content }) => ({ role, content }));

    // Try edge function first
    const edgeOk = await streamViaEdge({
      messagesToSend: msgPayload,
      language: activeLang.label,
      signal: abort.signal,
      onDelta: (chunk) => {
        if (abort.signal.aborted) return;
        upsert(chunk);
      },
      onDone,
      onError,
    });

    // If edge function returned deprecation content, wipe and retry direct
    if (!edgeOk && !abort.signal.aborted) {
      deprecationDetected = true;
      wipeAssistantMsg();
      await streamDirect({
        messagesToSend: msgPayload,
        language: activeLang.label,
        sid,
        signal: abort.signal,
        onDelta: (chunk) => {
          if (abort.signal.aborted) return;
          upsert(chunk);
        },
        onDone,
        onError,
      });
    }
  }, [sessions, activeId, activeLang, isTyping, streamViaEdge, streamDirect]);

  /* ── Stop generating ────────────────────────────── */
  const stopGenerating = () => {
    abortRef.current?.abort();
    setIsTyping(false);
  };

  /* ── Copy message ────────────────────────────────── */
  const copyMessage = (idx: number) => {
    navigator.clipboard.writeText(messages[idx].content);
    setCopiedIdx(idx);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  /* ── Export chat ─────────────────────────────────── */
  const exportChat = () => {
    if (!session) return;
    const text = session.messages
      .map((m) => `${m.role === "user" ? "You" : "Nyaya Setu"}:\n${m.content}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Chat copied to clipboard");
  };

  /* ── Voice input ─────────────────────────────────── */
  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice input not supported in this browser."); return; }
    if (isRecording && recRef.current) { recRef.current.stop(); setIsRecording(false); return; }
    const rec = new SR();
    rec.lang = activeLang.code;
    rec.interimResults = false;
    rec.continuous = false;
    recRef.current = rec;
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " : "") + t);
      setIsRecording(false);
    };
    rec.onerror = () => { setIsRecording(false); toast.error("Voice recognition failed."); };
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
          fixed inset-y-14 left-0 z-40 w-72 flex-shrink-0 flex flex-col border-r bg-card
          transform transition-transform duration-300 ease-in-out
          md:relative md:inset-auto md:z-auto md:translate-x-0
          ${sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"}
        `}
      >
        {/* New chat */}
        <div className="border-b p-3">
          <button
            onClick={() => { setActiveId(null); setSidebarOpen(false); setFollowUps([]); }}
            id="new-chat-btn"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <MessageSquarePlus size={16} /> New Chat
          </button>
        </div>

        {/* Search */}
        <div className="border-b px-3 py-2">
          <div className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5">
            <Search size={13} className="shrink-0 text-muted-foreground" />
            <input
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              placeholder="Search conversations…"
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
            />
            {sessionSearch && (
              <button onClick={() => setSessionSearch("")}><X size={12} className="text-muted-foreground" /></button>
            )}
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Conversations
            </h3>
            {sessions.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm("Clear all conversations?")) clearAllSessions();
                }}
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {filteredSessions.length === 0 && (
            <p className="text-xs italic text-muted-foreground">
              {sessionSearch ? "No matches found" : "No conversations yet"}
            </p>
          )}

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-1"
          >
            {filteredSessions.map((s, i) => (
              <motion.div
                key={s.id}
                variants={fadeInUp}
                custom={i}
                className={`group flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors cursor-pointer ${
                  activeId === s.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => { setActiveId(s.id); setSidebarOpen(false); setFollowUps([]); }}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium leading-tight">{s.title}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Clock size={9} className="shrink-0 opacity-60" />
                    <span className="text-[10px] opacity-60">{fmtRelative(s.updatedAt)}</span>
                    <span className="text-[10px] opacity-60">·</span>
                    <MessagesSquare size={9} className="shrink-0 opacity-60" />
                    <span className="text-[10px] opacity-60">{s.messages.length}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all mt-0.5"
                  aria-label="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* NALSA helpline footer */}
        <div className="border-t p-3">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-medium text-primary">Need urgent help?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              NALSA Free Legal Aid: <strong className="text-foreground">15100</strong>
            </p>
          </div>
        </div>
      </aside>

      {/* Sidebar backdrop (mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ──────────── Chat Area ──────────── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Chat header */}
        <div className="flex items-center gap-3 border-b px-4 py-2.5 bg-card">
          <button
            onClick={() => setSidebarOpen(true)}
            id="open-sidebar-btn"
            className="flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground md:hidden transition-colors"
          >
            <Menu size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">
              {session ? session.title : "Legal Assistant"}
            </h2>
            <p className="text-xs text-muted-foreground">AI-powered · Not a lawyer · Informational only</p>
          </div>

          {/* Language pills — desktop */}
          <div className="hidden sm:flex items-center gap-1 overflow-x-auto max-w-xs">
            {languages.map((l) => (
              <button
                key={l.label}
                onClick={() => setActiveLang(l)}
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
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
              <button onClick={exportChat} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors" title="Copy chat">
                <Copy size={14} />
              </button>
              <button onClick={() => { setActiveId(null); setFollowUps([]); }} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <RotateCcw size={12} /> New
              </button>
            </div>
          )}
        </div>

        {/* Language bar — mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b px-4 py-2 sm:hidden scrollbar-hide">
          {languages.map((l) => (
            <button
              key={l.label}
              onClick={() => setActiveLang(l)}
              className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex-shrink-0 ${
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
          {/* Welcome screen */}
          {messages.length === 0 && !isTyping && (
            <div className="flex h-full flex-col items-center justify-center text-center animate-fade-in-up">
              {/* Glowing Ashoka Chakra hero */}
              <div className="relative mb-6">
                <div className="absolute inset-0 scale-[2] rounded-full bg-primary/10 blur-3xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <AshokaChakra size={40} className="text-primary/50 animate-spin-slow" />
                </div>
              </div>

              <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
                Your AI Legal Assistant
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Ask any legal question in any Indian language. I'll explain your rights, cite the relevant laws, and suggest next steps.
              </p>

              {/* Legal topic quick-start */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="mt-8 grid w-full max-w-xl gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
              >
                {legalTopics.map((topic, i) => {
                  const Icon = topic.icon;
                  return (
                    <motion.button
                      key={topic.title}
                      variants={fadeInUp}
                      custom={i}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => sendMessage(topic.query)}
                      id={`topic-${topic.title.toLowerCase().replace(/\s+/g, "-")}`}
                      className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-all hover:border-primary/20 hover:shadow-sm"
                    >
                      <div className={`shrink-0 rounded-lg ${topic.bg} p-2 ${topic.color}`}>
                        <Icon size={16} />
                      </div>
                      <span className="text-xs font-semibold text-foreground">{topic.title}</span>
                    </motion.button>
                  );
                })}
              </motion.div>

              {/* Example question pills */}
              <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-lg">
                <p className="w-full text-xs text-muted-foreground mb-1">Or try asking:</p>
                {[
                  "मेरा मकान मालिक किराया बढ़ा रहा है",
                  "My employer is not paying salary",
                  "Cheque bounce — what can I do?",
                  "How to file RTI?",
                  "I was harassed at workplace",
                  "Landlord asking me to vacate in 2 days",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          <div className="mx-auto max-w-2xl space-y-5">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={`${session?.id}-${i}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
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
                          <Markdown components={mdComponents}>{m.content}</Markdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>

                    {/* Timestamp + actions */}
                    <div className={`mt-1 flex items-center gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <span className="text-[10px] text-muted-foreground/60">{fmtTime(m.ts)}</span>

                      {m.role === "assistant" && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => copyMessage(i)} className="text-muted-foreground hover:text-foreground" aria-label="Copy">
                            {copiedIdx === i ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                          </button>
                          <button
                            onClick={() => addReaction(i, "up")}
                            className={`transition-colors ${m.reaction === "up" ? "text-success" : "text-muted-foreground hover:text-success"}`}
                            aria-label="Helpful"
                          >
                            <ThumbsUp size={12} />
                          </button>
                          <button
                            onClick={() => addReaction(i, "down")}
                            className={`transition-colors ${m.reaction === "down" ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
                            aria-label="Not helpful"
                          >
                            <ThumbsDown size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <AshokaChakra size={18} className="text-primary animate-spin-slow" />
                </div>
                <div className="flex-1 max-w-[70%] space-y-2.5 rounded-2xl border bg-card p-4">
                  <div className="h-3 w-3/4 rounded shimmer-line" />
                  <div className="h-3 w-1/2 rounded shimmer-line" />
                  <div className="h-3 w-2/3 rounded shimmer-line" />
                </div>
              </motion.div>
            )}

            {/* Suggested follow-ups */}
            <AnimatePresence>
              {followUps.length > 0 && !isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-wrap gap-2 pl-11"
                >
                  <p className="w-full text-[10px] text-muted-foreground">Suggested follow-ups:</p>
                  {followUps.map((q) => (
                    <button
                      key={q}
                      onClick={() => { sendMessage(q); setFollowUps([]); }}
                      className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10"
                    >
                      {q}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={bottomRef} />
          </div>

          {/* Scroll to bottom FAB */}
          <AnimatePresence>
            {showScroll && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={scrollToBottom}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full border bg-card shadow-md transition-all hover:shadow-lg"
              >
                <ArrowDown size={14} className="text-muted-foreground" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ──────────── Input area ──────────── */}
        <div className="border-t bg-card px-4 py-3">
          <div className="mx-auto max-w-2xl">
            {/* Stop generating button */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="mb-2 flex justify-center"
                >
                  <button
                    onClick={stopGenerating}
                    id="stop-generating-btn"
                    className="flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                  >
                    <Square size={10} fill="currentColor" />
                    Stop generating
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-2 rounded-2xl border bg-background px-3 py-2 focus-within:border-primary/40 transition-colors">
              {/* Voice button */}
              <button
                onClick={toggleVoice}
                id="voice-input-btn"
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
              <div className="flex-1 min-w-0">
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
                  placeholder="Type your legal question in any language…"
                  rows={1}
                  id="chat-input"
                  className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none max-h-32"
                  style={{ minHeight: "1.5rem" }}
                />
                {input.length > 200 && (
                  <p className="text-right text-[10px] text-muted-foreground">{input.length} chars</p>
                )}
              </div>

              {/* Send button */}
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                id="send-message-btn"
                className="flex-shrink-0 rounded-full bg-primary p-2 text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </div>

            <div className="mt-1.5 flex items-center justify-between px-1">
              <p className="text-[10px] text-muted-foreground">
                {isRecording ? (
                  <span className="text-destructive font-medium">● Listening…</span>
                ) : (
                  "Shift+Enter for new line · You can paste documents or notices"
                )}
              </p>
              <p className="text-[10px] text-muted-foreground">Powered by AI · Not legal advice</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

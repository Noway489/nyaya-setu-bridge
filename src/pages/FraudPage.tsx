import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, AlertTriangle, CheckCircle, Copy, RotateCcw,
  MessageSquare, ExternalLink, Phone, History, ChevronDown,
  ChevronUp, Trash2, Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateGuide } from "@/lib/gemini";
import PageTransition from "@/components/PageTransition";
import { resultSlideIn, fadeInUp, staggerContainer, scaleIn } from "@/lib/animations";

/* ── Types ─────────────────────────────────────────────── */

type RiskLevel = "high" | "suspicious" | "safe";

interface FraudResult {
  level: RiskLevel;
  type: string;
  label: string;
  reasons: string[];
  actions: string[];
  reportTo: { label: string; value: string }[];
  note: string;
}

type HistoryItem = { id: string; message: string; result: FraudResult; ts: number };
type MessageType = "SMS" | "WhatsApp" | "Email";

/* ── Constants ─────────────────────────────────────────── */

const HISTORY_KEY = "nyaya-fraud-history";
const POLLINATIONS_URL = "https://text.pollinations.ai/openai";

const SCANNING_STAGES = [
  "Reading message structure…",
  "Checking known fraud patterns…",
  "Analysing URLs & phone numbers…",
  "Cross-referencing Indian scam database…",
  "Verifying sender behaviour…",
  "Compiling risk assessment…",
];

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

const exampleGroups = [
  { tag: "KYC Fraud", msg: "Your SBI account will be blocked in 24 hrs. Click here to update KYC: bit.ly/sbi-kyc" },
  { tag: "Lottery Scam", msg: "You've won ₹50 lakh lottery from Jio! Send ₹2500 registration fee to claim prize." },
  { tag: "Digital Arrest", msg: "CBI officer here. Digital arrest warrant issued. Transfer ₹5 lakh or face arrest." },
  { tag: "Customs Fraud", msg: "Customs department: Your package is held. Pay ₹2500 duty via UPI to release." },
  { tag: "Investment Scam", msg: "Earn ₹15,000 per day from home! Join our WhatsApp group for guaranteed crypto returns." },
];

const educationCards = [
  {
    icon: "🏦", title: "Banking/KYC Phishing",
    flags: ["Urgency about account blocking", "Links to unofficial domains", "Asking for OTP or password"],
    law: "IT Act §66C / §66D", helpline: "1930",
  },
  {
    icon: "🎰", title: "Lottery & Prize Scams",
    flags: ["Unbelievable prize amount", "Registration/processing fee required", "No verifiable lottery name"],
    law: "Prize Chits & Money Circulation Schemes (Banning) Act", helpline: "1930",
  },
  {
    icon: "👮", title: "Digital Arrest / CBI Fraud",
    flags: ["Claims of arrest warrant", "Pressure to stay on call", "Demands for urgent money transfer"],
    law: "IPC §384 (Extortion) / IT Act §66D", helpline: "112",
  },
  {
    icon: "💸", title: "UPI Payment Fraud",
    flags: ["'Collect' requests framed as 'send'", "Fake QR codes", "Impersonating buyers/sellers"],
    law: "IT Act §66C / RBI Guidelines", helpline: "1930",
  },
  {
    icon: "💼", title: "Job Offer Scams",
    flags: ["Too-good salary for simple work", "Advance payment demanded", "No verifiable company info"],
    law: "IPC §420 (Cheating)", helpline: "1930",
  },
  {
    icon: "📦", title: "Fake Customs / Delivery",
    flags: ["Package held at customs", "Duty payment via UPI/link", "No official tracking reference"],
    law: "IPC §420 / Customs Act", helpline: "1930",
  },
];

const riskConfig: Record<RiskLevel, {
  bg: string; border: string; badge: string; badgeBg: string;
  icon: typeof Shield; iconColor: string; ringColor: string; label: string;
}> = {
  high: {
    bg: "bg-destructive/5", border: "border-destructive/30",
    badge: "text-destructive", badgeBg: "bg-destructive/10",
    icon: AlertTriangle, iconColor: "text-destructive", ringColor: "bg-destructive",
    label: "HIGH RISK",
  },
  suspicious: {
    bg: "bg-warning/5", border: "border-warning/30",
    badge: "text-warning", badgeBg: "bg-warning/10",
    icon: Shield, iconColor: "text-warning", ringColor: "bg-warning",
    label: "SUSPICIOUS",
  },
  safe: {
    bg: "bg-success/5", border: "border-success/30",
    badge: "text-success", badgeBg: "bg-success/10",
    icon: CheckCircle, iconColor: "text-success", ringColor: "bg-success",
    label: "APPEARS SAFE",
  },
};

/* ── Helpers ──────────────────────────────────────────── */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const extractPatternTags = (reasons: string[], type: string): string[] => {
  const corpus = (reasons.join(" ") + " " + type).toLowerCase();
  const tags: string[] = [];
  if (corpus.includes("urgency") || corpus.includes("24 hr") || corpus.includes("blocked") || corpus.includes("immediate")) tags.push("⏰ Urgency Tactic");
  if (corpus.includes("link") || corpus.includes("url") || corpus.includes("click") || corpus.includes("http")) tags.push("🔗 Suspicious Link");
  if (corpus.includes("cbi") || corpus.includes("government") || corpus.includes("officer") || corpus.includes("arrest")) tags.push("🏛️ Fake Authority");
  if (corpus.includes("kyc") || corpus.includes("account") || corpus.includes("bank") || corpus.includes("sbi") || corpus.includes("hdfc")) tags.push("🏦 Banking Fraud");
  if (corpus.includes("lottery") || corpus.includes("prize") || corpus.includes("won") || corpus.includes("lucky")) tags.push("🎰 Lottery Scam");
  if (corpus.includes("upi") || corpus.includes("payment") || corpus.includes("transfer") || corpus.includes("qr")) tags.push("💸 Payment Fraud");
  if (corpus.includes("otp") || corpus.includes("password") || corpus.includes("pin")) tags.push("🔐 OTP Phishing");
  if (corpus.includes("job") || corpus.includes("offer") || corpus.includes("work from home") || corpus.includes("earn")) tags.push("💼 Job Scam");
  if (corpus.includes("investment") || corpus.includes("crypto") || corpus.includes("return") || corpus.includes("profit")) tags.push("📈 Investment Scam");
  if (corpus.includes("customs") || corpus.includes("package") || corpus.includes("delivery") || corpus.includes("parcel")) tags.push("📦 Fake Delivery");
  return tags.slice(0, 4);
};

const detectInputWarnings = (text: string): string[] => {
  const warnings: string[] = [];
  if (/https?:\/\/|bit\.ly|tinyurl|wa\.me/i.test(text)) warnings.push("Contains a shortened/suspicious URL");
  if (/\b(otp|password|pin)\b/i.test(text)) warnings.push("Mentions OTP or password — never share these");
  if (/₹\d|Rs\.?\s*\d|pay|transfer|fee/i.test(text)) warnings.push("Contains money/payment references");
  if (/\b(arrest|cbi|court|warrant)\b/i.test(text)) warnings.push("Contains law enforcement threats");
  return warnings;
};

const loadHistory = (): HistoryItem[] => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
};
const saveHistory = (h: HistoryItem[]) => localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 8)));

const fmtRelative = (ts: number) => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

/* ══════════════════════════════════════════════════════
   FraudPage Component
   ══════════════════════════════════════════════════════ */

const FraudPage = () => {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [result, setResult] = useState<FraudResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stage, setStage] = useState(SCANNING_STAGES[0]);
  const [messageType, setMessageType] = useState<MessageType>("SMS");
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [showEducation, setShowEducation] = useState(false);
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inputWarnings = detectInputWarnings(text);
  const patternTags = result ? extractPatternTags(result.reasons, result.type) : [];
  const cfg = result ? riskConfig[result.level] : null;

  useEffect(() => { saveHistory(history); }, [history]);

  /* ── Direct frontend fallback ─────────────────────── */
  const analyzeDirectFallback = async (): Promise<FraudResult | null> => {
    try {
      const result = await generateGuide(
        `Analyze this ${messageType} message for fraud:\n\n"${text}"`,
        PLAIN_JSON_PROMPT
      );
      if (result?.level && result?.reasons) {
        return result as FraudResult;
      }
    } catch (e) {
      console.warn("Direct fallback generation failed:", e);
    }
    return null;
  };

  /* ── Main analyze orchestrator ────────────────────── */
  const analyze = async () => {
    if (!text.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setResult(null);

    // Cycle stage messages
    let stageIdx = 0;
    setStage(SCANNING_STAGES[0]);
    stageRef.current = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, SCANNING_STAGES.length - 1);
      setStage(SCANNING_STAGES[stageIdx]);
    }, 2200);

    try {
      // Try edge function first
      const { data, error } = await supabase.functions.invoke("fraud-check", {
        body: { message: text, messageType },
      });

      let finalResult: FraudResult | null = null;

      if (!error && !data?.error && data?.level) {
        finalResult = data as FraudResult;
      } else {
        console.warn("Edge function failed, trying direct fallback:", error?.message || data?.error);
        finalResult = await analyzeDirectFallback();
      }

      if (finalResult) {
        setResult(finalResult);
        const item: HistoryItem = { id: uid(), message: text.slice(0, 120), result: finalResult, ts: Date.now() };
        setHistory((prev) => [item, ...prev.filter((h) => h.id !== item.id)]);
      } else {
        toast.error("Analysis failed. Please try again in a moment.");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to analyze. Please try again.");
    } finally {
      if (stageRef.current) clearInterval(stageRef.current);
      setIsAnalyzing(false);
    }
  };

  const reset = () => { setResult(null); setText(""); };

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(
      `Fraud Check Result:\nRisk: ${result.label}\nType: ${result.type}\n\nReasons:\n${result.reasons.join("\n")}\n\nWhat to do:\n${result.actions.join("\n")}\n\nNote: ${result.note}`
    );
    toast.success("Result copied to clipboard");
  };

  const discussWithAI = () => {
    if (!result) return;
    navigate("/chat", {
      state: {
        initialMessage: `I received a suspicious message that was flagged as "${result.label}" (${result.type}). Here's the message:\n\n"${text.slice(0, 300)}"\n\nWhat legal steps can I take?`,
      },
    });
  };

  /* ══════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════ */
  return (
    <PageTransition>
      <div className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-10">
        <div className="mx-auto max-w-2xl">

          {/* ── Header ── */}
          <motion.div
            variants={scaleIn} initial="hidden" animate="visible"
            className="mb-8 text-center"
          >
            <div className="relative mx-auto mb-4 h-16 w-16">
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
              <div className="relative flex h-full items-center justify-center rounded-full bg-primary/10">
                <Shield size={30} className="text-primary" />
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Fraud &amp; Scam Detector
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Paste any suspicious message — SMS, WhatsApp, or email. AI analyzes it for fraud patterns in seconds.
            </p>
          </motion.div>

          {/* ── Input Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border bg-card p-5 shadow-sm space-y-4"
          >
            {/* Message type tabs */}
            <div className="flex gap-1.5 rounded-lg border bg-muted p-1 w-fit">
              {(["SMS", "WhatsApp", "Email"] as MessageType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setMessageType(t)}
                  id={`msg-type-${t.toLowerCase()}`}
                  className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
                    messageType === t
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "SMS" ? "📱 SMS" : t === "WhatsApp" ? "💬 WhatsApp" : "📧 Email"}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                id="fraud-message-input"
                placeholder={`Paste suspicious ${messageType} here… / संदिग्ध संदेश यहाँ पेस्ट करें…`}
                className="w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
              />
              <span className="absolute bottom-2.5 right-3 text-[10px] text-muted-foreground/50">{text.length}</span>
            </div>

            {/* Inline warnings */}
            <AnimatePresence>
              {inputWarnings.length > 0 && text.length > 20 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5"
                >
                  {inputWarnings.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
                      <Info size={12} className="shrink-0" /> {w}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Example pills */}
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Try a known scam:
              </p>
              <div className="flex flex-wrap gap-2">
                {exampleGroups.map(({ tag, msg }) => (
                  <motion.button
                    key={tag}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setText(msg)}
                    className="rounded-full border border-destructive/20 bg-destructive/5 px-3 py-1 text-xs font-medium text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    {tag}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Analyze button */}
            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={analyze}
              disabled={!text.trim() || isAnalyzing}
              id="analyze-btn"
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? "Analyzing…" : "🔍 Analyze for Fraud"}
            </motion.button>
          </motion.div>

          {/* ────────── Scanning Overlay ────────── */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
                className="mt-6 rounded-2xl border bg-card p-8 text-center shadow-sm space-y-5"
              >
                {/* Animated shield */}
                <div className="relative mx-auto h-20 w-20">
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                  <div className="absolute inset-1 rounded-full border-2 border-dashed border-primary/30 animate-spin" style={{ animationDuration: "3s" }} />
                  <div className="absolute inset-3 flex items-center justify-center rounded-full bg-primary/10">
                    <Shield size={24} className="text-primary" />
                  </div>
                </div>

                <div>
                  <h3 className="font-display text-base font-bold text-foreground">Scanning Message</h3>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={stage}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.3 }}
                      className="mt-1.5 text-sm text-muted-foreground"
                    >
                      {stage}
                    </motion.p>
                  </AnimatePresence>
                </div>

                {/* Progress bar */}
                <div className="mx-auto max-w-xs">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: "0%" }}
                      animate={{ width: "92%" }}
                      transition={{ duration: 13, ease: "easeInOut" }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Usually takes 10–20 seconds</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ────────── Result Card ────────── */}
          <AnimatePresence mode="wait">
            {result && cfg && !isAnalyzing && (
              <motion.div
                key="result"
                variants={resultSlideIn} initial="hidden" animate="visible"
                exit={{ opacity: 0, y: -10 }}
                className={`mt-6 overflow-hidden rounded-2xl border ${cfg.border} ${cfg.bg} shadow-sm`}
              >
                {/* Risk level header */}
                <div className={`flex items-center gap-4 border-b ${cfg.border} px-6 py-5`}>
                  {/* Animated risk icon */}
                  <div className="relative">
                    {result.level === "high" && (
                      <div className={`absolute inset-0 rounded-full ${cfg.ringColor}/20 animate-ping`} />
                    )}
                    <div className={`relative flex h-14 w-14 items-center justify-center rounded-full ${cfg.badgeBg}`}>
                      <cfg.icon size={26} className={cfg.iconColor} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className={`inline-flex items-center gap-1.5 rounded-full ${cfg.badgeBg} px-3 py-1 text-xs font-bold ${cfg.badge} uppercase tracking-wide`}>
                      {cfg.label}
                    </div>
                    <p className="mt-1.5 font-display text-base font-bold text-foreground leading-tight">{result.type}</p>
                    <p className="text-sm text-muted-foreground">{result.label}</p>
                  </div>
                </div>

                <div className="px-6 py-5 space-y-5">
                  {/* Pattern tags */}
                  {patternTags.length > 0 && (
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-wrap gap-2">
                      {patternTags.map((tag, i) => (
                        <motion.span
                          key={tag} variants={fadeInUp} custom={i}
                          className={`rounded-full border ${cfg.border} ${cfg.badgeBg} ${cfg.badge} px-3 py-1 text-xs font-semibold`}
                        >
                          {tag}
                        </motion.span>
                      ))}
                    </motion.div>
                  )}

                  {/* Why dangerous / reasons */}
                  {result.level !== "safe" ? (
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                      <div>
                        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          <AlertTriangle size={11} /> Why this is dangerous
                        </h4>
                        <ul className="space-y-2">
                          {result.reasons.map((r, i) => (
                            <motion.li key={i} variants={fadeInUp} custom={i} className="flex items-start gap-2 text-sm text-foreground">
                              <span className="mt-0.5 shrink-0 text-destructive">⚠</span> {r}
                            </motion.li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          What to do RIGHT NOW
                        </h4>
                        <ol className="space-y-2">
                          {result.actions.map((a, i) => (
                            <motion.li key={i} variants={fadeInUp} custom={i + result.reasons.length} className="flex items-start gap-2.5 text-sm font-medium text-foreground">
                              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${cfg.badgeBg} ${cfg.badge}`}>
                                {i + 1}
                              </span>
                              {a}
                            </motion.li>
                          ))}
                        </ol>
                      </div>

                      {/* Report to — actionable buttons */}
                      {result.reportTo.length > 0 && (
                        <motion.div variants={fadeInUp} custom={result.reasons.length + result.actions.length}>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            Report To
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {/* Always include cybercrime portal */}
                            <a
                              href="https://cybercrime.gov.in"
                              target="_blank" rel="noopener noreferrer"
                              id="cybercrime-portal-btn"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                            >
                              <ExternalLink size={11} /> Cybercrime Portal
                            </a>
                            <a
                              href="tel:1930"
                              id="helpline-1930-btn"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Phone size={11} /> Helpline: 1930
                            </a>
                            {result.reportTo.map((r, i) => (
                              <span key={i} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground">
                                {r.label}: <strong className="text-foreground">{r.value}</strong>
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    /* Safe result */
                    <div className="space-y-2">
                      {result.reasons.map((r, i) => (
                        <motion.p key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }} className="flex items-center gap-2.5 text-sm text-foreground">
                          <CheckCircle size={15} className="text-success shrink-0" /> {r}
                        </motion.p>
                      ))}
                    </div>
                  )}

                  {/* Note */}
                  <p className="text-xs italic text-muted-foreground border-t pt-4">{result.note}</p>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={reset} id="analyze-another-btn"
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RotateCcw size={12} /> Check another
                    </motion.button>

                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={copyResult} id="copy-result-btn"
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Copy size={12} /> Copy result
                    </motion.button>

                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={discussWithAI} id="discuss-ai-btn"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <MessageSquare size={12} /> Discuss with Legal AI
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ────────── History Panel ────────── */}
          {history.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 rounded-2xl border bg-card shadow-sm overflow-hidden">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <History size={15} className="text-muted-foreground" />
                  Recent Checks ({history.length})
                </span>
                {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                    className="overflow-hidden border-t"
                  >
                    <div className="p-3 space-y-2">
                      {history.map((h) => {
                        const hCfg = riskConfig[h.result.level];
                        return (
                          <div
                            key={h.id}
                            className="flex items-center gap-3 rounded-xl border px-3 py-2.5 hover:bg-muted/40 cursor-pointer transition-colors group"
                            onClick={() => { setText(h.message); setResult(h.result); setShowHistory(false); }}
                          >
                            <hCfg.icon size={14} className={`shrink-0 ${hCfg.iconColor}`} />
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-xs font-medium text-foreground">{h.message}</p>
                              <p className="text-[10px] text-muted-foreground">{fmtRelative(h.ts)} · {h.result.label}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setHistory((prev) => prev.filter((x) => x.id !== h.id)); }}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ────────── Fraud Education Section ────────── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8">
            <button
              onClick={() => setShowEducation(!showEducation)}
              className="flex w-full items-center justify-between rounded-xl border bg-card px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors shadow-sm"
            >
              <span>📚 How to Spot Common Indian Scams</span>
              {showEducation ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <AnimatePresence>
              {showEducation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="mt-3 grid gap-3 sm:grid-cols-2 overflow-hidden"
                >
                  {educationCards.map((card, i) => (
                    <motion.div
                      key={card.title}
                      variants={fadeInUp} custom={i} initial="hidden" animate="visible"
                      className="rounded-xl border bg-card p-4 shadow-sm"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-xl">{card.icon}</span>
                        <h4 className="text-sm font-bold text-foreground">{card.title}</h4>
                      </div>
                      <ul className="mb-3 space-y-1">
                        {card.flags.map((f, j) => (
                          <li key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <span className="mt-0.5 text-destructive shrink-0">•</span> {f}
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{card.law}</span>
                        <a href="tel:1930" className="text-[10px] font-semibold text-primary hover:underline">📞 {card.helpline}</a>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <p className="mt-6 text-center text-xs italic text-muted-foreground">
            AI analysis is indicative only. For legal advice, consult a qualified advocate.
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default FraudPage;

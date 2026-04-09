import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, AlertCircle, Phone, ChevronDown, ChevronRight, Search, Sparkles, MessageSquare, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateGuide } from "@/lib/gemini";
import PageTransition from "@/components/PageTransition";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/animations";

/* ── Types ─────────────────────────────────────────────── */

interface Step {
  title: string;
  detail: string;
  escalation?: string;
}

interface Procedure {
  id: string; // custom ones will have dynamic IDs
  title: string;
  category: string;
  description: string;
  documents: string[];
  fees: string;
  timeEstimate: string;
  steps: Step[];
  deadlines?: string;
  helpline: { label: string; number: string };
  isCustom?: boolean; // flag for AI generated guides
}

/* ── Constants ─────────────────────────────────────────── */

const POLLINATIONS_URL = "https://text.pollinations.ai/openai";
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

const popularGuides: Procedure[] = [
  {
    id: "fir",
    title: "File an FIR",
    category: "Criminal",
    description: "File a First Information Report when a cognizable offence has been committed",
    documents: ["Government-issued ID (Aadhaar/Voter ID)", "Details of the incident (date, time, place)", "Any evidence (photos, documents)"],
    fees: "Free — Police cannot refuse or charge for filing FIR",
    timeEstimate: "30-60 minutes at the police station",
    steps: [
      { title: "Visit the nearest police station", detail: "Go to the police station with jurisdiction. You can file at any station under a Zero FIR.", escalation: "If they refuse jurisdiction, insist on a Zero FIR (mandatory)." },
      { title: "Narrate the incident to Duty Officer", detail: "Describe the complete incident. The officer will write it down. You can narrate in your regional language." },
      { title: "Review and sign the FIR", detail: "Read the written FIR carefully before signing. Ensure all facts are correct." },
      { title: "Get your free copy", detail: "Under Section 154(2) CrPC, you are entitled to a free copy immediately. Note the FIR number." },
    ],
    deadlines: "File as soon as possible. Unexplained delay weakens the case.",
    helpline: { label: "Police Control Room", number: "112" },
  },
  {
    id: "cybercrime",
    title: "Report Cybercrime",
    category: "Criminal",
    description: "Report online fraud, hacking, cyberbullying, or identity theft",
    documents: ["Screenshots of the fraud", "Transaction details", "Suspect's URLs or profiles"],
    fees: "Free",
    timeEstimate: "15-30 minutes online",
    steps: [
      { title: "Call 1930 helpline", detail: "For financial fraud, immediately call 1930. They can freeze suspicious transactions within the golden hour." },
      { title: "File online complaint", detail: "Visit cybercrime.gov.in and register. File a complaint with all details and get an acknowledgment number." },
      { title: "Visit Cyber Cell if needed", detail: "For serious cases, visit your nearest Cyber Crime Police Station with printed evidence." },
    ],
    helpline: { label: "National Cyber Helpline", number: "1930" },
  },
  {
    id: "consumer",
    title: "Consumer Complaint",
    category: "Civil / Consumer",
    description: "File a complaint for defective products, deficient services, or unfair trade practices",
    documents: ["Purchase receipt / invoice", "Product defect proof", "Communication with seller", "ID proof"],
    fees: "No fee up to ₹5 lakh; ₹200 for ₹5-10 lakh",
    timeEstimate: "20-30 minutes online filing",
    steps: [
      { title: "Send legal notice", detail: "Send a written complaint to the company giving them 15-30 days to resolve. Keep proof of sending." },
      { title: "File on eDaakhil", detail: "Register on edaakhil.nic.in. Upload complaint, evidence, and pay fee. No lawyer required.", escalation: "If portal is down, file physically at District Forum." },
      { title: "Attend hearing", detail: "Present your evidence clearly on the hearing date. The commission will pass an order." },
    ],
    deadlines: "File within 2 years of the cause of action.",
    helpline: { label: "Consumer Helpline", number: "1800-11-4000" },
  },
  {
    id: "rti",
    title: "File an RTI",
    category: "Civil / Consumer",
    description: "Request information from any public authority under the Right to Information Act, 2005",
    documents: ["Application on plain paper or online form", "ID proof (sometimes required for BPL fee waiver)"],
    fees: "₹10 (postal order, DD, or online payment)",
    timeEstimate: "10-15 minutes to file; 30 days for response",
    steps: [
      { title: "Identify Public Authority", detail: "Determine which government department has the info." },
      { title: "File application", detail: "Online at rtionline.gov.in for central depts. State depts have specific portals. By post, address to the PIO.", escalation: "If you don't know the PIO, address it to the Head of Department." },
      { title: "Wait for response", detail: "The PIO must respond within 30 days (48 hours for life/liberty issues)." },
      { title: "File appeal if ignored", detail: "If no response, file First Appeal to the Appellate Authority within 30 days." },
    ],
    helpline: { label: "RTI Info Helpline", number: "011-26105773" },
  },
];

const SCANNING_STAGES = [
  "Analysing Indian Legal Framework...",
  "Compiling required documents...",
  "Structuring step-by-step procedure...",
  "Locating relevant helplines...",
  "Finalizing custom guide...",
];

/* ── Helpers ────────────────────────────────────────────── */

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const categories = [...new Set(popularGuides.map((p) => p.category))];

/* ══════════════════════════════════════════════════════════
   GuidePage Component
   ══════════════════════════════════════════════════════════ */

const GuidePage = () => {
  const navigate = useNavigate();
  const [activeGuide, setActiveGuide] = useState<Procedure>(popularGuides[0]);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  
  // Custom Generation State
  const [searchQuery, setSearchQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [stage, setStage] = useState(SCANNING_STAGES[0]);
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Direct frontend fallback ───────────────────────────── */
  const generateDirectFallback = async (topic: string): Promise<Procedure | null> => {
    try {
      const result = await generateGuide(topic, PLAIN_JSON_PROMPT);
      if (result?.title && result?.steps) {
        return { ...result, id: uid(), isCustom: true } as Procedure;
      }
    } catch (e) {
      console.warn("Direct fallback generation failed:", e);
    }
    return null;
  };

  /* ── Main generate orchestrator ─────────────────────────── */
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setExpandedStep(null);

    // Cycle stage messages
    let stageIdx = 0;
    setStage(SCANNING_STAGES[0]);
    stageRef.current = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, SCANNING_STAGES.length - 1);
      setStage(SCANNING_STAGES[stageIdx]);
    }, 2500);

    try {
      // Try edge function first
      const { data, error } = await supabase.functions.invoke("dynamic-guide", {
        body: { topic: searchQuery },
      });

      let finalGuide: Procedure | null = null;

      if (!error && !data?.error && data?.title && data?.steps) {
        finalGuide = { ...data, id: uid(), isCustom: true } as Procedure;
      } else {
        console.warn("Edge function failed, trying direct fallback:", error?.message || data?.error);
        finalGuide = await generateDirectFallback(searchQuery);
      }

      if (finalGuide) {
        // Clear search and set active
        setSearchQuery("");
        setActiveGuide(finalGuide);
      } else {
        toast.error("Could not generate guide. Please try a different topic.");
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred while generating.");
    } finally {
      if (stageRef.current) clearInterval(stageRef.current);
      setIsGenerating(false);
    }
  };

  /* ── Select popular guide ──────────────────────────────── */
  const handleSelectPopular = (guideId: string) => {
    const guide = popularGuides.find(g => g.id === guideId);
    if (guide) {
      setActiveGuide(guide);
      setExpandedStep(null);
      // scroll to top on mobile
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /* ── Discuss with AI ───────────────────────────────────── */
  const discussWithAI = () => {
    navigate("/chat", {
      state: {
        initialMessage: `I am looking at the guide for "${activeGuide.title}". Can you give me more specific advice about my situation regarding this process?`,
      },
    });
  };

  /* ══════════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════════ */
  return (
    <PageTransition>
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col md:flex-row bg-background">
        {/* ──────────── Sidebar ──────────── */}
        <aside className="w-full border-b bg-card md:w-72 flex-shrink-0 md:border-b-0 md:border-r">
          <div className="p-4 md:p-5 h-full flex flex-col">
            
            {/* AI Generator Input */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
                <Sparkles size={16} className="text-primary" />
                Ask AI for a Custom Guide
              </h3>
              <form onSubmit={handleGenerate} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., How to get a birth certificate"
                  disabled={isGenerating}
                  className="w-full rounded-xl border bg-background px-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                />
                <Search size={14} className="absolute left-3.5 top-3.5 text-muted-foreground" />
                <button
                  type="submit"
                  disabled={!searchQuery.trim() || isGenerating}
                  className="absolute right-2 top-1.5 rounded-lg bg-primary p-1.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </form>
              <p className="mt-2 text-[10px] text-muted-foreground leading-tight">
                Type any legal situation. Our AI will instantly build a custom step-by-step guide for it.
              </p>
            </div>

            <hr className="border-border mb-6" />

            {/* Mobile Dropdown for Popular Guides */}
            <div className="md:hidden mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Popular Topics</h3>
              <select
                value={activeGuide.id}
                onChange={(e) => handleSelectPopular(e.target.value)}
                className="w-full rounded-card border bg-background px-3 py-2 text-sm text-foreground"
              >
                {activeGuide.isCustom && <option value={activeGuide.id}>{activeGuide.title} (Custom)</option>}
                {popularGuides.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            {/* Desktop List for Popular Guides */}
            <div className="hidden md:block flex-1 overflow-y-auto pr-1">
              {/* If a custom guide is active, show it at the top of the list momentarily */}
              {activeGuide.isCustom && (
                <div className="mb-4">
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-primary">Your Generated Guide</h3>
                  <button
                    className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors border-l-2 border-l-primary bg-primary/5 font-medium text-primary"
                  >
                    <Sparkles size={14} />
                    {activeGuide.title}
                  </button>
                </div>
              )}

              {categories.map((cat) => (
                <div key={cat} className="mb-5">
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h3>
                  <div className="space-y-0.5">
                    {popularGuides.filter((p) => p.category === cat).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPopular(p.id)}
                        className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors group ${
                          activeGuide.id === p.id && !activeGuide.isCustom
                            ? "border-l-2 border-l-primary bg-primary/5 font-medium text-primary"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-2 border-transparent"
                        }`}
                      >
                        <FileText size={14} className={activeGuide.id === p.id && !activeGuide.isCustom ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} />
                        <span className="truncate">{p.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ──────────── Content Area ──────────── */}
        <main className="flex-1 p-5 md:p-8 relative">
          
          <AnimatePresence mode="wait">
            
            {/* Loading Skeleton */}
            {isGenerating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="mx-auto max-w-2xl py-10"
              >
                <div className="mb-8 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                    <div className="relative flex h-full w-full items-center justify-center rounded-full bg-primary/10">
                      <Loader2 size={28} className="text-primary animate-spin" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Building Custom Legal Guide</h2>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={stage}
                        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="mt-1 text-sm text-primary font-medium"
                      >
                        {stage}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </div>

                {/* Shimmer layout */}
                <div className="space-y-6 opacity-60">
                  <div className="h-24 w-full rounded-2xl bg-muted animate-pulse" />
                  <div className="h-32 w-full rounded-2xl bg-muted animate-pulse" />
                  <div className="space-y-3">
                    <div className="h-14 w-full rounded-xl bg-muted animate-pulse" />
                    <div className="h-14 w-full rounded-xl bg-muted animate-pulse" />
                    <div className="h-14 w-full rounded-xl bg-muted animate-pulse" />
                  </div>
                </div>
              </motion.div>
            ) : (

              /* Actual Guide UI */
              <motion.div
                key={activeGuide.id}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
                className="mx-auto max-w-2xl"
              >
                {/* Hero strip */}
                <div className="mb-6 rounded-2xl border bg-card-warm p-6 shadow-sm">
                  {activeGuide.isCustom && (
                    <span className="inline-flex items-center gap-1 mb-3 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      <Sparkles size={10} /> AI Generated Guide
                    </span>
                  )}
                  <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl leading-tight">{activeGuide.title}</h1>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{activeGuide.category}</span>
                  </div>
                  <p className="mt-4 text-sm text-foreground/80 leading-relaxed border-t border-border pt-4">{activeGuide.description}</p>
                </div>

                {/* What you'll need */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6 rounded-2xl border bg-card p-6 shadow-sm">
                  <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Requirements</h2>
                  <div className="grid gap-6 sm:grid-cols-3">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><FileText size={14} className="text-primary"/> Documents</h4>
                      <ul className="space-y-2">
                        {activeGuide.documents.map((d, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 leading-tight">
                            <span className="text-primary font-bold">•</span> {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><span className="text-primary font-bold">₹</span> Fees</h4>
                      <p className="text-xs text-muted-foreground leading-tight">{activeGuide.fees}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><span className="text-primary text-sm font-bold">⏱</span> Time</h4>
                      <p className="text-xs text-muted-foreground leading-tight">{activeGuide.timeEstimate}</p>
                    </div>
                  </div>
                </motion.div>

                {/* Steps */}
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Step-by-Step Procedure</h2>
                </div>
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                  {activeGuide.steps.map((s, i) => (
                    <motion.div key={i} variants={fadeInUp} custom={i} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                      <button
                        onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                        className={`flex w-full items-center gap-4 p-4 text-left transition-colors ${expandedStep === i ? "bg-muted/30" : "hover:bg-muted/20"}`}
                      >
                        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${expandedStep === i ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm font-bold text-foreground">{s.title}</span>
                        {expandedStep === i ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                      </button>
                      
                      <AnimatePresence>
                        {expandedStep === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                          >
                            <div className="p-4 pt-0 pl-[3.25rem] border-t border-border/50 bg-muted/10">
                              <p className="text-sm text-foreground/80 leading-relaxed mt-3">{s.detail}</p>
                              {s.escalation && (
                                <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning-foreground">
                                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                  <span className="font-medium leading-relaxed">{s.escalation}</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Deadlines */}
                {activeGuide.deadlines && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 rounded-2xl border border-l-4 border-l-warning bg-card py-4 px-5 shadow-sm">
                    <h3 className="text-xs font-bold text-warning uppercase flex items-center gap-1.5"><AlertCircle size={14}/> Important Time Limits</h3>
                    <p className="mt-2 text-sm text-foreground/80">{activeGuide.deadlines}</p>
                  </motion.div>
                )}

                {/* Footer Actions (Helpline + Chat) */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col justify-center rounded-2xl bg-destructive/10 border border-destructive/20 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Phone size={14} className="text-destructive" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">Help / Emergency</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {activeGuide.helpline.label}: <a href={`tel:${activeGuide.helpline.number}`} className="text-destructive hover:underline">{activeGuide.helpline.number}</a>
                    </p>
                  </div>

                  <button
                    onClick={discussWithAI}
                    className="flex flex-col justify-center items-start rounded-2xl bg-primary border p-4 text-left hover:bg-primary/95 transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare size={14} className="text-primary-foreground/80" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/80">Need clarification?</p>
                    </div>
                    <p className="text-sm font-semibold text-primary-foreground flex items-center justify-between w-full">
                      Discuss with Legal AI
                      <ChevronRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </p>
                  </button>
                </motion.div>

                <p className="mt-8 text-center text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold pb-4">
                  AI-generated guides are for informational purposes.
                </p>

              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </PageTransition>
  );
};

export default GuidePage;

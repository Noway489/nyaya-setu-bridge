import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileSearch, Upload, AlertTriangle, CheckCircle, AlertCircle, Loader2, MessageSquare, ChevronRight, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { analyzeDocument } from "@/lib/gemini";
import PageTransition from "@/components/PageTransition";
import { fadeInUp, staggerContainer, resultSlideIn, slideInLeft, slideInRight } from "@/lib/animations";

import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

// Explicitly set the pdf.js worker source via cdn matching the installed version to avoid Vite worker compilation issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

const docTypes = ["Rental Agreement", "Employment Contract", "Loan Agreement", "Legal Notice", "Property Deed", "Other"];

const SCANNING_STAGES = [
  "Extracting document text...",
  "Running legal cross-reference...",
  "Identifying unconscionable clauses...",
  "Formatting risk analysis...",
];

type ClauseRisk = "risk" | "review" | "ok";

interface Clause {
  name: string;
  risk: ClauseRisk;
  explanation: string;
  suggestion?: string;
}

interface AnalysisResult {
  docType: string;
  summary: string;
  clauses: Clause[];
  beforeYouSign: string[];
}

const riskIcon: Record<ClauseRisk, React.ReactNode> = {
  risk: <AlertTriangle size={14} className="text-destructive" />,
  review: <AlertCircle size={14} className="text-warning" />,
  ok: <CheckCircle size={14} className="text-success" />,
};

const riskBorder: Record<ClauseRisk, string> = {
  risk: "border-l-destructive",
  review: "border-l-warning",
  ok: "border-l-success",
};

const riskBadge: Record<ClauseRisk, { bg: string; label: string }> = {
  risk: { bg: "bg-destructive/10 text-destructive", label: "High Risk" },
  review: { bg: "bg-warning/10 text-warning", label: "Review" },
  ok: { bg: "bg-success/10 text-success", label: "Safe" },
};

const DocumentPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [docType, setDocType] = useState(docTypes[0]);
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [stage, setStage] = useState(SCANNING_STAGES[0]);
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (stageRef.current) clearInterval(stageRef.current);
    };
  }, []);

  /* ── File parsing ──────────────────────────────────────── */
  const processFile = async (file: File) => {
    if (!file) return;
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!["pdf", "doc", "docx", "txt"].includes(ext || "")) {
      toast.error("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
      return;
    }

    setIsExtracting(true);
    setText("");
    
    try {
      const arrayBuffer = await file.arrayBuffer();

      if (ext === "pdf") {
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        let extractedText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          extractedText += textContent.items.map((item: any) => item.str).join(" ") + "\\n";
        }
        setText(extractedText.trim() || "Could not extract text from PDF.");
        
      } else if (ext === "docx" || ext === "doc") {
        const result = await mammoth.extractRawText({ arrayBuffer });
        setText(result.value || "Could not extract text from Document.");
      } else if (ext === "txt") {
        setText(await file.text());
      }
      
      toast.success(`Extracted text from ${file.name}`);
    } catch (e: any) {
      console.error("Extraction error:", e);
      toast.error("Failed to extract text. The file might be corrupted or scanned (no text).");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  /* ── Analysis ──────────────────────────────────────────── */
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
      // 1. Try Supabase configured edge function
      const { data, error } = await supabase.functions.invoke("document-analyze", {
        body: { text, docType },
      });

      let finalResult: AnalysisResult | null = null;

      if (!error && !data?.error && data?.docType && data?.clauses) {
        finalResult = data as AnalysisResult;
      } else {
        console.warn("Edge function failed, trying generic fallback framework:", error?.message || data?.error);
        try {
          finalResult = await analyzeDocument(text, docType);
        } catch (fbErr) {
          console.error("Fallback also failed", fbErr);
        }
      }

      if (finalResult && finalResult.clauses) {
        setResult(finalResult);
      } else {
        toast.error("Analysis failed. Please try a different document text.");
      }
    } catch (e: any) {
      console.error("Document analysis error:", e);
      toast.error(e.message || "Failed to analyze document. Please try again.");
    } finally {
      if (stageRef.current) clearInterval(stageRef.current);
      setIsAnalyzing(false);
    }
  };

  /* ── Discuss with AI ───────────────────────────────────── */
  const discussWithAI = () => {
    if (!result) return;
    const ctx = `I am reviewing a legal document (type: ${result.docType}). 
Here is exactly what Nyaya Setu Document Analyzer told me:

Summary: ${result.summary}

Significant Clauses:
${result.clauses.map(c => `- ${c.name} (${c.risk}): ${c.explanation}`).join('\n')}

Based on this, what should I be most careful about?`;

    navigate("/chat", {
      state: { initialMessage: ctx },
    });
  };

  return (
    <PageTransition>
      <div className="min-h-[calc(100vh-3.5rem)] bg-background">
        <div className="flex flex-col lg:flex-row">
          
          {/* ──────────── Left - Input ──────────── */}
          <motion.div variants={slideInLeft} initial="hidden" animate="visible" className="flex-1 border-b lg:border-b-0 lg:border-r p-6 lg:p-8 bg-card flex flex-col">
            <div className="mb-6">
              <span className="inline-flex items-center justify-center rounded-xl bg-primary/10 p-2.5 text-primary mb-4">
                <FileSearch size={22} />
              </span>
              <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Analyze Document</h1>
              <p className="mt-2 text-sm text-foreground/70 leading-relaxed max-w-sm">
                Paste or upload any legal agreement below to get an instant, plain-language breakdown of its risks and clauses.
              </p>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                isDragging 
                  ? "border-primary bg-primary/5 scale-[1.02]" 
                  : "border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/50"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
              />
              <div className="rounded-full bg-background p-3 shadow-sm mb-3">
                {isExtracting ? (
                  <Loader2 size={24} className="text-primary animate-spin" />
                ) : (
                  <Upload size={24} className="text-primary/70" />
                )}
              </div>
              <p className="text-sm font-semibold text-foreground">
                {isExtracting ? "Extracting Text..." : "Click to upload or drag and drop"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF, DOCX, or TXT
              </p>
            </div>
            
            <div className="mb-5 flex items-center justify-center gap-3 opacity-60">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">OR</span>
                <div className="h-px flex-1 bg-border" />
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {docTypes.map((d) => (
                <button
                  key={d}
                  onClick={() => setDocType(d)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all shadow-sm ${
                    docType === d 
                      ? "bg-primary text-primary-foreground scale-[1.02]" 
                      : "bg-background border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Paste the content of your ${docType} here...`}
              className="w-full flex-1 min-h-[280px] rounded-2xl border bg-background p-5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground outline-none resize-none focus:border-primary/50 transition-colors shadow-sm"
            />

            <button
              onClick={analyze}
              disabled={!text.trim() || isAnalyzing}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/95 disabled:opacity-40 disabled:hover:scale-100 active:scale-[0.98]"
            >
              <FileSearch size={16} />
              {isAnalyzing ? "Scanning Document..." : "Analyze Contract Now"}
            </button>
            <p className="text-[10px] text-center mt-3 text-muted-foreground uppercase font-bold tracking-wider">
              Files strictly entirely processed via verified AI
            </p>
          </motion.div>

          {/* ──────────── Right - Results ──────────── */}
          <div className="flex-1 bg-card-warm p-6 lg:p-8 relative">
            <AnimatePresence mode="wait">
              
              {!result && !isAnalyzing && (
                <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center text-center opacity-60 px-6">
                  <Upload size={40} className="mb-4 text-muted-foreground stroke-1" />
                  <p className="text-sm font-medium text-foreground">Waiting for document</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-xs leading-relaxed">
                    Once you paste your document and hit analyze, the AI will highlight dangerous clauses and summarize what you are signing.
                  </p>
                </motion.div>
              )}

              {isAnalyzing && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center text-center max-w-md mx-auto">
                  
                  {/* Scanner Visual */}
                  <div className="relative mb-8 h-20 w-16 overflow-hidden rounded text-primary/20">
                    <FileSearch size={64} />
                    <motion.div 
                      className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]"
                      animate={{ top: ["0%", "100%", "0%"] }} 
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }} 
                    />
                  </div>

                  <h3 className="text-sm font-bold text-foreground">Analyzing Legal Text</h3>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={stage}
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                      className="mt-1 text-xs font-semibold text-primary"
                    >
                      {stage}
                    </motion.p>
                  </AnimatePresence>

                  <div className="w-full max-w-[200px] mt-4 h-1 rounded-full bg-muted overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary" 
                      initial={{ width: "0%" }} 
                      animate={{ width: "100%" }} 
                      transition={{ duration: 8, ease: "linear" }}
                    />
                  </div>
                </motion.div>
              )}

              {result && !isAnalyzing && (
                <motion.div key="results" variants={slideInRight} initial="hidden" animate="visible" className="space-y-6 max-w-2xl mx-auto pb-10">
                  
                  {/* Header */}
                  <div className="flex flex-col gap-1.5 border-b border-border pb-5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Analysis Complete
                      </span>
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                        {result.docType}
                      </span>
                    </div>
                  </div>

                  {/* Summary */}
                  <motion.div variants={resultSlideIn} className="rounded-2xl border bg-card p-6 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <FileSearch size={14} /> Executive Summary
                    </h3>
                    <p className="text-sm leading-relaxed text-foreground/90">{result.summary}</p>
                  </motion.div>

                  {/* Clauses */}
                  <div>
                     <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Clause Breakdown</h3>
                     <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                       {result.clauses.map((c, i) => (
                         <motion.div key={i} variants={fadeInUp} custom={i} className={`rounded-xl border border-l-4 ${riskBorder[c.risk]} bg-card p-5 shadow-sm`}>
                           <div className="flex items-center gap-2 mb-2">
                             {riskIcon[c.risk]}
                             <span className="text-sm font-bold text-foreground">{c.name}</span>
                             <span className={`ml-auto rounded-md px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider ${riskBadge[c.risk].bg}`}>
                               {riskBadge[c.risk].label}
                             </span>
                           </div>
                           <p className="text-sm leading-relaxed text-muted-foreground">{c.explanation}</p>
                           {c.suggestion && (
                             <div className="mt-3 rounded-md bg-muted/40 p-3 border border-border border-dashed">
                               <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                 <span className="text-primary text-[10px]">💡</span> Suggestion
                               </p>
                               <p className="mt-1 text-xs text-muted-foreground">{c.suggestion}</p>
                             </div>
                           )}
                         </motion.div>
                       ))}
                     </motion.div>
                  </div>

                  {/* Before You Sign */}
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-l-4 border-l-primary bg-card p-5 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <CheckCircle size={14} className="text-primary" /> Before You Sign
                    </h3>
                    <ul className="space-y-2">
                      {result.beforeYouSign.map((b, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/80 leading-relaxed">
                          <span className="text-primary font-bold mt-[-1px]">•</span> {b}
                        </li>
                      ))}
                    </ul>
                  </motion.div>

                  {/* Action Banner */}
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-8 overflow-hidden rounded-2xl border bg-primary shadow-lg relative cursor-pointer hover:bg-primary/95 transition-colors group" onClick={discussWithAI}>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-foreground/10 opacity-50" />
                    <div className="relative p-5 flex flex-col sm:flex-row items-center gap-4 sm:justify-between">
                      <div className="flex items-center gap-3">
                         <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/20 text-primary-foreground">
                            <MessageSquare size={16} />
                         </div>
                         <div className="text-left">
                            <h4 className="text-sm font-bold text-primary-foreground">Concerned about a clause?</h4>
                            <p className="text-xs font-medium text-primary-foreground/80">Discuss this document instantly with Legal AI.</p>
                         </div>
                      </div>
                      <span className="rounded-full bg-primary-foreground/20 p-2 text-primary-foreground transition-transform group-hover:translate-x-1">
                        <ChevronRight size={16} />
                      </span>
                    </div>
                  </motion.div>
                  
                  <p className="text-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 mt-4">
                    AI generated analysis is not legal advice.
                  </p>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default DocumentPage;

import { useState } from "react";
import { FileSearch, Upload, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/PageTransition";
import { fadeInUp, staggerContainer, resultSlideIn, slideInLeft, slideInRight } from "@/lib/animations";

const docTypes = ["Rental Agreement", "Employment Contract", "Loan Agreement", "Legal Notice", "Property Deed", "Other"];

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
  risk: { bg: "bg-destructive/10 text-destructive", label: "Risk" },
  review: { bg: "bg-warning/10 text-warning", label: "Review" },
  ok: { bg: "bg-success/10 text-success", label: "OK" },
};

const DocumentPage = () => {
  const [docType, setDocType] = useState(docTypes[0]);
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyze = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("document-analyze", {
        body: { text, docType },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setResult(data as AnalysisResult);
    } catch (e: any) {
      console.error("Document analysis error:", e);
      toast.error(e.message || "Failed to analyze document. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-[calc(100vh-3.5rem)] bg-background">
        <div className="flex flex-col lg:flex-row">
          {/* Left - Input */}
          <motion.div variants={slideInLeft} initial="hidden" animate="visible" className="flex-1 border-r-0 p-6 lg:border-r lg:p-8">
            <FileSearch size={28} className="mb-3 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground">Document Analyzer</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload or paste a legal document to get a plain-language breakdown of key clauses and risks.
            </p>

            <div className="mt-6 flex items-center justify-center rounded-card border-2 border-dashed border-border bg-muted/30 p-8 text-center">
              <div>
                <Upload size={24} className="mx-auto text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Drag & drop PDF or image</p>
                <p className="text-xs text-muted-foreground">(Coming soon)</p>
              </div>
            </div>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="Paste document text here..."
              className="w-full rounded-card border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:border-primary/50 transition-colors"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {docTypes.map((d) => (
                <motion.button
                  key={d}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDocType(d)}
                  className={`rounded-pill px-3 py-1 text-xs font-medium transition-colors ${
                    docType === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d}
                </motion.button>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={analyze}
              disabled={!text.trim() || isAnalyzing}
              className="mt-4 w-full rounded-card bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Document →"}
            </motion.button>
          </motion.div>

          {/* Right - Results */}
          <div className="flex-1 bg-card-warm p-6 lg:p-8">
            <AnimatePresence mode="wait">
              {!result && !isAnalyzing && (
                <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full items-center justify-center text-center">
                  <p className="text-sm text-muted-foreground">Your document analysis will appear here.</p>
                </motion.div>
              )}

              {isAnalyzing && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin-slow rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Analyzing document...</p>
                  </div>
                </motion.div>
              )}

              {result && (
                <motion.div key="results" variants={slideInRight} initial="hidden" animate="visible" className="space-y-5">
                  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="inline-block rounded-pill bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {result.docType}
                  </motion.span>

                  <motion.div variants={resultSlideIn} initial="hidden" animate="visible" className="rounded-card border bg-card p-4">
                    <h3 className="text-sm font-semibold text-foreground">Summary</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{result.summary}</p>
                  </motion.div>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Clause Analysis</h3>
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                      {result.clauses.map((c, i) => (
                        <motion.div key={i} variants={fadeInUp} custom={i} className={`rounded-card border border-l-4 ${riskBorder[c.risk]} bg-card p-4`}>
                          <div className="flex items-center gap-2">
                            {riskIcon[c.risk]}
                            <span className="text-sm font-semibold text-foreground">{c.name}</span>
                            <span className={`ml-auto rounded-pill px-2 py-0.5 text-[10px] font-semibold ${riskBadge[c.risk].bg}`}>
                              {riskBadge[c.risk].label}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{c.explanation}</p>
                          {c.suggestion && (
                            <p className="mt-2 text-xs italic text-primary">💡 Negotiate: {c.suggestion}</p>
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>

                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-card border border-l-4 border-l-warning bg-warning/5 p-4">
                    <h3 className="text-sm font-semibold text-foreground">Before You Sign</h3>
                    <ul className="mt-2 space-y-1">
                      {result.beforeYouSign.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="mt-0.5 text-warning">•</span> {b}
                        </li>
                      ))}
                    </ul>
                  </motion.div>

                  <p className="text-xs italic text-muted-foreground">
                    This analysis is for informational purposes only. Consult a lawyer before signing legal documents.
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

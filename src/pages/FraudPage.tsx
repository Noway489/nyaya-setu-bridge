import { useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Copy, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/PageTransition";
import { resultSlideIn, fadeInUp, staggerContainer } from "@/lib/animations";

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

const exampleMessages = [
  "Your SBI account will be blocked in 24 hrs. Click here to update KYC: bit.ly/sbi-kyc",
  "You've won ₹50 lakh lottery from Jio! Send ₹2500 registration fee to claim prize.",
  "Dear customer, your KYC is pending. Update now or account will be suspended: kyc-update.in",
  "Customs department: Your package is held. Pay ₹2500 duty via UPI to release.",
  "CBI officer here. Digital arrest warrant issued. Transfer ₹5 lakh or face arrest.",
];

const riskStyles: Record<RiskLevel, { bg: string; border: string; badge: string }> = {
  high: { bg: "bg-destructive/5", border: "border-l-destructive", badge: "bg-destructive/10 text-destructive" },
  suspicious: { bg: "bg-warning/5", border: "border-l-warning", badge: "bg-warning/10 text-warning" },
  safe: { bg: "bg-success/5", border: "border-l-success", badge: "bg-success/10 text-success" },
};

const FraudPage = () => {
  const [text, setText] = useState("");
  const [result, setResult] = useState<FraudResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyze = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("fraud-check", {
        body: { message: text },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setResult(data as FraudResult);
    } catch (e: any) {
      console.error("Fraud check error:", e);
      toast.error(e.message || "Failed to analyze. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const styles = result ? riskStyles[result.level] : null;

  return (
    <PageTransition>
      <div className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-10">
        <div className="mx-auto max-w-[680px]">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8 text-center">
            <Shield size={32} className="mx-auto mb-3 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Fraud & Scam Detector</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Paste any suspicious message — SMS, WhatsApp, email, or social media post. AI analyzes it for fraud patterns.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
            <div className="mb-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="Paste the suspicious message here... / संदिग्ध संदेश यहाँ पेस्ट करें..."
                className="w-full rounded-card border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:border-primary/50 transition-colors"
              />
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {exampleMessages.map((e, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setText(e)}
                  className="rounded-pill border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  {e.slice(0, 40)}...
                </motion.button>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={analyze}
              disabled={!text.trim() || isAnalyzing}
              className="w-full rounded-card bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze for Fraud →"}
            </motion.button>
          </motion.div>

          <AnimatePresence mode="wait">
            {result && styles && (
              <motion.div
                key="fraud-result"
                variants={resultSlideIn}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                className={`mt-6 rounded-card border border-l-4 ${styles.border} ${styles.bg} p-6`}
              >
                <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} className={`inline-block rounded-pill px-3 py-1 text-xs font-semibold ${styles.badge}`}>
                  {result.label}
                </motion.span>
                <p className="mt-2 text-sm font-semibold text-foreground">{result.type}</p>

                {result.level !== "safe" && (
                  <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                    <div className="mt-4">
                      <h4 className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                        <AlertTriangle size={12} /> Why this is dangerous
                      </h4>
                      <ul className="mt-2 space-y-1">
                        {result.reasons.map((r, i) => (
                          <motion.li key={i} variants={fadeInUp} custom={i} className="flex items-start gap-2 text-sm text-foreground">
                            <span className="mt-1 text-destructive">⚠</span> {r}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground">What to do RIGHT NOW</h4>
                      <ol className="mt-2 space-y-1">
                        {result.actions.map((a, i) => (
                          <motion.li key={i} variants={fadeInUp} custom={i + result.reasons.length} className="text-sm font-medium text-foreground">
                            {i + 1}. {a}
                          </motion.li>
                        ))}
                      </ol>
                    </div>
                    {result.reportTo.length > 0 && (
                      <motion.div variants={fadeInUp} custom={result.reasons.length + result.actions.length} className="mt-4 flex flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">Report to:</span>
                        {result.reportTo.map((r, i) => (
                          <span key={i} className="rounded-pill border px-3 py-1 text-xs font-medium text-foreground">
                            {r.label}: {r.value}
                          </span>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {result.level === "safe" && (
                  <div className="mt-3">
                    {result.reasons.map((r, i) => (
                      <motion.p key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle size={14} className="text-success" /> {r}
                      </motion.p>
                    ))}
                  </div>
                )}

                <p className="mt-4 text-xs italic text-muted-foreground">{result.note}</p>

                <div className="mt-4 flex gap-2">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { setResult(null); setText(""); }}
                    className="flex items-center gap-1 rounded-card border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw size={12} /> Analyze another
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      navigator.clipboard.writeText(`Fraud Check Result: ${result.label}\n${result.type}\n${result.reasons.join("\n")}`);
                      toast.success("Copied to clipboard");
                    }}
                    className="flex items-center gap-1 rounded-card border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy size={12} /> Copy result
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
};

export default FraudPage;

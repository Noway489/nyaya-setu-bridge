import { useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-10">
      <div className="mx-auto max-w-[680px]">
        <div className="mb-8 text-center">
          <Shield size={32} className="mx-auto mb-3 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Fraud & Scam Detector</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste any suspicious message — SMS, WhatsApp, email, or social media post. AI analyzes it for fraud patterns.
          </p>
        </div>

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
            <button
              key={i}
              onClick={() => setText(e)}
              className="rounded-pill border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              {e.slice(0, 40)}...
            </button>
          ))}
        </div>

        <button
          onClick={analyze}
          disabled={!text.trim() || isAnalyzing}
          className="w-full rounded-card bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isAnalyzing ? "Analyzing..." : "Analyze for Fraud →"}
        </button>

        {result && styles && (
          <div className={`mt-6 rounded-card border border-l-4 ${styles.border} ${styles.bg} p-6 animate-fade-in-up`}>
            <span className={`inline-block rounded-pill px-3 py-1 text-xs font-semibold ${styles.badge}`}>
              {result.label}
            </span>
            <p className="mt-2 text-sm font-semibold text-foreground">{result.type}</p>

            {result.level !== "safe" && (
              <>
                <div className="mt-4">
                  <h4 className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                    <AlertTriangle size={12} /> Why this is dangerous
                  </h4>
                  <ul className="mt-2 space-y-1">
                    {result.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="mt-1 text-destructive">⚠</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">What to do RIGHT NOW</h4>
                  <ol className="mt-2 space-y-1">
                    {result.actions.map((a, i) => (
                      <li key={i} className="text-sm font-medium text-foreground">
                        {i + 1}. {a}
                      </li>
                    ))}
                  </ol>
                </div>
                {result.reportTo.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">Report to:</span>
                    {result.reportTo.map((r, i) => (
                      <span key={i} className="rounded-pill border px-3 py-1 text-xs font-medium text-foreground">
                        {r.label}: {r.value}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            {result.level === "safe" && (
              <div className="mt-3">
                {result.reasons.map((r, i) => (
                  <p key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle size={14} className="text-success" /> {r}
                  </p>
                ))}
              </div>
            )}

            <p className="mt-4 text-xs italic text-muted-foreground">{result.note}</p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => { setResult(null); setText(""); }}
                className="flex items-center gap-1 rounded-card border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw size={12} /> Analyze another
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Fraud Check Result: ${result.label}\n${result.type}\n${result.reasons.join("\n")}`);
                  toast.success("Copied to clipboard");
                }}
                className="flex items-center gap-1 rounded-card border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy size={12} /> Copy result
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FraudPage;

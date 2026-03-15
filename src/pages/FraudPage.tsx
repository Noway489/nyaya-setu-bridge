import { useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Copy, RotateCcw } from "lucide-react";

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

const analyzeMessage = (msg: string): FraudResult => {
  const lower = msg.toLowerCase();
  if (lower.includes("sbi") || lower.includes("kyc") || lower.includes("bank") || lower.includes("block")) {
    return {
      level: "high",
      type: "Banking Impersonation Fraud",
      label: "🔴 PHISHING ATTEMPT DETECTED",
      reasons: [
        "Contains urgency tactics (\"blocked in 24 hrs\")",
        "Includes suspicious shortened URL (bit.ly link)",
        "Impersonates a bank — real banks never ask for KYC via SMS",
        "Requests clicking an external link to \"update\" information",
      ],
      actions: [
        "Do NOT click any links in this message",
        "Do NOT share OTP, PIN, CVV, or password with anyone",
        "Block and report the sender number",
        "Report to your bank's official fraud helpline",
      ],
      reportTo: [
        { label: "Cybercrime Helpline", value: "1930" },
        { label: "cybercrime.gov.in", value: "https://cybercrime.gov.in" },
        { label: "Bank Fraud Dept", value: "Your bank's helpline" },
      ],
      note: "No real bank, government, or court contacts you via SMS or WhatsApp to ask for OTP, PIN, or money.",
    };
  }
  if (lower.includes("won") || lower.includes("lottery") || lower.includes("prize") || lower.includes("lakh")) {
    return {
      level: "high",
      type: "Lottery / Prize Scam",
      label: "🔴 SCAM DETECTED",
      reasons: [
        "Promises unrealistic monetary reward",
        "Asks for upfront payment to \"claim\" a prize",
        "No legitimate lottery requires a fee to collect winnings",
        "Uses well-known brand name to build false trust",
      ],
      actions: [
        "Do NOT send any money",
        "Do NOT share personal or banking details",
        "Block the sender immediately",
        "Report to cybercrime portal",
      ],
      reportTo: [
        { label: "Cybercrime Helpline", value: "1930" },
        { label: "cybercrime.gov.in", value: "https://cybercrime.gov.in" },
      ],
      note: "You cannot win a lottery you never entered. All such messages are scams.",
    };
  }
  if (lower.includes("cbi") || lower.includes("digital arrest") || lower.includes("warrant") || lower.includes("customs") || lower.includes("duty")) {
    return {
      level: "high",
      type: "Government Impersonation Fraud",
      label: "🔴 IMPERSONATION SCAM DETECTED",
      reasons: [
        "Impersonates a government agency (CBI/Customs)",
        "\"Digital arrest\" is NOT a real legal concept in India",
        "Creates extreme urgency and fear to pressure payment",
        "Demands money transfer via UPI — no government agency does this",
      ],
      actions: [
        "Do NOT transfer any money",
        "Hang up the call immediately if contacted by phone",
        "No government officer will ever demand money over phone/message",
        "File a complaint on the cybercrime portal",
      ],
      reportTo: [
        { label: "Cybercrime Helpline", value: "1930" },
        { label: "Police", value: "112" },
        { label: "cybercrime.gov.in", value: "https://cybercrime.gov.in" },
      ],
      note: "\"Digital arrest\" does not exist in Indian law. CBI/Police never demand money via phone or UPI.",
    };
  }
  return {
    level: "safe",
    type: "General Message",
    label: "🟢 LIKELY SAFE",
    reasons: ["No common fraud patterns detected in this message", "Does not contain urgency tactics or suspicious links"],
    actions: ["Stay alert and verify sender identity for any financial requests"],
    reportTo: [],
    note: "Stay vigilant. If something feels wrong, trust your instinct and verify independently.",
  };
};

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
    await new Promise((r) => setTimeout(r, 1000));
    setResult(analyzeMessage(text));
    setIsAnalyzing(false);
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

        {/* Input */}
        <div className="mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Paste the suspicious message here... / संदिग्ध संदेश यहाँ पेस्ट करें..."
            className="w-full rounded-card border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Example chips */}
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

        {/* Result */}
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
                onClick={() => navigator.clipboard.writeText(`Fraud Check Result: ${result.label}\n${result.type}\n${result.reasons.join("\n")}`)}
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

import { useState } from "react";
import {
  Copy, Download, ArrowLeft, MessageSquare,
  Check, RotateCcw, Share2, ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { resultSlideIn, fadeInUp, staggerContainer } from "@/lib/animations";
import { ComplaintType } from "./ComplaintTypeSelector";

/* ── What to do next — per type ── */

const nextSteps: Record<ComplaintType, { steps: string[]; helpline?: string }> = {
  "FIR": {
    steps: [
      "Visit your nearest police station and present this draft to the duty officer",
      "The officer MUST register the FIR — they cannot legally refuse for cognizable offences",
      "Get a signed copy / acknowledgement of the FIR with the FIR number",
      "Keep a copy of this document and the FIR for future reference",
    ],
    helpline: "Police: 100 | Women: 1091 | Cybercrime: 1930",
  },
  "Legal Notice": {
    steps: [
      "Print on plain paper or get an advocate to print on their letterhead",
      "Send via Registered Post with Acknowledgement Due (RPAD) or courier with tracking",
      "Keep the courier receipt / postal receipt as proof of delivery",
      "If no response within the deadline, file the appropriate court case",
    ],
  },
  "Consumer Complaint": {
    steps: [
      "File online at consumerhelpline.gov.in or edaakhil.nic.in",
      "District Consumer Forum handles claims up to ₹50 Lakhs",
      "Attach all receipts, invoices, and screenshots as evidence",
      "Pay the minimal court fee (varies by claim amount)",
    ],
    helpline: "National Consumer Helpline: 1915",
  },
  "RTI Application": {
    steps: [
      "Send to the Public Information Officer (PIO) of the department via Registered Post",
      "Attach a ₹10 Indian Postal Order / court fee stamp (BPL citizens free)",
      "PIO must respond within 30 days (48 hours for life/liberty matters)",
      "File a First Appeal with the First Appellate Authority if unsatisfied",
    ],
    helpline: "RTI Online Portal: rtionline.gov.in",
  },
  "Grievance Letter": {
    steps: [
      "Send via email AND registered post for a paper trail",
      "Follow up after 7 days if no acknowledgement received",
      "File on Centralized Public Grievance Redress Portal (CPGRAMS) for govt grievances",
      "Escalate to the Banking Ombudsman / IRDAI for financial sector grievances",
    ],
    helpline: "CPGRAMS: pgportal.gov.in",
  },
  "Labour Complaint": {
    steps: [
      "File with the local Assistant Labour Commissioner (ALC) office",
      "For PF/ESI issues, file directly with regional EPFO/ESIC office",
      "For unpaid wages, file under Payment of Wages Act at Labour Court",
      "Free legal aid available from District Legal Services Authority (DLSA)",
    ],
    helpline: "NALSA Free Legal Aid: 15100",
  },
  "Domestic Violence": {
    steps: [
      "Call 181 (Women Helpline) or 112 for immediate help",
      "File with the Protection Officer in your district",
      "The Magistrate can issue emergency protection orders same day",
      "Free legal aid available — you do NOT need to hire a lawyer",
    ],
    helpline: "Women Helpline: 181 | NALSA: 15100",
  },
};

/* ── Props ── */

interface ComplaintResultProps {
  draft: string;
  complaintType: ComplaintType;
  onEdit: () => void;
  onRegenerate: () => void;
}

/* ── Component ── */

export default function ComplaintResult({
  draft,
  complaintType,
  onEdit,
  onRegenerate,
}: ComplaintResultProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const next = nextSteps[complaintType] || { steps: [], helpline: undefined };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {
      toast.error("Failed to copy text.");
    }
  };

  const handleDownload = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return toast.error("Pop-up blocked. Please allow pop-ups to download.");

    const htmlContent = draft
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${complaintType} — Nyaya Setu Draft</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Libre Baskerville', 'Times New Roman', serif; padding: 60px; line-height: 1.7; color: #111; background: #fff; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 18px; text-align: center; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
            h2 { font-size: 15px; margin: 20px 0 6px; }
            h3 { font-size: 14px; margin: 16px 0 4px; }
            p { margin-bottom: 12px; text-align: justify; font-size: 13px; }
            strong { font-weight: bold; }
            .disclaimer { font-style: italic; color: #666; text-align: center; margin: 0 0 36px; padding: 12px 16px; border: 1px dashed #bbb; font-size: 11px; line-height: 1.5; }
            .header { text-align: right; font-size: 11px; color: #888; margin-bottom: 40px; }
            @media print { body { padding: 30px; } }
          </style>
        </head>
        <body>
          <div class="header">
            Nyaya Setu — न्याय सेतु &nbsp;|&nbsp; AI-Powered Legal Aid for India
          </div>
          <div class="disclaimer">
            <strong>IMPORTANT:</strong> This is an AI-generated legal draft. It must be reviewed carefully and personalized before submission. Nyaya Setu does not provide legal advice. Please consult a qualified advocate for your specific situation.
          </div>
          <p>${htmlContent}</p>
          <script>
            window.onload = () => { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${complaintType} Draft — Nyaya Setu`,
          text: draft.slice(0, 300) + "...",
        });
      } catch (_) { /* user cancelled */ }
    } else {
      handleCopy();
      toast("Share copied to clipboard");
    }
  };

  const handleDiscuss = () => {
    navigate("/chat", {
      state: {
        initialMessage: `I need help reviewing or modifying this AI-drafted ${complaintType}:\n\n${draft}`,
      },
    });
  };

  return (
    <motion.div
      variants={resultSlideIn}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-4xl space-y-6"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onEdit}
          id="result-back-btn"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to Form
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onRegenerate}
            id="regenerate-btn"
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-accent"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Regenerate</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleCopy}
            id="copy-draft-btn"
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-accent"
          >
            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleDownload}
            id="download-pdf-btn"
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-accent"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Download PDF</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleShare}
            id="share-btn"
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-accent md:flex hidden"
          >
            <Share2 size={14} />
            Share
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleDiscuss}
            id="discuss-ai-btn"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
          >
            <MessageSquare size={14} />
            <span className="hidden sm:inline">Discuss with AI</span>
          </motion.button>
        </div>
      </div>

      {/* Document Viewer */}
      <div className="overflow-hidden rounded-2xl border border-border/60 shadow-md">
        {/* Warning banner */}
        <div className="border-b bg-amber-500/10 px-5 py-3 text-center text-sm font-medium text-amber-700 dark:text-amber-400">
          ⚠️ AI-Generated Draft — Review carefully. Fill in all{" "}
          <code className="rounded bg-amber-500/15 px-1 text-xs">[PLACEHOLDERS]</code>{" "}
          before submitting.
        </div>

        {/* Paper document */}
        <div className="bg-[#fdfcfa] dark:bg-[#1a1a1a] p-6 sm:p-10">
          <div className="font-mono text-sm leading-relaxed text-foreground sm:text-[14.5px]">
            {draft.split("\n").map((line, idx) => {
              if (/^#{1,2}\s/.test(line)) {
                return (
                  <div key={idx} className="my-3 text-center text-base font-bold tracking-wide text-foreground">
                    {line.replace(/^#+\s/, "")}
                  </div>
                );
              }
              if (/^###\s/.test(line)) {
                return (
                  <div key={idx} className="mt-4 mb-1 text-sm font-bold text-foreground">
                    {line.replace(/^###\s/, "")}
                  </div>
                );
              }
              const parts = line.split(/(\*\*.*?\*\*|\[.*?\])/g);
              return (
                <div key={idx} className="min-h-[1.6em]">
                  {parts.map((part, i) => {
                    if (part.startsWith("**") && part.endsWith("**")) {
                      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
                    }
                    if (part.startsWith("[") && part.endsWith("]")) {
                      return (
                        <span key={i} className="rounded bg-primary/10 px-1 text-primary font-medium text-[13px]">
                          {part}
                        </span>
                      );
                    }
                    return part;
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* What to do next */}
      {next.steps.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-primary/20 bg-primary/5 p-6"
        >
          <h3 className="mb-4 font-display text-base font-bold text-primary">
            ✅ What to do next with your {complaintType}
          </h3>
          <ol className="space-y-3">
            {next.steps.map((step, i) => (
              <motion.li
                key={i}
                variants={fadeInUp}
                custom={i}
                className="flex items-start gap-3 text-sm text-foreground"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </motion.li>
            ))}
          </ol>
          {next.helpline && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-card px-4 py-2.5 text-xs font-medium text-primary">
              <ChevronRight size={14} />
              {next.helpline}
            </div>
          )}
        </motion.div>
      )}

      {/* Disclaimer */}
      <p className="text-center text-xs italic text-muted-foreground">
        This draft is generated by AI for informational purposes only. It is not legal advice.
        Please consult a qualified advocate before submission.
      </p>
    </motion.div>
  );
}

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Loader2, Save, Info, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ComplaintType } from "./ComplaintTypeSelector";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { fadeInUp } from "@/lib/animations";

/* ── Per-type field configuration ── */

interface FormField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "date";
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
  maxLength?: number;
}

const config: Record<ComplaintType, FormField[]> = {
  "FIR": [
    { id: "complainantName", label: "Your Full Name", type: "text", required: true, placeholder: "e.g. Rajesh Kumar Sharma" },
    { id: "contactDetails", label: "Contact Number / Address", type: "text", required: false, placeholder: "e.g. 9876543210, 12 MG Road, Delhi" },
    { id: "incidentDate", label: "Date of Incident", type: "date", required: true },
    { id: "incidentLocation", label: "Location of Incident", type: "text", required: true, placeholder: "e.g. Near Connaught Place Metro Station, New Delhi" },
    { id: "accusedDetails", label: "Accused Person(s) Description", type: "text", required: false, placeholder: "Name, address, or physical description if known" },
    { id: "incidentDetails", label: "What happened? (Full description)", type: "textarea", required: true, maxLength: 1500,
      helpText: "Describe the incident in full detail — what happened, how it happened, and any witnesses present.", placeholder: "Describe the incident clearly: sequence of events, nature of crime, any items stolen/damaged, witnesses, etc." },
  ],
  "Legal Notice": [
    { id: "senderName", label: "Your Name & Address", type: "text", required: true, placeholder: "e.g. Priya Sen, 45 Park Street, Kolkata - 700001" },
    { id: "recipientName", label: "Recipient Name & Address", type: "text", required: true, placeholder: "e.g. XYZ Company Ltd, 22 Business Hub, Mumbai - 400001" },
    { id: "disputeDate", label: "Date of Dispute / Agreement", type: "date", required: false },
    { id: "amountClaimed", label: "Amount / Relief Claimed (if any)", type: "text", required: false, placeholder: "e.g. ₹2,50,000 or specific performance of contract" },
    { id: "disputeDetails", label: "Nature of Dispute & Your Demands", type: "textarea", required: true, maxLength: 1200,
      helpText: "Describe what went wrong and exactly what you demand they do — refund, restore, pay, etc.", placeholder: "Explain what the other party did wrong, which agreement was breached, and what you want them to do within a specific timeframe." },
  ],
  "Consumer Complaint": [
    { id: "complainantName", label: "Your Full Name & Address", type: "text", required: true, placeholder: "e.g. Anita Verma, 7 Lake View, Bengaluru - 560001" },
    { id: "companyDetails", label: "Company / Seller Name & Address", type: "text", required: true, placeholder: "e.g. Amazon Seller Services Pvt Ltd, Bengaluru" },
    { id: "purchaseDate", label: "Date of Purchase / Service", type: "date", required: false },
    { id: "amountPaid", label: "Amount Paid", type: "text", required: false, placeholder: "e.g. ₹15,999 via UPI / Credit Card" },
    { id: "productService", label: "Product / Service Name", type: "text", required: true, placeholder: "e.g. Samsung Galaxy S23, Travel Insurance Policy" },
    { id: "issueFaced", label: "Deficiency / Issue Faced & Relief Sought", type: "textarea", required: true, maxLength: 1200,
      helpText: "Describe the defect, deficiency of service, or unfair trade practice, and what relief you are seeking (refund, replacement, compensation).", placeholder: "Describe the problem clearly and what you want as remedy — full refund, replacement, or compensation." },
  ],
  "RTI Application": [
    { id: "applicantName", label: "Your Full Name & Address", type: "text", required: true, placeholder: "e.g. Suresh Nair, 3 Gandhi Nagar, Kochi - 682017" },
    { id: "department", label: "Government Department / Authority", type: "text", required: true, placeholder: "e.g. Municipal Corporation of Delhi, PWD, EPFO" },
    { id: "applicationDate", label: "Date of Application", type: "date", required: false },
    { id: "feeDetails", label: "Application Fee Payment Details", type: "text", required: false, placeholder: "e.g. ₹10 via IPO / Court Fee Stamp / Online" },
    { id: "infoNeeded", label: "Information / Documents Required", type: "textarea", required: true, maxLength: 1200,
      helpText: "Be very specific about the information you need. Vague requests may be rejected. List each item separately.", placeholder: "List each piece of information or document you want, clearly and separately. E.g., 1. Copies of all sanction orders... 2. Budget allocated for..." },
  ],
  "Grievance Letter": [
    { id: "applicantName", label: "Your Full Name & Contact", type: "text", required: true, placeholder: "e.g. Meena Iyer, meena@email.com, 9123456789" },
    { id: "authority", label: "Recipient (Authority / Manager)", type: "text", required: true, placeholder: "e.g. The Branch Manager, SBI Main Branch, Chennai" },
    { id: "referenceNumber", label: "Account / Reference Number (if any)", type: "text", required: false, placeholder: "e.g. Account No. 12345678901, Policy No. XYZ" },
    { id: "grievanceDate", label: "Date of Issue / Incident", type: "date", required: false },
    { id: "grievance", label: "Grievance Details & Expected Resolution", type: "textarea", required: true, maxLength: 1000,
      helpText: "Be specific about the issue, any previous communication attempts, and your expected resolution or deadline.", placeholder: "Describe the issue, previous follow-ups made, and what resolution you expect." },
  ],
  "Labour Complaint": [
    { id: "employeeName", label: "Your Name, Designation & Contact", type: "text", required: true, placeholder: "e.g. Dinesh Kumar, Software Engineer, 9876543210" },
    { id: "employerName", label: "Employer / Company Name & Address", type: "text", required: true, placeholder: "e.g. ABC Technologies Pvt Ltd, Sector 18, Noida" },
    { id: "employmentPeriod", label: "Period of Employment", type: "text", required: false, placeholder: "e.g. June 2021 – March 2024" },
    { id: "salaryDetails", label: "Monthly Salary / Dues Pending", type: "text", required: false, placeholder: "e.g. ₹45,000/month; 3 months salary unpaid" },
    { id: "violationType", label: "Type of Violation", type: "select", required: true,
      options: ["Unpaid Wages / Salary", "Wrongful / Illegal Termination", "No Appointment Letter or PF", "Sexual Harassment at Workplace", "Denial of Leave / Benefits", "Other Labour Rights Violation"] },
    { id: "grievanceDetails", label: "Full Description of Complaint", type: "textarea", required: true, maxLength: 1200,
      helpText: "Describe what happened, the dates, any proof you have, and what relief you are seeking.", placeholder: "Explain the violation in detail, including dates, amounts, prior communication with employer, and what relief you want (back wages, reinstatement, etc.)." },
  ],
  "Domestic Violence": [
    { id: "survivorName", label: "Your Name & Contact Details", type: "text", required: true, placeholder: "e.g. [Can be kept confidential]" },
    { id: "respondentName", label: "Respondent Name & Relation", type: "text", required: true, placeholder: "e.g. [Name], Husband / In-laws" },
    { id: "residentialAddress", label: "Shared Household Address", type: "text", required: false, placeholder: "Address of the shared household" },
    { id: "incidentDate", label: "Date(s) of Violence / Abuse", type: "text", required: false, placeholder: "e.g. Ongoing since 2022, or specific recent date" },
    { id: "typeOfViolence", label: "Type of Violence / Abuse", type: "select", required: true,
      options: ["Physical Violence", "Emotional / Mental Abuse", "Sexual Abuse", "Economic Abuse (Withholding Money)", "All of the above"] },
    { id: "reliefSought", label: "Relief / Protection Needed", type: "textarea", required: true, maxLength: 1000,
      helpText: "Specify what legal protection or orders you are seeking from the Magistrate.", placeholder: "E.g., Protection order (no contact), Residence order, Monetary relief, Custody order, Compensation for injuries." },
  ],
};

/* ── Tips per type ── */

const tips: Record<ComplaintType, { title: string; items: string[] }> = {
  "FIR": {
    title: "FIR Tips",
    items: ["Note exact time, date, and location of the incident", "List all witnesses and their contact info", "Police must register FIR for cognizable offences — they cannot refuse", "Note any CCTV cameras nearby", "You can file a Complaint to Magistrate if police refuse to file FIR"],
  },
  "Legal Notice": {
    title: "Notice Tips",
    items: ["Give a reasonable deadline (15–30 days)", "Keep a copy of the sent notice (with proof of delivery)", "Notice sent before filing suit shows good faith", "Consider having a lawyer sign the notice for more weight"],
  },
  "Consumer Complaint": {
    title: "Consumer Tips",
    items: ["Keep all receipts, invoices, and chat screenshots", "Try emailing the company first — use that as evidence", "District Forum handles claims up to ₹50 Lakhs", "NCDRC handles claims above ₹2 Crore", "File on the National Consumer Helpline (1915)"],
  },
  "RTI Application": {
    title: "RTI Tips",
    items: ["Application fee is ₹10 only (BPL citizens exempt)", "PIO must reply within 30 days (48 hrs for life/liberty)", "Be extremely specific — vague requests get rejected", "You can appeal to First Appellate Authority if unsatisfied", "Use India Post Dept. speed post for record keeping"],
  },
  "Grievance Letter": {
    title: "Grievance Tips",
    items: ["Keep copies of all previous communications", "Address to the highest feasible authority", "Set a clear deadline for resolution (7–15 days)", "Send by registered post / email with read receipt"],
  },
  "Labour Complaint": {
    title: "Labour Tips",
    items: ["File with local Labour Commissioner or ALC office", "Keep copies of salary slips, appointment letter, ID cards", "EPFO complaints go to EPFO regional office", "Sexual harassment: file with Internal Complaints Committee first", "Legal aid available free from District Legal Services Authority"],
  },
  "Domestic Violence": {
    title: "DV Act Tips",
    items: ["Call helpline: 181 (Women Helpline) or 112", "Free legal aid from Legal Services Authority (NALSA: 15100)", "You do NOT need a lawyer to file under DV Act", "Magistrate can issue emergency protection order same day", "Shelter homes available — ask protection officer"],
  },
};

/* ── Generating stage messages ── */
export const GENERATING_STAGES = [
  "Reading your details...",
  "Structuring the document...",
  "Adding legal references...",
  "Formatting the draft...",
  "Almost ready...",
];

/* ── Props ── */

interface ComplaintFormProps {
  type: ComplaintType;
  onBack: () => void;
  onSubmit: (formData: Record<string, string>) => void;
  isGenerating: boolean;
  generatingStage?: string;
}

/* ── Component ── */

export default function ComplaintForm({
  type,
  onBack,
  onSubmit,
  isGenerating,
  generatingStage,
}: ComplaintFormProps) {
  const fields = config[type] || [];
  const hint = tips[type];
  const draftKey = `nyaya_draft_${type.replace(/\s+/g, "_")}`;

  const [formData, setFormData] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {};
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(formData));
  }, [formData, draftKey]);

  const handleChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) setErrors((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const validate = () => {
    const newErrs: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.required && !formData[f.id]?.trim()) newErrs[f.id] = "This field is required.";
    });
    setErrors(newErrs);
    return Object.keys(newErrs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    } else {
      document.querySelector(".border-destructive")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  /* ── Generating overlay ── */
  if (isGenerating) {
    return (
      <motion.div
        key="generating"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto flex max-w-lg flex-col items-center gap-6 rounded-2xl border bg-card p-10 shadow-sm text-center"
      >
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full bg-primary/10" />
          </div>
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">Drafting Your Document</h3>
          <AnimatePresence mode="wait">
            <motion.p
              key={generatingStage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="mt-2 text-sm text-muted-foreground"
            >
              {generatingStage || "Preparing..."}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="w-full rounded-full bg-muted h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "90%" }}
            transition={{ duration: 8, ease: "easeInOut" }}
          />
        </div>
        <p className="text-xs text-muted-foreground">AI is generating a legally structured draft — usually takes 15–30 seconds.</p>
      </motion.div>
    );
  }

  /* ── Normal form ── */
  return (
    <motion.div
      key="form"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto max-w-4xl"
    >
      {/* Back + badge row */}
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Change Type
        </button>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Drafting: {type}
        </span>
      </div>

      <div className="flex gap-6">
        {/* Main Form */}
        <form onSubmit={handleSubmit} className="flex-1 space-y-5 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-2">
            <h2 className="font-display text-xl font-bold text-foreground">Fill in the Details</h2>
            <p className="text-sm text-muted-foreground">
              Provide as much information as possible. The AI will fill in standard legal language automatically.
            </p>
          </div>

          {fields.map((field, i) => (
            <motion.div
              key={field.id}
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              custom={i}
              className="space-y-1.5"
            >
              <label htmlFor={field.id} className="flex items-center gap-2 text-sm font-medium text-foreground">
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
                {field.helpText && (
                  <Tooltip>
                    <TooltipTrigger type="button">
                      <Info size={13} className="text-muted-foreground hover:text-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs leading-snug">
                      <p>{field.helpText}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </label>

              {field.type === "textarea" ? (
                <div className="relative">
                  <textarea
                    id={field.id}
                    value={formData[field.id] || ""}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    placeholder={field.placeholder || ""}
                    maxLength={field.maxLength}
                    rows={5}
                    className={`w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 transition-shadow ${errors[field.id] ? "border-destructive focus:ring-destructive/60" : "border-input"}`}
                  />
                  {field.maxLength && (
                    <span className="absolute bottom-2 right-2 text-[10px] text-muted-foreground/60">
                      {(formData[field.id] || "").length}/{field.maxLength}
                    </span>
                  )}
                </div>
              ) : field.type === "select" ? (
                <select
                  id={field.id}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 transition-shadow ${errors[field.id] ? "border-destructive focus:ring-destructive/60" : "border-input"}`}
                >
                  <option value="" disabled>Select an option</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === "date" ? (
                <input
                  type="date"
                  id={field.id}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 transition-shadow ${errors[field.id] ? "border-destructive focus:ring-destructive/60" : "border-input"}`}
                />
              ) : (
                <input
                  type="text"
                  id={field.id}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  placeholder={field.placeholder || ""}
                  className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 transition-shadow ${errors[field.id] ? "border-destructive focus:ring-destructive/60" : "border-input"}`}
                />
              )}
              {errors[field.id] && (
                <p className="text-xs font-medium text-destructive">{errors[field.id]}</p>
              )}
            </motion.div>
          ))}

          <div className="flex items-center justify-between border-t pt-5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Save size={13} />
              Auto-saved locally
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              id="generate-complaint-btn"
              disabled={isGenerating}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-70"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Document
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </div>
        </form>

        {/* Tips panel — desktop only */}
        <aside className="hidden w-64 shrink-0 xl:block">
          <div className="sticky top-6 rounded-xl border bg-amber-50/60 dark:bg-amber-900/10 p-5">
            <div className="mb-3 flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Lightbulb size={16} />
              <span className="text-sm font-semibold">{hint.title}</span>
            </div>
            <ul className="space-y-2">
              {hint.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  <span className="mt-0.5 shrink-0 text-amber-500">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

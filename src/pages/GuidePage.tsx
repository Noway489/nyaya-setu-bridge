import { useState } from "react";
import { FileText, AlertCircle, Phone, ChevronDown, ChevronRight } from "lucide-react";

interface Step {
  title: string;
  detail: string;
  escalation?: string;
}

interface Procedure {
  id: string;
  title: string;
  category: string;
  description: string;
  documents: string[];
  fees: string;
  timeEstimate: string;
  steps: Step[];
  deadlines?: string;
  helpline: { label: string; number: string };
}

const procedures: Procedure[] = [
  {
    id: "fir",
    title: "File an FIR",
    category: "Criminal",
    description: "File a First Information Report when a cognizable offence has been committed",
    documents: ["Government-issued ID (Aadhaar/Voter ID/Passport)", "Details of the incident (date, time, place)", "Names/descriptions of accused (if known)", "Any evidence (photos, screenshots, documents)"],
    fees: "Free — Police cannot refuse or charge for filing FIR",
    timeEstimate: "30-60 minutes at the police station",
    steps: [
      { title: "Visit the nearest police station", detail: "Go to the police station with jurisdiction over the area where the crime occurred. You can file FIR at any police station under Section 154 CrPC — they must register it.", escalation: "If the police station claims it's not their jurisdiction, insist on a Zero FIR (mandatory since 2013)." },
      { title: "Narrate the incident to the Duty Officer", detail: "Describe the complete incident. The officer will write it down in your words. You can narrate in Hindi, English, or your regional language." },
      { title: "Review and sign the FIR", detail: "Read the written FIR carefully before signing. Ensure all facts, dates, and details are correct. You have the right to get it corrected before signing." },
      { title: "Get your copy", detail: "Under Section 154(2) CrPC, you are entitled to a free copy of the FIR. Insist on getting it immediately. Note down the FIR number." },
      { title: "Follow up", detail: "Note the Investigation Officer's name and number. Follow up regularly. You can track the case status online in many states." },
    ],
    deadlines: "File as soon as possible. Delay weakens the case, though there is no time limit for filing FIR for cognizable offences.",
    helpline: { label: "Police Control Room", number: "112" },
  },
  {
    id: "cybercrime",
    title: "Report Cybercrime",
    category: "Criminal",
    description: "Report online fraud, hacking, cyberbullying, or identity theft",
    documents: ["Screenshots of the fraud/crime", "Transaction details (if financial fraud)", "Suspect's contact details, URLs, or social media profiles", "ID proof"],
    fees: "Free",
    timeEstimate: "15-30 minutes online, or visit cyber cell",
    steps: [
      { title: "File online complaint", detail: "Visit cybercrime.gov.in and register. File a complaint with all details and evidence. You'll get a complaint acknowledgment number." },
      { title: "Call 1930 helpline", detail: "For financial fraud, immediately call 1930 (National Cybercrime Helpline). They can freeze suspicious transactions within the golden hour." },
      { title: "Visit Cyber Cell if needed", detail: "For serious cases, visit your nearest Cyber Crime Police Station with all evidence. Many cities have dedicated cyber cells." },
      { title: "Preserve evidence", detail: "Take screenshots of everything — chats, transactions, emails, URLs. Do not delete any messages or clear browsing history." },
    ],
    helpline: { label: "Cybercrime Helpline", number: "1930" },
  },
  {
    id: "consumer",
    title: "Consumer Complaint",
    category: "Civil / Consumer",
    description: "File a complaint for defective products, deficient services, or unfair trade practices",
    documents: ["Purchase receipt / invoice", "Product details and defect description", "Communication with the seller/service provider", "ID proof"],
    fees: "No fee for claims up to ₹5 lakh; ₹200 for ₹5-10 lakh; ₹400 for ₹10-20 lakh",
    timeEstimate: "Can be filed online in 20-30 minutes",
    steps: [
      { title: "Send legal notice to the company", detail: "Before filing, send a formal written complaint to the company giving them 15-30 days to resolve. Keep proof of sending (registered post / email)." },
      { title: "File on edaakhil.nic.in", detail: "Register on the e-Daakhil portal. Upload your complaint, evidence, and pay the nominal fee. You can file from home without a lawyer.", escalation: "If the portal is down, visit your District Consumer Disputes Redressal Forum physically." },
      { title: "Attend hearing", detail: "You'll receive a hearing date. You can represent yourself — no lawyer required. Present your evidence clearly." },
      { title: "Get the order", detail: "The commission will pass an order. If the company doesn't comply, you can file an execution petition." },
    ],
    deadlines: "File within 2 years of the cause of action (date of purchase/defect discovery).",
    helpline: { label: "Consumer Helpline", number: "1800-11-4000" },
  },
  {
    id: "rti",
    title: "File RTI",
    category: "Civil / Consumer",
    description: "Request information from any public authority under the Right to Information Act, 2005",
    documents: ["Application on plain paper or online", "₹10 fee (waived for BPL)"],
    fees: "₹10 (postal order, DD, or online payment)",
    timeEstimate: "10-15 minutes to file; 30 days for response",
    steps: [
      { title: "Identify the Public Authority", detail: "Determine which government department has the information you need. This could be central, state, or local government body." },
      { title: "File online or by post", detail: "Online: Visit rtionline.gov.in for central departments. For state departments, use respective state RTI portals. By post: Write on plain paper addressed to the PIO (Public Information Officer).", escalation: "If you don't know who the PIO is, address it to the head of the department." },
      { title: "Wait for response", detail: "The PIO must respond within 30 days (48 hours for life/liberty matters). If no response, file First Appeal to the Appellate Authority within 30 days." },
      { title: "File appeal if needed", detail: "First Appeal: To the senior officer within the department. Second Appeal: To the Central/State Information Commission if still unsatisfied." },
    ],
    deadlines: "No time limit for filing RTI. Response must come within 30 days.",
    helpline: { label: "RTI Helpline", number: "011-26105773" },
  },
];

const categories = [...new Set(procedures.map((p) => p.category))];

const GuidePage = () => {
  const [activeId, setActiveId] = useState(procedures[0].id);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const active = procedures.find((p) => p.id === activeId)!;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full border-b bg-card p-4 md:w-64 md:border-b-0 md:border-r md:p-5">
        {/* Mobile dropdown */}
        <div className="md:hidden">
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            className="w-full rounded-card border bg-background px-3 py-2 text-sm text-foreground"
          >
            {procedures.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        {/* Desktop list */}
        <div className="hidden md:block">
          {categories.map((cat) => (
            <div key={cat} className="mb-4">
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h3>
              {procedures.filter((p) => p.category === cat).map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setActiveId(p.id); setExpandedStep(null); }}
                  className={`mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    activeId === p.id
                      ? "border-l-2 border-l-primary bg-primary/5 font-medium text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText size={14} />
                  {p.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-6 md:p-8">
        <div className="mx-auto max-w-2xl animate-fade-in-up">
          {/* Hero strip */}
          <div className="mb-6 rounded-card border bg-card-warm p-5">
            <h1 className="font-display text-xl font-bold text-foreground md:text-2xl">{active.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{active.description}</p>
          </div>

          {/* What you'll need */}
          <div className="mb-6 rounded-card border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">What You'll Need</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground">Documents</h4>
                <ul className="mt-1 space-y-1">
                  {active.documents.map((d, i) => (
                    <li key={i} className="text-xs text-foreground">• {d}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground">Fees</h4>
                <p className="mt-1 text-xs text-foreground">{active.fees}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground">Time Estimate</h4>
                <p className="mt-1 text-xs text-foreground">{active.timeEstimate}</p>
              </div>
            </div>
          </div>

          {/* Steps */}
          <h2 className="mb-3 text-sm font-semibold text-foreground">Step-by-Step Guide</h2>
          <div className="space-y-3">
            {active.steps.map((s, i) => (
              <div key={i} className="rounded-card border bg-card p-4">
                <button
                  onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-foreground">{s.title}</span>
                  {expandedStep === i ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                </button>
                {expandedStep === i && (
                  <div className="mt-3 ml-10 animate-fade-in-up">
                    <p className="text-sm text-muted-foreground">{s.detail}</p>
                    {s.escalation && (
                      <div className="mt-2 rounded-md bg-warning/5 p-2 text-xs text-warning">
                        <AlertCircle size={12} className="mr-1 inline" /> {s.escalation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Deadlines */}
          {active.deadlines && (
            <div className="mt-5 rounded-card border border-l-4 border-l-warning bg-warning/5 p-4">
              <h3 className="text-xs font-semibold text-warning uppercase">Time Limits</h3>
              <p className="mt-1 text-sm text-foreground">{active.deadlines}</p>
            </div>
          )}

          {/* Helpline */}
          <div className="mt-5 rounded-card bg-primary p-4">
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-primary-foreground" />
              <div>
                <p className="text-xs text-primary-foreground/80">Free Help</p>
                <p className="text-sm font-semibold text-primary-foreground">
                  {active.helpline.label}: {active.helpline.number}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GuidePage;

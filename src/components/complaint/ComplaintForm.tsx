import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Loader2, Save, Info } from "lucide-react";
import { ComplaintType } from "./ComplaintTypeSelector";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface FormField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "radio";
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
}

const config: Record<ComplaintType, FormField[]> = {
  "FIR": [
    { id: "personalDetails", label: "Your Full Name & Contact (Optional)", type: "text", required: false, placeholder: "e.g. John Doe, 9876543210" },
    { id: "incidentDetails", label: "What happened?", type: "textarea", required: true, helpText: "Describe the incident. Our AI will automatically structure this into a formal FIR.", placeholder: "Briefly explain the crime, when it occurred, and where." },
  ],
  "Legal Notice": [
    { id: "senderRecipient", label: "Who is involved? (Optional)", type: "text", required: false, placeholder: "From [You] to [Company/Person]" },
    { id: "disputeDetails", label: "What is the dispute & your demands?", type: "textarea", required: true, placeholder: "Explain what went wrong and what you want them to do (e.g. refund in 15 days)." },
  ],
  "Consumer Complaint": [
    { id: "companyDetails", label: "Company/Seller Name (Optional)", type: "text", required: false, placeholder: "e.g. Amazon India" },
    { id: "issueFaced", label: "What is the problem?", type: "textarea", required: true, placeholder: "Explain the defective product or service, and what relief you are seeking." },
  ],
  "RTI Application": [
    { id: "departmentSought", label: "Which Govt Department? (Optional)", type: "text", required: false, placeholder: "e.g. Municipal Corporation" },
    { id: "infoNeeded", label: "What exactly do you want to know?", type: "textarea", required: true, placeholder: "List out the information or documents you need." },
  ],
  "Grievance Letter": [
    { id: "authority", label: "Who are you addressing? (Optional)", type: "text", required: false, placeholder: "e.g. The Bank Manager" },
    { id: "grievance", label: "Describe your grievance", type: "textarea", required: true, placeholder: "Explain the issue you are facing." },
  ]
};

interface ComplaintFormProps {
  type: ComplaintType;
  onBack: () => void;
  onSubmit: (formData: Record<string, string>) => void;
  isGenerating: boolean;
}

export default function ComplaintForm({ type, onBack, onSubmit, isGenerating }: ComplaintFormProps) {
  const fields = config[type] || [];
  
  // Try to load draft from localStorage
  const draftKey = `nyaya_draft_${type.replace(/\s+/g, '_')}`;
  
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {};
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-save form data periodically or on change
  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(formData));
  }, [formData, draftKey]);

  const handleChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[id];
        return newErrs;
      });
    }
  };

  const handleValidation = () => {
    const newErrs: Record<string, string> = {};
    fields.forEach(f => {
      if (f.required && !formData[f.id]?.trim()) {
        newErrs[f.id] = "This field is required";
      }
    });
    setErrors(newErrs);
    return Object.keys(newErrs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (handleValidation()) {
      onSubmit(formData);
    } else {
      // Create a small red text warning if validation fails
      const firstErrorElement = document.querySelector('.border-destructive');
      firstErrorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Change Type
        </button>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Drafting {type}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <h2 className="font-display text-xl font-bold text-foreground">Fill Details for {type}</h2>
          <p className="text-sm text-muted-foreground">Provide accurate information to generate a legally sound draft.</p>
        </div>

        <div className="space-y-5">
          {fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <label htmlFor={field.id} className="flex items-center gap-2 text-sm font-medium text-foreground">
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
                {field.helpText && (
                  <Tooltip>
                    <TooltipTrigger type="button">
                      <Info size={14} className="text-muted-foreground hover:text-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs leading-tight">
                      <p>{field.helpText}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </label>

              {field.type === "textarea" ? (
                <textarea
                  id={field.id}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  placeholder={field.placeholder || ""}
                  rows={4}
                  className={`w-full resize-y rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 dark:focus:ring-offset-background ${errors[field.id] ? 'border-destructive focus:ring-destructive' : 'border-input'}`}
                />
              ) : field.type === "select" ? (
                <select
                  id={field.id}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 dark:focus:ring-offset-background ${errors[field.id] ? 'border-destructive focus:ring-destructive' : 'border-input'}`}
                >
                  <option value="" disabled>Select an option</option>
                  {field.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  id={field.id}
                  value={formData[field.id] || ""}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  placeholder={field.placeholder || ""}
                  className={`w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 dark:focus:ring-offset-background ${errors[field.id] ? 'border-destructive focus:ring-destructive' : 'border-input'}`}
                />
              )}
              {errors[field.id] && <p className="text-xs font-medium text-destructive">{errors[field.id]}</p>}
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Save size={16} />
            Auto-saved locally
          </div>
          <button
            type="submit"
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 rounded-pill bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-70 dark:focus:ring-offset-background"
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
          </button>
        </div>
      </form>
    </div>
  );
}

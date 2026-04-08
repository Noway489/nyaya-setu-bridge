import { FileText, Scale, ShoppingBag, Fingerprint, Mail } from "lucide-react";

export type ComplaintType = "FIR" | "Legal Notice" | "Consumer Complaint" | "RTI Application" | "Grievance Letter";

interface ComplaintTypeSelectorProps {
  onSelect: (type: ComplaintType) => void;
}

const types: { id: ComplaintType; title: string; icon: React.FC<any>; description: string }[] = [
  {
    id: "FIR",
    title: "FIR (Police Report)",
    icon: Fingerprint,
    description: "First Information Report for criminal offenses like theft, assault, or fraud.",
  },
  {
    id: "Legal Notice",
    title: "Legal Notice",
    icon: Scale,
    description: "Formal formal warning before taking legal action against someone.",
  },
  {
    id: "Consumer Complaint",
    title: "Consumer Complaint",
    icon: ShoppingBag,
    description: "Complaint against a seller or service provider for deficiency or fraud.",
  },
  {
    id: "RTI Application",
    title: "RTI Application",
    icon: FileText,
    description: "Seek official info from Govt departments under the Right to Information Act.",
  },
  {
    id: "Grievance Letter",
    title: "Grievance Letter",
    icon: Mail,
    description: "Formal letter addressing complaints to a specific authority or company.",
  },
];

export default function ComplaintTypeSelector({ onSelect }: ComplaintTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-semibold text-foreground">Select Complaint Type</h2>
        <p className="mt-2 text-muted-foreground">Choose the type of legal document you want our AI to draft for you.</p>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {types.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className="flex flex-col items-start rounded-xl border bg-card p-6 text-left shadow-sm transition-all duration-200 hover:border-primary/50 hover:bg-accent hover:shadow-md"
            >
              <div className="mb-4 rounded-full bg-primary/10 p-3 text-primary">
                <Icon size={24} />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{type.title}</h3>
              <p className="text-sm text-muted-foreground">{type.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

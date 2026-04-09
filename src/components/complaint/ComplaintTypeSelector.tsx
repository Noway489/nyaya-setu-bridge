import { motion } from "framer-motion";
import {
  FileText, Scale, ShoppingBag, Fingerprint,
  Mail, Briefcase, HeartHandshake,
} from "lucide-react";
import { staggerContainer, fadeInUp } from "@/lib/animations";

export type ComplaintType =
  | "FIR"
  | "Legal Notice"
  | "Consumer Complaint"
  | "RTI Application"
  | "Grievance Letter"
  | "Labour Complaint"
  | "Domestic Violence";

interface ComplaintTypeSelectorProps {
  onSelect: (type: ComplaintType) => void;
}

const types: {
  id: ComplaintType;
  title: string;
  icon: React.FC<any>;
  description: string;
  color: string;
  bg: string;
  hoverBorder: string;
  badge?: string;
  law: string;
}[] = [
  {
    id: "FIR",
    title: "FIR (Police Report)",
    icon: Fingerprint,
    description: "First Information Report for theft, assault, fraud, or any cognizable offence.",
    color: "text-destructive",
    bg: "bg-destructive/10",
    hoverBorder: "hover:border-destructive/40",
    badge: "Most Used",
    law: "IPC / BNS 2023",
  },
  {
    id: "Legal Notice",
    title: "Legal Notice",
    icon: Scale,
    description: "Formal warning before initiating legal proceedings against a person or company.",
    color: "text-primary",
    bg: "bg-primary/10",
    hoverBorder: "hover:border-primary/40",
    law: "Indian Contract Act",
  },
  {
    id: "Consumer Complaint",
    title: "Consumer Complaint",
    icon: ShoppingBag,
    description: "File a complaint against a seller or service provider for deficiency or fraud.",
    color: "text-secondary",
    bg: "bg-secondary/10",
    hoverBorder: "hover:border-secondary/40",
    badge: "Popular",
    law: "Consumer Protection Act 2019",
  },
  {
    id: "RTI Application",
    title: "RTI Application",
    icon: FileText,
    description: "Seek official information from government departments under the RTI Act.",
    color: "text-success",
    bg: "bg-success/10",
    hoverBorder: "hover:border-success/40",
    law: "RTI Act 2005",
  },
  {
    id: "Grievance Letter",
    title: "Grievance Letter",
    icon: Mail,
    description: "Formal letter to address complaints to an authority, bank, or organization.",
    color: "text-warning",
    bg: "bg-warning/10",
    hoverBorder: "hover:border-warning/40",
    law: "General Correspondence",
  },
  {
    id: "Labour Complaint",
    title: "Labour Complaint",
    icon: Briefcase,
    description: "Complaint for unpaid wages, wrongful termination, or workplace rights violations.",
    color: "text-[#8b5cf6]",
    bg: "bg-[#8b5cf6]/10",
    hoverBorder: "hover:border-[#8b5cf6]/40",
    law: "Industrial Disputes Act / Labour Codes",
  },
  {
    id: "Domestic Violence",
    title: "Domestic Violence",
    icon: HeartHandshake,
    description: "Application for protection under the Domestic Violence Act, 2005.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    hoverBorder: "hover:border-rose-500/40",
    law: "DV Act 2005",
  },
];

export default function ComplaintTypeSelector({ onSelect }: ComplaintTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Select Document Type
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose the type of legal document you want our AI to draft. Takes about 30 seconds.
        </p>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {types.map((type, i) => {
          const Icon = type.icon;
          return (
            <motion.button
              key={type.id}
              variants={fadeInUp}
              custom={i}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(type.id)}
              id={`complaint-type-${type.id.replace(/\s+/g, "-").toLowerCase()}`}
              className={`group relative flex flex-col items-start rounded-xl border bg-card p-5 text-left shadow-sm transition-all duration-200 ${type.hoverBorder} hover:shadow-md`}
            >
              {type.badge && (
                <span className="absolute right-3 top-3 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {type.badge}
                </span>
              )}

              <div className={`mb-4 rounded-xl ${type.bg} p-3 ${type.color} transition-transform duration-200 group-hover:scale-110`}>
                <Icon size={22} />
              </div>

              <h3 className="mb-1 font-display text-[15px] font-semibold text-foreground leading-tight">
                {type.title}
              </h3>
              <p className="mb-3 text-xs text-muted-foreground leading-relaxed">
                {type.description}
              </p>
              <span className={`mt-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${type.bg} ${type.color}`}>
                {type.law}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      <p className="text-center text-xs text-muted-foreground">
        ⚡ AI drafts in ~30 seconds · Review before submission · Not a substitute for legal counsel
      </p>
    </div>
  );
}

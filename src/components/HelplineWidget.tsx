import { useState } from "react";
import { Phone, X } from "lucide-react";

const helplines = [
  { label: "Police", number: "112" },
  { label: "Women Helpline", number: "181" },
  { label: "Cybercrime", number: "1930" },
  { label: "Legal Aid (NALSA)", number: "15100" },
  { label: "Consumer", number: "1800-11-4000" },
  { label: "Child Helpline", number: "1098" },
];

const HelplineWidget = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-64 rounded-card border bg-card p-4 shadow-lg animate-fade-in-up">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Emergency Helplines</h4>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {helplines.map((h) => (
              <a
                key={h.number}
                href={`tel:${h.number}`}
                className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <span className="text-muted-foreground">{h.label}</span>
                <span className="font-mono font-semibold text-foreground">{h.number}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        aria-label="Emergency helplines"
      >
        <Phone size={20} />
      </button>
    </div>
  );
};

export default HelplineWidget;

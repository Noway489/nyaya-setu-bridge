import { Link } from "react-router-dom";
import AshokaChakra from "./AshokaChakra";

const Footer = () => (
  <footer className="border-t bg-card">
    <div className="container mx-auto px-4 py-10">
      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AshokaChakra size={24} className="text-primary" />
            <span className="font-display text-lg font-bold">Nyaya Setu</span>
          </div>
          <p className="text-sm text-muted-foreground">Bridge to Justice — AI-powered legal aid for every Indian citizen.</p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">Navigate</h4>
          <div className="flex flex-col gap-1.5">
            {[
              { to: "/", label: "Home" },
              { to: "/chat", label: "Legal Chat" },
              { to: "/fraud", label: "Fraud Check" },
              { to: "/document", label: "Documents" },
              { to: "/guide", label: "Guide" },
              { to: "/about", label: "About" },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">Emergency Helplines</h4>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span>Police: <strong className="text-foreground">112</strong></span>
            <span>Women: <strong className="text-foreground">181</strong></span>
            <span>Cybercrime: <strong className="text-foreground">1930</strong></span>
            <span>Legal Aid: <strong className="text-foreground">15100</strong></span>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
        <p>Built for OneEarth AI Challenge 2026 · SDG 16 — Peace, Justice & Strong Institutions</p>
        <p className="mt-1">This platform provides legal information, not legal advice.</p>
      </div>
    </div>
  </footer>
);

export default Footer;

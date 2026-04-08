import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import AshokaChakra from "./AshokaChakra";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/chat", label: "Legal Chat" },
  { to: "/fraud", label: "Fraud Check" },
  { to: "/document", label: "Documents" },
  { to: "/complaint-generator", label: "Draft Complaint" },
  { to: "/guide", label: "Guide" },
  { to: "/about", label: "About" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <AshokaChakra size={28} className="text-primary" />
          <span className="font-display text-lg font-bold text-foreground">Nyaya Setu</span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                location.pathname === l.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:block">
          <Link
            to="/chat"
            className="inline-flex items-center rounded-pill bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
          >
            Get Help
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-center rounded-md p-2 text-foreground md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t bg-card px-4 pb-4 pt-2 md:hidden animate-fade-in-up">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                location.pathname === l.to ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/chat"
            onClick={() => setOpen(false)}
            className="mt-2 block rounded-pill bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground"
          >
            Get Help
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

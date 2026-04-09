import { Link } from "react-router-dom";
import { Scale, Shield, FileSearch, ListChecks, Mic, BookOpen, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import AshokaChakra from "@/components/AshokaChakra";
import PageTransition from "@/components/PageTransition";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const features = [
  { icon: Scale, title: "Legal Chatbot", desc: "Describe your problem in any Indian language. Get the applicable law, your rights, and next steps.", to: "/chat" },
  { icon: Shield, title: "Fraud Detector", desc: "Paste any suspicious SMS, WhatsApp message, or email. AI detects phishing, scams, and fake notices instantly.", to: "/fraud" },
  { icon: FileSearch, title: "Document Analyzer", desc: "Upload or paste your rental agreement, employment contract, or legal notice. Get a plain-language clause breakdown.", to: "/document" },
  { icon: ListChecks, title: "Procedure Guide", desc: "Step-by-step instructions for filing FIR, consumer complaints, RTI, cybercrime reports, and more.", to: "/guide" },
  { icon: Mic, title: "Voice Support", desc: "Ask your legal question by voice in Hindi, Tamil, Telugu, or 10+ other languages via Sarvam AI.", to: "/chat" },
  { icon: BookOpen, title: "Law Finder", desc: "Identify which IPC section, act, or clause applies to your situation. Instant lookup.", to: "/chat" },
];

const helplines = [
  { label: "Police", number: "112" },
  { label: "Women", number: "181" },
  { label: "Cybercrime", number: "1930" },
  { label: "Legal Aid", number: "15100" },
  { label: "Consumer", number: "1800-11-4000" },
  { label: "Child", number: "1098" },
];

const Index = () => (
  <PageTransition>
    <div className="min-h-screen">
      {/* Hero */}
      <section className="grain-texture relative overflow-hidden border-b bg-background px-4 py-20 md:py-28">
        <div className="relative z-10 container mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.8, rotate: -90 }} animate={{ opacity: 0.6, scale: 1, rotate: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
            <AshokaChakra size={48} className="mx-auto mb-6 text-primary" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="font-display text-5xl font-bold leading-tight text-foreground md:text-7xl">
            न्याय सेतु
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }} className="mt-2 font-display text-2xl font-medium text-muted-foreground md:text-3xl">
            Nyaya Setu
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }} className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            AI-powered legal aid for every Indian citizen. In your language. Free.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.5 }} className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/chat" className="inline-flex items-center gap-2 rounded-pill bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105">
              Get Legal Help <ArrowRight size={16} />
            </Link>
            <Link to="/fraud" className="inline-flex items-center gap-2 rounded-pill border border-primary px-6 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/5 hover:scale-105">
              Check a Suspicious Message
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-card">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.4 }} className="container mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-4 text-sm text-muted-foreground">
          {["22+ Languages", "6 Legal Modules", "Free to Use", "SDG 16 Aligned"].map((s) => (
            <span key={s} className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-primary" /> {s}
            </span>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-background px-4 py-16">
        <div className="container mx-auto">
          <motion.h2 initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mb-10 text-center font-display text-2xl font-bold text-foreground md:text-3xl">
            Everything you need to understand your rights
          </motion.h2>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div key={f.title} variants={fadeInUp} custom={i}>
                <Link to={f.to} className="group flex h-full flex-col rounded-card border bg-card-warm p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-sm hover:-translate-y-1">
                  <f.icon size={24} className="mb-3 text-primary" />
                  <h3 className="mb-1 text-base font-semibold text-foreground">{f.title}</h3>
                  <p className="flex-1 text-sm text-muted-foreground">{f.desc}</p>
                  <span className="mt-4 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Explore <ArrowRight size={12} />
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* SDG 16 */}
      <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="bg-primary px-4 py-12">
        <div className="container mx-auto text-center">
          <h2 className="font-display text-xl font-bold text-primary-foreground md:text-2xl">
            Supporting SDG 16 — Peace, Justice and Strong Institutions
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-primary-foreground/80">
            Nyaya Setu strengthens access to justice and builds accountable, transparent governance through AI.
          </p>
        </div>
      </motion.section>

      {/* Helplines */}
      <section className="border-t bg-card px-4 py-6">
        <div className="container mx-auto">
          <h3 className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Emergency Helplines
          </h3>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-wrap items-center justify-center gap-4">
            {helplines.map((h, i) => (
              <motion.a key={h.number} variants={fadeInUp} custom={i} href={`tel:${h.number}`} className="flex items-center gap-2 rounded-pill border px-4 py-1.5 text-sm transition-colors hover:border-primary/30">
                <span className="text-muted-foreground">{h.label}:</span>
                <span className="font-mono font-semibold text-foreground">{h.number}</span>
              </motion.a>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  </PageTransition>
);

export default Index;

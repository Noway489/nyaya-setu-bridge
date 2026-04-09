import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AshokaChakra from "@/components/AshokaChakra";
import PageTransition from "@/components/PageTransition";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const AboutPage = () => (
  <PageTransition>
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Hero */}
      <section className="grain-texture relative border-b px-4 py-16">
        <div className="relative z-10 container mx-auto max-w-2xl text-center">
          <motion.div initial={{ opacity: 0, scale: 0.8, rotate: -90 }} animate={{ opacity: 0.6, scale: 1, rotate: 0 }} transition={{ duration: 0.7 }}>
            <AshokaChakra size={40} className="mx-auto mb-4 text-primary" />
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-display text-3xl font-bold text-foreground md:text-4xl">What is Nyaya Setu?</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-4 text-base text-muted-foreground leading-relaxed">
            Nyaya Setu (न्याय सेतु) means "Bridge to Justice." It is an AI-powered legal aid platform designed to make justice accessible to every Indian citizen — regardless of language, literacy, or economic status.
          </motion.p>
        </div>
      </section>

      {/* SDG 16 */}
      <section className="bg-card px-4 py-12">
        <div className="container mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="rounded-card border border-l-4 border-l-primary bg-primary/5 p-6">
            <h2 className="font-display text-xl font-bold text-foreground">SDG 16 — Peace, Justice & Strong Institutions</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              United Nations Sustainable Development Goal 16 aims to promote peaceful and inclusive societies, provide access to justice for all, and build effective, accountable institutions. In India, where millions lack access to affordable legal guidance, Nyaya Setu directly addresses targets 16.3 (rule of law and equal access to justice) and 16.6 (transparent and accountable institutions).
            </p>
            <motion.ul variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-4 space-y-2">
              {[
                "80% of India's population cannot afford a lawyer",
                "Over 4.7 crore cases pending in Indian courts",
                "Legal illiteracy prevents citizens from exercising their rights",
              ].map((item, i) => (
                <motion.li key={i} variants={fadeInUp} custom={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-0.5 text-primary">•</span> {item}
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t px-4 py-12">
        <div className="container mx-auto max-w-2xl">
          <h2 className="mb-8 text-center font-display text-2xl font-bold text-foreground">How It Works</h2>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid gap-6 md:grid-cols-3">
            {[
              { step: "1", title: "Describe", desc: "Tell us your problem in any Indian language — by text or voice." },
              { step: "2", title: "AI Analyzes", desc: "Our AI identifies applicable laws, your rights, and relevant procedures." },
              { step: "3", title: "Get Guidance", desc: "Receive step-by-step guidance, risk assessments, and helpline numbers." },
            ].map((s, i) => (
              <motion.div key={s.step} variants={fadeInUp} custom={i} className="text-center">
                <motion.div whileHover={{ scale: 1.1 }} className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {s.step}
                </motion.div>
                <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Technology */}
      <section className="border-t bg-card px-4 py-12">
        <div className="container mx-auto max-w-2xl">
          <h2 className="mb-6 text-center font-display text-2xl font-bold text-foreground">Built With</h2>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-wrap justify-center gap-3">
            {["AI Language Models", "Sarvam AI (Voice)", "IndianKanoon (Law Database)", "React + TypeScript", "Tailwind CSS"].map((t, i) => (
              <motion.span key={t} variants={fadeInUp} custom={i} className="rounded-pill border bg-card-warm px-4 py-1.5 text-xs font-medium text-foreground">
                {t}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t px-4 py-12">
        <div className="container mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-card border bg-warning/5 p-6">
            <h2 className="font-display text-lg font-bold text-foreground">Important Disclaimer</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Nyaya Setu provides <strong className="text-foreground">legal information</strong>, not legal advice. The platform is designed to educate and guide citizens about their rights and available legal remedies. It does not replace consultation with a qualified lawyer. For complex legal matters, always seek professional legal counsel. The AI may occasionally provide incomplete or inaccurate information — always verify critical legal information from official sources.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Hackathon */}
      <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="border-t bg-primary px-4 py-12">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="font-display text-xl font-bold text-primary-foreground">OneEarth AI Challenge 2026</h2>
          <p className="mt-3 text-sm text-primary-foreground/80">
            Built for the OneEarth AI Tool Development Challenge under SDG 16: Peace, Justice & Strong Institutions.
          </p>
          <Link to="/chat" className="mt-6 inline-flex items-center gap-2 rounded-pill bg-primary-foreground px-6 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-foreground/90">
            Try Nyaya Setu <ArrowRight size={14} />
          </Link>
        </div>
      </motion.section>
    </div>
  </PageTransition>
);

export default AboutPage;

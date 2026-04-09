import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateComplaint } from "@/lib/gemini";
import ComplaintTypeSelector, { ComplaintType } from "@/components/complaint/ComplaintTypeSelector";
import ComplaintForm, { GENERATING_STAGES } from "@/components/complaint/ComplaintForm";
import ComplaintResult from "@/components/complaint/ComplaintResult";
import PageTransition from "@/components/PageTransition";
import { scaleIn } from "@/lib/animations";

type Step = "select" | "form" | "result";

export default function ComplaintGenerator() {
  const [step, setStep] = useState<Step>("select");
  const [selectedType, setSelectedType] = useState<ComplaintType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStage, setGeneratingStage] = useState(GENERATING_STAGES[0]);
  const [draftResult, setDraftResult] = useState<string | null>(null);
  const [lastFormData, setLastFormData] = useState<Record<string, string>>({});

  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearStageTimer = () => {
    if (stageTimerRef.current) {
      clearInterval(stageTimerRef.current);
      stageTimerRef.current = null;
    }
  };

  const handleSelectType = (type: ComplaintType) => {
    setSelectedType(type);
    setStep("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToSelect = () => {
    setStep("select");
    setSelectedType(null);
    setDraftResult(null);
  };

  const handleBackToForm = () => {
    setStep("form");
  };

  const runGeneration = useCallback(async (formData: Record<string, string>, type: ComplaintType) => {
    setIsGenerating(true);
    setGeneratingStage(GENERATING_STAGES[0]);
    setDraftResult(null);

    let stageIdx = 0;
    stageTimerRef.current = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, GENERATING_STAGES.length - 1);
      setGeneratingStage(GENERATING_STAGES[stageIdx]);
    }, 2000);

    try {
      const draft = await generateComplaint(type, formData);
      clearStageTimer();
      setDraftResult(draft);
      setStep("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      clearStageTimer();
      console.error("Draft generation error:", e);
      toast.error(e.message || "Failed to generate draft. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleSubmitForm = async (formData: Record<string, string>) => {
    if (!selectedType) return;
    setLastFormData(formData);
    await runGeneration(formData, selectedType);
  };

  const handleRegenerate = async () => {
    if (!selectedType) return;
    await runGeneration(lastFormData, selectedType);
  };

  return (
    <PageTransition>
      <div className="min-h-[calc(100vh-3.5rem)] bg-background">
        <div className="container mx-auto max-w-5xl px-4 py-10 sm:py-14">

          {/* Header */}
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            className="mb-10 text-center"
          >
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                <FileText size={28} />
              </div>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Complaint Generator
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
              Generate legally structured documents in seconds using AI. Fill in basic details — we handle the legal language.
            </p>

            {/* Step indicator */}
            <div className="mt-6 flex items-center justify-center gap-2 text-sm">
              {(["select", "form", "result"] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                      step === s
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : (step === "form" && s === "select") || (step === "result" && s !== "result")
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`hidden sm:inline text-xs font-medium ${
                      step === s ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s === "select" ? "Choose Type" : s === "form" ? "Fill Details" : "Review Draft"}
                  </span>
                  {i < 2 && <div className="h-px w-6 bg-border sm:w-10" />}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            {step === "select" && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                <ComplaintTypeSelector onSelect={handleSelectType} />
              </motion.div>
            )}

            {step === "form" && selectedType && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                <ComplaintForm
                  type={selectedType}
                  onBack={handleBackToSelect}
                  onSubmit={handleSubmitForm}
                  isGenerating={isGenerating}
                  generatingStage={generatingStage}
                />
              </motion.div>
            )}

            {step === "result" && draftResult && selectedType && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                <ComplaintResult
                  draft={draftResult}
                  complaintType={selectedType}
                  onEdit={handleBackToForm}
                  onRegenerate={handleRegenerate}
                />
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </PageTransition>
  );
}

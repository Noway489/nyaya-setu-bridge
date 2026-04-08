import { useState } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import ComplaintTypeSelector, { ComplaintType } from "@/components/complaint/ComplaintTypeSelector";
import ComplaintForm from "@/components/complaint/ComplaintForm";
import ComplaintResult from "@/components/complaint/ComplaintResult";
import { supabase } from "@/integrations/supabase/client";

export default function ComplaintGenerator() {
  const [step, setStep] = useState<"select" | "form" | "result">("select");
  const [selectedType, setSelectedType] = useState<ComplaintType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftResult, setDraftResult] = useState<string | null>(null);

  const handleSelectType = (type: ComplaintType) => {
    setSelectedType(type);
    setStep("form");
  };

  const handleBackToSelect = () => {
    setStep("select");
    setSelectedType(null);
  };

  const handleBackToForm = () => {
    setStep("form");
  };

  const handleSubmitForm = async (formData: Record<string, string>) => {
    if (!selectedType) return;
    
    setIsGenerating(true);
    setDraftResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-complaint", {
        body: { complaintType: selectedType, formData },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      
      if (data?.draft) {
        setDraftResult(data.draft);
        setStep("result");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        throw new Error("Invalid response from AI");
      }
    } catch (e: any) {
      console.error("Draft generation error:", e);
      toast.error(e.message || "Failed to generate draft. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:py-12">
      {/* Header aligned with other pages */}
      <div className="mb-8 text-center sm:mb-12">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText size={32} />
          </div>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Complaint Generator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Instantly generate legally structured, formal complaints and notices using AI. Fill out simple details and let us draft the paperwork.
        </p>
      </div>

      {step === "select" && (
        <div className="animate-fade-in-up">
          <ComplaintTypeSelector onSelect={handleSelectType} />
        </div>
      )}

      {step === "form" && selectedType && (
        <div className="animate-fade-in flex-1">
          <ComplaintForm 
            type={selectedType}
            onBack={handleBackToSelect}
            onSubmit={handleSubmitForm}
            isGenerating={isGenerating}
          />
        </div>
      )}

      {step === "result" && draftResult && (
        <div className="animate-fade-in-up">
          <ComplaintResult 
            draft={draftResult} 
            onEdit={handleBackToForm} 
          />
        </div>
      )}
    </div>
  );
}

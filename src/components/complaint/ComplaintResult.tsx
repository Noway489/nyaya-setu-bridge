import { useState, useEffect } from "react";
import { Copy, Download, ArrowLeft, MessageSquare } from "lucide-react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ComplaintResultProps {
  draft: string;
  onEdit: () => void;
}

export default function ComplaintResult({ draft, onEdit }: ComplaintResultProps) {
  const navigate = useNavigate();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      toast.success("Copied to clipboard!");
    } catch (e) {
      toast.error("Failed to copy text.");
    }
  };

  const handleDownload = () => {
    // Simple way to trigger print dialog for PDF saving without heavy libraries
    const printWindow = window.open("", "_blank");
    if (!printWindow) return toast.error("Pop-up blocked. Could not print.");
    
    // We format the markdown closely to how it renders
    const cleanHtml = draft
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");

    printWindow.document.write(`
      <html>
        <head>
          <title>Legal_Draft</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 40px; line-height: 1.6; color: #000; }
            h1, h2, h3 { text-align: center; font-family: Arial, sans-serif; }
            .disclaimer { font-style: italic; color: #555; text-align: center; margin-bottom: 30px; padding: 10px; border: 1px dashed #ccc; }
          </style>
        </head>
        <body>
          <div class="disclaimer"><strong>NOTE:</strong> This is an AI-generated draft. Please review with a qualified advocate before submission.</div>
          <p>${cleanHtml}</p>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDiscuss = () => {
    // Navigate to chat and pass the draft into localstorage or state so chat can pick it up
    // A simple approach is passing via state
    navigate("/chat", { state: { initialMessage: "I need help understanding or modifying this drafted document:\n\n" + draft }});
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to Edit
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-accent hover:text-foreground"
          >
            <Copy size={16} />
            <span className="hidden sm:inline">Copy</span>
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-accent hover:text-foreground"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Download PDF</span>
          </button>
          <button
            onClick={handleDiscuss}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
          >
            <MessageSquare size={16} />
            <span className="hidden sm:inline">Discuss with AI</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 shadow-sm bg-[#fafafa] dark:bg-[#1a1a1a]">
        <div className="border-b bg-amber-500/10 px-4 py-3 text-center text-sm font-medium text-amber-700 dark:text-amber-400">
          ⚠️ AI-Generated Draft — Review carefully before use. Fill in any [BRACKETS].
        </div>
        <div className="p-6 sm:p-10">
          <div className="font-mono text-sm leading-relaxed text-foreground sm:text-[15px] whitespace-pre-wrap break-words">
            {draft.split('\n').map((line, index) => {
              // Basic bold markdown renderer for the mono view without full prose
              if (line.match(/^#+\s/)) {
                return <div key={index} className="font-bold text-lg mt-4 mb-2">{line.replace(/^#+\s/, '')}</div>;
              }
              // Replace bold tags with actual bold spans
              const parts = line.split(/(\*\*.*?\*\*)/g);
              return (
                <div key={index} className="min-h-[1.5em]">
                  {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

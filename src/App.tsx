import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HelplineWidget from "@/components/HelplineWidget";
import Index from "./pages/Index";
import ChatPage from "./pages/ChatPage";
import FraudPage from "./pages/FraudPage";
import DocumentPage from "./pages/DocumentPage";
import GuidePage from "./pages/GuidePage";
import AboutPage from "./pages/AboutPage";
import ComplaintGenerator from "./pages/ComplaintGenerator";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Index />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/fraud" element={<FraudPage />} />
        <Route path="/document" element={<DocumentPage />} />
        <Route path="/complaint-generator" element={<ComplaintGenerator />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">
            <AnimatedRoutes />
          </main>
          <Routes>
            <Route path="/chat" element={null} />
            <Route path="*" element={<Footer />} />
          </Routes>
          <HelplineWidget />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

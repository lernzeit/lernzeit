import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";

// Lazy load pages - not needed on initial load
const Start = lazy(() => import("./pages/Start"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Datenschutz = lazy(() => import("./pages/Datenschutz"));
const Nutzungsbedingungen = lazy(() => import("./pages/Nutzungsbedingungen"));
const Impressum = lazy(() => import("./pages/Impressum"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/start" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lädt...</div>}>
              <Start />
            </Suspense>
          } />
          <Route path="/datenschutz" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lädt...</div>}>
              <Datenschutz />
            </Suspense>
          } />
          <Route path="/nutzungsbedingungen" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lädt...</div>}>
              <Nutzungsbedingungen />
            </Suspense>
          } />
          <Route path="/impressum" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lädt...</div>}>
              <Impressum />
            </Suspense>
          } />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
              <NotFound />
            </Suspense>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

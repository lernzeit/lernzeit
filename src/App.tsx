import { lazy, Suspense } from "react";
import { NoIndex } from "@/components/Seo";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import Index from "./pages/Index";
import AndroidAppBanner from "./components/AndroidAppBanner";
import AnalyticsTracker from "./components/AnalyticsTracker";
import PlatformReporter from "./components/PlatformReporter";

// Lazy load pages - not needed on initial load
const Start = lazy(() => import("./pages/Start"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const EmailBestaetigung = lazy(() => import("./pages/EmailBestaetigung"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Datenschutz = lazy(() => import("./pages/Datenschutz"));
const Nutzungsbedingungen = lazy(() => import("./pages/Nutzungsbedingungen"));
const Impressum = lazy(() => import("./pages/Impressum"));
const Widerruf = lazy(() => import("./pages/Widerruf"));
const Kuendigen = lazy(() => import("./pages/Kuendigen"));
const Support = lazy(() => import("./pages/Support"));
const IdeaForum = lazy(() => import("./pages/IdeaForum"));
const KontoLoeschen = lazy(() => import("./pages/KontoLoeschen"));
const Faq = lazy(() => import("./pages/Faq"));
const Ratgeber = lazy(() => import("./pages/Ratgeber"));
const RatgeberArtikel = lazy(() => import("./pages/RatgeberArtikel"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnalyticsTracker />
        <PlatformReporter />
        <AndroidAppBanner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Navigate to="/?auth=true" replace />} />
          <Route path="/reset-password" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lädt...</div>}>
              <NoIndex />
              <ResetPassword />
            </Suspense>
          } />
          <Route path="/start" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lädt...</div>}>
              <Start />
            </Suspense>
          } />
          <Route path="/email-bestaetigung" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lädt...</div>}>
              <NoIndex />
              <EmailBestaetigung />
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
          <Route path="/support" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lädt...</div>}>
              <Support />
            </Suspense>
          } />
          <Route path="/konto-loeschen" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lädt...</div>}>
              <KontoLoeschen />
            </Suspense>
          } />
          <Route path="/widerruf" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lädt...</div>}>
              <Widerruf />
            </Suspense>
          } />
          <Route path="/kuendigen" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lädt...</div>}>
              <Kuendigen />
            </Suspense>
          } />
          <Route path="/kündigen" element={<Navigate to="/kuendigen" replace />} />
          <Route path="/account-loeschen" element={<Navigate to="/konto-loeschen" replace />} />
          <Route path="/delete-account" element={<Navigate to="/konto-loeschen" replace />} />
          <Route path="/faq" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lädt...</div>}>
              <Faq />
            </Suspense>
          } />
          <Route path="/ratgeber" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lädt...</div>}>
              <Ratgeber />
            </Suspense>
          } />
          <Route path="/ratgeber/:slug" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lädt...</div>}>
              <RatgeberArtikel />
            </Suspense>
          } />
          <Route path="/ideen" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Lädt...</div>}>
              <IdeaForum />
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

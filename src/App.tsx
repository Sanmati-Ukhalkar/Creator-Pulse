import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { OnboardingFlow } from "./components/onboarding/OnboardingFlow";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import Sources from "./pages/Sources";
import Drafts from "./pages/Drafts";
import Delivery from "./pages/Delivery";
import Settings from "./pages/Settings";
import VoiceTraining from "./pages/VoiceTraining";
import Intelligence from "./pages/Intelligence";
import TrendDetails from "./pages/TrendDetails";
import { AppLayout } from "./components/layout/AppLayout";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/onboarding" element={<OnboardingFlow />} />

              {/* Protected Dashboard Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<AppLayout><Index /></AppLayout>} />
                <Route path="/intelligence" element={<AppLayout><Intelligence /></AppLayout>} />
                <Route path="/trends/:id" element={<AppLayout><TrendDetails /></AppLayout>} />
                <Route path="/sources" element={<AppLayout><Sources /></AppLayout>} />
                <Route path="/drafts" element={<AppLayout><Drafts /></AppLayout>} />
                <Route path="/delivery" element={<AppLayout><Delivery /></AppLayout>} />
                <Route path="/voice-training" element={<AppLayout><VoiceTraining /></AppLayout>} />
                <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;

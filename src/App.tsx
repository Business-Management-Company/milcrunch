import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import Resources from "./pages/Resources";
import VeteranPodcastAwards from "./pages/VeteranPodcastAwards";
import PlatformEvents from "./pages/platform/Events";
import PlatformAwards from "./pages/platform/Awards";
import PlatformSponsorships from "./pages/platform/Sponsorships";
import PlatformAIAgents from "./pages/platform/AIAgents";
import SolutionsMediaBrands from "./pages/solutions/MediaBrands";
import SolutionsEventTeams from "./pages/solutions/EventTeams";
import SolutionsSponsors from "./pages/solutions/Sponsors";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminEvents from "./pages/admin/Events";
import AdminAwards from "./pages/admin/Awards";
import AdminSponsors from "./pages/admin/Sponsors";
import AttendeePortal from "./pages/attendee/Portal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/veteran-podcast-awards" element={<VeteranPodcastAwards />} />
            <Route path="/platform/events" element={<PlatformEvents />} />
            <Route path="/platform/awards" element={<PlatformAwards />} />
            <Route path="/platform/sponsorships" element={<PlatformSponsorships />} />
            <Route path="/platform/ai-agents" element={<PlatformAIAgents />} />
            <Route path="/solutions/media-brands" element={<SolutionsMediaBrands />} />
            <Route path="/solutions/event-teams" element={<SolutionsEventTeams />} />
            <Route path="/solutions/sponsors" element={<SolutionsSponsors />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/events" element={<AdminEvents />} />
            <Route path="/admin/awards" element={<AdminAwards />} />
            <Route path="/admin/sponsors" element={<AdminSponsors />} />
            <Route path="/portal" element={<AttendeePortal />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

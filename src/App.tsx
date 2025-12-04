import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DevAdminProvider } from "@/contexts/DevAdminContext";
import AIChatbot from "@/components/AIChatbot";
import DevRoleSwitcher from "@/components/DevRoleSwitcher";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import Resources from "./pages/Resources";
import VeteranPodcastAwards from "./pages/VeteranPodcastAwards";
import NationalMilitaryPodcastDay from "./pages/NationalMilitaryPodcastDay";
import Nominate from "./pages/Nominate";
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
import AdminEmailSignups from "./pages/admin/EmailSignups";
import AdminMarketing from "./pages/admin/Marketing";
import AdminAnalytics from "./pages/admin/Analytics";
import CreateEvent from "./pages/admin/CreateEvent";
import CreateAwards from "./pages/admin/CreateAwards";
import AttendeePortal from "./pages/attendee/Portal";
import EventDetail from "./pages/events/EventDetail";
import EventCheckout from "./pages/events/EventCheckout";
import EventConfirmation from "./pages/events/EventConfirmation";
import EventPageBuilder from "./pages/admin/EventPageBuilder";
import SponsorshipWizard from "./pages/admin/SponsorshipWizard";
import TeamManagement from "./pages/admin/TeamManagement";
import CreatorOnboarding from "./pages/admin/CreatorOnboarding";
import CheckInDashboard from "./pages/admin/CheckInDashboard";
import TravelAddons from "./pages/admin/TravelAddons";
import DemoSponsorships from "./pages/admin/DemoSponsorships";
import SponsorPortal from "./pages/sponsor/Portal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DevAdminProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/veteran-podcast-awards" element={<VeteranPodcastAwards />} />
              <Route path="/national-military-podcast-day" element={<NationalMilitaryPodcastDay />} />
              <Route path="/nominate" element={<Nominate />} />
              <Route path="/platform/events" element={<PlatformEvents />} />
              <Route path="/platform/awards" element={<PlatformAwards />} />
              <Route path="/platform/sponsorships" element={<PlatformSponsorships />} />
              <Route path="/platform/ai-agents" element={<PlatformAIAgents />} />
              <Route path="/solutions/media-brands" element={<SolutionsMediaBrands />} />
              <Route path="/solutions/event-teams" element={<SolutionsEventTeams />} />
              <Route path="/solutions/sponsors" element={<SolutionsSponsors />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/events" element={<AdminEvents />} />
              <Route path="/admin/events/create" element={<CreateEvent />} />
              <Route path="/admin/awards" element={<AdminAwards />} />
              <Route path="/admin/awards/create" element={<CreateAwards />} />
              <Route path="/admin/sponsors" element={<AdminSponsors />} />
              <Route path="/admin/email-signups" element={<AdminEmailSignups />} />
              <Route path="/admin/marketing" element={<AdminMarketing />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/events/:eventId/page-builder" element={<EventPageBuilder />} />
              <Route path="/admin/events/:eventId/sponsorships" element={<SponsorshipWizard />} />
              <Route path="/admin/events/:eventId/team" element={<TeamManagement />} />
              <Route path="/admin/events/:eventId/check-in" element={<CheckInDashboard />} />
              <Route path="/admin/sponsorship-wizard" element={<SponsorshipWizard />} />
              <Route path="/admin/onboarding" element={<CreatorOnboarding />} />
              <Route path="/admin/travel" element={<TravelAddons />} />
              <Route path="/sponsors/demo" element={<DemoSponsorships />} />
              <Route path="/portal" element={<AttendeePortal />} />
              <Route path="/sponsor/portal" element={<SponsorPortal />} />
              <Route path="/events/:slug" element={<EventDetail />} />
              <Route path="/events/:slug/checkout" element={<EventCheckout />} />
              <Route path="/events/:slug/confirmation" element={<EventConfirmation />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AIChatbot />
            <DevRoleSwitcher />
          </DevAdminProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

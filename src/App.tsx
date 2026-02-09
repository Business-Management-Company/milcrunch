import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DevAdminProvider } from "@/contexts/DevAdminContext";
import DevRoleSwitcher from "@/components/DevRoleSwitcher";
import Index from "./pages/Index";
import HomePage from "./pages/HomePage";
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
import SummaryDashboard from "./pages/SummaryDashboard";
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
import Demo from "./pages/Demo";
import EventsCalendar from "./pages/EventsCalendar";
import CreatorDashboard from "./pages/creator/CreatorDashboard";
import CreatorProfile from "./pages/creator/CreatorProfile";
import CreatorSocials from "./pages/creator/CreatorSocials";
import CreatorOpportunities from "./pages/creator/CreatorOpportunities";
import BrandDashboard from "./pages/brand/BrandDashboard";
import BrandDiscover from "./pages/brand/BrandDiscover";
import BrandLists from "./pages/brand/BrandLists";
import BrandCampaigns from "./pages/brand/BrandCampaigns";
import PDXHome from "./pages/pdx/PDXHome";
import CreatePDX from "./pages/pdx/CreatePDX";
import AdminPodcasts from "./pages/admin/media/Podcasts";
import PDTV from "./pages/admin/media/PDTV";
import BusinessOverview from "./pages/admin/BusinessOverview";
import Podcasts from "./pages/Podcasts";
import PlaceholderPage from "./pages/PlaceholderPage";
import Verification from "./pages/Verification";
import { ListProvider } from "./contexts/ListContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AIAssistantProvider } from "./contexts/AIAssistantContext";
import AppLayout from "./components/layout/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DevAdminProvider>
            <ListProvider>
            <AIAssistantProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/home" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/veteran-podcast-awards" element={<VeteranPodcastAwards />} />
              <Route path="/national-military-podcast-day" element={<NationalMilitaryPodcastDay />} />
              <Route path="/nominate" element={<Nominate />} />
              <Route path="/podcasts" element={<Podcasts />} />
              <Route path="/platform/events" element={<PlatformEvents />} />
              <Route path="/platform/awards" element={<PlatformAwards />} />
              <Route path="/platform/sponsorships" element={<PlatformSponsorships />} />
              <Route path="/platform/ai-agents" element={<PlatformAIAgents />} />
              <Route path="/solutions/media-brands" element={<SolutionsMediaBrands />} />
              <Route path="/solutions/event-teams" element={<SolutionsEventTeams />} />
              <Route path="/solutions/sponsors" element={<SolutionsSponsors />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<SummaryDashboard />} />
                <Route path="/lists" element={<BrandLists />} />
                <Route path="/brand/dashboard" element={<BrandDashboard />} />
                <Route path="/brand/discover" element={<BrandDiscover />} />
                <Route path="/brand/lists" element={<BrandLists />} />
                <Route path="/brand/campaigns" element={<BrandCampaigns />} />
                <Route path="/admin" element={<SummaryDashboard />} />
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
              <Route path="/admin/media/podcasts" element={<AdminPodcasts />} />
              <Route path="/admin/media/pdtv" element={<PDTV />} />
              <Route path="/admin/business-overview" element={<BusinessOverview />} />
              <Route path="/pdx" element={<PDXHome />} />
              <Route path="/pdx/create" element={<CreatePDX />} />
              {/* Placeholder pages */}
              <Route path="/speakers" element={<PlaceholderPage title="Speakers" description="Manage event speakers and invite creators to your stages." />} />
              <Route path="/awards" element={<PlaceholderPage title="Awards" description="Nominate and manage veteran podcast and creator awards." />} />
              <Route path="/sponsors" element={<PlaceholderPage title="Sponsors" description="Partner with brands and manage sponsorship opportunities." />} />
              <Route path="/verification" element={<Verification />} />
              <Route path="/analytics" element={<PlaceholderPage title="Analytics" description="View campaign performance, reach, and engagement metrics." />} />
              <Route path="/social-monitoring" element={<PlaceholderPage title="Social Monitoring" description="Track mentions and sentiment across social channels." />} />
              <Route path="/swag" element={<PlaceholderPage title="SWAG Store" description="Order branded merchandise and swag for events." />} />
              <Route path="/settings" element={<PlaceholderPage title="Settings" description="Manage your account and platform preferences." />} />
              <Route path="/events" element={<EventsCalendar />} />
              </Route>
              <Route path="/sponsors/demo" element={<DemoSponsorships />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/portal" element={<AttendeePortal />} />
              <Route path="/sponsor/portal" element={<SponsorPortal />} />
              <Route path="/events/:slug" element={<EventDetail />} />
              <Route path="/events/:slug/checkout" element={<EventCheckout />} />
              <Route path="/events/:slug/confirmation" element={<EventConfirmation />} />
              {/* Creator routes (military/veteran creators) */}
              <Route path="/creator/dashboard" element={<CreatorDashboard />} />
              <Route path="/creator/profile" element={<CreatorProfile />} />
              <Route path="/creator/socials" element={<CreatorSocials />} />
              <Route path="/creator/opportunities" element={<CreatorOpportunities />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <DevRoleSwitcher />
            </AIAssistantProvider>
            </ListProvider>
          </DevAdminProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;


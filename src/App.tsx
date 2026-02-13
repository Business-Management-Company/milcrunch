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
import LoginPage from "./pages/creator/LoginPage";
import SignupPage from "./pages/creator/SignupPage";
import { CreatorRoute, BrandRoute, SuperAdminRoute } from "./components/auth/ProtectedRoute";
import CreatorDashboard from "./pages/creator/CreatorDashboard";
import CreatorProfile from "./pages/creator/CreatorProfile";
import CreatorSocials from "./pages/creator/CreatorSocials";
import CreatorBioPage from "./pages/creator/CreatorBioPage";
import CreatorAnalytics from "./pages/creator/CreatorAnalytics";
import CreatorOnboard from "./pages/creator/CreatorOnboard";
import CreatorBioEditor from "./pages/creator/CreatorBioEditor";
import CreatePost from "./pages/creator/CreatePost";
import CreatorPosts from "./pages/creator/CreatorPosts";
import CreatorEvents from "./pages/creator/CreatorEvents";
import CreatorDeals from "./pages/creator/CreatorDeals";
import CreatorLists from "./pages/creator/CreatorLists";
import CreatorSettings from "./pages/creator/CreatorSettings";
import CreatorCustomize from "./pages/creator/CreatorCustomize";
import CreatorHelp from "./pages/creator/CreatorHelp";
import SimilarCreators from "./pages/creator/SimilarCreators";
import Leaderboard from "./pages/creator/Leaderboard";
import CreatorOpportunities from "./pages/creator/CreatorOpportunities";
import BrandDashboard from "./pages/brand/BrandDashboard";
import BrandDiscover from "./pages/brand/BrandDiscover";
import BrandLists from "./pages/brand/BrandLists";
import BrandDirectory from "./pages/brand/BrandDirectory";
import BrandCampaigns from "./pages/brand/BrandCampaigns";
import BrandAttribution from "./pages/brand/BrandAttribution";
import BrandSettings from "./pages/brand/BrandSettings";
import PDXHome from "./pages/pdx/PDXHome";
import CreatePDX from "./pages/pdx/CreatePDX";
import AdminPodcasts from "./pages/admin/media/Podcasts";
import PDTV from "./pages/admin/media/PDTV";
import FeaturedCreators from "./pages/admin/FeaturedCreators";
import BusinessOverview from "./pages/admin/BusinessOverview";
import Podcasts from "./pages/Podcasts";
import PlaceholderPage from "./pages/PlaceholderPage";
import Verification from "./pages/Verification";
import Speakers from "./pages/Speakers";
import { ListProvider } from "./contexts/ListContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AIAssistantProvider } from "./contexts/AIAssistantContext";
import AppLayout from "./components/layout/AppLayout";
import { AdminChatProvider } from "./contexts/AdminChatContext";
import FloatingAdminChat from "./components/superadmin/FloatingAdminChat";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import AdminTasks from "./pages/superadmin/AdminTasks";
import AdminDeployments from "./pages/superadmin/AdminDeployments";
import AdminPrompts from "./pages/superadmin/AdminPrompts";
import AdminChat from "./pages/superadmin/AdminChat";

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
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
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
              {/* Super Admin panel: /admin, /admin/tasks, etc. — only super_admin; others redirect to /brand/dashboard */}
              <Route path="/admin" element={<SuperAdminRoute><AdminChatProvider><AppLayout /></AdminChatProvider></SuperAdminRoute>}>
                <Route index element={<SuperAdminDashboard />} />
                <Route path="tasks" element={<AdminTasks />} />
                <Route path="deployments" element={<AdminDeployments />} />
                <Route path="prompts" element={<AdminPrompts />} />
                <Route path="chat" element={<AdminChat />} />
              </Route>
              <Route element={<BrandRoute><AppLayout /></BrandRoute>}>
                <Route path="/dashboard" element={<SummaryDashboard />} />
                <Route path="/lists" element={<BrandLists />} />
                <Route path="/brand/dashboard" element={<BrandDashboard />} />
                <Route path="/brand/discover" element={<BrandDiscover />} />
                <Route path="/brand/directory" element={<BrandDirectory />} />
                <Route path="/brand/lists" element={<BrandLists />} />
                <Route path="/brand/campaigns" element={<BrandCampaigns />} />
                <Route path="/brand/attribution" element={<BrandAttribution />} />
                <Route path="/brand/settings" element={<BrandSettings />} />
                <Route path="/brand/podcasts" element={<AdminPodcasts />} />
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
              <Route path="/admin/featured-creators" element={<FeaturedCreators />} />
              <Route path="/admin/business-overview" element={<BusinessOverview />} />
              <Route path="/pdx" element={<PDXHome />} />
              <Route path="/pdx/create" element={<CreatePDX />} />
              {/* Placeholder pages */}
              <Route path="/speakers" element={<Speakers />} />
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
              {/* Creator bio pages (public, with CreatorPixel tracking) */}
              <Route path="/c/:handle" element={<CreatorBioPage />} />
              <Route path="/c/:handle/:eventSlug" element={<CreatorBioPage />} />
              {/* Creator app (protected, role-based redirect) */}
              <Route path="/creator/onboard" element={<CreatorRoute><CreatorOnboard /></CreatorRoute>} />
              <Route path="/creator/dashboard" element={<CreatorRoute><CreatorDashboard /></CreatorRoute>} />
              <Route path="/creator/profile" element={<CreatorRoute><CreatorProfile /></CreatorRoute>} />
              <Route path="/creator/bio" element={<CreatorRoute><CreatorBioEditor /></CreatorRoute>} />
              <Route path="/creator/socials" element={<CreatorRoute><CreatorSocials /></CreatorRoute>} />
              <Route path="/creator/post/new" element={<CreatorRoute><CreatePost /></CreatorRoute>} />
              <Route path="/creator/posts" element={<CreatorRoute><CreatorPosts /></CreatorRoute>} />
              <Route path="/creator/analytics" element={<CreatorRoute><CreatorAnalytics /></CreatorRoute>} />
              <Route path="/creator/events" element={<CreatorRoute><CreatorEvents /></CreatorRoute>} />
              <Route path="/creator/deals" element={<CreatorRoute><CreatorDeals /></CreatorRoute>} />
              <Route path="/creator/lists" element={<CreatorRoute><CreatorLists /></CreatorRoute>} />
              <Route path="/creator/settings" element={<CreatorRoute><CreatorSettings /></CreatorRoute>} />
              <Route path="/creator/customize" element={<CreatorRoute><CreatorCustomize /></CreatorRoute>} />
              <Route path="/creator/help" element={<CreatorRoute><CreatorHelp /></CreatorRoute>} />
              <Route path="/creator/similar" element={<CreatorRoute><SimilarCreators /></CreatorRoute>} />
              <Route path="/creator/leaderboard" element={<CreatorRoute><Leaderboard /></CreatorRoute>} />
              <Route path="/creator/opportunities" element={<CreatorRoute><CreatorOpportunities /></CreatorRoute>} />
              <Route path="/creator/:handle" element={<CreatorBioPage />} />
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


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
import Creators from "./pages/Creators";
import CreatorPublicProfile from "./pages/CreatorPublicProfile";
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
import EventRegister from "./pages/events/EventRegister";
import EventPageBuilder from "./pages/admin/EventPageBuilder";
import SponsorshipWizard from "./pages/admin/SponsorshipWizard";
import TeamManagement from "./pages/admin/TeamManagement";
import CreatorOnboarding from "./pages/admin/CreatorOnboarding";
import CheckInDashboard from "./pages/admin/CheckInDashboard";
import TravelAddons from "./pages/admin/TravelAddons";
import DemoSponsorships from "./pages/admin/DemoSponsorships";
import SponsorPortal from "./pages/sponsor/Portal";
import Demo from "./pages/Demo";
import Prospectus from "./pages/Prospectus";
import Onboard from "./pages/Onboard";
import EventsCalendar from "./pages/EventsCalendar";
import PublicEvents from "./pages/PublicEvents";
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

import BrandDiscover from "./pages/brand/BrandDiscover";
import BrandLists, { BrandListDetail } from "./pages/brand/BrandLists";
import BrandDirectory from "./pages/brand/BrandDirectory";
import BrandCampaigns from "./pages/brand/BrandCampaigns";
import BrandEvents from "./pages/brand/BrandEvents";
import ConflictsCollabs from "./pages/brand/ConflictsCollabs";
import BrandEventCreate from "./pages/brand/BrandEventCreate";
import BrandEventDetail from "./pages/brand/BrandEventDetail";
import BrandAttribution from "./pages/brand/BrandAttribution";
import BrandSettings from "./pages/brand/BrandSettings";
import BrandPosting from "./pages/brand/BrandPosting";
import BrandTags from "./pages/brand/BrandTags";
import BrandVenueFinder from "./pages/brand/BrandVenueFinder";
import PdxWizard from "./pages/brand/PdxWizard";
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
import AppLayout from "./components/layout/AppLayout";
import RoleAwareChatProvider from "./components/RoleAwareChatProvider";
import FloatingAdminChat from "./components/superadmin/FloatingAdminChat";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import AdminTasks from "./pages/superadmin/AdminTasks";
import AdminDeployments from "./pages/superadmin/AdminDeployments";
import AdminPrompts from "./pages/superadmin/AdminPrompts";
import AdminChat from "./pages/superadmin/AdminChat";
import RoiCalculator from "./pages/superadmin/RoiCalculator";
import GrowthCalculator from "./pages/superadmin/GrowthCalculator";
import RevenueProjections from "./pages/superadmin/RevenueProjections";
import SaasCalculator from "./pages/superadmin/SaasCalculator";
import Calculators from "./pages/superadmin/Calculators";
import ProspectusAccess from "./pages/admin/ProspectusAccess";
import ProspectusAccessLog from "./pages/superadmin/ProspectusAccessLog";
import SalesCRM from "./pages/superadmin/SalesCRM";
import SuperAdminHub from "./pages/admin/SuperAdminHub";
import BrandPages from "./pages/brand/BrandPages";
import BrandPageEdit from "./pages/brand/BrandPageEdit";
import DynamicPage from "./pages/DynamicPage";
import PlansPage from "./pages/PlansPage";
import SponsorDashboard from "./pages/brand/sponsors/SponsorDashboard";
import SponsorFormBuilder from "./pages/brand/sponsors/SponsorFormBuilder";
import SponsorPages from "./pages/brand/sponsors/SponsorPages";
import SponsorPageEditor from "./pages/brand/sponsors/SponsorPageEditor";
import SponsorDecks from "./pages/brand/sponsors/SponsorDecks";
import SocialMonitoring from "./pages/brand/SocialMonitoring";
import AttendeeSchedule from "./pages/attendee/AttendeeSchedule";
import AttendeeSpeakers from "./pages/attendee/AttendeeSpeakers";
import AttendeeSponsors from "./pages/attendee/AttendeeSponsors";
import AttendeeCommunityPage from "./pages/attendee/AttendeeCommunityPage";
import AttendeeProfilePage from "./pages/attendee/AttendeeProfilePage";
import AttendeeRegister from "./pages/attendee/AttendeeRegister";
import EventSelector from "./pages/attendee/EventSelector";
import SponsorApply from "./pages/SponsorApply";
import PublicSponsorPage from "./pages/PublicSponsorPage";
import Shop from "./pages/Shop";
import ShopProduct from "./pages/ShopProduct";
import SwagPackages from "./pages/SwagPackages";
import MerchAdmin from "./pages/brand/shop/MerchAdmin";
import SwagAdmin from "./pages/brand/shop/SwagAdmin";
import Integrations from "./pages/brand/Integrations";
import StreamingDashboard from "./pages/brand/Streaming";
import EmailCampaigns from "./pages/brand/email/EmailCampaigns";
import EmailLists from "./pages/brand/email/EmailLists";
import EmailTemplates from "./pages/brand/email/EmailTemplates";
import EmailForms from "./pages/brand/email/EmailForms";
import EmailSettingsPage from "./pages/brand/email/EmailSettings";
import EmailContacts from "./pages/brand/email/EmailContacts";
import EmailSubscribe from "./pages/public/EmailSubscribe";
import EmailUnsubscribe from "./pages/public/EmailUnsubscribe";
import AdvertisingDashboard from "./pages/brand/advertising/AdvertisingDashboard";
import RateDesk from "./pages/brand/advertising/RateDesk";
import AdCampaignsPage from "./pages/brand/advertising/AdCampaigns";
import AdInventory from "./pages/brand/advertising/AdInventory";
import AdAnalytics from "./pages/brand/advertising/AdAnalytics";
import LeadManager from "./pages/brand/advertising/LeadManager";
import KnowledgeBase from "./pages/kb/KnowledgeBase";
import KbCategoryPage from "./pages/kb/KbCategory";
import KbArticlePage from "./pages/kb/KbArticle";
import KbAdmin from "./pages/kb/KbAdmin";
import SharedReport from "./pages/SharedReport";
import PublicVerificationReport from "./pages/PublicVerificationReport";
import CopyDeepLink from "./components/superadmin/CopyDeepLink";

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
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/creators" element={<Creators />} />
              <Route path="/creators/:handle" element={<CreatorPublicProfile />} />
              <Route path="/home" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/sign-in" element={<Navigate to="/login" replace />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/plans" element={<PlansPage />} />
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
              <Route path="/admin" element={<SuperAdminRoute><RoleAwareChatProvider><AppLayout /></RoleAwareChatProvider></SuperAdminRoute>}>
                <Route index element={<SuperAdminDashboard />} />
                <Route path="tasks" element={<AdminTasks />} />
                <Route path="deployments" element={<AdminDeployments />} />
                <Route path="prompts" element={<AdminPrompts />} />
                <Route path="chat" element={<AdminChat />} />
                <Route path="roi-calculator" element={<RoiCalculator />} />
                <Route path="growth-calculator" element={<GrowthCalculator />} />
                <Route path="revenue-projections" element={<RevenueProjections />} />
                <Route path="saas-calculator" element={<SaasCalculator />} />
                <Route path="kb" element={<KbAdmin />} />
                <Route path="prospectus-access-log" element={<ProspectusAccessLog />} />
                <Route path="sales" element={<SalesCRM />} />
              </Route>
              <Route element={<BrandRoute><RoleAwareChatProvider><AppLayout /></RoleAwareChatProvider></BrandRoute>}>
                <Route path="/dashboard" element={<Navigate to="/brand/dashboard" replace />} />
                <Route path="/lists" element={<BrandLists />} />
                <Route path="/lists/:listId" element={<BrandListDetail />} />
                <Route path="/brand/dashboard" element={<SummaryDashboard />} />
                <Route path="/brand/discover" element={<BrandDiscover />} />
                <Route path="/brand/directories" element={<BrandDirectory />} />
                <Route path="/brand/lists" element={<BrandLists />} />
                <Route path="/brand/lists/:listId" element={<BrandListDetail />} />
                <Route path="/brand/campaigns" element={<BrandCampaigns />} />
                <Route path="/brand/tags" element={<BrandTags />} />
                <Route path="/brand/events" element={<BrandEvents />} />
                <Route path="/brand/events/conflicts" element={<ConflictsCollabs />} />
                <Route path="/brand/events/create" element={<BrandEventCreate />} />
                <Route path="/brand/events/:eventId" element={<BrandEventDetail />} />
                <Route path="/brand/venues" element={<BrandVenueFinder />} />
                <Route path="/brand/pdx/new" element={<PdxWizard />} />
                <Route path="/brand/calculators" element={<Calculators />} />
                <Route path="/brand/attribution" element={<BrandAttribution />} />
                <Route path="/brand/settings" element={<BrandSettings />} />
                <Route path="/brand/posting" element={<BrandPosting />} />
                <Route path="/brand/pages" element={<BrandPages />} />
                <Route path="/brand/pages/:id" element={<BrandPageEdit />} />
                <Route path="/brand/sponsors" element={<SponsorDashboard />} />
                <Route path="/brand/sponsors/forms" element={<SponsorFormBuilder />} />
                <Route path="/brand/sponsors/forms/:id" element={<SponsorFormBuilder />} />
                <Route path="/brand/sponsors/pages" element={<SponsorPages />} />
                <Route path="/brand/sponsors/pages/:id" element={<SponsorPageEditor />} />
                <Route path="/brand/sponsors/decks" element={<SponsorDecks />} />
                <Route path="/brand/shop/merch" element={<MerchAdmin />} />
                <Route path="/brand/shop/swag" element={<SwagAdmin />} />
                <Route path="/brand/verification" element={<Verification />} />
                <Route path="/brand/integrations" element={<Integrations />} />
                <Route path="/brand/connectors" element={<Navigate to="/brand/integrations" replace />} />
                <Route path="/brand/streaming" element={<StreamingDashboard />} />
                <Route path="/brand/streaming/:id" element={<StreamingDashboard />} />
                <Route path="/brand/podcasts" element={<AdminPodcasts />} />
                <Route path="/brand/email/contacts" element={<EmailContacts />} />
                <Route path="/brand/email/contacts/:contactId" element={<EmailContacts />} />
                <Route path="/brand/email/campaigns" element={<EmailCampaigns />} />
                <Route path="/brand/email/campaigns/new" element={<EmailCampaigns />} />
                <Route path="/brand/email/lists" element={<EmailLists />} />
                <Route path="/brand/email/lists/:listId" element={<EmailLists />} />
                <Route path="/brand/email/templates" element={<EmailTemplates />} />
                <Route path="/brand/email/forms" element={<EmailForms />} />
                <Route path="/brand/email/settings" element={<EmailSettingsPage />} />
                <Route path="/brand/advertising" element={<AdvertisingDashboard />} />
                <Route path="/brand/advertising/rate-desk" element={<RateDesk />} />
                <Route path="/brand/advertising/campaigns" element={<AdCampaignsPage />} />
                <Route path="/brand/advertising/inventory" element={<AdInventory />} />
                <Route path="/brand/advertising/analytics" element={<AdAnalytics />} />
                <Route path="/brand/advertising/leads" element={<LeadManager />} />
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
              <Route path="/admin/prospectus-access" element={<ProspectusAccess />} />
              <Route path="/pdx" element={<Navigate to="/brand/events" replace />} />
              <Route path="/pdx/create" element={<Navigate to="/brand/events/create" replace />} />
              {/* Placeholder pages */}
              <Route path="/speakers" element={<Speakers />} />
              <Route path="/awards" element={<PlaceholderPage title="Awards" description="Nominate and manage veteran podcast and creator awards." />} />
              <Route path="/sponsors" element={<PlaceholderPage title="Sponsors" description="Partner with brands and manage sponsorship opportunities." />} />
              <Route path="/verification" element={<Verification />} />
              <Route path="/analytics" element={<PlaceholderPage title="Analytics" description="View campaign performance, reach, and engagement metrics." />} />
              <Route path="/brand/social-monitoring" element={<SocialMonitoring />} />
              {/* /swag moved to public routes */}
              <Route path="/settings" element={<PlaceholderPage title="Settings" description="Manage your account and platform preferences." />} />
              </Route>
              <Route path="/admin/dashboard" element={<SuperAdminHub />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/shop/:id" element={<ShopProduct />} />
              <Route path="/swag" element={<SwagPackages />} />
              <Route path="/events" element={<PublicEvents />} />
              <Route path="/subscribe/:slug" element={<EmailSubscribe />} />
              <Route path="/unsubscribe/:contactId" element={<EmailUnsubscribe />} />
              <Route path="/sponsors/demo" element={<DemoSponsorships />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/prospectus" element={<Prospectus />} />
              <Route path="/onboard" element={<Onboard />} />
              <Route path="/portal" element={<AttendeePortal />} />
              <Route path="/sponsor/portal" element={<SponsorPortal />} />
              <Route path="/events/:eventId" element={<EventDetail />} />
              <Route path="/events/:eventId/register" element={<EventRegister />} />
              <Route path="/events/:eventId/checkout" element={<EventCheckout />} />
              <Route path="/events/:eventId/confirmation" element={<EventConfirmation />} />
              {/* Attendee experience (mobile-first PWA) */}
              <Route path="/attend" element={<EventSelector />} />
              <Route path="/attend/:eventSlug" element={<AttendeeSchedule />} />
              <Route path="/attend/:eventSlug/schedule" element={<AttendeeSchedule />} />
              <Route path="/attend/:eventSlug/speakers" element={<AttendeeSpeakers />} />
              <Route path="/attend/:eventSlug/community" element={<AttendeeCommunityPage />} />
              <Route path="/attend/:eventSlug/sponsors" element={<AttendeeSponsors />} />
              <Route path="/attend/:eventSlug/profile" element={<AttendeeProfilePage />} />
              <Route path="/attend/:eventSlug/register" element={<AttendeeRegister />} />
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
              {/* Public sponsor pages */}
              <Route path="/sponsor-apply/:formId" element={<SponsorApply />} />
              <Route path="/sponsors/:slug" element={<PublicSponsorPage />} />
              {/* Knowledge Base (public) */}
              <Route path="/kb" element={<KnowledgeBase />} />
              <Route path="/kb/:category" element={<KbCategoryPage />} />
              <Route path="/kb/:category/:slug" element={<KbArticlePage />} />
              {/* CMS dynamic pages */}
              <Route path="/p/:slug" element={<DynamicPage />} />
              {/* Public shared report page */}
              <Route path="/shared/:reportId" element={<SharedReport />} />
              {/* Public verification report (shareable link) */}
              <Route path="/report/:token" element={<PublicVerificationReport />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CopyDeepLink />
            <DevRoleSwitcher />
            </ListProvider>
          </DevAdminProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;


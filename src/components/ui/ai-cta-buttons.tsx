/**
 * Smart CTA button detection for AI chat responses.
 * Generates contextual "next step" buttons based on what the AI just said,
 * not generic category matches.
 */
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Search,
  Mail,
  ListChecks,
  Shield,
  FolderOpen,
  Users,
  ArrowRight,
  BarChart3,
  ClipboardList,
} from "lucide-react";

interface CTAButton {
  label: string;
  path: string;
  icon: typeof Calendar;
}

/**
 * Extract contextual CTAs from AI response text.
 * Prioritizes specific, actionable next steps over generic navigation.
 * Returns max 2 CTAs.
 */
export function detectCTAs(text: string): CTAButton[] {
  const ctas: CTAButton[] = [];
  const lower = text.toLowerCase();

  // --- Event-specific CTAs ---
  // Registration / RSVP context → detailed registrations
  if (/\b(registration|registrations|rsvp|sign.?up|attendee|ticket)/i.test(text)) {
    ctas.push({ label: "View Registrations", path: "/brand/events", icon: ClipboardList });
  }
  // Event analytics / stats / capacity
  else if (/\b(capacity|analytics|attendance|event stats|total events)/i.test(text)) {
    ctas.push({ label: "View Event Analytics", path: "/brand/events", icon: BarChart3 });
  }
  // General event mentions (upcoming, schedule, plan)
  else if (/\b(upcoming event|event calendar|schedule|plan.{0,10}event)/i.test(text)) {
    ctas.push({ label: "View All Events", path: "/brand/events", icon: Calendar });
  }
  // Specific event name mentioned — link to events page
  else if (/\b(milspousefest|milcrunch at|fort liberty|mic 2026|veteran podcast|awards)/i.test(text)) {
    ctas.push({ label: "Open Event Details", path: "/brand/events", icon: Calendar });
  }

  // --- Creator-specific CTAs ---
  if (/\b(find.{0,10}creator|search.{0,10}creator|discover.{0,10}creator|creator.{0,10}search|browse.{0,10}creator)/i.test(text)) {
    ctas.push({ label: "Search Creators", path: "/brand/discover", icon: Search });
  } else if (/\b(creator director|directory.{0,10}member|in the director)/i.test(text)) {
    ctas.push({ label: "Browse Directory", path: "/brand/directories", icon: FolderOpen });
  } else if (/\b(creator|influencer|profile)/i.test(text) && !/\b(list|campaign|event|verif)/i.test(text)) {
    ctas.push({ label: "Discover Creators", path: "/brand/discover", icon: Search });
  }

  // --- Campaign CTAs ---
  if (/\b(campaign|email.{0,5}campaign|outreach|send.{0,10}email)/i.test(text)) {
    ctas.push({ label: "View Campaigns", path: "/brand/campaigns", icon: Mail });
  }

  // --- Verification CTAs ---
  if (/\b(verif|verification|verify|background check|confirm.{0,10}status)/i.test(text)) {
    ctas.push({ label: "Run Verification", path: "/brand/verification", icon: Shield });
  }

  // --- List CTAs ---
  if (/\b(list created|saved list|creator list|build.{0,5}list|your lists)/i.test(text)) {
    ctas.push({ label: "View Lists", path: "/brand/lists", icon: ListChecks });
  }

  // --- Sponsor CTAs ---
  if (/\b(sponsor|sponsorship|partnership|partner)/i.test(text)) {
    ctas.push({ label: "View Sponsors", path: "/admin/sponsors", icon: Users });
  }

  // Deduplicate by path
  const seen = new Set<string>();
  const unique: CTAButton[] = [];
  for (const cta of ctas) {
    if (!seen.has(cta.path)) {
      seen.add(cta.path);
      unique.push(cta);
    }
  }

  // Max 2 CTAs for focused next steps
  return unique.slice(0, 2);
}

export function AICTAButtons({ text, onNavigate }: { text: string; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const ctas = detectCTAs(text);

  if (ctas.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {ctas.map((cta) => (
        <button
          key={cta.path}
          onClick={() => {
            navigate(cta.path);
            onNavigate?.();
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full border border-[#1e3a5f]/25 bg-[#1e3a5f]/5 text-[#1e3a5f] hover:bg-[#1e3a5f]/15 hover:border-[#1e3a5f]/40 transition-colors"
        >
          <cta.icon className="h-3 w-3" />
          {cta.label}
          <ArrowRight className="h-3 w-3 opacity-50" />
        </button>
      ))}
    </div>
  );
}

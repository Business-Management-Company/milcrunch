/**
 * Shared CTA button detection and rendering for AI chat responses.
 * Detects mentions of platform features in AI response text and renders
 * pill-shaped navigation buttons.
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
} from "lucide-react";

interface CTAButton {
  label: string;
  path: string;
  icon: typeof Calendar;
}

const CTA_RULES: { pattern: RegExp; cta: CTAButton }[] = [
  {
    pattern: /\b(event|events|upcoming event|event calendar|schedule)\b/i,
    cta: { label: "View Events", path: "/brand/events", icon: Calendar },
  },
  {
    pattern: /\b(creator|creators|discover|discovery|influencer|find creators|search creators)\b/i,
    cta: { label: "Browse Creators", path: "/brand/discover", icon: Search },
  },
  {
    pattern: /\b(campaign|campaigns|email campaign|email marketing|outreach)\b/i,
    cta: { label: "View Campaigns", path: "/brand/campaigns", icon: Mail },
  },
  {
    pattern: /\b(verif|verification|verify creator|background check)\b/i,
    cta: { label: "Run Verification", path: "/brand/verification", icon: Shield },
  },
  {
    pattern: /\b(list|lists|saved list|creator list|build a list)\b/i,
    cta: { label: "View Lists", path: "/brand/lists", icon: ListChecks },
  },
  {
    pattern: /\b(director|directories|directory)\b/i,
    cta: { label: "View Directories", path: "/brand/directories", icon: FolderOpen },
  },
  {
    pattern: /\b(sponsor|sponsors|sponsorship|partnership)\b/i,
    cta: { label: "View Sponsors", path: "/admin/sponsors", icon: Users },
  },
];

export function detectCTAs(text: string): CTAButton[] {
  const seen = new Set<string>();
  const result: CTAButton[] = [];

  for (const rule of CTA_RULES) {
    if (rule.pattern.test(text) && !seen.has(rule.cta.path)) {
      seen.add(rule.cta.path);
      result.push(rule.cta);
    }
  }

  // Max 3 CTAs to avoid clutter
  return result.slice(0, 3);
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

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, ShieldAlert, Clock, AlertTriangle, XCircle, Globe, Briefcase, FileText, Search, Video, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MarkdownResponse } from "@/components/MarkdownResponse";

interface ReportRecord {
  id: string;
  person_name: string;
  claimed_branch: string | null;
  claimed_status: string | null;
  claimed_type: string | null;
  verification_score: number | null;
  status: string;
  ai_analysis: string | null;
  evidence_sources: { url: string; title: string; category: string }[] | null;
  source_username: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  profile_photo_url: string | null;
  pdl_data: Record<string, unknown> | null;
  manual_checks: Record<string, unknown> | null;
  created_at: string | null;
  last_verified_at: string | null;
}

function ConfidenceRing({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-28 h-28">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{score}%</span>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: "red" | "yellow" | "green" }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${status === "green" ? "bg-green-500" : status === "yellow" ? "bg-amber-400" : "bg-red-400"}`} />
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    verified: { label: "Verified", className: "bg-blue-100 text-blue-800", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800", icon: <Clock className="h-3.5 w-3.5" /> },
    flagged: { label: "Flagged", className: "bg-red-100 text-red-800", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    denied: { label: "Denied", className: "bg-red-200 text-red-900", icon: <XCircle className="h-3.5 w-3.5" /> },
  };
  const s = map[status] ?? map.pending;
  return (
    <Badge className={cn("gap-1", s.className)} variant="secondary">
      {s.icon}
      {s.label}
    </Badge>
  );
}

export default function PublicVerificationReport() {
  const { token } = useParams<{ token: string }>();
  const [record, setRecord] = useState<ReportRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error: err } = await supabase
        .from("verifications")
        .select("id, person_name, claimed_branch, claimed_status, claimed_type, verification_score, status, ai_analysis, evidence_sources, source_username, linkedin_url, website_url, profile_photo_url, pdl_data, manual_checks, created_at, last_verified_at")
        .eq("public_token", token)
        .single();
      if (err || !data) {
        setError("Report not found or link has expired.");
      } else {
        setRecord(data as ReportRecord);
      }
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Report Not Found</h1>
          <p className="text-gray-500 text-sm">{error || "This verification report could not be loaded."}</p>
        </div>
      </div>
    );
  }

  const score = record.verification_score ?? 0;
  const sources = (record.evidence_sources ?? []);
  const pdl = record.pdl_data as Record<string, unknown> | null;
  const heroPhoto = record.profile_photo_url || (pdl as any)?.profile_pic_url || (pdl as any)?.photo_url || null;
  const initials = (record.person_name || "??").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  // Status dots
  const aiDot: "green" | "red" = record.ai_analysis ? "green" : "red";
  const evidenceDot: "green" | "yellow" | "red" = sources.length >= 10 ? "green" : sources.length > 0 ? "yellow" : "red";
  const socialDot: "green" | "red" = record.source_username || record.linkedin_url ? "green" : "red";

  const careerDot: "green" | "yellow" | "red" = (() => {
    const mc = record.manual_checks;
    if (mc?.career_track) return "green";
    if (pdl && ((pdl as any).employment?.length > 0 || (pdl as any).experience?.length > 0)) return "green";
    if (pdl) return "yellow";
    return "red";
  })();

  const mediaDot: "green" | "yellow" | "red" = (() => {
    const mc = record.manual_checks;
    if (mc?.youtube_media && (mc.youtube_media as any).videos?.length > 0) return "green";
    if ((mc as any)?.media_error) return "red";
    return "yellow";
  })();

  const bgDot: "green" | "yellow" | "red" = (() => {
    const mc = record.manual_checks;
    if ((mc as any)?.background_dot_override) return (mc as any).background_dot_override;
    return (record.ai_analysis || pdl) ? "green" : "yellow";
  })();

  // Social links — pull from all available data sources
  const socialLinks: { name: string; url: string; color: string }[] = [];
  const seenPlatforms = new Set<string>();
  const PLATFORM_COLORS: Record<string, string> = {
    instagram: "border-pink-200 text-pink-700 hover:border-pink-400",
    youtube: "border-red-200 text-red-700 hover:border-red-400",
    twitter: "border-slate-300 text-slate-700 hover:border-slate-500",
    tiktok: "border-gray-800 text-gray-900 hover:border-black",
    facebook: "border-blue-200 text-blue-700 hover:border-blue-400",
    linkedin: "border-blue-200 text-blue-700 hover:border-blue-500",
    website: "border-gray-200 text-gray-600 hover:border-gray-400",
  };
  // LinkedIn confidence check: only show if URL matches creator identity
  const isLinkedInConfident = (url: string): boolean => {
    if (record.linkedin_url && url.toLowerCase().includes(record.linkedin_url.toLowerCase().replace(/\/$/, ""))) return true;
    const slug = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i)?.[1]?.toLowerCase() ?? "";
    if (!slug) return false;
    const handle = record.source_username?.toLowerCase();
    if (handle && slug.includes(handle)) return true;
    const nameParts = record.person_name.trim().toLowerCase().split(/\s+/);
    const lastName = nameParts[nameParts.length - 1];
    if (lastName && lastName.length >= 3 && slug.includes(lastName)) return true;
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      if (firstName.length >= 3 && slug.includes(firstName) && slug.includes(lastName)) return true;
    }
    return false;
  };
  const addSocialPill = (network: string, label: string, url: string) => {
    if (seenPlatforms.has(network)) return;
    // Filter LinkedIn through confidence check (explicit linkedin_url is always trusted)
    if (network === "linkedin" && url !== record.linkedin_url && !isLinkedInConfident(url)) return;
    seenPlatforms.add(network);
    socialLinks.push({ name: label, url, color: PLATFORM_COLORS[network] ?? PLATFORM_COLORS.website });
  };
  // 1. Explicit fields (linkedin_url is user-provided, always trusted)
  if (record.source_username) addSocialPill("instagram", `@${record.source_username}`, `https://instagram.com/${record.source_username}`);
  if (record.linkedin_url) addSocialPill("linkedin", "LinkedIn", record.linkedin_url);
  // 2. Saved social_profiles from verification pipeline (already filtered during pipeline)
  const savedProfiles = record.manual_checks?.social_profiles as { network: string; url: string }[] | undefined;
  if (Array.isArray(savedProfiles)) {
    for (const sp of savedProfiles) {
      const net = sp.network?.toLowerCase();
      if (net && sp.url) addSocialPill(net, net === "twitter" ? "Twitter/X" : net.charAt(0).toUpperCase() + net.slice(1), sp.url);
    }
  }
  // 3. Evidence source URLs
  const evidenceSources = (record.evidence_sources ?? []);
  for (const s of evidenceSources.filter(s => s.category === "Social Media")) {
    const url = s.url.toLowerCase();
    if (url.includes("facebook")) addSocialPill("facebook", "Facebook", s.url);
    if (url.includes("twitter") || url.includes("x.com")) addSocialPill("twitter", "Twitter/X", s.url);
    if (url.includes("youtube")) addSocialPill("youtube", "YouTube", s.url);
    if (url.includes("tiktok")) addSocialPill("tiktok", "TikTok", s.url);
    if (url.includes("linkedin")) addSocialPill("linkedin", "LinkedIn", s.url);
  }
  // 4. PDL profiles
  const pdlProfiles = (record.pdl_data as any)?.profiles as { network: string; url: string }[] | undefined;
  if (Array.isArray(pdlProfiles)) {
    for (const p of pdlProfiles) {
      const net = (p.network ?? "").toLowerCase();
      if (net && p.url && PLATFORM_COLORS[net]) addSocialPill(net, net === "twitter" ? "Twitter/X" : net.charAt(0).toUpperCase() + net.slice(1), p.url);
    }
  }
  // 5. creator_has flags (skip linkedin — no URL to validate)
  const creatorHas = record.manual_checks?.creator_has as Record<string, boolean> | undefined;
  if (creatorHas) {
    const bases: Record<string, string> = { instagram: "https://instagram.com/", youtube: "https://youtube.com/@", tiktok: "https://tiktok.com/@", twitter: "https://twitter.com/", facebook: "https://facebook.com/" };
    for (const [k, v] of Object.entries(creatorHas)) {
      if (v && bases[k]) {
        const handle = record.source_username || record.person_name.toLowerCase().replace(/\s+/g, "");
        addSocialPill(k, k === "twitter" ? "Twitter/X" : k.charAt(0).toUpperCase() + k.slice(1), bases[k] + handle);
      }
    }
  }
  if (record.website_url) addSocialPill("website", "Website", record.website_url);

  // Category counts for evidence
  const categoryCounts = new Map<string, number>();
  for (const s of sources) {
    const cat = s.category || "Other";
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#1e3a5f]" />
          <span className="font-bold text-sm text-gray-900">MilCrunch</span>
          <span className="text-xs text-gray-400 ml-1">Verification Report</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex items-start gap-6">
            {/* Left: photo + info */}
            <div className="flex-1 flex items-start gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-[#1e3a5f] to-[#2d5282] flex items-center justify-center text-white font-bold text-xl shrink-0">
                {heroPhoto ? (
                  <img src={heroPhoto} alt={record.person_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                ) : (
                  initials
                )}
              </div>

              <div>
                <h1 className="text-xl font-bold text-gray-900">{record.person_name}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <StatusBadge status={record.status} />
                  {record.claimed_branch && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                      {record.claimed_branch}
                    </span>
                  )}
                  {record.claimed_status && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
                      {record.claimed_status.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                {/* Social links */}
                {socialLinks.length > 0 && (
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {socialLinks.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${link.color}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                        {link.name}
                      </a>
                    ))}
                  </div>
                )}

                {record.last_verified_at && (
                  <p className="text-xs text-gray-400 mt-2">
                    Last verified: {new Date(record.last_verified_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>

            {/* Right: confidence ring */}
            <div className="shrink-0 flex flex-col items-center">
              <ConfidenceRing score={score} />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Confidence</p>
            </div>
          </div>
        </div>

        {/* Status Dots Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Verification Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Intelligence Summary", icon: <FileText className="h-4 w-4 text-[#1e3a5f]" />, dot: aiDot },
              { label: "Evidence Sources", icon: <Search className="h-4 w-4 text-[#1e3a5f]" />, dot: evidenceDot, extra: `${sources.length} sources` },
              { label: "Career Track", icon: <Briefcase className="h-4 w-4 text-[#1e3a5f]" />, dot: careerDot },
              { label: "Social Verification", icon: <Globe className="h-4 w-4 text-[#1e3a5f]" />, dot: socialDot },
              { label: "Media & Appearances", icon: <Video className="h-4 w-4 text-[#1e3a5f]" />, dot: mediaDot },
              { label: "Background Review", icon: <ShieldAlert className="h-4 w-4 text-[#1e3a5f]" />, dot: bgDot },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                {item.icon}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{item.label}</p>
                  {item.extra && <p className="text-[10px] text-gray-400">{item.extra}</p>}
                </div>
                <StatusDot status={item.dot as "green" | "yellow" | "red"} />
              </div>
            ))}
          </div>
        </div>

        {/* Intelligence Summary */}
        {record.ai_analysis && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-4">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#1e3a5f]" />
              Intelligence Summary
            </h2>
            <MarkdownResponse content={record.ai_analysis!} />
          </div>
        )}

        {/* Evidence Sources Summary */}
        {sources.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-4">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Search className="h-4 w-4 text-[#1e3a5f]" />
              Evidence Sources ({sources.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {Array.from(categoryCounts.entries()).map(([cat, count]) => (
                <span key={cat} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                  {cat} <span className="text-gray-400">({count})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 pb-8">
          <p className="text-xs text-gray-400">
            Powered by <a href="https://milcrunch.com" className="text-[#1e3a5f] font-medium hover:underline">MilCrunch</a> Military Verification
          </p>
        </div>
      </main>
    </div>
  );
}

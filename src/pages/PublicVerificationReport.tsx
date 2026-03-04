import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getCreatorAvatar } from "@/lib/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, ShieldAlert, Clock, AlertTriangle, XCircle, Globe, Briefcase, FileText, Search, Video, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MarkdownResponse } from "@/components/MarkdownResponse";
import { getPlatformsFromEnrichmentData } from "@/lib/enrichment-platforms";

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
  const color = score >= 80 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
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
  const [enrichmentData, setEnrichmentData] = useState<unknown>(null);

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

  // Fetch IC enrichment data from directory_members
  useEffect(() => {
    const handle = record?.source_username;
    if (!handle) return;
    (async () => {
      const { data } = await supabase
        .from("directory_members")
        .select("enrichment_data")
        .eq("creator_handle", handle)
        .limit(1)
        .maybeSingle();
      if (data?.enrichment_data) setEnrichmentData(data.enrichment_data);
    })();
  }, [record?.source_username]);

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
  const heroPhoto = getCreatorAvatar(record) || (pdl as any)?.profile_pic_url || (pdl as any)?.photo_url || null;
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

  // IC enrichment data is the source of truth for platform pills
  const icPlatforms = getPlatformsFromEnrichmentData(enrichmentData);

  // Fallback: Instagram from explicit handle if IC doesn't cover it
  const seenPlatforms = new Set(icPlatforms.map((p) => p.platform));
  const fallbackLinks: { name: string; url: string; pillClass: string }[] = [];
  if (record.source_username && !seenPlatforms.has("instagram")) {
    fallbackLinks.push({
      name: `@${record.source_username}`,
      url: `https://instagram.com/${record.source_username}`,
      pillClass: "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100",
    });
  }

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
                {(icPlatforms.length > 0 || fallbackLinks.length > 0) && (
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {icPlatforms.map((p) => (
                      <a
                        key={p.platform}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${p.pillClass}`}
                      >
                        {p.label}
                        <span className="opacity-60">@{p.username}</span>
                      </a>
                    ))}
                    {fallbackLinks.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${link.pillClass}`}
                      >
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

                {/* Share on LinkedIn */}
                <button
                  onClick={() => {
                    const profileUrl = record.source_username
                      ? `https://milcrunch.com/creators/${record.source_username}`
                      : `https://milcrunch.com/report/${token}`;
                    const text = encodeURIComponent("Proud to be a verified military creator on MilCrunch \u2014 the #1 network connecting veteran voices with brands. \ud83c\udf96\ufe0f #MilCrunch #VeteranCreator #MilitaryInfluencer");
                    window.open(
                      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}&text=${text}`,
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }}
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#0077B5" }}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#ffffff" />
                  </svg>
                  Share on LinkedIn
                </button>
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

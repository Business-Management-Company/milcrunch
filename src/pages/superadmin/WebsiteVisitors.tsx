import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Loader2, ExternalLink, MapPin, Building2, Briefcase, Mail, Globe } from "lucide-react";

interface Visitor {
  id: string;
  created_at: string;
  page_url: string | null;
  linkedin_url: string | null;
  full_name: string | null;
  email: string | null;
  company: string | null;
  job_title: string | null;
  location: string | null;
  ip_address: string | null;
  rb2b_timestamp: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? u.hostname : u.hostname + u.pathname;
  } catch {
    return url;
  }
}

export default function WebsiteVisitors() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("website_visitors")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        console.warn("[WebsiteVisitors] fetch error:", error.message);
      }
      setVisitors(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <Users className="h-5 w-5 text-purple-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website Visitors</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading..." : `${visitors.length} identified visitor${visitors.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Table */}
      <div
        className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col"
        style={{ maxHeight: "calc(100vh - 220px)" }}
      >
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
              <tr className="border-b border-gray-100">
                <th className="text-left font-medium text-gray-500 px-4 py-3">Name</th>
                <th className="text-left font-medium text-gray-500 px-4 py-3">Company</th>
                <th className="text-left font-medium text-gray-500 px-4 py-3">Title</th>
                <th className="text-left font-medium text-gray-500 px-4 py-3">Email</th>
                <th className="text-left font-medium text-gray-500 px-4 py-3">Page Visited</th>
                <th className="text-left font-medium text-gray-500 px-4 py-3">Location</th>
                <th className="text-left font-medium text-gray-500 px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No visitors identified yet. RB2B data will appear here as visitors are detected.
                  </td>
                </tr>
              ) : (
                visitors.map((v) => (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    {/* Name + LinkedIn */}
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[160px]">{v.full_name || "—"}</span>
                        {v.linkedin_url && (
                          <a
                            href={v.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 shrink-0"
                            title="View LinkedIn"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Company */}
                    <td className="px-4 py-3 text-gray-600">
                      <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
                        {v.company ? (
                          <>
                            <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            {v.company}
                          </>
                        ) : (
                          "—"
                        )}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3 text-gray-600">
                      <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
                        {v.job_title ? (
                          <>
                            <Briefcase className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            {v.job_title}
                          </>
                        ) : (
                          "—"
                        )}
                      </span>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-gray-600">
                      {v.email ? (
                        <a
                          href={`mailto:${v.email}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 truncate max-w-[180px]"
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          {v.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Page */}
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {v.page_url ? (
                        <span className="inline-flex items-center gap-1 truncate max-w-[160px]" title={v.page_url}>
                          <Globe className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          {shortenUrl(v.page_url)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3 text-gray-500">
                      {v.location ? (
                        <span className="inline-flex items-center gap-1 truncate max-w-[120px]">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          {v.location}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {formatDate(v.rb2b_timestamp || v.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

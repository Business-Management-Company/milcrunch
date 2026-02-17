import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, FileText, Upload, Inbox, Plus, ArrowRight, ExternalLink } from "lucide-react";
import { getSponsorStats, getSubmissions } from "@/lib/sponsor-db";
import type { SponsorFormSubmission } from "@/lib/sponsor-types";
import { format } from "date-fns";

export default function SponsorDashboard() {
  const [stats, setStats] = useState({ totalSponsors: 0, activeForms: 0, submissions: 0, decks: 0 });
  const [recent, setRecent] = useState<SponsorFormSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, r] = await Promise.all([getSponsorStats(), getSubmissions()]);
      setStats(s);
      setRecent(r.slice(0, 10));
      setLoading(false);
    })();
  }, []);

  const statCards = [
    { label: "Total Sponsors", value: stats.totalSponsors, icon: Building2, color: "text-purple-600 bg-purple-50", link: "/brand/sponsors/pages" },
    { label: "Active Forms", value: stats.activeForms, icon: FileText, color: "text-blue-600 bg-blue-50", link: "/brand/sponsors/forms" },
    { label: "Submissions", value: stats.submissions, icon: Inbox, color: "text-green-600 bg-green-50", link: "/brand/sponsors/forms" },
    { label: "Decks Uploaded", value: stats.decks, icon: Upload, color: "text-orange-600 bg-orange-50", link: "/brand/sponsors/decks" },
  ];

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Approved</Badge>;
      case "rejected": return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Rejected</Badge>;
      default: return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sponsor Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage forms, sponsor pages, and decks in one place.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Link key={s.label} to={s.link}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? "—" : s.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/brand/sponsors/forms">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer border-dashed border-2 border-purple-200 bg-purple-50/30 group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Create Sponsor Form</p>
                <p className="text-xs text-gray-500">Build an intake form for sponsors</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
            </div>
          </Card>
        </Link>
        <Link to="/brand/sponsors/pages">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer border-dashed border-2 border-blue-200 bg-blue-50/30 group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <ExternalLink className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Create Sponsor Page</p>
                <p className="text-xs text-gray-500">Build a public sponsor landing page</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
            </div>
          </Card>
        </Link>
        <Link to="/brand/sponsors/decks">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer border-dashed border-2 border-orange-200 bg-orange-50/30 group">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Upload Deck</p>
                <p className="text-xs text-gray-500">Add a sponsorship deck PDF</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent Submissions */}
      <Card className="border-gray-200">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Submissions</h2>
            <Link to="/brand/sponsors/forms" className="text-sm text-[#6C5CE7] hover:underline">View all</Link>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : recent.length === 0 ? (
          <div className="p-8 text-center">
            <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No submissions yet.</p>
            <p className="text-sm text-gray-400 mt-1">Create a sponsor form and share it to start receiving applications.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Tier</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((sub) => {
                  const d = sub.data as Record<string, any>;
                  return (
                    <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-gray-900">{d["Company Name"] || d["company_name"] || "—"}</td>
                      <td className="px-5 py-3 text-gray-600">{d["Sponsorship Tier"] || d["tier"] || "—"}</td>
                      <td className="px-5 py-3 text-gray-500">{format(new Date(sub.created_at), "MMM d, yyyy")}</td>
                      <td className="px-5 py-3">{statusBadge(sub.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Edit, Trash2, Globe, Building2 } from "lucide-react";
import { getSponsorPages, deleteSponsorPage } from "@/lib/sponsor-db";
import type { SponsorPage } from "@/lib/sponsor-types";
import { useToast } from "@/hooks/use-toast";

export default function SponsorPages() {
  const [pages, setPages] = useState<SponsorPage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const p = await getSponsorPages();
      setPages(p);
      setLoading(false);
    })();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sponsor page?")) return;
    const ok = await deleteSponsorPage(id);
    if (ok) {
      setPages((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Sponsor page deleted" });
    }
  };

  const tierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case "presenting": return "bg-purple-100 text-purple-700";
      case "diamond": return "bg-blue-100 text-blue-700";
      case "platinum": return "bg-gray-200 text-gray-700";
      case "gold": return "bg-yellow-100 text-yellow-700";
      case "silver": return "bg-gray-100 text-gray-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sponsor Pages</h1>
          <p className="text-gray-500 text-sm mt-1">Create public landing pages for your sponsors.</p>
        </div>
        <Link to="/brand/sponsors/pages/new">
          <Button className="bg-[#6C5CE7] hover:bg-[#5A4BD5]">
            <Plus className="h-4 w-4 mr-2" /> New Sponsor Page
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : pages.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">No sponsor pages yet</h3>
          <p className="text-gray-500 text-sm mb-4">Create a public page for each sponsor with their branding, description, and social links.</p>
          <Link to="/brand/sponsors/pages/new">
            <Button className="bg-[#6C5CE7] hover:bg-[#5A4BD5]">
              <Plus className="h-4 w-4 mr-2" /> Create First Page
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3">Sponsor</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {page.logo_url ? (
                        <img src={page.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover bg-gray-100" />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-purple-600" />
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{page.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={tierColor(page.tier)}>{page.tier}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={page.published ? "default" : "secondary"} className={page.published ? "bg-green-100 text-green-700" : ""}>
                      {page.published ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(page.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {page.published && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/sponsors/${page.slug}`} target="_blank" rel="noreferrer">
                            <Globe className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/brand/sponsors/pages/${page.id}`}><Edit className="h-3.5 w-3.5" /></Link>
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(page.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

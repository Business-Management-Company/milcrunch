import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, FileText, Loader2, Globe, EyeOff, Archive } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface SitePage {
  id: string;
  slug: string;
  page_name: string;
  status: string;
  meta_title: string | null;
  meta_description: string | null;
  h1_override: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image_url: string | null;
  structured_data: unknown;
  updated_at: string | null;
  published_at: string | null;
}

function calcSeoScore(p: SitePage): number {
  let score = 0;
  const total = 8;
  if (p.meta_title && p.meta_title.length > 0 && p.meta_title.length <= 70) score++;
  if (p.meta_description && p.meta_description.length >= 120 && p.meta_description.length <= 170) score++;
  if (p.h1_override || p.page_name) score++;
  if (p.og_title) score++;
  if (p.og_description) score++;
  if (p.og_image_url) score++;
  if (p.twitter_title || p.twitter_description) score++;
  if (p.structured_data) score++;
  return Math.round((score / total) * 100);
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  archived: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const STATUS_ICONS: Record<string, typeof Globe> = {
  draft: EyeOff,
  published: Globe,
  archived: Archive,
};

const BrandPages = () => {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from("site_pages")
        .select("id, slug, page_name, status, meta_title, meta_description, h1_override, og_title, og_description, og_image_url, twitter_title, twitter_description, twitter_image_url, structured_data, updated_at, published_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setPages((data as SitePage[]) || []);
    } catch (err) {
      console.error("Failed to load pages:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = pages.filter(
    (p) =>
      p.page_name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-1">Pages</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Create and manage website pages with built-in SEO analysis.
            </p>
          </div>
          <Button asChild className="bg-pd-blue hover:bg-pd-darkblue text-white">
            <Link to="/brand/pages/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Page
            </Link>
          </Button>
        </div>

        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-lg bg-background dark:bg-[#1A1D27] dark:border-gray-700"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              {search ? "No pages match your search" : "No pages yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {search ? "Try a different search term." : "Create your first page to get started."}
            </p>
            {!search && (
              <Button asChild className="bg-pd-blue hover:bg-pd-darkblue text-white">
                <Link to="/brand/pages/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Page
                </Link>
              </Button>
            )}
          </Card>
        ) : (
          <Card className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <th className="px-5 py-3">Page Name</th>
                    <th className="px-5 py-3">Slug</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">SEO Score</th>
                    <th className="px-5 py-3">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {filtered.map((page) => {
                    const seo = calcSeoScore(page);
                    const StatusIcon = STATUS_ICONS[page.status] || EyeOff;
                    return (
                      <tr key={page.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/brand/pages/${page.id}`}
                            className="font-medium text-foreground hover:text-pd-blue transition-colors"
                          >
                            {page.page_name}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs">
                          /p{page.slug.startsWith("/") ? page.slug : `/${page.slug}`}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge className={`${STATUS_STYLES[page.status] || STATUS_STYLES.draft} text-xs font-medium capitalize inline-flex items-center gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {page.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  seo >= 80 ? "bg-green-500" : seo >= 60 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                                style={{ width: `${seo}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${
                              seo >= 80 ? "text-green-600" : seo >= 60 ? "text-yellow-600" : "text-red-500"
                            }`}>
                              {seo}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground text-xs">
                          {page.updated_at ? format(new Date(page.updated_at), "MMM d, yyyy h:mm a") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BrandPages;

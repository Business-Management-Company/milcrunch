import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink, Instagram, Twitter, Linkedin, Youtube, Loader2, ArrowLeft } from "lucide-react";
import { getSponsorPage } from "@/lib/sponsor-db";
import type { SponsorPage } from "@/lib/sponsor-types";
import { cn } from "@/lib/utils";

const tierStyles: Record<string, string> = {
  Presenting: "bg-purple-600 text-white",
  Diamond: "bg-blue-600 text-white",
  Platinum: "bg-gray-700 text-white",
  Gold: "bg-yellow-500 text-black",
  Silver: "bg-gray-400 text-white",
};

export default function PublicSponsorPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<SponsorPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const p = await getSponsorPage(slug);
      setPage(p);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" /></div>;
  }

  if (!page || !page.published) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sponsor Not Found</h2>
          <p className="text-gray-500 text-sm mb-4">This sponsor page doesn't exist or hasn't been published yet.</p>
          <Link to="/" className="text-[#6C5CE7] hover:underline text-sm">Back to MilCrunch</Link>
        </Card>
      </div>
    );
  }

  const socials = [
    { url: page.social_instagram, icon: Instagram, label: "Instagram" },
    { url: page.social_twitter, icon: Twitter, label: "Twitter" },
    { url: page.social_linkedin, icon: Linkedin, label: "LinkedIn" },
    { url: page.social_youtube, icon: Youtube, label: "YouTube" },
  ].filter((s) => s.url);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-[#6C5CE7] via-[#5B4BD1] to-[#1A1A2E]">
        {page.banner_url && (
          <img src={page.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-4 left-4">
          <Link to="/" className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 -mt-16 relative z-10 pb-12">
        {/* Logo + Title */}
        <div className="flex items-end gap-4 mb-6">
          {page.logo_url ? (
            <img src={page.logo_url} alt={page.name} className="h-24 w-24 rounded-2xl border-4 border-white shadow-lg bg-white object-contain" />
          ) : (
            <div className="h-24 w-24 rounded-2xl border-4 border-white shadow-lg bg-white flex items-center justify-center">
              <span className="text-3xl font-bold text-[#6C5CE7]">{page.name.charAt(0)}</span>
            </div>
          )}
          <div className="pb-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{page.name}</h1>
              <Badge className={cn("text-xs", tierStyles[page.tier] || "bg-gray-200 text-gray-700")}>{page.tier} Sponsor</Badge>
            </div>
          </div>
        </div>

        {/* Description */}
        {page.description && (
          <Card className="p-6 mb-6 border-gray-200">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{page.description}</p>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          {page.website_url && (
            <Button asChild className="bg-[#6C5CE7] hover:bg-[#5A4BD5]">
              <a href={page.website_url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> Visit Website
              </a>
            </Button>
          )}
          {page.contact_email && (
            <Button variant="outline" asChild>
              <a href={`mailto:${page.contact_email}`}>Contact Sponsor</a>
            </Button>
          )}
        </div>

        {/* Social Links */}
        {socials.length > 0 && (
          <Card className="p-5 mb-6 border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Follow</h3>
            <div className="flex gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.url!.startsWith("http") ? s.url! : `https://${s.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition-colors"
                >
                  <s.icon className="h-4 w-4" /> {s.label}
                </a>
              ))}
            </div>
          </Card>
        )}

        {/* Custom Content */}
        {page.content_blocks && (
          <Card className="p-6 mb-6 border-gray-200">
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: page.content_blocks }} />
          </Card>
        )}

        {/* Footer */}
        <div className="text-center pt-8">
          <Link to="/" className="text-sm text-gray-400 hover:text-[#6C5CE7]">
            Powered by MilCrunch<span className="text-[#6C5CE7] font-bold">X</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

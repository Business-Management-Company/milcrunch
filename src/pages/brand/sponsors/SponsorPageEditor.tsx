import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Eye, Loader2 } from "lucide-react";
import { getSponsorPage, upsertSponsorPage } from "@/lib/sponsor-db";
import { generateSlug, SPONSOR_TIERS } from "@/lib/sponsor-types";
import type { SponsorPage } from "@/lib/sponsor-types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EventOption { id: string; title: string }

export default function SponsorPageEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [events, setEvents] = useState<EventOption[]>([]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [eventId, setEventId] = useState("");
  const [tier, setTier] = useState("Gold");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [youtube, setYoutube] = useState("");
  const [contentBlocks, setContentBlocks] = useState("");
  const [published, setPublished] = useState(false);

  useEffect(() => {
    // Load events for dropdown
    (async () => {
      const { data } = await supabase.from("events").select("id, title").order("start_date", { ascending: false });
      setEvents((data as EventOption[]) ?? []);
    })();
  }, []);

  useEffect(() => {
    if (isNew || !id) return;
    (async () => {
      const page = await getSponsorPage(id);
      if (page) {
        setName(page.name);
        setSlug(page.slug);
        setEventId(page.event_id || "");
        setTier(page.tier);
        setLogoUrl(page.logo_url || "");
        setBannerUrl(page.banner_url || "");
        setDescription(page.description || "");
        setWebsiteUrl(page.website_url || "");
        setContactEmail(page.contact_email || "");
        setInstagram(page.social_instagram || "");
        setTwitter(page.social_twitter || "");
        setLinkedin(page.social_linkedin || "");
        setYoutube(page.social_youtube || "");
        setContentBlocks(page.content_blocks || "");
        setPublished(page.published);
      }
      setLoading(false);
    })();
  }, [id, isNew]);

  // Auto-generate slug from name
  useEffect(() => {
    if (isNew && name) setSlug(generateSlug(name));
  }, [name, isNew]);

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (!slug.trim()) { toast({ title: "Slug required", variant: "destructive" }); return; }
    setSaving(true);
    const payload: any = {
      name, slug, tier, published,
      event_id: eventId || null,
      logo_url: logoUrl || null,
      banner_url: bannerUrl || null,
      description: description || null,
      website_url: websiteUrl || null,
      contact_email: contactEmail || null,
      social_instagram: instagram || null,
      social_twitter: twitter || null,
      social_linkedin: linkedin || null,
      social_youtube: youtube || null,
      content_blocks: contentBlocks || null,
    };
    if (!isNew && id) payload.id = id;
    const result = await upsertSponsorPage(payload);
    setSaving(false);
    if (result) {
      toast({ title: isNew ? "Sponsor page created!" : "Sponsor page updated!" });
      navigate("/brand/sponsors/pages");
    } else {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/brand/sponsors/pages")} data-back-nav><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-bold text-gray-900">{isNew ? "New Sponsor Page" : "Edit Sponsor Page"}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && published && (
            <Button variant="outline" size="sm" onClick={() => window.open(`/sponsors/${slug}`, "_blank")}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Preview
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#2d5282]">
            <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save Page"}
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card className="p-5 space-y-4 border-gray-200">
        <h2 className="font-semibold text-gray-700">Basic Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-500">Sponsor Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="USAA" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Slug (URL path)</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 font-mono text-xs" placeholder="usaa" />
            {slug && <p className="text-xs text-gray-400 mt-1">URL: /sponsors/{slug}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-500">Event</Label>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">None</option>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Tier</Label>
            <select value={tier} onChange={(e) => setTier(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {SPONSOR_TIERS.map((t) => <option key={t.name} value={t.name}>{t.name} ({t.price})</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={published} onCheckedChange={setPublished} />
          <Label className="text-sm">Published (visible at /sponsors/{slug})</Label>
        </div>
      </Card>

      {/* Branding */}
      <Card className="p-5 space-y-4 border-gray-200">
        <h2 className="font-semibold text-gray-700">Branding</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-500">Logo URL</Label>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="mt-1" placeholder="https://..." />
            {logoUrl && <img src={logoUrl} alt="logo preview" className="mt-2 h-12 rounded-lg bg-gray-100 object-contain" />}
          </div>
          <div>
            <Label className="text-xs text-gray-500">Banner URL</Label>
            <Input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} className="mt-1" placeholder="https://..." />
          </div>
        </div>
        <div>
          <Label className="text-xs text-gray-500">Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-1" placeholder="About the sponsor..." />
        </div>
      </Card>

      {/* Contact & Social */}
      <Card className="p-5 space-y-4 border-gray-200">
        <h2 className="font-semibold text-gray-700">Contact & Social</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-500">Website URL</Label>
            <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="mt-1" placeholder="https://..." />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Contact Email</Label>
            <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="mt-1" placeholder="sponsor@company.com" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-500">Instagram</Label>
            <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="mt-1" placeholder="@handle" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">Twitter / X</Label>
            <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} className="mt-1" placeholder="@handle" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">LinkedIn</Label>
            <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className="mt-1" placeholder="URL or handle" />
          </div>
          <div>
            <Label className="text-xs text-gray-500">YouTube</Label>
            <Input value={youtube} onChange={(e) => setYoutube(e.target.value)} className="mt-1" placeholder="Channel URL" />
          </div>
        </div>
      </Card>

      {/* Custom Content */}
      <Card className="p-5 space-y-4 border-gray-200">
        <h2 className="font-semibold text-gray-700">Custom Content Blocks</h2>
        <p className="text-xs text-gray-400">Add custom HTML or markdown content that will appear on the sponsor page.</p>
        <Textarea value={contentBlocks} onChange={(e) => setContentBlocks(e.target.value)} rows={6} className="font-mono text-xs" placeholder="<div>Custom HTML...</div>" />
      </Card>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getDominantColorFromFile } from "@/lib/dominant-color";
import type { HeroImageFormat, BioPageTheme } from "@/types/bio-page";
import { Loader2, ImagePlus, ExternalLink, Instagram, Youtube, Twitter, Facebook, Linkedin } from "lucide-react";
import { toast } from "sonner";

export default function CreatorProfile() {
  const { user } = useAuth();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroImageFormat, setHeroImageFormat] = useState<HeroImageFormat>("landscape");
  const [heroDominantColor, setHeroDominantColor] = useState<string | null>(null);
  const [bioPageTheme, setBioPageTheme] = useState<BioPageTheme>("light");
  const [customLinks, setCustomLinks] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    // Load from profiles table + user_metadata
    supabase
      .from("profiles")
      .select("full_name, bio")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const meta = user.user_metadata ?? {};
        setHandle((meta.handle as string) ?? "");
        setDisplayName((data?.full_name as string) ?? (meta.full_name as string) ?? "");
        setBio((data?.bio as string) ?? "");
        setHeroImageUrl((meta.hero_image_url as string) ?? null);
        setHeroImageFormat((meta.hero_image_format as HeroImageFormat) ?? "landscape");
        setHeroDominantColor((meta.hero_dominant_color as string) ?? null);
        setBioPageTheme((meta.bio_page_theme as BioPageTheme) ?? "light");
        const cl = meta.custom_links;
        setCustomLinks(typeof cl === "object" && cl ? cl as Record<string, unknown> : {});
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const save = async () => {
    if (!user?.id) return;
    const h = handle.replace(/^@/, "").trim().toLowerCase();
    if (!h) {
      toast.error("Set a handle for your bio page URL.");
      return;
    }
    setSaving(true);
    // Save basic fields to profiles table
    const { error: profileErr } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        full_name: displayName.trim() || null,
        bio: bio.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (profileErr) {
      setSaving(false);
      toast.error(profileErr.message);
      return;
    }
    // Save extra fields to user_metadata
    const { error: metaErr } = await supabase.auth.updateUser({
      data: {
        handle: h,
        full_name: displayName.trim() || null,
        hero_image_url: heroImageUrl || null,
        hero_image_format: heroImageFormat,
        hero_dominant_color: heroDominantColor || null,
        bio_page_theme: bioPageTheme,
        custom_links: Object.keys(customLinks).length ? customLinks : null,
      },
    });
    setSaving(false);
    if (metaErr) {
      toast.error(metaErr.message);
      return;
    }
    toast.success("Profile saved.");
  };

  const useProfilePhoto = () => {
    setHeroImageUrl(null);
    setHeroDominantColor(null);
    toast.success("Bio page will use your profile photo. Save to apply.");
  };

  const uploadHero = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/hero.${ext}`;
    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage.from("creator-assets").upload(path, file, {
        upsert: true,
      });
      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }
      const { data: urlData } = supabase.storage.from("creator-assets").getPublicUrl(path);
      setHeroImageUrl(urlData.publicUrl);
      const color = await getDominantColorFromFile(file);
      if (color) setHeroDominantColor(color);
      toast.success("Hero image uploaded. Save to apply.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const bioUrl = handle ? `${baseUrl}/c/${handle.replace(/^@/, "").toLowerCase()}` : "";

  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">
          Profile Builder
        </h1>
        <p className="text-muted-foreground">
          Build your MilCrunch creator profile. Your handle is your public bio page URL.
        </p>
      </div>

      {loading ? (
        <Card className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="bg-gradient-card border-border p-6 space-y-6">
            <div>
              <Label htmlFor="handle">Bio page handle</Label>
              <div className="flex gap-2 mt-1">
                <span className="inline-flex items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                  /c/
                </span>
                <Input
                  id="handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="yourhandle"
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Your bio page: {bioUrl || "—"} (share this link in your social bios)
              </p>
            </div>
            <div>
              <Label htmlFor="display_name">Display name</Label>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Short bio for your bio page..."
                className="mt-1 min-h-[100px]"
              />
            </div>
            <Button onClick={save} disabled={saving} className="rounded-lg">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save profile
            </Button>
          </Card>

          {/* Bio Page Layout (Komi-style) */}
          <Card className="bg-gradient-card border-border p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Bio page layout</h2>
              <p className="text-sm text-muted-foreground">
                Choose how your bio page looks: hero image format and theme.
              </p>
            </div>

            <div>
              <Label>Hero image</Label>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted border border-border flex-shrink-0">
                  {heroImageUrl ? (
                    <img src={heroImageUrl} alt="Hero" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImagePlus className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={useProfilePhoto}
                    className="rounded-lg"
                  >
                    Use profile photo
                  </Button>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={uploadHero}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImagePlus className="h-4 w-4 mr-2" />}
                      Upload hero image
                    </Button>
                  </div>
                </div>
              </div>
              {heroDominantColor && (
                <p className="text-xs text-muted-foreground mt-2">
                  Background color: <span className="inline-block w-4 h-4 rounded border border-border align-middle" style={{ backgroundColor: heroDominantColor }} /> {heroDominantColor}
                </p>
              )}
            </div>

            <div>
              <Label>Image format</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Portrait: tall, centered. Square: centered. Landscape: full-bleed hero (best for mobile).
              </p>
              <RadioGroup
                value={heroImageFormat}
                onValueChange={(v) => setHeroImageFormat(v as HeroImageFormat)}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="portrait" id="fmt-portrait" />
                  <Label htmlFor="fmt-portrait" className="font-normal cursor-pointer">Portrait</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="square" id="fmt-square" />
                  <Label htmlFor="fmt-square" className="font-normal cursor-pointer">Square</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="landscape" id="fmt-landscape" />
                  <Label htmlFor="fmt-landscape" className="font-normal cursor-pointer">Landscape</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Theme</Label>
              <RadioGroup
                value={bioPageTheme}
                onValueChange={(v) => setBioPageTheme(v as BioPageTheme)}
                className="flex flex-wrap gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="theme-light" />
                  <Label htmlFor="theme-light" className="font-normal cursor-pointer">Light</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dark" id="theme-dark" />
                  <Label htmlFor="theme-dark" className="font-normal cursor-pointer">Dark</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="auto" id="theme-auto" />
                  <Label htmlFor="theme-auto" className="font-normal cursor-pointer">Auto</Label>
                </div>
              </RadioGroup>
            </div>

            {bioUrl && (
              <div className="pt-2">
                <a
                  href={bioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Preview bio page
                </a>
              </div>
            )}
          </Card>
          {/* Connected Accounts */}
          <Card className="bg-gradient-card border-border p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Connected Accounts</h2>
              <p className="text-sm text-muted-foreground">
                Link your social media accounts to auto-sync content and analytics.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: "Instagram", icon: Instagram, color: "text-pink-500", bg: "bg-pink-50" },
                { name: "TikTok", icon: () => (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.16 8.16 0 004.76 1.52V7.12a4.84 4.84 0 01-1-.43z" />
                  </svg>
                ), color: "text-gray-900", bg: "bg-gray-100" },
                { name: "YouTube", icon: Youtube, color: "text-red-600", bg: "bg-red-50" },
                { name: "Twitter / X", icon: Twitter, color: "text-gray-900", bg: "bg-gray-100" },
                { name: "Facebook", icon: Facebook, color: "text-blue-600", bg: "bg-blue-50" },
                { name: "LinkedIn", icon: Linkedin, color: "text-blue-700", bg: "bg-blue-50" },
              ].map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.name}
                    className="flex items-center justify-between border border-border rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${p.bg} ${p.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{p.name}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.info("Creator connections coming soon")}
                    >
                      Connect
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </CreatorLayout>
  );
}

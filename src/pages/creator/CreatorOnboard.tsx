import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { getConnectedAccounts } from "@/lib/upload-post-sync";
import {
  Check,
  Instagram,
  ArrowRight,
  ArrowLeft,
  Link2,
  Share2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: Instagram },
  { id: "tiktok", name: "TikTok" },
  { id: "youtube", name: "YouTube" },
  { id: "facebook", name: "Facebook" },
  { id: "x", name: "Twitter/X" },
  { id: "linkedin", name: "LinkedIn" },
];

const CATEGORY_TAGS = [
  "Military", "Fitness", "Lifestyle", "Business", "Gaming", "Education",
  "Podcasts", "News & Politics", "Motivation", "Family", "Travel", "Food", "Tech", "Fashion",
];

export default function CreatorOnboard() {
  const { user, creatorProfile, refetchCreatorProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [connected, setConnected] = useState<{ platform: string; username?: string }[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [branch, setBranch] = useState("");
  const [rank, setRank] = useState("");
  const [yearsOfService, setYearsOfService] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [links, setLinks] = useState<{ label: string; url: string }[]>([
    { label: "Website", url: "" },
    { label: "Amazon Storefront", url: "" },
    { label: "Podcast", url: "" },
    { label: "YouTube Channel", url: "" },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const role = (user.user_metadata?.role as string) ?? "creator";
    if (role === "super_admin" || role === "admin" || role === "brand") {
      if (role === "super_admin") navigate("/admin", { replace: true });
      else navigate("/brand/dashboard", { replace: true });
      return;
    }
    if (creatorProfile?.onboarding_completed) {
      navigate("/creator/dashboard");
      return;
    }
  }, [user, creatorProfile, navigate]);

  useEffect(() => {
    if (!user?.id || creatorProfile !== null) return;
    supabase
      .from("creator_profiles")
      .upsert(
        {
          user_id: user.id,
          role: "creator",
          onboarding_step: 0,
          onboarding_completed: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .then(() => refetchCreatorProfile());
  }, [user?.id, creatorProfile, refetchCreatorProfile]);

  useEffect(() => {
    if (!user?.id) return;
    getConnectedAccounts(user.id).then((accounts) => {
      setConnected(accounts.map((a) => ({ platform: a.platform, username: a.platform_username ?? undefined })));
    });
  }, [user?.id]);

  useEffect(() => {
    if (creatorProfile) {
      setDisplayName(creatorProfile.display_name ?? "");
      setHandle(creatorProfile.handle ?? "");
    }
  }, [creatorProfile]);

  const saveStep2 = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase.from("creator_profiles").upsert(
      {
        user_id: user.id,
        display_name: displayName.trim() || null,
        handle: handle.replace(/^@/, "").trim().toLowerCase() || null,
        bio: bio.trim() || null,
        branch: branch || null,
        rank: rank || null,
        years_of_service: yearsOfService || null,
        category_tags: categories.length ? categories : null,
        onboarding_step: 2,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refetchCreatorProfile();
    setStep(3);
  };

  const saveStep3 = async () => {
    if (!user?.id) return;
    setSaving(true);
    const customLinks = {
      tabs: [
        { label: "My Links", type: "links", order: 1, visible: true },
        { label: "Events", type: "events", order: 2, visible: true },
        { label: "About", type: "about", order: 3, visible: true },
      ],
      links: links.filter((l) => l.url.trim()).map((l) => ({ label: l.label, url: l.url.trim() })),
    };
    const { error } = await supabase.from("creator_profiles").upsert(
      {
        user_id: user.id,
        custom_links: customLinks,
        onboarding_step: 3,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStep(4);
  };

  const completeOnboarding = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase.from("creator_profiles").upsert(
      {
        user_id: user.id,
        onboarding_step: 4,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refetchCreatorProfile();
    toast.success("You're all set!");
    navigate("/creator/dashboard");
  };

  const progress = (step / 4) * 100;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const bioPageUrl = handle ? `${baseUrl}/c/${handle}` : "";

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1B2A4A]/5 to-background py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">Step {step} of 4</p>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-6 w-6" />
                Connect Your Socials
              </CardTitle>
              <CardDescription>
                Connect at least one platform to sync your profile. You can add more later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {PLATFORMS.map((p) => {
                const connectedAccount = connected.find((c) => c.platform === p.id);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border"
                  >
                    <span className="font-medium">{p.name}</span>
                    {connectedAccount ? (
                      <span className="flex items-center gap-2 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        {connectedAccount.username ? `@${connectedAccount.username}` : "Connected"}
                      </span>
                    ) : (
                      <Button size="sm" variant="outline" asChild>
                        <a href="/creator/socials">Connect</a>
                      </Button>
                    )}
                  </div>
                );
              })}
              <div className="flex gap-3 pt-4">
                <Button onClick={() => setStep(2)}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Skip for now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Set Up Your Profile</CardTitle>
              <CardDescription>
                This info appears on your bio page. You can change it anytime.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Display name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Handle (bio page URL: /c/yourhandle)</Label>
                <Input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/^@/, "").toLowerCase())}
                  placeholder="yourhandle"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1 min-h-[80px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Branch (optional)</Label>
                  <Input value={branch} onChange={(e) => setBranch(e.target.value)} className="mt-1" placeholder="e.g. Army" />
                </div>
                <div>
                  <Label>Rank (optional)</Label>
                  <Input value={rank} onChange={(e) => setRank(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Years of service (optional)</Label>
                <Input value={yearsOfService} onChange={(e) => setYearsOfService(e.target.value)} className="mt-1" placeholder="e.g. 2004-2012" />
              </div>
              <div>
                <Label>Categories (select all that apply)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {CATEGORY_TAGS.map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      variant={categories.includes(tag) ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setCategories((c) => (c.includes(tag) ? c.filter((x) => x !== tag) : [...c, tag]))
                      }
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={saveStep2} disabled={saving}>
                  {saving ? "Saving..." : "Continue"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-6 w-6" />
                Add Your Links
              </CardTitle>
              <CardDescription>
                Links appear as buttons on your bio page. Drag to reorder later in Profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {links.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Label"
                    value={link.label}
                    onChange={(e) =>
                      setLinks((prev) => {
                        const next = [...prev];
                        next[i] = { ...next[i], label: e.target.value };
                        return next;
                      })
                    }
                  />
                  <Input
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) =>
                      setLinks((prev) => {
                        const next = [...prev];
                        next[i] = { ...next[i], url: e.target.value };
                        return next;
                      })
                    }
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLinks((prev) => [...prev, { label: "", url: "" }])}
              >
                + Add Link
              </Button>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={saveStep3} disabled={saving}>
                  {saving ? "Saving..." : "Continue"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-6 w-6" />
                Your Bio Page is Live!
              </CardTitle>
              <CardDescription>
                Share your link in your Instagram or TikTok bio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {bioPageUrl && (
                <div className="flex gap-2">
                  <Input readOnly value={bioPageUrl} className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(bioPageUrl);
                      toast.success("Link copied!");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://www.instagram.com/`} target="_blank" rel="noopener noreferrer">
                    Share on Instagram
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://www.tiktok.com/`} target="_blank" rel="noopener noreferrer">
                    Share on TikTok
                  </a>
                </Button>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" asChild>
                  <a href={bioPageUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Preview bio page
                  </a>
                </Button>
                <Button onClick={completeOnboarding} disabled={saving}>
                  {saving ? "Saving..." : "Go to Dashboard"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

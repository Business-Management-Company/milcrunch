import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Globe, EyeOff, Loader2,
  CheckCircle2, XCircle, AlertTriangle,
  Plus, Trash2, ChevronUp, ChevronDown,
  Type, Image, MousePointerClick, Columns2, Video, HelpCircle, LayoutTemplate,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import ImageUpload from "@/components/cms/ImageUpload";

// ----- Types -----
interface FaqPair {
  q: string;
  a: string;
}

interface ContentBlock {
  id: string;
  type: "hero" | "text" | "image" | "cta" | "two_column" | "video" | "faq";
  data: Record<string, string>;
}

interface PageData {
  id?: string;
  slug: string;
  page_name: string;
  status: string;
  content: ContentBlock[];
  meta_title: string;
  meta_description: string;
  h1_override: string;
  canonical_url: string;
  robots: string;
  og_title: string;
  og_description: string;
  og_image_url: string;
  og_image_alt: string;
  twitter_card_type: string;
  twitter_title: string;
  twitter_description: string;
  twitter_image_url: string;
  structured_data: string;
  published_at: string | null;
}

const EMPTY_PAGE: PageData = {
  slug: "",
  page_name: "",
  status: "draft",
  content: [],
  meta_title: "",
  meta_description: "",
  h1_override: "",
  canonical_url: "",
  robots: "index, follow",
  og_title: "",
  og_description: "",
  og_image_url: "",
  og_image_alt: "",
  twitter_card_type: "summary_large_image",
  twitter_title: "",
  twitter_description: "",
  twitter_image_url: "",
  structured_data: "",
  published_at: null,
};

const BLOCK_TYPES: { type: ContentBlock["type"]; label: string; icon: typeof Type }[] = [
  { type: "hero", label: "Hero", icon: LayoutTemplate },
  { type: "text", label: "Text", icon: Type },
  { type: "image", label: "Image", icon: Image },
  { type: "cta", label: "CTA Button", icon: MousePointerClick },
  { type: "two_column", label: "Two Column", icon: Columns2 },
  { type: "video", label: "Video Embed", icon: Video },
  { type: "faq", label: "FAQ", icon: HelpCircle },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function slugify(text: string): string {
  return "/" + text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ----- Helpers for content stats -----
function countContentWords(blocks: ContentBlock[]): number {
  let words = 0;
  for (const b of blocks) {
    const d = b.data;
    const text = [
      d.title, d.subtitle, d.body, d.left, d.right,
      d.text, d.heading, d.description, d.caption,
      d.question, d.answer, d.faq_pairs,
    ]
      .filter(Boolean)
      .join(" ");
    words += text.split(/\s+/).filter((w) => w.length > 0).length;
  }
  return words;
}

function countImagesWithoutAlt(blocks: ContentBlock[]): number {
  let missing = 0;
  for (const b of blocks) {
    if (b.type === "image" && b.data.url && !b.data.alt?.trim()) missing++;
    if (b.type === "hero" && b.data.bg_image && !b.data.bg_image_alt?.trim()) missing++;
  }
  return missing;
}

// ----- SEO Score -----
interface SeoCheck {
  label: string;
  passed: boolean | "warn";
  detail: string;
}

function calcSeo(p: PageData): { score: number; checks: SeoCheck[] } {
  const checks: SeoCheck[] = [];
  let pts = 0;
  const total = 10;

  // Meta Title
  const mtLen = (p.meta_title || "").length;
  if (mtLen >= 50 && mtLen <= 60) {
    checks.push({ label: "Meta Title", passed: true, detail: `Ideal length (${mtLen} chars)` });
    pts++;
  } else if (mtLen > 0 && mtLen <= 70) {
    checks.push({ label: "Meta Title", passed: "warn", detail: `Acceptable (${mtLen} chars, ideal 50-60)` });
    pts += 0.5;
  } else if (mtLen > 70) {
    checks.push({ label: "Meta Title", passed: false, detail: `Too long (${mtLen}/60 chars)` });
  } else {
    checks.push({ label: "Meta Title", passed: false, detail: "Missing meta title" });
  }

  // Meta Description
  const mdLen = (p.meta_description || "").length;
  if (mdLen >= 150 && mdLen <= 160) {
    checks.push({ label: "Meta Description", passed: true, detail: `Ideal length (${mdLen} chars)` });
    pts++;
  } else if (mdLen >= 120 && mdLen <= 170) {
    checks.push({ label: "Meta Description", passed: "warn", detail: `Acceptable (${mdLen} chars, ideal 150-160)` });
    pts += 0.5;
  } else if (mdLen > 170) {
    checks.push({ label: "Meta Description", passed: false, detail: `Too long (${mdLen}/160 chars)` });
  } else if (mdLen > 0) {
    checks.push({ label: "Meta Description", passed: "warn", detail: `Too short (${mdLen}/160 chars)` });
  } else {
    checks.push({ label: "Meta Description", passed: false, detail: "Missing meta description" });
  }

  // H1
  if (p.h1_override || p.page_name) {
    checks.push({ label: "H1 Heading", passed: true, detail: "H1 is defined" });
    pts++;
  } else {
    checks.push({ label: "H1 Heading", passed: false, detail: "Missing H1" });
  }

  // Content length
  const wordCount = countContentWords(p.content);
  if (wordCount >= 300) {
    checks.push({ label: "Content Length", passed: true, detail: `${wordCount} words (min 300)` });
    pts++;
  } else if (wordCount > 0) {
    checks.push({ label: "Content Length", passed: "warn", detail: `Only ${wordCount} words (min 300)` });
  } else {
    checks.push({ label: "Content Length", passed: false, detail: "No content" });
  }

  // Image alt tags
  const missingAlts = countImagesWithoutAlt(p.content);
  const hasImages = p.content.some(
    (b) => (b.type === "image" && b.data.url) || (b.type === "hero" && b.data.bg_image),
  );
  if (hasImages && missingAlts === 0) {
    checks.push({ label: "Image Alt Tags", passed: true, detail: "All images have alt text" });
    pts++;
  } else if (hasImages && missingAlts > 0) {
    checks.push({ label: "Image Alt Tags", passed: false, detail: `${missingAlts} image(s) missing alt text` });
  } else {
    checks.push({ label: "Image Alt Tags", passed: "warn", detail: "No images on page" });
    pts += 0.5;
  }

  // OG Title
  if (p.og_title) {
    checks.push({ label: "OG Title", passed: true, detail: "Open Graph title set" });
    pts++;
  } else {
    checks.push({ label: "OG Title", passed: false, detail: "Missing OG title" });
  }

  // OG Description
  if (p.og_description) {
    checks.push({ label: "OG Description", passed: true, detail: "Open Graph description set" });
    pts++;
  } else {
    checks.push({ label: "OG Description", passed: false, detail: "Missing OG description" });
  }

  // OG Image
  if (p.og_image_url) {
    checks.push({ label: "OG Image", passed: true, detail: "OG image set" });
    pts++;
  } else {
    checks.push({ label: "OG Image", passed: false, detail: "Missing OG image" });
  }

  // Twitter
  if (p.twitter_title || p.twitter_description) {
    checks.push({ label: "Twitter Card", passed: true, detail: "Twitter metadata set" });
    pts++;
  } else {
    checks.push({ label: "Twitter Card", passed: false, detail: "Missing Twitter metadata" });
  }

  // Structured Data
  if (p.structured_data && p.structured_data.trim().length > 2) {
    checks.push({ label: "Structured Data", passed: true, detail: "JSON-LD present" });
    pts++;
  } else {
    checks.push({ label: "Structured Data", passed: "warn", detail: "No structured data" });
  }

  return { score: Math.round((pts / total) * 100), checks };
}

// ----- FAQ Pairs helper -----
function parseFaqPairs(data: Record<string, string>): FaqPair[] {
  if (data.faq_pairs) {
    try {
      return JSON.parse(data.faq_pairs) as FaqPair[];
    } catch { /* fallback */ }
  }
  // legacy single Q&A
  if (data.question || data.answer) {
    return [{ q: data.question || "", a: data.answer || "" }];
  }
  return [{ q: "", a: "" }];
}

function serializeFaqPairs(pairs: FaqPair[]): string {
  return JSON.stringify(pairs);
}

// ----- Content Block Editor -----
function BlockEditor({
  block,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  block: ContentBlock;
  onUpdate: (data: Record<string, string>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const d = block.data;
  const set = (key: string, val: string) => onUpdate({ ...d, [key]: val });

  const blockMeta = BLOCK_TYPES.find((b) => b.type === block.type);
  const Icon = blockMeta?.icon || Type;

  // FAQ pairs state
  const [faqPairs, setFaqPairs] = useState<FaqPair[]>(() =>
    block.type === "faq" ? parseFaqPairs(d) : [],
  );

  const updateFaqPair = (idx: number, field: "q" | "a", val: string) => {
    const pairs = [...faqPairs];
    pairs[idx] = { ...pairs[idx], [field]: val };
    setFaqPairs(pairs);
    onUpdate({ ...d, faq_pairs: serializeFaqPairs(pairs) });
  };

  const addFaqPair = () => {
    const pairs = [...faqPairs, { q: "", a: "" }];
    setFaqPairs(pairs);
    onUpdate({ ...d, faq_pairs: serializeFaqPairs(pairs) });
  };

  const removeFaqPair = (idx: number) => {
    const pairs = faqPairs.filter((_, i) => i !== idx);
    setFaqPairs(pairs);
    onUpdate({ ...d, faq_pairs: serializeFaqPairs(pairs) });
  };

  return (
    <Card className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium capitalize">{block.type.replace("_", " ")} Block</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} disabled={isFirst}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} disabled={isLast}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {block.type === "hero" && (
          <>
            <div><Label className="text-xs">Title</Label><Input value={d.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="Hero title" /></div>
            <div><Label className="text-xs">Subtitle</Label><Input value={d.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} placeholder="Hero subtitle" /></div>
            <ImageUpload
              label="Background Image"
              value={d.bg_image || ""}
              onChange={(url) => set("bg_image", url)}
            />
            <div><Label className="text-xs">Background Image Alt Text</Label><Input value={d.bg_image_alt || ""} onChange={(e) => set("bg_image_alt", e.target.value)} placeholder="Describe the background image" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">CTA Text</Label><Input value={d.cta_text || ""} onChange={(e) => set("cta_text", e.target.value)} placeholder="Get Started" /></div>
              <div><Label className="text-xs">CTA Link</Label><Input value={d.cta_link || ""} onChange={(e) => set("cta_link", e.target.value)} placeholder="/signup" /></div>
            </div>
          </>
        )}
        {block.type === "text" && (
          <div><Label className="text-xs">Content</Label><Textarea value={d.body || ""} onChange={(e) => set("body", e.target.value)} rows={5} placeholder="Write your content here... (supports markdown)" /></div>
        )}
        {block.type === "image" && (
          <>
            <ImageUpload
              label="Image"
              value={d.url || ""}
              onChange={(url) => set("url", url)}
            />
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Alt Text</Label><Input value={d.alt || ""} onChange={(e) => set("alt", e.target.value)} placeholder="Descriptive alt text" /></div>
              <div><Label className="text-xs">Caption</Label><Input value={d.caption || ""} onChange={(e) => set("caption", e.target.value)} placeholder="Optional caption" /></div>
            </div>
          </>
        )}
        {block.type === "cta" && (
          <>
            <div><Label className="text-xs">Heading</Label><Input value={d.heading || ""} onChange={(e) => set("heading", e.target.value)} placeholder="Call to action heading" /></div>
            <div><Label className="text-xs">Description</Label><Textarea value={d.description || ""} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Supporting description text" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Button Text</Label><Input value={d.text || ""} onChange={(e) => set("text", e.target.value)} placeholder="Click me" /></div>
              <div><Label className="text-xs">Link URL</Label><Input value={d.url || ""} onChange={(e) => set("url", e.target.value)} placeholder="/signup" /></div>
              <div>
                <Label className="text-xs">Style</Label>
                <Select value={d.style || "primary"} onValueChange={(v) => set("style", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Background Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={d.bg_color || "#f9fafb"}
                  onChange={(e) => set("bg_color", e.target.value)}
                  className="h-8 w-10 rounded border border-gray-200 cursor-pointer"
                />
                <Input
                  value={d.bg_color || ""}
                  onChange={(e) => set("bg_color", e.target.value)}
                  placeholder="#f9fafb"
                  className="flex-1"
                />
              </div>
            </div>
          </>
        )}
        {block.type === "two_column" && (
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Left Column</Label><Textarea value={d.left || ""} onChange={(e) => set("left", e.target.value)} rows={4} placeholder="Left column content" /></div>
            <div><Label className="text-xs">Right Column</Label><Textarea value={d.right || ""} onChange={(e) => set("right", e.target.value)} rows={4} placeholder="Right column content" /></div>
          </div>
        )}
        {block.type === "video" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Video Embed URL</Label><Input value={d.url || ""} onChange={(e) => set("url", e.target.value)} placeholder="https://youtube.com/embed/..." /></div>
              <div><Label className="text-xs">Title</Label><Input value={d.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="Video title" /></div>
            </div>
            {d.url && (
              <div className="aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mt-1">
                <iframe
                  src={d.url}
                  title={d.title || "Video preview"}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </>
        )}
        {block.type === "faq" && (
          <div className="space-y-3">
            {faqPairs.map((pair, idx) => (
              <div key={idx} className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Q&A #{idx + 1}</span>
                  {faqPairs.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-500" onClick={() => removeFaqPair(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div><Label className="text-xs">Question</Label><Input value={pair.q} onChange={(e) => updateFaqPair(idx, "q", e.target.value)} placeholder="Frequently asked question" /></div>
                <div><Label className="text-xs">Answer</Label><Textarea value={pair.a} onChange={(e) => updateFaqPair(idx, "a", e.target.value)} rows={2} placeholder="Answer..." /></div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addFaqPair}>
              <Plus className="h-3 w-3 mr-1" />
              Add Q&A Pair
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

// ----- Main Page Editor -----
const BrandPageEdit = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [page, setPage] = useState<PageData>({ ...EMPTY_PAGE });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [ogOpen, setOgOpen] = useState(false);
  const [twitterOpen, setTwitterOpen] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      (async () => {
        const { data, error } = await supabase
          .from("site_pages")
          .select("*")
          .eq("id", id)
          .single();
        if (error || !data) {
          toast({ title: "Page not found", variant: "destructive" });
          navigate("/brand/pages");
          return;
        }
        setPage({
          id: data.id,
          slug: data.slug || "",
          page_name: data.page_name || "",
          status: data.status || "draft",
          content: (Array.isArray(data.content) ? data.content : []) as ContentBlock[],
          meta_title: data.meta_title || "",
          meta_description: data.meta_description || "",
          h1_override: data.h1_override || "",
          canonical_url: data.canonical_url || "",
          robots: data.robots || "index, follow",
          og_title: data.og_title || "",
          og_description: data.og_description || "",
          og_image_url: data.og_image_url || "",
          og_image_alt: data.og_image_alt || "",
          twitter_card_type: data.twitter_card_type || "summary_large_image",
          twitter_title: data.twitter_title || "",
          twitter_description: data.twitter_description || "",
          twitter_image_url: data.twitter_image_url || "",
          structured_data: data.structured_data ? JSON.stringify(data.structured_data, null, 2) : "",
          published_at: data.published_at || null,
        });
        setSlugManuallyEdited(true); // existing pages have slugs
        setLoading(false);
      })();
    }
  }, [id, isNew, navigate, toast]);

  const set = useCallback(<K extends keyof PageData>(key: K, val: PageData[K]) => {
    setPage((prev) => ({ ...prev, [key]: val }));
  }, []);

  // Auto-slug from page name
  const handlePageNameChange = (name: string) => {
    set("page_name", name);
    if (!slugManuallyEdited && !page.published_at) {
      set("slug", slugify(name));
    }
  };

  const handleSlugChange = (slug: string) => {
    setSlugManuallyEdited(true);
    set("slug", slug);
  };

  const handleSave = async (newStatus?: string) => {
    if (!page.page_name.trim()) {
      toast({ title: "Page name is required", variant: "destructive" });
      return;
    }
    if (!page.slug.trim()) {
      toast({ title: "Slug is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    const status = newStatus || page.status;
    let structuredJson: unknown = null;
    if (page.structured_data.trim()) {
      try {
        structuredJson = JSON.parse(page.structured_data);
      } catch {
        toast({ title: "Invalid JSON-LD in structured data", variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    const slug = page.slug.startsWith("/") ? page.slug : `/${page.slug}`;

    const payload = {
      slug,
      page_name: page.page_name,
      status,
      content: page.content as unknown as Record<string, unknown>,
      meta_title: page.meta_title || null,
      meta_description: page.meta_description || null,
      h1_override: page.h1_override || null,
      canonical_url: page.canonical_url || null,
      robots: page.robots,
      og_title: page.og_title || null,
      og_description: page.og_description || null,
      og_image_url: page.og_image_url || null,
      og_image_alt: page.og_image_alt || null,
      twitter_card_type: page.twitter_card_type,
      twitter_title: page.twitter_title || null,
      twitter_description: page.twitter_description || null,
      twitter_image_url: page.twitter_image_url || null,
      structured_data: structuredJson as Record<string, unknown> | null,
      updated_by: user?.id || null,
      updated_at: new Date().toISOString(),
      ...(status === "published" && !page.published_at ? { published_at: new Date().toISOString() } : {}),
    };

    try {
      if (isNew) {
        const { data, error } = await supabase
          .from("site_pages")
          .insert({ ...payload, created_by: user?.id || null })
          .select("id")
          .single();
        if (error) throw error;
        toast({ title: "Page created" });
        navigate(`/brand/pages/${data.id}`, { replace: true });
      } else {
        const { error } = await supabase
          .from("site_pages")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        setPage((prev) => ({ ...prev, status, ...(status === "published" && !prev.published_at ? { published_at: new Date().toISOString() } : {}) }));
        toast({ title: status === "published" ? "Page published" : "Page saved" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Content block helpers
  const addBlock = (type: ContentBlock["type"]) => {
    set("content", [...page.content, { id: uid(), type, data: {} }]);
    setShowBlockPicker(false);
  };
  const updateBlock = (idx: number, data: Record<string, string>) => {
    const c = [...page.content];
    c[idx] = { ...c[idx], data };
    set("content", c);
  };
  const deleteBlock = (idx: number) => {
    set("content", page.content.filter((_, i) => i !== idx));
  };
  const moveBlock = (idx: number, dir: -1 | 1) => {
    const c = [...page.content];
    const target = idx + dir;
    if (target < 0 || target >= c.length) return;
    [c[idx], c[target]] = [c[target], c[idx]];
    set("content", c);
  };

  const { score, checks } = calcSeo(page);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-pd-page-light dark:bg-[#0F1117] text-foreground transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/brand/pages")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-pd-navy dark:text-white">
                {isNew ? "Create Page" : page.page_name || "Edit Page"}
              </h1>
              {!isNew && (
                <p className="text-xs text-muted-foreground font-mono">
                  /p{page.slug.startsWith("/") ? page.slug : `/${page.slug}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={page.status === "published" ? "bg-green-100 text-green-700" : page.status === "archived" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}>
              {page.status === "published" ? <Globe className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
              {page.status}
            </Badge>
            {page.status === "published" ? (
              <Button variant="outline" size="sm" onClick={() => handleSave("draft")} disabled={saving}>
                Revert to Draft
              </Button>
            ) : (
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSave("published")} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Globe className="h-4 w-4 mr-1" />}
                Publish
              </Button>
            )}
            <Button size="sm" className="bg-pd-blue hover:bg-pd-darkblue text-white" onClick={() => handleSave()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN — Page Information + Content Blocks (70%) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-6">
              <h2 className="font-semibold text-lg mb-4">Page Information</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Page Name</Label>
                    <Input
                      value={page.page_name}
                      onChange={(e) => handlePageNameChange(e.target.value)}
                      placeholder="About Us"
                    />
                  </div>
                  <div>
                    <Label>
                      Slug
                      {page.published_at && (
                        <span className="ml-2 text-xs text-orange-500">Locked after publishing</span>
                      )}
                    </Label>
                    <Input
                      value={page.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="/about"
                      disabled={!!page.published_at}
                      className={page.published_at ? "opacity-60" : ""}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={page.status} onValueChange={(v) => set("status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>H1 Override</Label>
                    <Input value={page.h1_override} onChange={(e) => set("h1_override", e.target.value)} placeholder="Custom H1 (defaults to Page Name)" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Content Blocks */}
            <Card className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Content Blocks</h2>
                <Button size="sm" variant="outline" onClick={() => setShowBlockPicker(!showBlockPicker)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Block
                </Button>
              </div>

              {showBlockPicker && (
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  {BLOCK_TYPES.map((bt) => {
                    const BIcon = bt.icon;
                    return (
                      <button
                        key={bt.type}
                        onClick={() => addBlock(bt.type)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-colors"
                      >
                        <BIcon className="h-5 w-5 text-pd-blue" />
                        <span className="text-xs font-medium">{bt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {page.content.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <LayoutTemplate className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No content blocks yet. Click "Add Block" to start building.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {page.content.map((block, idx) => (
                    <BlockEditor
                      key={block.id}
                      block={block}
                      onUpdate={(data) => updateBlock(idx, data)}
                      onDelete={() => deleteBlock(idx)}
                      onMoveUp={() => moveBlock(idx, -1)}
                      onMoveDown={() => moveBlock(idx, 1)}
                      isFirst={idx === 0}
                      isLast={idx === page.content.length - 1}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT COLUMN — SEO Analysis (30%) */}
          <div className="space-y-6">
            {/* SEO Analysis */}
            <Card className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-6">
              <h2 className="font-semibold text-lg mb-4">SEO Analysis</h2>
              <div className="flex items-center gap-3 mb-5">
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-gray-100 dark:text-gray-800"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      strokeWidth="3"
                      strokeDasharray={`${score}, 100`}
                      className={score >= 80 ? "stroke-green-500" : score >= 60 ? "stroke-yellow-500" : "stroke-red-500"}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${
                    score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-500"
                  }`}>
                    {score}%
                  </span>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${
                    score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-500"
                  }`}>
                    {score >= 80 ? "Good" : score >= 60 ? "Needs Work" : "Poor"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {checks.filter((c) => c.passed === true).length}/{checks.length} checks passed
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {checks.map((c) => (
                  <div key={c.label} className="flex items-start gap-2 text-sm">
                    {c.passed === true ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    ) : c.passed === "warn" ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <span className="font-medium">{c.label}</span>
                      <span className="text-muted-foreground ml-1">&mdash; {c.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Meta Title & Description */}
            <Card className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-6">
              <h2 className="font-semibold text-lg mb-4">Meta Tags</h2>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">
                    Meta Title
                    <span className={`ml-2 ${
                      (page.meta_title || "").length >= 50 && (page.meta_title || "").length <= 60
                        ? "text-green-600"
                        : (page.meta_title || "").length > 60
                          ? "text-red-500"
                          : "text-muted-foreground"
                    }`}>
                      {(page.meta_title || "").length}/60
                    </span>
                  </Label>
                  <Input value={page.meta_title} onChange={(e) => set("meta_title", e.target.value)} placeholder="Page Title — RecurrentX" />
                </div>
                <div>
                  <Label className="text-xs">
                    Meta Description
                    <span className={`ml-2 ${
                      (page.meta_description || "").length >= 150 && (page.meta_description || "").length <= 160
                        ? "text-green-600"
                        : (page.meta_description || "").length > 160
                          ? "text-red-500"
                          : "text-muted-foreground"
                    }`}>
                      {(page.meta_description || "").length}/160
                    </span>
                  </Label>
                  <Textarea value={page.meta_description} onChange={(e) => set("meta_description", e.target.value)} rows={3} placeholder="A concise description for search engines (150-160 chars ideal)" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Canonical URL</Label>
                    <Input value={page.canonical_url} onChange={(e) => set("canonical_url", e.target.value)} placeholder="Auto-generated" />
                  </div>
                  <div>
                    <Label className="text-xs">Robots</Label>
                    <Select value={page.robots} onValueChange={(v) => set("robots", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="index, follow">index, follow</SelectItem>
                        <SelectItem value="noindex, follow">noindex, follow</SelectItem>
                        <SelectItem value="index, nofollow">index, nofollow</SelectItem>
                        <SelectItem value="noindex, nofollow">noindex, nofollow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Structured Data (JSON-LD)</Label>
                  <Textarea
                    value={page.structured_data}
                    onChange={(e) => set("structured_data", e.target.value)}
                    rows={3}
                    placeholder={'{\n  "@context": "https://schema.org"\n}'}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </Card>

            {/* Open Graph (collapsible) */}
            <Collapsible open={ogOpen} onOpenChange={setOgOpen}>
              <Card className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-6">
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <h2 className="font-semibold text-lg">Open Graph</h2>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${ogOpen ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="space-y-3">
                    <div><Label className="text-xs">OG Title</Label><Input value={page.og_title} onChange={(e) => set("og_title", e.target.value)} placeholder="Title for social sharing" /></div>
                    <div><Label className="text-xs">OG Description</Label><Textarea value={page.og_description} onChange={(e) => set("og_description", e.target.value)} rows={2} placeholder="Description for social sharing" /></div>
                    <ImageUpload
                      label="OG Image"
                      value={page.og_image_url}
                      onChange={(url) => set("og_image_url", url)}
                    />
                    <div><Label className="text-xs">OG Image Alt Text</Label><Input value={page.og_image_alt} onChange={(e) => set("og_image_alt", e.target.value)} placeholder="Describe the image" /></div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Twitter Card (collapsible) */}
            <Collapsible open={twitterOpen} onOpenChange={setTwitterOpen}>
              <Card className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1A1D27] p-6">
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <h2 className="font-semibold text-lg">Twitter Card</h2>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${twitterOpen ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Card Type</Label>
                      <Select value={page.twitter_card_type} onValueChange={(v) => set("twitter_card_type", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="summary">Summary</SelectItem>
                          <SelectItem value="summary_large_image">Summary Large Image</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Twitter Title</Label><Input value={page.twitter_title} onChange={(e) => set("twitter_title", e.target.value)} placeholder="Title for Twitter" /></div>
                    <div><Label className="text-xs">Twitter Description</Label><Textarea value={page.twitter_description} onChange={(e) => set("twitter_description", e.target.value)} rows={2} placeholder="Description for Twitter" /></div>
                    <ImageUpload
                      label="Twitter Image"
                      value={page.twitter_image_url}
                      onChange={(url) => set("twitter_image_url", url)}
                    />
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandPageEdit;

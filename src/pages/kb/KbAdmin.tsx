import { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Eye,
  Info,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { KB_CATEGORIES, KB_ARTICLES } from "@/lib/kb-articles";
import type { KbArticle } from "@/lib/kb-articles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import MarkdownRenderer from "@/components/ui/markdown-renderer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface EditableArticle {
  title: string;
  slug: string;
  category: string;
  summary: string;
  content: string;
  readTime: number;
  date: string;
  related: string[];
  isPublished: boolean;
}

function articleToEditable(a: KbArticle): EditableArticle {
  return {
    title: a.title,
    slug: a.slug,
    category: a.category,
    summary: a.summary,
    content: a.content,
    readTime: a.readTime,
    date: a.date,
    related: a.related,
    isPublished: true,
  };
}

function blankArticle(): EditableArticle {
  return {
    title: "",
    slug: "",
    category: KB_CATEGORIES[0]?.slug ?? "getting-started",
    summary: "",
    content: "",
    readTime: 5,
    date: new Date().toISOString().slice(0, 10),
    related: [],
    isPublished: true,
  };
}

// ---------------------------------------------------------------------------
/* ---------- markdown rendering handled by shared MarkdownRenderer component ---------- */

// ---------------------------------------------------------------------------
// Category badge color
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  "getting-started": "bg-blue-500/20 text-blue-300",
  features: "bg-blue-600/20 text-blue-400",
  creators: "bg-emerald-500/20 text-emerald-300",
  brands: "bg-amber-500/20 text-amber-300",
  billing: "bg-rose-500/20 text-rose-300",
  integrations: "bg-cyan-500/20 text-cyan-300",
};

function categoryBadgeClass(slug: string) {
  return CATEGORY_COLORS[slug] ?? "bg-white/10 text-white/60";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function KbAdmin() {
  // Data state -- seed from static KB_ARTICLES
  const [articles, setArticles] = useState<EditableArticle[]>(() =>
    KB_ARTICLES.map(articleToEditable),
  );

  // UI state
  const [view, setView] = useState<"list" | "edit">("list");
  const [editIndex, setEditIndex] = useState<number | null>(null); // null = new
  const [draft, setDraft] = useState<EditableArticle>(blankArticle());
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filtered articles
  const filtered = useMemo(() => {
    if (activeCategory === "all") return articles;
    return articles.filter((a) => a.category === activeCategory);
  }, [articles, activeCategory]);

  // Category label helper
  const categoryLabel = (slug: string) => {
    const cat = KB_CATEGORIES.find((c) => c.slug === slug);
    return cat ? `${cat.emoji} ${cat.label}` : slug;
  };

  // ------- Actions -------

  const openNew = () => {
    setEditIndex(null);
    setDraft(blankArticle());
    setConfirmDelete(false);
    setView("edit");
  };

  const openEdit = (idx: number) => {
    setEditIndex(idx);
    setDraft({ ...articles[idx] });
    setConfirmDelete(false);
    setView("edit");
  };

  const cancelEdit = () => {
    setView("list");
    setEditIndex(null);
    setConfirmDelete(false);
  };

  const handleTitleChange = (title: string) => {
    const isNew = editIndex === null;
    setDraft((d) => ({
      ...d,
      title,
      // Auto-slug only for new articles
      ...(isNew ? { slug: slugify(title) } : {}),
    }));
  };

  const handleSave = async () => {
    if (!draft.title.trim() || !draft.slug.trim()) {
      toast.error("Title and slug are required.");
      return;
    }

    setSaving(true);

    // Update local state first
    const updated = [...articles];
    if (editIndex !== null) {
      updated[editIndex] = { ...draft };
    } else {
      updated.push({ ...draft });
    }
    setArticles(updated);

    // Attempt Supabase upsert
    try {
      const { error } = await (supabase as any)
        .from("kb_articles")
        .upsert(
          {
            title: draft.title,
            slug: draft.slug,
            category: draft.category,
            summary: draft.summary,
            content: draft.content,
            read_time: draft.readTime,
            is_published: draft.isPublished,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "slug" },
        );

      if (error) throw error;
      toast.success("Article saved to database.");
    } catch (err: any) {
      console.error("Supabase save error:", err);
      toast.error(
        "Save failed \u2014 kb_articles table may not exist yet. Changes saved locally.",
      );
    }

    setSaving(false);
    setView("list");
    setEditIndex(null);
  };

  const handleDelete = async () => {
    if (editIndex === null) {
      cancelEdit();
      return;
    }

    const slug = articles[editIndex].slug;

    // Remove locally
    const updated = articles.filter((_, i) => i !== editIndex);
    setArticles(updated);

    // Attempt Supabase delete
    try {
      const { error } = await (supabase as any)
        .from("kb_articles")
        .delete()
        .eq("slug", slug);

      if (error) throw error;
      toast.success("Article deleted.");
    } catch (err: any) {
      console.error("Supabase delete error:", err);
      toast.error(
        "Delete failed \u2014 kb_articles table may not exist yet. Removed locally.",
      );
    }

    setView("list");
    setEditIndex(null);
    setConfirmDelete(false);
  };

  // ------- Render -------

  if (view === "edit") {
    return (
      <div className="min-h-screen bg-[#0A0F1E] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={cancelEdit}
              className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white/60" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">
                {editIndex !== null ? "Edit Article" : "New Article"}
              </h1>
              <p className="text-sm text-white/40 mt-0.5">
                {editIndex !== null
                  ? `Editing: ${draft.slug}`
                  : "Create a new knowledge base article"}
              </p>
            </div>
          </div>

          {/* Editor + Preview side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor Form */}
            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Title
                </label>
                <Input
                  value={draft.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Article title"
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#1e3a5f]"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Slug
                </label>
                <Input
                  value={draft.slug}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, slug: e.target.value }))
                  }
                  placeholder="article-slug"
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-gray-600 font-mono text-sm focus-visible:ring-[#1e3a5f]"
                />
              </div>

              {/* Category + Read Time row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">
                    Category
                  </label>
                  <Select
                    value={draft.category}
                    onValueChange={(val) =>
                      setDraft((d) => ({ ...d, category: val }))
                    }
                  >
                    <SelectTrigger className="bg-white/[0.06] border-white/10 text-white focus:ring-[#1e3a5f]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KB_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.slug} value={cat.slug}>
                          {cat.emoji} {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">
                    Read Time (min)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={draft.readTime}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        readTime: parseInt(e.target.value, 10) || 1,
                      }))
                    }
                    className="bg-white/[0.06] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-[#1e3a5f]"
                  />
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Summary
                </label>
                <Textarea
                  rows={2}
                  value={draft.summary}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, summary: e.target.value }))
                  }
                  placeholder="Brief description of the article..."
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-gray-600 resize-none focus-visible:ring-[#1e3a5f]"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">
                  Content (Markdown)
                </label>
                <Textarea
                  rows={20}
                  value={draft.content}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, content: e.target.value }))
                  }
                  placeholder="Write your article content here using markdown..."
                  className="bg-white/[0.06] border-white/10 text-white placeholder:text-gray-600 resize-y font-mono text-sm leading-relaxed focus-visible:ring-[#1e3a5f]"
                />
              </div>

              {/* Published toggle */}
              <div className="flex items-center gap-3">
                <Switch
                  checked={draft.isPublished}
                  onCheckedChange={(checked) =>
                    setDraft((d) => ({ ...d, isPublished: checked }))
                  }
                  className="data-[state=checked]:bg-[#10B981]"
                />
                <span className="text-sm text-white/70">
                  {draft.isPublished ? "Published" : "Draft"}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/[0.08]">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white"
                >
                  {saving ? "Saving..." : "Save Article"}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEdit}
                  className="border-white/10 text-white/70 hover:bg-white/[0.06] hover:text-white"
                >
                  Cancel
                </Button>
                {editIndex !== null && (
                  <>
                    {confirmDelete ? (
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-sm text-red-400">
                          Are you sure?
                        </span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Confirm Delete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDelete(false)}
                          className="border-white/10 text-white/70 hover:bg-white/[0.06] hover:text-white"
                        >
                          No
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setConfirmDelete(true)}
                        className="ml-auto border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Delete
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Preview Panel */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.08]">
                <Eye className="h-4 w-4 text-[#1e3a5f]" />
                <span className="text-sm font-medium text-white/60">
                  Preview
                </span>
              </div>

              {draft.title ? (
                <h1 className="text-xl font-bold text-white mb-2">
                  {draft.title}
                </h1>
              ) : (
                <p className="text-white/30 italic text-sm">
                  Article title will appear here...
                </p>
              )}

              {draft.summary && (
                <p className="text-sm text-white/50 mb-4">{draft.summary}</p>
              )}

              <div className="mt-4">
                {draft.content && <MarkdownRenderer content={draft.content} className="text-white/70 [&_h2]:text-white [&_h3]:text-white/90 [&_strong]:text-white/90" />}
              </div>

              {!draft.content && (
                <p className="text-white/20 italic text-sm mt-6">
                  Start writing content to see a live preview...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ------- List View -------
  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <BookOpen className="h-7 w-7 text-[#1e3a5f]" />
              <h1 className="text-2xl font-bold">Knowledge Base Editor</h1>
            </div>
            <p className="text-sm text-white/40 mt-1 ml-10">
              Manage articles, categories, and published content.
            </p>
          </div>
          <Button
            onClick={openNew}
            className="bg-[#1e3a5f] hover:bg-[#2d5282] text-white"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Article
          </Button>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 mb-6">
          <Info className="h-4 w-4 text-[#1e3a5f] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-white/40 leading-relaxed">
            Articles are loaded from static data. Connect Supabase to enable
            persistent editing. Changes made here are saved locally during this
            session.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              activeCategory === "all"
                ? "bg-[#1e3a5f] text-white"
                : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/70",
            )}
          >
            All ({articles.length})
          </button>
          {KB_CATEGORIES.map((cat) => {
            const count = articles.filter(
              (a) => a.category === cat.slug,
            ).length;
            return (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  activeCategory === cat.slug
                    ? "bg-[#1e3a5f] text-white"
                    : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/70",
                )}
              >
                {cat.emoji} {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Article List */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">
              No articles in this category.
            </p>
          </div>
        ) : (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_140px_100px_100px_80px] gap-4 px-5 py-3 border-b border-white/[0.08] text-xs font-medium text-white/30 uppercase tracking-wider">
              <span>Title</span>
              <span>Category</span>
              <span>Status</span>
              <span>Date</span>
              <span className="text-right">Action</span>
            </div>

            {/* Rows */}
            {filtered.map((article, idx) => {
              // Find real index in full articles array
              const realIdx = articles.findIndex(
                (a) => a.slug === article.slug,
              );
              return (
                <div
                  key={article.slug}
                  className="grid grid-cols-[1fr_140px_100px_100px_80px] gap-4 px-5 py-3.5 border-b border-white/[0.04] last:border-0 items-center hover:bg-white/[0.02] transition-colors"
                >
                  {/* Title */}
                  <span className="font-semibold text-white text-sm truncate">
                    {article.title}
                  </span>

                  {/* Category badge */}
                  <span>
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded text-xs font-medium",
                        categoryBadgeClass(article.category),
                      )}
                    >
                      {categoryLabel(article.category)}
                    </span>
                  </span>

                  {/* Status */}
                  <span>
                    {article.isPublished ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#10B981]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                        Draft
                      </span>
                    )}
                  </span>

                  {/* Date */}
                  <span className="text-xs text-white/30">{article.date}</span>

                  {/* Edit button */}
                  <span className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(realIdx)}
                      className="text-white/50 hover:text-white hover:bg-white/[0.06]"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

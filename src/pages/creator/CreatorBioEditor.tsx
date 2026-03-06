import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CreatorLayout from "@/components/layout/CreatorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Link2,
  ExternalLink,
  Plus,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Clapperboard,
  MonitorPlay,
  Share2,
  CalendarCheck,
  BookOpen,
  Ticket,
  ShoppingBag,
  HandCoins,
  Link,
  Mic,
  Mail,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import type { BioSectionConfig, SectionType, SectionCatalogEntry } from "@/types/bio-page";
import { SECTION_CATALOG, normalizeCustomLinks } from "@/types/bio-page";

/* Map icon string names from the catalog to actual Lucide components */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Clapperboard,
  MonitorPlay,
  Share2,
  CalendarCheck,
  BookOpen,
  Ticket,
  ShoppingBag,
  HandCoins,
  Link,
  Mic,
  Mail,
};

function getSectionIcon(entry: SectionCatalogEntry) {
  const Icon = ICON_MAP[entry.icon];
  return Icon ? <Icon className="h-5 w-5" /> : <Link2 className="h-5 w-5" />;
}

function generateId() {
  return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function CreatorBioEditor() {
  const { user, creatorProfile } = useAuth();
  const navigate = useNavigate();
  const handle = creatorProfile?.handle ?? "";
  const bioUrl = handle ? `${typeof window !== "undefined" ? window.location.origin : ""}/c/${handle}` : "";

  const [sections, setSections] = useState<BioSectionConfig[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load existing sections from user_metadata
  useEffect(() => {
    if (!user?.id) return;
    const meta = user.user_metadata ?? {};
    const cl = meta.custom_links;
    const config = normalizeCustomLinks(cl);
    setSections(config.sections ?? []);
    setLoaded(true);
  }, [user?.id]);

  useEffect(() => {
    if (!handle && loaded) {
      navigate("/creator/profile");
    }
  }, [handle, navigate, loaded]);

  // Persist sections to Supabase
  const persistSections = useCallback(async (updated: BioSectionConfig[]) => {
    if (!user?.id) return;
    setSaving(true);
    const meta = user.user_metadata ?? {};
    const cl = typeof meta.custom_links === "object" && meta.custom_links
      ? (meta.custom_links as Record<string, unknown>)
      : {};
    const { error } = await supabase.auth.updateUser({
      data: {
        custom_links: { ...cl, sections: updated },
      },
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    }
  }, [user]);

  const addSection = (entry: SectionCatalogEntry) => {
    const already = sections.find((s) => s.type === entry.type);
    if (already) {
      toast.info(`${entry.label} is already added.`);
      setModalOpen(false);
      return;
    }
    const newSection: BioSectionConfig = {
      id: generateId(),
      type: entry.type,
      label: entry.label,
      visible: true,
      order: sections.length + 1,
    };
    const updated = [...sections, newSection];
    setSections(updated);
    persistSections(updated);
    setModalOpen(false);
    toast.success(`Added ${entry.label}`);
  };

  const removeSection = (id: string) => {
    const updated = sections
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, order: i + 1 }));
    setSections(updated);
    persistSections(updated);
  };

  const toggleVisibility = (id: string) => {
    const updated = sections.map((s) =>
      s.id === id ? { ...s, visible: !s.visible } : s
    );
    setSections(updated);
    persistSections(updated);
  };

  const moveSection = (id: string, direction: "up" | "down") => {
    const idx = sections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sections.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const updated = [...sections];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    const reordered = updated.map((s, i) => ({ ...s, order: i + 1 }));
    setSections(reordered);
    persistSections(reordered);
  };

  const catalogEntryFor = (type: SectionType) =>
    SECTION_CATALOG.find((e) => e.type === type);

  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-foreground mb-2">My Bio Page</h1>
        <p className="text-muted-foreground">
          Add and arrange sections on your bio page. Toggle visibility and reorder as needed.
        </p>
      </div>

      {/* Bio page link */}
      {bioUrl && (
        <Card className="rounded-xl border-border mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-5 w-5" />
              Bio page link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-mono text-muted-foreground break-all mb-3">{bioUrl}</p>
            <div className="flex gap-2">
              <Button size="sm" asChild>
                <a href={bioUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open bio page
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/creator/profile")}>
                Edit profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section list */}
      <Card className="rounded-xl border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Page Sections</CardTitle>
              <CardDescription>
                {sections.length === 0
                  ? "No sections added yet. Click below to get started."
                  : `${sections.length} section${sections.length === 1 ? "" : "s"} configured`}
              </CardDescription>
            </div>
            {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {sections.map((section, idx) => {
            const entry = catalogEntryFor(section.type);
            if (!entry) return null;
            return (
              <div
                key={section.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  section.visible
                    ? "bg-card border-border"
                    : "bg-muted/50 border-border/50 opacity-60"
                }`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-2 shrink-0">
                  {getSectionIcon(entry)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{section.label}</span>
                    {entry.comingSoon && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{entry.description}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={idx === 0}
                    onClick={() => moveSection(section.id, "up")}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={idx === sections.length - 1}
                    onClick={() => moveSection(section.id, "down")}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Switch
                    checked={section.visible}
                    onCheckedChange={() => toggleVisibility(section.id)}
                    aria-label={section.visible ? "Hide section" : "Show section"}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeSection(section.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          <Button
            variant="outline"
            className="w-full mt-3 border-dashed"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </CardContent>
      </Card>

      {/* Page preview */}
      {sections.length > 0 && (
        <Card className="rounded-xl border-border mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Page Preview</CardTitle>
            <CardDescription>How sections will appear on your bio page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sections
              .filter((s) => s.visible)
              .sort((a, b) => a.order - b.order)
              .map((section) => {
                const entry = catalogEntryFor(section.type);
                if (!entry) return null;
                return (
                  <div
                    key={section.id}
                    className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 p-4"
                  >
                    <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 text-primary shrink-0">
                      {getSectionIcon(entry)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{section.label}</span>
                        {entry.comingSoon && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{entry.description}</p>
                    </div>
                    {section.visible ? (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Add Section Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a Section</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {SECTION_CATALOG.map((entry) => {
              const alreadyAdded = sections.some((s) => s.type === entry.type);
              return (
                <button
                  key={entry.type}
                  onClick={() => addSection(entry)}
                  disabled={alreadyAdded}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    alreadyAdded
                      ? "border-border/40 bg-muted/30 opacity-50 cursor-not-allowed"
                      : "border-border hover:bg-accent hover:border-accent-foreground/20 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 text-primary shrink-0">
                    {getSectionIcon(entry)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{entry.label}</span>
                      {entry.comingSoon && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Coming Soon
                        </Badge>
                      )}
                      {alreadyAdded && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Added
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </CreatorLayout>
  );
}

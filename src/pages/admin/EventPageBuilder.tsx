import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Eye, Save, Plus, Trash2, GripVertical, Image,
  Type, Users, Calendar, MapPin, HelpCircle, Star, Video,
  MessageSquare, FileText, Palette, Settings, Sparkles, Loader2,
  ChevronUp, ChevronDown, X, Check, Layout
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Section {
  id: string;
  type: string;
  title: string;
  enabled: boolean;
  content: Record<string, any>;
  order: number;
}

interface BrandSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontHeadline: string;
  fontBody: string;
  logoUrl: string;
  coverImageUrl: string;
}

const SECTION_TYPES = [
  { id: "hero", label: "Hero Section", icon: Image, description: "Main banner with event title and CTA" },
  { id: "about", label: "About / Description", icon: FileText, description: "Event details and overview" },
  { id: "speakers", label: "Speakers", icon: Users, description: "Featured speakers and panelists" },
  { id: "agenda", label: "Agenda / Schedule", icon: Calendar, description: "Event timeline and sessions" },
  { id: "venue", label: "Venue & Location", icon: MapPin, description: "Venue details with map" },
  { id: "sponsors", label: "Sponsors & Partners", icon: Star, description: "Sponsor logos and tiers" },
  { id: "faqs", label: "FAQs", icon: HelpCircle, description: "Frequently asked questions" },
  { id: "gallery", label: "Photo Gallery", icon: Image, description: "Event photos and media" },
  { id: "video", label: "Video Embed", icon: Video, description: "Promo video or livestream" },
  { id: "testimonials", label: "Testimonials", icon: MessageSquare, description: "Attendee reviews and quotes" },
  { id: "cta", label: "Call to Action", icon: Type, description: "Registration CTA block" },
];

const FONT_OPTIONS = [
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "Inter", label: "Inter" },
  { value: "Poppins", label: "Poppins" },
  { value: "Space Grotesk", label: "Space Grotesk" },
  { value: "DM Sans", label: "DM Sans" },
  { value: "Outfit", label: "Outfit" },
];

const EventPageBuilder = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { eventId } = useParams();

  const [sections, setSections] = useState<Section[]>([
    { id: "1", type: "hero", title: "Hero Section", enabled: true, content: { headline: "", subheadline: "", ctaText: "Register Now" }, order: 0 },
    { id: "2", type: "about", title: "About", enabled: true, content: { description: "" }, order: 1 },
    { id: "3", type: "speakers", title: "Speakers", enabled: true, content: { speakers: [] }, order: 2 },
    { id: "4", type: "agenda", title: "Agenda", enabled: true, content: { items: [] }, order: 3 },
    { id: "5", type: "venue", title: "Venue", enabled: true, content: {}, order: 4 },
    { id: "6", type: "faqs", title: "FAQs", enabled: true, content: { faqs: [] }, order: 5 },
  ]);

  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    primaryColor: "#6366f1",
    secondaryColor: "#1e1b4b",
    accentColor: "#f59e0b",
    fontHeadline: "Plus Jakarta Sans",
    fontBody: "Inter",
    logoUrl: "",
    coverImageUrl: "",
  });

  const [activeSection, setActiveSection] = useState<string | null>("1");
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  const addSection = (type: string) => {
    const sectionType = SECTION_TYPES.find(s => s.id === type);
    if (!sectionType) return;

    const newSection: Section = {
      id: Date.now().toString(),
      type,
      title: sectionType.label,
      enabled: true,
      content: {},
      order: sections.length,
    };

    setSections([...sections, newSection]);
    setActiveSection(newSection.id);
    toast.success(`Added ${sectionType.label}`);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
    if (activeSection === id) {
      setActiveSection(sections[0]?.id || null);
    }
    toast.success("Section removed");
  };

  const updateSection = (id: string, updates: Partial<Section>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const updateSectionContent = (id: string, content: Record<string, any>) => {
    setSections(sections.map(s => s.id === id ? { ...s, content: { ...s.content, ...content } } : s));
  };

  const moveSection = (id: string, direction: "up" | "down") => {
    const index = sections.findIndex(s => s.id === id);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    const newSections = [...sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    newSections.forEach((s, i) => s.order = i);
    setSections(newSections);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("Page saved successfully!");
    setIsSaving(false);
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update sections with AI-generated content
    setSections(prev => prev.map(s => {
      if (s.type === "about") {
        return { ...s, content: { ...s.content, description: "Join us for an unforgettable experience that brings together industry leaders, innovators, and passionate community members. This event features expert-led sessions, hands-on workshops, and unparalleled networking opportunities designed to inspire, educate, and connect." } };
      }
      if (s.type === "hero") {
        return { ...s, content: { ...s.content, headline: "Transform Your Future", subheadline: "Connect, Learn, and Grow with Industry Leaders" } };
      }
      return s;
    }));
    
    toast.success("AI content generated!");
    setIsGenerating(false);
  };

  const renderSectionEditor = (section: Section) => {
    switch (section.type) {
      case "hero":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Headline</Label>
              <Input
                value={section.content.headline || ""}
                onChange={(e) => updateSectionContent(section.id, { headline: e.target.value })}
                placeholder="Your Event Title"
              />
            </div>
            <div className="space-y-2">
              <Label>Subheadline</Label>
              <Input
                value={section.content.subheadline || ""}
                onChange={(e) => updateSectionContent(section.id, { subheadline: e.target.value })}
                placeholder="A compelling tagline"
              />
            </div>
            <div className="space-y-2">
              <Label>CTA Button Text</Label>
              <Input
                value={section.content.ctaText || "Register Now"}
                onChange={(e) => updateSectionContent(section.id, { ctaText: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Background Image URL</Label>
              <Input
                value={section.content.backgroundImage || ""}
                onChange={(e) => updateSectionContent(section.id, { backgroundImage: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
        );

      case "about":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Description</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAIGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                AI Generate
              </Button>
            </div>
            <Textarea
              value={section.content.description || ""}
              onChange={(e) => updateSectionContent(section.id, { description: e.target.value })}
              placeholder="Describe your event..."
              rows={6}
            />
          </div>
        );

      case "speakers":
        const speakers = section.content.speakers || [];
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Speakers ({speakers.length})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newSpeakers = [...speakers, { id: Date.now(), name: "", title: "", bio: "", image: "" }];
                  updateSectionContent(section.id, { speakers: newSpeakers });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Speaker
              </Button>
            </div>
            <div className="space-y-4">
              {speakers.map((speaker: any, index: number) => (
                <Card key={speaker.id} className="p-4 bg-secondary/30">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Speaker {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateSectionContent(section.id, { speakers: speakers.filter((s: any) => s.id !== speaker.id) });
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    <Input
                      value={speaker.name}
                      onChange={(e) => {
                        const updated = speakers.map((s: any) => s.id === speaker.id ? { ...s, name: e.target.value } : s);
                        updateSectionContent(section.id, { speakers: updated });
                      }}
                      placeholder="Name"
                    />
                    <Input
                      value={speaker.title}
                      onChange={(e) => {
                        const updated = speakers.map((s: any) => s.id === speaker.id ? { ...s, title: e.target.value } : s);
                        updateSectionContent(section.id, { speakers: updated });
                      }}
                      placeholder="Title / Company"
                    />
                    <Textarea
                      value={speaker.bio}
                      onChange={(e) => {
                        const updated = speakers.map((s: any) => s.id === speaker.id ? { ...s, bio: e.target.value } : s);
                        updateSectionContent(section.id, { speakers: updated });
                      }}
                      placeholder="Short bio"
                      rows={2}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case "agenda":
        const items = section.content.items || [];
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Schedule Items ({items.length})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newItems = [...items, { id: Date.now(), time: "", title: "", description: "" }];
                  updateSectionContent(section.id, { items: newItems });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            <div className="space-y-3">
              {items.map((item: any, index: number) => (
                <Card key={item.id} className="p-3 bg-secondary/30">
                  <div className="flex items-start gap-3">
                    <Input
                      value={item.time}
                      onChange={(e) => {
                        const updated = items.map((i: any) => i.id === item.id ? { ...i, time: e.target.value } : i);
                        updateSectionContent(section.id, { items: updated });
                      }}
                      placeholder="9:00 AM"
                      className="w-24"
                    />
                    <div className="flex-1 space-y-2">
                      <Input
                        value={item.title}
                        onChange={(e) => {
                          const updated = items.map((i: any) => i.id === item.id ? { ...i, title: e.target.value } : i);
                          updateSectionContent(section.id, { items: updated });
                        }}
                        placeholder="Session title"
                      />
                      <Input
                        value={item.description}
                        onChange={(e) => {
                          const updated = items.map((i: any) => i.id === item.id ? { ...i, description: e.target.value } : i);
                          updateSectionContent(section.id, { items: updated });
                        }}
                        placeholder="Description"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateSectionContent(section.id, { items: items.filter((i: any) => i.id !== item.id) });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case "faqs":
        const faqs = section.content.faqs || [];
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>FAQs ({faqs.length})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newFaqs = [...faqs, { id: Date.now(), question: "", answer: "" }];
                  updateSectionContent(section.id, { faqs: newFaqs });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add FAQ
              </Button>
            </div>
            <div className="space-y-3">
              {faqs.map((faq: any) => (
                <Card key={faq.id} className="p-3 bg-secondary/30">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Input
                        value={faq.question}
                        onChange={(e) => {
                          const updated = faqs.map((f: any) => f.id === faq.id ? { ...f, question: e.target.value } : f);
                          updateSectionContent(section.id, { faqs: updated });
                        }}
                        placeholder="Question"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          updateSectionContent(section.id, { faqs: faqs.filter((f: any) => f.id !== faq.id) });
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={faq.answer}
                      onChange={(e) => {
                        const updated = faqs.map((f: any) => f.id === faq.id ? { ...f, answer: e.target.value } : f);
                        updateSectionContent(section.id, { faqs: updated });
                      }}
                      placeholder="Answer"
                      rows={2}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case "venue":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Venue Name</Label>
              <Input
                value={section.content.venueName || ""}
                onChange={(e) => updateSectionContent(section.id, { venueName: e.target.value })}
                placeholder="Convention Center"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={section.content.address || ""}
                onChange={(e) => updateSectionContent(section.id, { address: e.target.value })}
                placeholder="Full address"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Parking Info</Label>
              <Input
                value={section.content.parking || ""}
                onChange={(e) => updateSectionContent(section.id, { parking: e.target.value })}
                placeholder="Parking details"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={section.content.showMap || false}
                onCheckedChange={(checked) => updateSectionContent(section.id, { showMap: checked })}
              />
              <Label>Show Map</Label>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            <p>Editor for {section.type} coming soon</p>
          </div>
        );
    }
  };

  const activeSectionData = sections.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar - Sections List */}
      <aside className="w-72 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/admin/events">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Link>
          </Button>
          <h2 className="font-headline font-bold text-foreground">Page Builder</h2>
          <p className="text-sm text-muted-foreground">Drag sections to reorder</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {sections.sort((a, b) => a.order - b.order).map((section, index) => {
              const SectionIcon = SECTION_TYPES.find(t => t.id === section.type)?.icon || Layout;
              return (
                <Card
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "p-3 cursor-pointer transition-all",
                    activeSection === section.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <SectionIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium text-foreground truncate">
                      {section.title}
                    </span>
                    <Switch
                      checked={section.enabled}
                      onCheckedChange={(checked) => updateSection(section.id, { enabled: checked })}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {activeSection === section.id && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); moveSection(section.id, "up"); }}
                        disabled={index === 0}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); moveSection(section.id, "down"); }}
                        disabled={index === sections.length - 1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Add Section */}
          <div className="mt-6">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Add Section</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {SECTION_TYPES.filter(t => !sections.find(s => s.type === t.id)).map((type) => (
                <Button
                  key={type.id}
                  variant="outline"
                  size="sm"
                  onClick={() => addSection(type.id)}
                  className="justify-start text-xs"
                >
                  <type.icon className="w-3 h-3 mr-1" />
                  {type.label.split(" ")[0]}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
          <Tabs defaultValue="content" className="w-auto">
            <TabsList>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}>
              <Eye className="w-4 h-4 mr-2" />
              {previewMode ? "Edit" : "Preview"}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {previewMode ? (
            <Card className="max-w-4xl mx-auto p-8 bg-gradient-card">
              <div className="text-center mb-8">
                <Badge className="mb-4">Preview Mode</Badge>
                <p className="text-muted-foreground">This is how your event page will look</p>
              </div>
              
              {sections.filter(s => s.enabled).sort((a, b) => a.order - b.order).map((section) => (
                <div key={section.id} className="mb-8 pb-8 border-b border-border last:border-0">
                  <h3 className="text-lg font-semibold text-foreground mb-4">{section.title}</h3>
                  <div className="text-muted-foreground text-sm">
                    {section.type === "hero" && (
                      <div className="text-center py-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg">
                        <h2 className="text-3xl font-bold text-foreground">{section.content.headline || "Event Title"}</h2>
                        <p className="text-lg mt-2">{section.content.subheadline || "Subheadline"}</p>
                        <Button className="mt-4">{section.content.ctaText || "Register Now"}</Button>
                      </div>
                    )}
                    {section.type === "about" && <p>{section.content.description || "Event description..."}</p>}
                    {section.type === "speakers" && (
                      <div className="grid grid-cols-3 gap-4">
                        {(section.content.speakers || []).map((s: any) => (
                          <Card key={s.id} className="p-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-2" />
                            <p className="font-medium text-foreground">{s.name || "Speaker Name"}</p>
                            <p className="text-xs">{s.title || "Title"}</p>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          ) : activeSectionData ? (
            <Card className="max-w-2xl mx-auto p-6 bg-gradient-card">
              <div className="flex items-center gap-2 mb-6">
                {(() => {
                  const Icon = SECTION_TYPES.find(t => t.id === activeSectionData.type)?.icon || Layout;
                  return <Icon className="w-5 h-5 text-primary" />;
                })()}
                <h3 className="font-headline font-bold text-foreground">{activeSectionData.title}</h3>
              </div>
              
              <div className="space-y-2 mb-6">
                <Label>Section Title</Label>
                <Input
                  value={activeSectionData.title}
                  onChange={(e) => updateSection(activeSectionData.id, { title: e.target.value })}
                />
              </div>

              {renderSectionEditor(activeSectionData)}
            </Card>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Layout className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a section to edit</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar - Branding */}
      <aside className="w-72 border-l border-border bg-card p-4 overflow-y-auto">
        <h3 className="font-headline font-bold text-foreground mb-4 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Branding
        </h3>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Colors</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Primary</span>
                <input
                  type="color"
                  value={brandSettings.primaryColor}
                  onChange={(e) => setBrandSettings({ ...brandSettings, primaryColor: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Secondary</span>
                <input
                  type="color"
                  value={brandSettings.secondaryColor}
                  onChange={(e) => setBrandSettings({ ...brandSettings, secondaryColor: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Accent</span>
                <input
                  type="color"
                  value={brandSettings.accentColor}
                  onChange={(e) => setBrandSettings({ ...brandSettings, accentColor: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Typography</Label>
            <div className="space-y-2">
              <Label className="text-sm">Headline Font</Label>
              <Select
                value={brandSettings.fontHeadline}
                onValueChange={(v) => setBrandSettings({ ...brandSettings, fontHeadline: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Body Font</Label>
              <Select
                value={brandSettings.fontBody}
                onValueChange={(v) => setBrandSettings({ ...brandSettings, fontBody: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Logo</Label>
            <Input
              value={brandSettings.logoUrl}
              onChange={(e) => setBrandSettings({ ...brandSettings, logoUrl: e.target.value })}
              placeholder="Logo URL"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Cover Image</Label>
            <Input
              value={brandSettings.coverImageUrl}
              onChange={(e) => setBrandSettings({ ...brandSettings, coverImageUrl: e.target.value })}
              placeholder="Cover image URL"
            />
          </div>

          <Button variant="outline" className="w-full" onClick={handleAIGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            AI Brand Kit Generator
          </Button>
        </div>
      </aside>
    </div>
  );
};

export default EventPageBuilder;

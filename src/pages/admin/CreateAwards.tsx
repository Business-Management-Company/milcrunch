import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, ArrowRight, Award, Trophy, Users, FileText, 
  Sparkles, Check, Loader2, Plus, Trash2, Star, Calendar,
  Settings, Eye, Save, Globe, Gavel, Vote, Crown, Medal
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  description: string;
  maxNominations: number;
  allowPublicVoting: boolean;
}

interface JudgingCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
}

const WIZARD_STEPS = [
  { id: "basics", label: "Program Basics", icon: Award },
  { id: "categories", label: "Categories", icon: Trophy },
  { id: "judging", label: "Judging", icon: Gavel },
  { id: "timeline", label: "Timeline", icon: Calendar },
  { id: "review", label: "Review", icon: Eye },
];

const CreateAwards = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  
  // Form state
  const [programDetails, setProgramDetails] = useState({
    title: "",
    description: "",
    year: new Date().getFullYear().toString(),
    theme: "",
  });
  
  const [categories, setCategories] = useState<Category[]>([
    { id: "1", name: "", description: "", maxNominations: 10, allowPublicVoting: true }
  ]);
  
  const [judgingSettings, setJudgingSettings] = useState({
    blindJudging: true,
    minJudgesPerCategory: 3,
    scoringScale: "1-10",
  });
  
  const [judgingCriteria, setJudgingCriteria] = useState<JudgingCriterion[]>([
    { id: "1", name: "Quality", description: "Overall quality and excellence", weight: 30 },
    { id: "2", name: "Impact", description: "Positive impact on the community", weight: 30 },
    { id: "3", name: "Innovation", description: "Creativity and originality", weight: 20 },
    { id: "4", name: "Engagement", description: "Audience engagement and reach", weight: 20 },
  ]);
  
  const [timeline, setTimeline] = useState({
    nominationStart: "",
    nominationEnd: "",
    judgingStart: "",
    judgingEnd: "",
    publicVotingStart: "",
    publicVotingEnd: "",
    ceremonyDate: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  const handleAIGenerateCategories = async () => {
    if (!programDetails.title) return;
    
    setIsAIGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setCategories([
      { id: "1", name: "Best New Podcast", description: "Recognizing podcasts launched in the past year that show exceptional promise and quality", maxNominations: 10, allowPublicVoting: true },
      { id: "2", name: "Best Storytelling", description: "Excellence in narrative and compelling story delivery", maxNominations: 10, allowPublicVoting: true },
      { id: "3", name: "Best Interview Show", description: "Outstanding interview skills and guest selection", maxNominations: 10, allowPublicVoting: true },
      { id: "4", name: "Best Production Quality", description: "Superior audio engineering, music, and sound design", maxNominations: 10, allowPublicVoting: false },
      { id: "5", name: "Community Impact Award", description: "Significant positive influence on the military/veteran community", maxNominations: 10, allowPublicVoting: true },
    ]);
    
    setIsAIGenerating(false);
  };

  const addCategory = () => {
    const newCategory: Category = {
      id: Date.now().toString(),
      name: "",
      description: "",
      maxNominations: 10,
      allowPublicVoting: true
    };
    setCategories([...categories, newCategory]);
  };

  const updateCategory = (id: string, field: keyof Category, value: any) => {
    setCategories(categories.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCategory = (id: string) => {
    if (categories.length > 1) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const addCriterion = () => {
    const newCriterion: JudgingCriterion = {
      id: Date.now().toString(),
      name: "",
      description: "",
      weight: 10
    };
    setJudgingCriteria([...judgingCriteria, newCriterion]);
  };

  const updateCriterion = (id: string, field: keyof JudgingCriterion, value: any) => {
    setJudgingCriteria(judgingCriteria.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCriterion = (id: string) => {
    if (judgingCriteria.length > 1) {
      setJudgingCriteria(judgingCriteria.filter(c => c.id !== id));
    }
  };

  const totalWeight = judgingCriteria.reduce((sum, c) => sum + c.weight, 0);

  const canProceed = () => {
    switch (currentStep) {
      case 0: return !!programDetails.title;
      case 1: return categories.length > 0 && categories.every(c => c.name);
      case 2: return judgingCriteria.length > 0 && totalWeight === 100;
      case 3: return !!timeline.nominationStart && !!timeline.nominationEnd;
      default: return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent/20 to-accent/10 text-accent text-sm font-semibold mb-4 animate-pulse-glow">
                <Sparkles className="w-4 h-4" />
                AI-Powered Awards Designer
              </div>
              <h2 className="text-4xl font-headline font-extrabold text-foreground mb-3">
                Create Your Awards Program
              </h2>
              <p className="text-lg text-muted-foreground">
                Let AI help you design a world-class awards experience
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground font-medium">Program Name *</Label>
                <Input
                  id="title"
                  value={programDetails.title}
                  onChange={(e) => setProgramDetails({ ...programDetails, title: e.target.value })}
                  placeholder="e.g., Veteran Podcast Awards 2024"
                  className="text-lg h-12"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Year</Label>
                  <Select
                    value={programDetails.year}
                    onValueChange={(value) => setProgramDetails({ ...programDetails, year: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Theme (optional)</Label>
                  <Input
                    value={programDetails.theme}
                    onChange={(e) => setProgramDetails({ ...programDetails, theme: e.target.value })}
                    placeholder="e.g., Honoring Excellence"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={programDetails.description}
                  onChange={(e) => setProgramDetails({ ...programDetails, description: e.target.value })}
                  placeholder="Describe your awards program..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h2 className="text-4xl font-headline font-extrabold text-foreground mb-3">
                Award Categories
              </h2>
              <p className="text-lg text-muted-foreground">
                Define the categories nominees can compete in
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleAIGenerateCategories}
                disabled={!programDetails.title || isAIGenerating}
                className="gap-2"
              >
                {isAIGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isAIGenerating ? "Generating Categories..." : "AI Suggest Categories"}
              </Button>
            </div>

            <div className="space-y-4">
              {categories.map((category, index) => (
                <Card key={category.id} className={cn(
                  "p-6 border-border transition-all",
                  isAIGenerating && "animate-pulse"
                )}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-accent" />
                      </div>
                      <span className="font-display font-bold text-foreground">Category {index + 1}</span>
                    </div>
                    {categories.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCategory(category.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Category Name *</Label>
                      <Input
                        value={category.name}
                        onChange={(e) => updateCategory(category.id, "name", e.target.value)}
                        placeholder="e.g., Best New Podcast"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Max Nominations</Label>
                      <Input
                        type="number"
                        value={category.maxNominations}
                        onChange={(e) => updateCategory(category.id, "maxNominations", parseInt(e.target.value) || 10)}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <Label className="text-foreground">Description</Label>
                    <Textarea
                      value={category.description}
                      onChange={(e) => updateCategory(category.id, "description", e.target.value)}
                      placeholder="Describe this category..."
                      rows={2}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <Label className="text-foreground font-medium">Public Voting</Label>
                      <p className="text-sm text-muted-foreground">Allow audience to vote in this category</p>
                    </div>
                    <Switch
                      checked={category.allowPublicVoting}
                      onCheckedChange={(checked) => updateCategory(category.id, "allowPublicVoting", checked)}
                    />
                  </div>
                </Card>
              ))}
            </div>

            <Button variant="outline" onClick={addCategory} className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Another Category
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h2 className="text-4xl font-headline font-extrabold text-foreground mb-3">
                Judging Configuration
              </h2>
              <p className="text-lg text-muted-foreground">
                Set up how nominations will be evaluated
              </p>
            </div>

            <Card className="p-6 bg-secondary/50 border-border">
              <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-accent" />
                Judging Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground font-medium">Blind Judging</Label>
                    <p className="text-sm text-muted-foreground">Hide nominee identities from judges</p>
                  </div>
                  <Switch
                    checked={judgingSettings.blindJudging}
                    onCheckedChange={(checked) => setJudgingSettings({ ...judgingSettings, blindJudging: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground font-medium">Minimum Judges per Category</Label>
                    <p className="text-sm text-muted-foreground">Required judges before results are finalized</p>
                  </div>
                  <Input
                    type="number"
                    value={judgingSettings.minJudgesPerCategory}
                    onChange={(e) => setJudgingSettings({ ...judgingSettings, minJudgesPerCategory: parseInt(e.target.value) || 3 })}
                    className="w-20"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground font-medium">Scoring Scale</Label>
                    <p className="text-sm text-muted-foreground">Point range for each criterion</p>
                  </div>
                  <Select
                    value={judgingSettings.scoringScale}
                    onValueChange={(value) => setJudgingSettings({ ...judgingSettings, scoringScale: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-5">1-5 Points</SelectItem>
                      <SelectItem value="1-10">1-10 Points</SelectItem>
                      <SelectItem value="1-100">1-100 Points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                  <Star className="w-5 h-5 text-accent" />
                  Scoring Rubric
                </h3>
                <Badge variant={totalWeight === 100 ? "default" : "destructive"}>
                  Total Weight: {totalWeight}%
                </Badge>
              </div>

              {judgingCriteria.map((criterion, index) => (
                <Card key={criterion.id} className="p-4 border-border">
                  <div className="grid md:grid-cols-[1fr,2fr,100px,40px] gap-4 items-center">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Criterion</Label>
                      <Input
                        value={criterion.name}
                        onChange={(e) => updateCriterion(criterion.id, "name", e.target.value)}
                        placeholder="e.g., Quality"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Input
                        value={criterion.description}
                        onChange={(e) => updateCriterion(criterion.id, "description", e.target.value)}
                        placeholder="Describe this criterion..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Weight %</Label>
                      <Input
                        type="number"
                        value={criterion.weight}
                        onChange={(e) => updateCriterion(criterion.id, "weight", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCriterion(criterion.id)}
                      className="text-muted-foreground hover:text-destructive self-end"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <Button variant="outline" onClick={addCriterion} className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Scoring Criterion
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8 max-w-3xl mx-auto">
            <div className="text-center">
              <h2 className="text-4xl font-headline font-extrabold text-foreground mb-3">
                Awards Timeline
              </h2>
              <p className="text-lg text-muted-foreground">
                Set key dates for your awards program
              </p>
            </div>

            <div className="space-y-6">
              <Card className="p-6 border-border hover:shadow-lg transition-shadow">
                <h3 className="font-headline font-bold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Nominations
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Start Date *</Label>
                    <Input
                      type="date"
                      value={timeline.nominationStart}
                      onChange={(e) => setTimeline({ ...timeline, nominationStart: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">End Date *</Label>
                    <Input
                      type="date"
                      value={timeline.nominationEnd}
                      onChange={(e) => setTimeline({ ...timeline, nominationEnd: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-border">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-accent" />
                  Judging Period
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Start Date</Label>
                    <Input
                      type="date"
                      value={timeline.judgingStart}
                      onChange={(e) => setTimeline({ ...timeline, judgingStart: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">End Date</Label>
                    <Input
                      type="date"
                      value={timeline.judgingEnd}
                      onChange={(e) => setTimeline({ ...timeline, judgingEnd: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-border">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <Vote className="w-5 h-5 text-primary" />
                  Public Voting (Optional)
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Start Date</Label>
                    <Input
                      type="date"
                      value={timeline.publicVotingStart}
                      onChange={(e) => setTimeline({ ...timeline, publicVotingStart: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">End Date</Label>
                    <Input
                      type="date"
                      value={timeline.publicVotingEnd}
                      onChange={(e) => setTimeline({ ...timeline, publicVotingEnd: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-primary/30 bg-primary/5">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  Ceremony / Announcement
                </h3>
                <div className="space-y-2">
                  <Label className="text-foreground">Date</Label>
                  <Input
                    type="date"
                    value={timeline.ceremonyDate}
                    onChange={(e) => setTimeline({ ...timeline, ceremonyDate: e.target.value })}
                  />
                </div>
              </Card>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h2 className="text-4xl font-headline font-extrabold text-foreground mb-3">
                Review Your Awards Program
              </h2>
              <p className="text-lg text-muted-foreground">
                Everything looks great! Review and launch your program.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border-border hover:shadow-lg transition-shadow">
                <h3 className="font-headline font-bold text-foreground mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-accent" />
                  Program Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium text-foreground">{programDetails.title || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Year</span>
                    <Badge variant="secondary">{programDetails.year}</Badge>
                  </div>
                  {programDetails.theme && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Theme</span>
                      <span className="font-medium text-foreground">{programDetails.theme}</span>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6 border-border">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent" />
                  Categories
                </h3>
                <div className="space-y-2">
                  {categories.filter(c => c.name).map((category) => (
                    <div key={category.id} className="flex items-center gap-2 text-sm">
                      <Medal className="w-4 h-4 text-accent" />
                      <span className="text-foreground">{category.name}</span>
                      {category.allowPublicVoting && (
                        <Badge variant="outline" className="text-xs">Public Vote</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 border-border">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-accent" />
                  Judging
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Blind Judging</span>
                    <Badge variant={judgingSettings.blindJudging ? "default" : "secondary"}>
                      {judgingSettings.blindJudging ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min Judges</span>
                    <span className="font-medium text-foreground">{judgingSettings.minJudgesPerCategory} per category</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Criteria</span>
                    <span className="font-medium text-foreground">{judgingCriteria.length} scoring criteria</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-border">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent" />
                  Timeline
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nominations</span>
                    <span className="font-medium text-foreground">
                      {timeline.nominationStart || "—"} to {timeline.nominationEnd || "—"}
                    </span>
                  </div>
                  {timeline.judgingStart && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Judging</span>
                      <span className="font-medium text-foreground">
                        {timeline.judgingStart} to {timeline.judgingEnd || "—"}
                      </span>
                    </div>
                  )}
                  {timeline.ceremonyDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ceremony</span>
                      <span className="font-medium text-foreground">{timeline.ceremonyDate}</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <Card className="p-6 border-accent/30 bg-accent/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-foreground">Ready to launch?</h3>
                  <p className="text-sm text-muted-foreground">Your awards program will begin accepting nominations</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="gap-2">
                    <Save className="w-4 h-4" />
                    Save as Draft
                  </Button>
                  <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Globe className="w-4 h-4" />
                    Launch Program
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="hover:bg-accent/10">
                <Link to="/admin/awards">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-headline font-extrabold text-foreground">Create Awards Program</h1>
                <p className="text-sm text-muted-foreground">
                  Step {currentStep + 1} of {WIZARD_STEPS.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Progress value={progress} className="w-48 h-2" />
              <span className="text-sm font-medium text-accent">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center py-4 overflow-x-auto">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => index <= currentStep && setCurrentStep(index)}
                  disabled={index > currentStep}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                    index === currentStep 
                      ? "bg-accent text-accent-foreground" 
                      : index < currentStep
                      ? "text-accent hover:bg-accent/10 cursor-pointer"
                      : "text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <step.icon className="w-4 h-4" />
                  <span className="text-sm font-medium hidden md:inline">{step.label}</span>
                </button>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={cn(
                    "w-8 h-px mx-2",
                    index < currentStep ? "bg-accent" : "bg-border"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 pb-32">
        {renderStepContent()}
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-card py-4">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button
              onClick={() => setCurrentStep(Math.min(WIZARD_STEPS.length - 1, currentStep + 1))}
              disabled={!canProceed()}
              className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
              <Globe className="w-4 h-4" />
              Launch Program
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default CreateAwards;

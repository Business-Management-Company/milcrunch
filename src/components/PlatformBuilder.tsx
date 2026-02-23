import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, Award, Users, FileText, Bot, 
  Ticket, QrCode, Vote, Gavel, Sparkles,
  ArrowRight, GripVertical, Plus
} from "lucide-react";

interface Module {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ElementType;
  category: "events" | "awards" | "sponsors" | "ai";
  color: string;
}

const availableModules: Module[] = [
  { id: "ticketing", title: "Ticketing & Registration", shortTitle: "Ticketing", description: "Sell tickets and manage registrations", icon: Ticket, category: "events", color: "bg-primary text-primary-foreground" },
  { id: "checkin", title: "QR Check-in", shortTitle: "Check-in", description: "Scan badges and track attendance", icon: QrCode, category: "events", color: "bg-primary text-primary-foreground" },
  { id: "calendar", title: "Event Calendar", shortTitle: "Calendar", description: "Public calendar and iCal exports", icon: Calendar, category: "events", color: "bg-primary text-primary-foreground" },
  { id: "nominations", title: "Nominations Portal", shortTitle: "Nominations", description: "Collect and manage nominations", icon: Award, category: "awards", color: "bg-accent text-accent-foreground" },
  { id: "judging", title: "Judge Scoring", shortTitle: "Judging", description: "Rubric-based scoring system", icon: Gavel, category: "awards", color: "bg-accent text-accent-foreground" },
  { id: "voting", title: "Public Voting", shortTitle: "Voting", description: "Fan voting campaigns", icon: Vote, category: "awards", color: "bg-accent text-accent-foreground" },
  { id: "sponsors", title: "Sponsor CRM", shortTitle: "Sponsors", description: "Track sponsor relationships", icon: Users, category: "sponsors", color: "bg-blue-600 text-white" },
  { id: "proposals", title: "Proposal Builder", shortTitle: "Proposals", description: "Generate branded proposals", icon: FileText, category: "sponsors", color: "bg-blue-600 text-white" },
  { id: "ai-architect", title: "AI Event Architect", shortTitle: "AI Events", description: "Auto-generate event schedules", icon: Bot, category: "ai", color: "bg-cosmic-purple text-white" },
];

const PlatformBuilder = () => {
  const [workspace, setWorkspace] = useState<string[]>(["ticketing", "nominations", "sponsors"]);
  const [draggedModule, setDraggedModule] = useState<string | null>(null);

  const handleDragStart = (moduleId: string) => {
    setDraggedModule(moduleId);
  };

  const handleDragEnd = () => {
    setDraggedModule(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedModule && !workspace.includes(draggedModule)) {
      setWorkspace([...workspace, draggedModule]);
    }
    setDraggedModule(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemoveFromWorkspace = (moduleId: string) => {
    setWorkspace(workspace.filter(id => id !== moduleId));
  };

  const handleAddToWorkspace = (moduleId: string) => {
    if (!workspace.includes(moduleId)) {
      setWorkspace([...workspace, moduleId]);
    }
  };

  const handleReorder = (dragIndex: number, hoverIndex: number) => {
    const newWorkspace = [...workspace];
    const draggedItem = newWorkspace[dragIndex];
    newWorkspace.splice(dragIndex, 1);
    newWorkspace.splice(hoverIndex, 0, draggedItem);
    setWorkspace(newWorkspace);
  };

  const workspaceModules = workspace.map(id => availableModules.find(m => m.id === id)!).filter(Boolean);
  const storeModules = availableModules.filter(m => !workspace.includes(m.id));

  return (
    <section className="py-24 px-6 bg-background">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-start max-w-6xl mx-auto">
          {/* Left side - Text content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <span className="text-sm font-semibold text-primary uppercase tracking-wider">
                More Than Just Event Software
              </span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight">
                Build your
                <br />
                <span className="text-primary">event platform.</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-lg">
                Turn tools on as you need them. Pay only for what you use with credits. No lockouts—your work stays yours.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-14 px-8">
                Start Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8">
                Schedule a Demo
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Start free with 100 credits • No credit card required
            </p>

            {/* Audience tags */}
            <div className="flex flex-wrap gap-2 pt-4">
              {["Event Planners", "Podcasters", "Agencies", "Brands"].map((tag) => (
                <span 
                  key={tag}
                  className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium border border-border"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Benefits list */}
            <ul className="space-y-3 pt-4">
              {[
                "Build events fast with modular tools",
                "Grow your audience with email + SMS",
                "Monetize with tickets, sponsors, and offers"
              ].map((benefit, i) => (
                <li key={i} className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Right side - Interactive builder */}
          <div className="space-y-6">
            <Card className="p-6 bg-card border-border shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-headline font-bold text-foreground">Event Workspace</h3>
                  <p className="text-sm text-muted-foreground">{workspace.length} modules active</p>
                </div>
                <Button size="sm" variant="ghost" className="text-primary">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Module Store */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Module Store
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">Pick what you need</p>
                  <div className="grid grid-cols-3 gap-2">
                    {availableModules.slice(0, 9).map((module) => {
                      const isInWorkspace = workspace.includes(module.id);
                      return (
                        <button
                          key={module.id}
                          onClick={() => isInWorkspace ? handleRemoveFromWorkspace(module.id) : handleAddToWorkspace(module.id)}
                          draggable={!isInWorkspace}
                          onDragStart={() => handleDragStart(module.id)}
                          onDragEnd={handleDragEnd}
                          className={`relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-1 ${
                            isInWorkspace 
                              ? "border-primary bg-primary/5 cursor-pointer" 
                              : "border-border bg-card hover:border-primary/50 hover:bg-secondary/50 cursor-grab active:cursor-grabbing"
                          }`}
                        >
                          {isInWorkspace && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          <div className={`w-8 h-8 rounded-lg ${module.color} flex items-center justify-center`}>
                            <module.icon className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-medium text-foreground text-center leading-tight">
                            {module.shortTitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* My Workspace */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      My Workspace
                    </p>
                    <span className="text-xs text-muted-foreground">↕ Drag to reorder</span>
                  </div>
                  <div 
                    className="space-y-2 min-h-[200px] p-2 rounded-xl border-2 border-dashed border-border bg-secondary/20"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    {workspaceModules.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        Drag modules here
                      </p>
                    ) : (
                      workspaceModules.map((module, index) => (
                        <div
                          key={module.id}
                          className="flex items-center gap-2 p-2 bg-card rounded-lg border border-border hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing group"
                          draggable
                          onDragStart={() => handleDragStart(module.id)}
                          onDragEnd={handleDragEnd}
                        >
                          <GripVertical className="w-3 h-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
                          <div className={`w-6 h-6 rounded-md ${module.color} flex items-center justify-center flex-shrink-0`}>
                            <module.icon className="w-3 h-3" />
                          </div>
                          <span className="text-xs font-medium text-foreground flex-1">{module.shortTitle}</span>
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {workspace.length} active • {availableModules.length - workspace.length} available
                  </p>
                  <p className="text-xs text-primary font-medium mt-1">
                    Start with {Math.min(3, availableModules.length - workspace.length)} free
                  </p>
                </div>
              </div>

              {/* Pagination dots */}
              <div className="flex justify-center gap-2 mb-6">
                <div className="w-6 h-1.5 rounded-full bg-primary" />
                <div className="w-1.5 h-1.5 rounded-full bg-border" />
                <div className="w-1.5 h-1.5 rounded-full bg-border" />
                <div className="w-1.5 h-1.5 rounded-full bg-border" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlatformBuilder;

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Calendar, Award, Users, FileText, Bot, 
  Ticket, QrCode, Vote, Gavel, Sparkles,
  ArrowRight, Check
} from "lucide-react";

interface Module {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  category: "events" | "awards" | "sponsors" | "ai";
  enabled: boolean;
}

const PlatformBuilder = () => {
  const [modules, setModules] = useState<Module[]>([
    { id: "ticketing", title: "Ticketing & Registration", description: "Sell tickets and manage registrations", icon: Ticket, category: "events", enabled: true },
    { id: "checkin", title: "QR Check-in", description: "Scan badges and track attendance", icon: QrCode, category: "events", enabled: true },
    { id: "calendar", title: "Event Calendar", description: "Public calendar and iCal exports", icon: Calendar, category: "events", enabled: false },
    { id: "nominations", title: "Nominations Portal", description: "Collect and manage nominations", icon: Award, category: "awards", enabled: true },
    { id: "judging", title: "Judge Scoring", description: "Rubric-based scoring system", icon: Gavel, category: "awards", enabled: true },
    { id: "voting", title: "Public Voting", description: "Fan voting campaigns", icon: Vote, category: "awards", enabled: false },
    { id: "sponsors", title: "Sponsor CRM", description: "Track sponsor relationships", icon: Users, category: "sponsors", enabled: true },
    { id: "proposals", title: "Proposal Builder", description: "Generate branded proposals", icon: FileText, category: "sponsors", enabled: true },
    { id: "ai-architect", title: "AI Event Architect", description: "Auto-generate event schedules", icon: Bot, category: "ai", enabled: false },
    { id: "ai-awards", title: "AI Awards Designer", description: "Generate categories & rubrics", icon: Sparkles, category: "ai", enabled: false },
  ]);

  const toggleModule = (id: string) => {
    setModules(prev => prev.map(m => 
      m.id === id ? { ...m, enabled: !m.enabled } : m
    ));
  };

  const enabledModules = modules.filter(m => m.enabled);
  const categoryColors = {
    events: "border-primary bg-primary/5",
    awards: "border-accent bg-accent/5",
    sponsors: "border-emerald-500 bg-emerald-50",
    ai: "border-purple-500 bg-purple-50",
  };

  return (
    <section className="py-24 px-6 bg-secondary/30">
      <div className="container mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground">
            Build Your Own Platform
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the modules you need. Toggle them on or off to create your perfect workspace.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Module Selection */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {modules.map((module) => (
                <Card 
                  key={module.id}
                  className={`p-4 cursor-pointer transition-all duration-300 border-2 ${
                    module.enabled 
                      ? categoryColors[module.category]
                      : "border-border bg-card hover:border-muted-foreground/30"
                  }`}
                  onClick={() => toggleModule(module.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        module.enabled 
                          ? module.category === "events" ? "bg-primary/10 text-primary" 
                            : module.category === "awards" ? "bg-accent/10 text-accent"
                            : module.category === "sponsors" ? "bg-emerald-100 text-emerald-600"
                            : "bg-purple-100 text-purple-600"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        <module.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className={`font-semibold ${module.enabled ? "text-foreground" : "text-muted-foreground"}`}>
                          {module.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                      </div>
                    </div>
                    <Switch 
                      checked={module.enabled}
                      onCheckedChange={() => toggleModule(module.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-card border-2 border-border sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm text-muted-foreground">Preview</span>
                <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                  {enabledModules.length} modules
                </span>
              </div>

              <div className="text-center mb-6">
                <h3 className="text-xl font-display font-bold text-foreground">My Custom Platform</h3>
                <p className="text-sm text-muted-foreground">Your personalized Events & Awards OS</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {enabledModules.slice(0, 6).map((module) => (
                  <div 
                    key={module.id}
                    className="p-3 bg-secondary/50 rounded-lg text-center"
                  >
                    <module.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <span className="text-xs font-medium text-foreground">{module.title.split(' ')[0]}</span>
                  </div>
                ))}
              </div>

              {enabledModules.length > 6 && (
                <p className="text-sm text-muted-foreground text-center mb-6">
                  +{enabledModules.length - 6} more modules
                </p>
              )}

              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary">
                <Sparkles className="w-4 h-4 mr-2" />
                Create My Workspace
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlatformBuilder;

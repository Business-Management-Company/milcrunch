import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Award, Users, FileText, Vote, 
  Scale, Bot, ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

const PlatformAwards = () => {
  const features = [
    { icon: FileText, title: "Category & Rules Builder", description: "Create unlimited categories with custom rules and weights" },
    { icon: Users, title: "Nomination Forms", description: "Public or curated nominations with custom questions" },
    { icon: Scale, title: "Judge Portal", description: "Scoring, comments, and weighted/blind judging options" },
    { icon: Vote, title: "Public Voting", description: "Optional public voting with fraud prevention" },
    { icon: Bot, title: "AI-Generated Content", description: "Category descriptions, winner citations, and ceremony scripts" },
    { icon: Award, title: "Winner Announcements", description: "Beautiful winner reveals and ceremony integrations" },
  ];

  return (
    <MarketingLayout>
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
              <Award className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Platform</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground">
              Awards & Nominations
            </h1>
            <p className="text-xl text-muted-foreground">
              Run awards that feel premium—without spreadsheets, manual emails, or jury chaos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {features.map((feature, index) => (
              <Card key={index} className="bg-gradient-card border-border p-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-display font-bold text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>

          <Card className="bg-accent/10 border-accent/20 p-8 mb-16 text-center">
            <Award className="w-12 h-12 text-accent mx-auto mb-4" />
            <h3 className="text-2xl font-display font-bold text-foreground mb-2">
              Veteran Podcast Awards is powered by this engine.
            </h3>
            <p className="text-muted-foreground mb-4">
              See our flagship awards program in action.
            </p>
            <Button variant="outline" asChild className="border-accent text-accent hover:bg-accent/10">
              <Link to="/veteran-podcast-awards">View Case Study</Link>
            </Button>
          </Card>

          <div className="text-center">
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link to="/signup">
                Create Your Awards Program
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default PlatformAwards;

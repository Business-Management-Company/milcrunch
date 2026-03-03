import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, Calendar, Award, DollarSign, MessageSquare, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const PlatformAIAgents = () => {
  const agents = [
    {
      icon: Calendar,
      title: "Event Architect",
      description: "Describe your event in plain language, and the AI drafts the complete schedule, registration flow, pricing tiers, and capacity planning.",
      inputs: "Event description, audience size, budget",
      outputs: "Schedule, ticket tiers, registration questions"
    },
    {
      icon: Award,
      title: "Awards Designer",
      description: "Provide your theme or focus area, and the AI generates categories, nomination questions, judging rubric, and scoring weights.",
      inputs: "Theme, industry focus, previous categories",
      outputs: "Categories, nomination forms, rubric"
    },
    {
      icon: DollarSign,
      title: "Sponsor Closer",
      description: "Select sponsor types and budget ranges, and the AI drafts customized proposals with follow-up email sequences.",
      inputs: "Sponsor type, event details, package tier",
      outputs: "Proposal draft, email sequences, pricing"
    },
    {
      icon: MessageSquare,
      title: "Attendee Concierge",
      description: "Attendees can ask natural language questions like 'When is my next session?' and get instant, personalized responses.",
      inputs: "Attendee registration, schedule data",
      outputs: "Personal agenda, reminders, answers"
    },
    {
      icon: Bot,
      title: "Content Generator",
      description: "Generate marketing copy, social posts, email campaigns, and press releases for your events and awards.",
      inputs: "Event details, tone, audience",
      outputs: "Marketing copy, social posts, emails"
    },
    {
      icon: Bot,
      title: "Analytics Advisor",
      description: "Get AI-powered insights on registration trends, sponsor ROI, and audience engagement patterns.",
      inputs: "Event data, historical trends",
      outputs: "Insights, recommendations, forecasts"
    }
  ];

  return (
    <MarketingLayout>
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground">
              AI Event Agents
            </h1>
            <p className="text-xl text-muted-foreground">
              Intelligent assistants that automate the tedious work so you can focus on creating great experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {agents.map((agent, index) => (
              <Card key={index} className="bg-gradient-card border-border p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <agent.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-foreground">{agent.title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">{agent.description}</p>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">Inputs</p>
                    <p className="text-sm text-foreground">{agent.inputs}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-1">Outputs</p>
                    <p className="text-sm text-foreground">{agent.outputs}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link to="/signup">
                Try AI Agents
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default PlatformAIAgents;

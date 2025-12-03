import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Clock, Bot, BarChart3, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const SolutionsEventTeams = () => {
  const benefits = [
    "AI-powered event planning and setup",
    "Automated registration and check-in workflows",
    "Real-time collaboration for distributed teams",
    "Template library for quick event creation",
    "Integrated sponsor and attendee management",
    "Post-event analytics and reporting"
  ];

  const useCases = [
    {
      icon: Clock,
      title: "Save 60% Time",
      description: "AI agents handle scheduling, proposals, and communications automatically."
    },
    {
      icon: Bot,
      title: "AI-First Workflows",
      description: "From event setup to attendee support, AI does the heavy lifting."
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Multiple planners can work on events with role-based permissions."
    },
    {
      icon: BarChart3,
      title: "Data-Driven Decisions",
      description: "Real-time dashboards help you optimize events on the fly."
    }
  ];

  return (
    <MarketingLayout>
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Solutions</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground">
              For Event Teams
            </h1>
            <p className="text-xl text-muted-foreground">
              Plan, execute, and analyze events faster than ever with AI-powered tools.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-bold text-foreground">Work Smarter, Not Harder</h2>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {useCases.map((useCase, index) => (
                <Card key={index} className="bg-gradient-card border-border p-6 space-y-3">
                  <useCase.icon className="w-8 h-8 text-primary" />
                  <h3 className="font-display font-bold text-foreground">{useCase.title}</h3>
                  <p className="text-sm text-muted-foreground">{useCase.description}</p>
                </Card>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link to="/auth?mode=signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default SolutionsEventTeams;

import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Play, FileText, MessageSquare, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Resources = () => {
  const faqs = [
    {
      question: "How does pricing work?",
      answer: "We offer three licensing models: Per-Event Pilot for testing, Brand License for single brand operations, and Network License for multi-brand media companies. Contact our sales team for custom pricing based on your needs."
    },
    {
      question: "Can I white-label the platform for my brand?",
      answer: "Yes! All Brand and Network licenses include full white-labeling capabilities. Your events and awards will appear under your brand with your colors, logos, and domain."
    },
    {
      question: "How do the AI Event Agents work?",
      answer: "Our AI agents are trained on thousands of successful events. Simply describe what you want (e.g., 'Create a 2-day virtual conference for 500 attendees') and the AI drafts schedules, registration forms, and pricing tiers for your review."
    },
    {
      question: "What integrations are available?",
      answer: "We integrate with popular tools including Stripe for payments, major email providers, calendar systems (Google Calendar, Outlook), and can connect to your CRM via our API."
    },
    {
      question: "How secure is the platform?",
      answer: "We use enterprise-grade security including SOC 2 compliance, encrypted data storage, and role-based access controls. Your attendee and sponsor data is protected."
    },
    {
      question: "Can I migrate from Eventbrite?",
      answer: "Absolutely. We can import your existing events, attendee lists, and historical data. Our team will help you transition smoothly with no data loss."
    },
    {
      question: "Is there a mobile app?",
      answer: "Our platform is web-first and fully mobile-optimized. Attendees can access everything from their mobile browser. Native apps are on our roadmap."
    },
    {
      question: "How do public voting and judging work?",
      answer: "For awards programs, you can enable public voting with IP-based fraud prevention, or use our judge portal for weighted scoring with blind judging options. Both can run simultaneously."
    }
  ];

  return (
    <MarketingLayout>
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-6">
            <h1 className="text-4xl md:text-6xl font-headline font-bold text-foreground">
              Resources
            </h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to get started with Events & Awards OS
            </p>
          </div>

          {/* Demo Video Section */}
          <Card className="bg-gradient-card border-border p-8 mb-16 max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/2 aspect-video bg-secondary rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8 text-primary ml-1" />
                  </div>
                  <p className="text-muted-foreground text-sm">Product Demo</p>
                  <p className="text-xs text-muted-foreground/60">Coming Soon</p>
                </div>
              </div>
              <div className="w-full md:w-1/2 space-y-4">
                <h2 className="text-2xl font-headline font-bold text-foreground">Watch the Product Tour</h2>
                <p className="text-muted-foreground">
                  See how Events & Awards OS can transform your event operations in this 5-minute walkthrough.
                </p>
                <Button disabled className="opacity-50">
                  Watch Demo
                  <Play className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-3xl mx-auto">
            <Card className="bg-gradient-card border-border p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <FileText className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-headline font-bold text-foreground mb-1">Documentation</h3>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </Card>
            <Card className="bg-gradient-card border-border p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Play className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-headline font-bold text-foreground mb-1">Video Tutorials</h3>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </Card>
            <Card className="bg-gradient-card border-border p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <MessageSquare className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-headline font-bold text-foreground mb-1">Support</h3>
              <p className="text-sm text-muted-foreground">Contact us</p>
            </Card>
          </div>

          {/* FAQs */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-headline font-bold text-foreground mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="bg-card border border-border rounded-lg px-6"
                >
                  <AccordionTrigger className="text-left font-headline font-semibold text-foreground hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <p className="text-muted-foreground mb-4">
              Still have questions?
            </p>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <a href="mailto:support@eventsawardstravel.com">
                Contact Support
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default Resources;

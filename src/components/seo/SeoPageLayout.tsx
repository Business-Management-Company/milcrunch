import MarketingLayout from "@/components/layout/MarketingLayout";
import SeoHead from "./SeoHead";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

interface SeoPageLayoutProps {
  title: string;
  metaTitle: string;
  metaDescription: string;
  canonical: string;
  faqs: FaqItem[];
  children: React.ReactNode;
}

export default function SeoPageLayout({
  title,
  metaTitle,
  metaDescription,
  canonical,
  faqs,
  children,
}: SeoPageLayoutProps) {
  return (
    <MarketingLayout>
      <SeoHead
        title={metaTitle}
        description={metaDescription}
        canonical={canonical}
        faqs={faqs}
      />

      {/* Hero */}
      <section className="py-20 px-6 bg-gradient-to-b from-[#000741] to-[#0a1628]">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-white mb-6">
            {title}
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            {metaDescription}
          </p>
        </div>
      </section>

      {/* Main content */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl prose prose-lg prose-gray dark:prose-invert">
          {children}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-headline font-bold mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-background rounded-lg p-6 border">
                <h3 className="text-lg font-semibold mb-2">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-[#000741] text-white">
        <div className="container mx-auto max-w-3xl text-center space-y-6">
          <h2 className="text-3xl font-headline font-bold">Ready to Get Started?</h2>
          <p className="text-gray-300">
            Join the largest verified military creator network. Discover creators, manage campaigns, and amplify veteran voices.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/creators">
              <Button size="lg" className="bg-white text-[#000741] hover:bg-gray-100">
                Browse Creator Directory <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/prospectus">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                View Prospectus
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

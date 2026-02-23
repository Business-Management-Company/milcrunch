import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Camera, Mic2, Building2, Check } from "lucide-react";
import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";

const PLANS = [
  {
    icon: <Camera className="h-7 w-7" />,
    title: "Creator Directory",
    description:
      "Get discovered by brands. Build your verified profile, showcase your reach, and land sponsorships.",
    features: [
      "Verified military creator profile",
      "Searchable by brands & sponsors",
      "Engagement analytics",
      "Event speaker opportunities",
    ],
    cta: "Join as Creator",
    href: "/signup",
    popular: false,
  },
  {
    icon: <Mic2 className="h-7 w-7" />,
    title: "Podcast Network",
    description:
      "List your show in the largest military podcast directory. Grow your audience and get discovered.",
    features: [
      "Podcast directory listing",
      "Episode streaming on platform",
      "Audience growth tools",
      "Cross-promotion with creators",
    ],
    cta: "List Your Podcast",
    href: "/signup",
    popular: false,
  },
  {
    icon: <Building2 className="h-7 w-7" />,
    title: "Brands & Sponsors",
    description:
      "Access 2,400+ verified military creators and 825 podcasts. Sponsor events with year-round ROI tracking.",
    features: [
      "AI-powered creator discovery",
      "365-day engagement analytics",
      "Sponsor ROI dashboards",
      "Event sponsorship management",
    ],
    cta: "Get Started",
    href: "/signup",
    popular: true,
  },
];

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      <main className="pt-14">
        <section className="px-4 md:px-8 py-20 md:py-28">
          <div className="max-w-5xl mx-auto text-center">
            <p className="text-sm font-bold tracking-widest text-[#1e3a5f] uppercase mb-3">
              Choose Your Path
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-[#1A1A2E] mb-4">
              Built for every role in the military community
            </h1>
            <p className="text-gray-500 max-w-2xl mx-auto mb-14">
              Whether you create content, host a podcast, or represent a brand
              — MilCrunch has a seat for you.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {PLANS.map((plan) => (
                <div
                  key={plan.title}
                  className="relative bg-white rounded-xl shadow-md p-8 flex flex-col text-left border border-gray-200"
                >

                  <div className="w-12 h-12 rounded-xl bg-[#1e3a5f]/10 text-[#1e3a5f] flex items-center justify-center mb-5">
                    {plan.icon}
                  </div>

                  <h3 className="text-xl font-bold text-[#1A1A2E] mb-2">
                    {plan.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-6">
                    {plan.description}
                  </p>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-[#1A1A2E]">
                        <Check className="h-4 w-4 text-[#1e3a5f] mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link to={plan.href}>
                    <Button
                      className={`w-full rounded-lg font-semibold ${
                        plan.popular
                          ? "bg-[#1e3a5f] hover:bg-[#2d5282] text-white"
                          : "bg-white hover:bg-[#1e3a5f]/5 text-[#1e3a5f] border-2 border-[#1e3a5f]"
                      }`}
                    >
                      {plan.cta} &rarr;
                    </Button>
                  </Link>
                </div>
              ))}
            </div>

            <p className="mt-12 text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[#1e3a5f] font-semibold hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

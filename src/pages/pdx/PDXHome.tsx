import { Link } from "react-router-dom";
import { Video, Mic2, Radio, Briefcase, Medal, ArrowRight, MapPin, Calendar, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PDX_BRINGS = [
  {
    icon: Video,
    title: "PDTV Live Streaming",
    description: "Online, Apple TV, iOS/Android",
  },
  {
    icon: Mic2,
    title: "Live & Virtual Events",
    description: "Conferences, panels, interviews",
  },
  {
    icon: Radio,
    title: "Co-Broadcasting",
    description: "Partner sites & social media channels",
  },
  {
    icon: Briefcase,
    title: "Brand Integration",
    description: "Messaging through PDX creator community",
  },
  {
    icon: Medal,
    title: "Military Focus",
    description: "Recruiting, retention, transition outreach",
  },
] as const;

const PAST_EXPERIENCES = [
  {
    id: "1",
    name: "PDX at VFW National Convention",
    location: "Columbus, OH",
    date: "Aug 2025",
    detail: "32 speakers, 4 days",
  },
  {
    id: "2",
    name: "PDX at Military Influencer Conference",
    location: "Washington, DC",
    date: "Oct 2024",
    detail: "15 panels",
  },
  {
    id: "3",
    name: "PDX at MBA Basketball",
    location: "Live sports broadcasting",
    date: "—",
    detail: "Collaboration",
  },
] as const;

const STATS = [
  { value: "100+ Creators", label: "Creators" },
  { value: "6M+ Reach", label: "Reach" },
  { value: "Live & Virtual", label: "Formats" },
  { value: "24/7 PDTV", label: "PDTV" },
];

const PDXHome = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-[#0F1117] dark:to-[#0F1117]">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-pd-navy dark:text-white md:text-5xl">
            The ParadeDeck Experience
          </h1>
          <p className="mt-2 text-2xl font-bold md:text-3xl">
            PD<span className="text-[#ED1C24]">X</span>
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            A scalable, mobile streaming experience bringing military creators to the stage
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500 dark:text-gray-400">
            {STATS.map((s) => (
              <div key={s.label}>
                <span className="font-semibold text-pd-navy dark:text-white">{s.value}</span>
                <span className="ml-1">·</span>
                <span className="ml-1">{s.label}</span>
              </div>
            ))}
          </div>
          <Button
            asChild
            size="lg"
            className="mt-10 bg-[#0064B1] hover:bg-[#005399] text-white px-8 py-6 text-base rounded-xl"
          >
            <Link to="/pdx/create">Create a PDX</Link>
          </Button>
        </div>
      </section>

      {/* What PDX Brings */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-pd-navy dark:text-white md:text-3xl">
            What PDX Brings
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {PDX_BRINGS.map((item) => (
              <Card
                key={item.title}
                className="flex flex-col items-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6 text-center shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0064B1]/10 text-[#0064B1] dark:bg-[#0064B1]/20 dark:text-[#0064B1]">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-3 font-semibold text-pd-navy dark:text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Past Experiences */}
      <section className="px-4 pb-24 md:pb-32">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-pd-navy dark:text-white md:text-3xl">
            Past Experiences
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PAST_EXPERIENCES.map((event) => (
              <Card
                key={event.id}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D27] p-6"
              >
                <h3 className="font-semibold text-pd-navy dark:text-white">{event.name}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {event.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {event.detail}
                  </span>
                </div>
                <Button variant="outline" size="sm" className="mt-4 rounded-lg border-[#0064B1]/30 text-[#0064B1] hover:bg-[#0064B1]/10">
                  View Recap
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default PDXHome;

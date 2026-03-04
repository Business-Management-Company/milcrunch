import SeoPageLayout from "@/components/seo/SeoPageLayout";
import { Link } from "react-router-dom";

const faqs = [
  {
    question: "Who are the top Navy influencers on social media?",
    answer: "Top Navy influencers include DAVE BRAY USA, a Navy veteran, musician, and patriotic content creator with a devoted following. MilCrunch's verified directory features dozens of Navy creators spanning fitness, music, lifestyle, and veteran advocacy content.",
  },
  {
    question: "How can brands work with Navy influencers?",
    answer: "Brands can browse the MilCrunch creator directory, filter by Navy branch affiliation, and add verified creators to campaign lists. Our platform handles military verification so you can trust every partnership is authentic.",
  },
  {
    question: "What kind of content do Navy creators make?",
    answer: "Navy creators produce a wide range of content including maritime and naval culture, deployment stories, fitness routines, music, travel vlogs from port visits, aviation (naval aviators), submarine life, and veteran transition advice.",
  },
  {
    question: "Are Navy influencers on MilCrunch verified?",
    answer: "Yes. Every Navy creator in the MilCrunch network goes through a multi-step verification pipeline that cross-references PeopleDataLabs records, social media bios, and community endorsements to confirm their Navy service.",
  },
];

export default function NavyInfluencers() {
  return (
    <SeoPageLayout
      title="Top Navy Influencers & Creators"
      metaTitle="Top Navy Influencers & Creators | MilCrunch"
      metaDescription="Discover top Navy influencers and creators. Verified sailors and veterans building audiences across social media."
      canonical="/navy-influencers"
      faqs={faqs}
    >
      <p>
        The United States Navy has produced some of the most compelling content creators in the
        military influencer space. From sailors documenting life aboard aircraft carriers to veterans
        building media brands around patriotism and service, Navy influencers bring a unique
        perspective shaped by deployments at sea, global travel, and the tight-knit culture of
        naval service.
      </p>

      <h2>Why Navy Influencers Stand Out</h2>
      <p>
        Navy creators have a storytelling advantage that few other niches can match. Their content
        draws from experiences most civilians never encounter: months-long deployments, port calls
        in dozens of countries, life aboard submarines and destroyers, and the camaraderie forged
        in close quarters. This authenticity resonates deeply with audiences who value real
        experience over manufactured content.
      </p>
      <p>
        Navy audiences tend to be highly engaged and loyal. Followers connect with these creators
        not just for entertainment but for shared identity and pride in naval service. For brands,
        that translates to trust-driven engagement that outperforms typical influencer campaigns.
      </p>

      <h2>Featured Navy Creators</h2>
      <ul>
        <li>
          <strong>DAVE BRAY USA</strong> — A Navy veteran, musician, and patriotic content creator
          whose powerful performances and advocacy for veterans have earned him a devoted following
          across Instagram and YouTube. DAVE BRAY represents the best of what Navy creators bring
          to the table: authenticity, service, and a mission-driven message.
        </li>
        <li>
          <strong>Patriotic Kenny</strong> — Known for his viral patriotic content on TikTok with
          over 142K average likes per post, Patriotic Kenny energizes military audiences with
          high-energy, shareable videos.
        </li>
      </ul>
      <p>
        Explore more Navy creators in our{" "}
        <Link to="/creators" className="text-primary hover:underline">verified creator directory</Link>.
      </p>

      <h2>Navy Content Categories</h2>
      <p>Navy influencers cover a broad spectrum of topics that appeal to both military and civilian audiences:</p>
      <ul>
        <li><strong>Maritime & Naval Culture</strong> — Ship life, naval traditions, fleet week coverage, and ocean-based content.</li>
        <li><strong>Music & Performance</strong> — Patriotic music, live performances at military events, and anthem content.</li>
        <li><strong>Fitness & Training</strong> — Navy SEAL-inspired workouts, swim training, and military conditioning programs.</li>
        <li><strong>Travel & Adventure</strong> — Port visit vlogs, global travel from deployments, and adventure content.</li>
        <li><strong>Veteran Advocacy</strong> — Transition support, mental health awareness, and veteran community building.</li>
      </ul>

      <h2>Working With Navy Influencers</h2>
      <p>
        MilCrunch makes it simple to discover and partner with verified Navy creators. Browse our{" "}
        <Link to="/creators" className="text-primary hover:underline">creator directory</Link> and
        filter by Navy branch affiliation to find creators who match your campaign goals. Whether
        you need a Navy veteran for a fitness brand partnership or a sailor-turned-musician for an
        event appearance, our platform connects you with verified talent.
      </p>
      <p>
        For a full overview of partnership options, sponsorship tiers, and campaign packages, visit
        our <Link to="/prospectus" className="text-primary hover:underline">brand prospectus</Link>.
      </p>
    </SeoPageLayout>
  );
}

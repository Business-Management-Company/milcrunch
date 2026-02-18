import React from "react";

/* ------------------------------------------------------------------ */
/*  Shared micro-components for mockup thumbnails                      */
/* ------------------------------------------------------------------ */

const Nav = () => (
  <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/10">
    <span className="text-[7px] text-white font-bold tracking-tight">
      recurrent<span className="text-[#6C5CE7]">X</span>
    </span>
    <div className="flex gap-1">
      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
    </div>
  </div>
);

const Pill = ({ children, active }: { children: React.ReactNode; active?: boolean }) => (
  <span
    className={`text-[6px] px-1.5 py-0.5 rounded-full font-medium ${
      active ? "bg-[#6C5CE7] text-white" : "bg-white/10 text-white/60"
    }`}
  >
    {children}
  </span>
);

const Btn = ({ children, sm }: { children: React.ReactNode; sm?: boolean }) => (
  <span
    className={`bg-[#6C5CE7] text-white rounded font-semibold inline-flex items-center justify-center ${
      sm ? "text-[5px] px-1.5 py-0.5" : "text-[6px] px-2 py-1"
    }`}
  >
    {children}
  </span>
);

const Avatar = ({ size = 12, color = "bg-[#6C5CE7]/40" }: { size?: number; color?: string }) => (
  <div className={`rounded-full ${color} flex-shrink-0`} style={{ width: size, height: size }} />
);

const Bar = ({ w, color = "bg-[#6C5CE7]" }: { w: string; color?: string }) => (
  <div className={`h-1 rounded-full ${color}`} style={{ width: w }} />
);

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white/[0.06] rounded p-1.5 text-center">
    <div className="text-[8px] font-bold text-white">{value}</div>
    <div className="text-[5px] text-white/40">{label}</div>
  </div>
);

const TableRow = ({ cells, header }: { cells: string[]; header?: boolean }) => (
  <div className={`flex gap-1 px-1.5 py-0.5 ${header ? "border-b border-white/10" : ""}`}>
    {cells.map((c, i) => (
      <span
        key={i}
        className={`flex-1 text-[5px] truncate ${
          header ? "text-white/40 font-medium" : i === 0 ? "text-white/80" : "text-white/50"
        }`}
      >
        {c}
      </span>
    ))}
  </div>
);

const Badge = ({
  children,
  color = "bg-emerald-500/20 text-emerald-400",
}: {
  children: React.ReactNode;
  color?: string;
}) => (
  <span className={`text-[5px] px-1 py-0.5 rounded-full font-medium ${color}`}>{children}</span>
);

/* ------------------------------------------------------------------ */
/*  TAB 2 — Events & Attendee App                                     */
/* ------------------------------------------------------------------ */

const EventSchedule = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">Event Schedule</div>
      <div className="flex gap-1">
        <Pill active>Day 1</Pill>
        <Pill>Day 2</Pill>
        <Pill>Day 3</Pill>
      </div>
      {["Keynote: Future of Veterans in Tech", "Panel: Brand Partnerships", "Networking Mixer"].map(
        (t, i) => (
          <div key={i} className="bg-white/[0.05] rounded p-1.5 flex items-center gap-1.5">
            <div className="text-[6px] text-[#6C5CE7] font-mono w-6 flex-shrink-0">
              {["9:00", "10:30", "12:00"][i]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[6px] text-white/90 truncate">{t}</div>
              <div className="text-[5px] text-white/40">Main Stage</div>
            </div>
            <Badge>{["Keynote", "Panel", "Social"][i]}</Badge>
          </div>
        )
      )}
    </div>
  </div>
);

const RegistrationFlow = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">Registration</div>
      {/* Progress bar */}
      <div className="flex items-center gap-0.5">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div
              className={`w-3 h-3 rounded-full flex items-center justify-center text-[5px] font-bold ${
                s === 1 ? "bg-[#6C5CE7] text-white" : "bg-white/10 text-white/40"
              }`}
            >
              {s}
            </div>
            {s < 3 && <div className="flex-1 h-px bg-white/10" />}
          </React.Fragment>
        ))}
      </div>
      <div className="space-y-1">
        <div>
          <div className="text-[5px] text-white/40 mb-0.5">Full Name</div>
          <div className="h-3 bg-white/[0.06] rounded border border-white/10" />
        </div>
        <div>
          <div className="text-[5px] text-white/40 mb-0.5">Email Address</div>
          <div className="h-3 bg-white/[0.06] rounded border border-white/10" />
        </div>
        <div>
          <div className="text-[5px] text-white/40 mb-0.5">Military Branch</div>
          <div className="h-3 bg-white/[0.06] rounded border border-white/10" />
        </div>
      </div>
      <Btn>Continue</Btn>
    </div>
  </div>
);

const CommunityFeed = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">Community Feed</div>
      {[
        { name: "Sarah K.", text: "Amazing keynote today!", likes: 12, comments: 3 },
        { name: "Mike R.", text: "Looking for the after-party location", likes: 5, comments: 8 },
        { name: "Organizer", text: "Schedule update: Panel moved to Room B", likes: 24, comments: 1 },
      ].map((post, i) => (
        <div key={i} className="bg-white/[0.05] rounded p-1.5 space-y-0.5">
          <div className="flex items-center gap-1">
            <Avatar size={8} color={["bg-pink-500/40", "bg-blue-500/40", "bg-[#6C5CE7]/60"][i]} />
            <span className="text-[6px] font-semibold text-white/90">{post.name}</span>
            {i === 2 && <Badge color="bg-[#6C5CE7]/30 text-[#6C5CE7]">Announcement</Badge>}
          </div>
          <div className="text-[5px] text-white/60">{post.text}</div>
          <div className="flex gap-2 text-[5px] text-white/30">
            <span>{post.likes} likes</span>
            <span>{post.comments} comments</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SpeakerProfiles = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">Speakers</div>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { name: "Col. James Wright", title: "Keynote Speaker", color: "bg-blue-500/40" },
          { name: "Dr. Lisa Chen", title: "Panel Moderator", color: "bg-pink-500/40" },
          { name: "Sgt. Marcus Hall", title: "Workshop Lead", color: "bg-emerald-500/40" },
          { name: "Capt. Amy Torres", title: "Fireside Chat", color: "bg-amber-500/40" },
        ].map((s, i) => (
          <div key={i} className="bg-white/[0.05] rounded p-1.5 text-center">
            <Avatar size={14} color={s.color} />
            <div className="text-[6px] font-semibold text-white/90 mt-1 truncate">{s.name}</div>
            <div className="text-[5px] text-white/40 truncate">{s.title}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LeadRetrieval = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-[7px] font-semibold">Lead Retrieval</div>
        <Btn sm>Scan QR Code</Btn>
      </div>
      <div className="text-[5px] text-white/40">3 leads captured today</div>
      {[
        { initials: "JW", name: "James Wright", company: "VetTech Inc." },
        { initials: "LC", name: "Lisa Chen", company: "MilComm Media" },
        { initials: "MH", name: "Marcus Hall", company: "Brave Corp" },
      ].map((lead, i) => (
        <div key={i} className="bg-white/[0.05] rounded p-1.5 flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-[#6C5CE7]/30 flex items-center justify-center text-[5px] font-bold text-[#6C5CE7] flex-shrink-0">
            {lead.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[6px] text-white/90 truncate">{lead.name}</div>
            <div className="text-[5px] text-white/40 truncate">{lead.company}</div>
          </div>
          <Badge>New</Badge>
        </div>
      ))}
    </div>
  </div>
);

const AttendeeQR = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 flex flex-col items-center justify-center space-y-1.5">
      <Avatar size={20} color="bg-[#6C5CE7]/40" />
      <div className="text-[7px] font-semibold text-center">Andrew Appleton</div>
      <Badge color="bg-[#6C5CE7]/20 text-[#6C5CE7]">U.S. Army</Badge>
      {/* QR Code placeholder */}
      <div className="w-14 h-14 bg-white rounded p-1">
        <div className="w-full h-full grid grid-cols-7 grid-rows-7 gap-px">
          {Array.from({ length: 49 }).map((_, i) => (
            <div
              key={i}
              className={`${
                [0,1,2,6,7,8,14,35,36,42,43,44,48,3,4,5,10,12,13,20,21,24,28,30,33,37,38,40,45,46,47].includes(i)
                  ? "bg-[#0A0F1E]"
                  : "bg-white"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="text-[5px] text-white/40">Scan to connect</div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  TAB 3 — Creator Network                                           */
/* ------------------------------------------------------------------ */

const CreatorDiscovery = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="h-3 bg-white/[0.06] rounded border border-white/10 flex items-center px-1.5">
        <span className="text-[5px] text-white/30">Search military creators...</span>
      </div>
      <div className="flex gap-0.5 flex-wrap">
        <Pill active>Instagram</Pill>
        <Pill>TikTok</Pill>
        <Pill>YouTube</Pill>
        <Pill active>Army</Pill>
      </div>
      {[
        { name: "VetFit_Mike", followers: "245K", match: "94%" },
        { name: "MilSpouse_Sarah", followers: "128K", match: "87%" },
        { name: "CombatChef", followers: "312K", match: "82%" },
      ].map((c, i) => (
        <div key={i} className="bg-white/[0.05] rounded p-1.5 flex items-center gap-1.5">
          <Avatar size={10} color={["bg-blue-500/40", "bg-pink-500/40", "bg-amber-500/40"][i]} />
          <div className="flex-1 min-w-0">
            <div className="text-[6px] text-white/90 truncate">@{c.name}</div>
            <div className="text-[5px] text-white/40">{c.followers} followers</div>
          </div>
          <Badge>{c.match}</Badge>
        </div>
      ))}
    </div>
  </div>
);

const CreatorProfile = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    {/* Banner */}
    <div className="h-8 bg-gradient-to-r from-[#6C5CE7] to-[#6C5CE7]/60 relative">
      <div className="absolute -bottom-2 left-2">
        <div className="w-6 h-6 rounded-full bg-[#0A0F1E] border-2 border-[#6C5CE7] flex items-center justify-center">
          <Avatar size={16} color="bg-blue-500/40" />
        </div>
      </div>
    </div>
    <div className="flex-1 p-2 pt-3 space-y-1.5">
      <div className="flex items-center gap-1">
        <span className="text-[7px] font-bold">VetFit_Mike</span>
        <span className="text-[5px] text-[#6C5CE7]">&#10003; Verified</span>
      </div>
      <div className="text-[5px] text-white/50">Army Veteran | Fitness Creator | 245K+</div>
      <div className="grid grid-cols-4 gap-1">
        {[
          { icon: "IG", val: "245K" },
          { icon: "TT", val: "180K" },
          { icon: "YT", val: "92K" },
          { icon: "ER", val: "4.2%" },
        ].map((s) => (
          <div key={s.icon} className="bg-white/[0.06] rounded p-1 text-center">
            <div className="text-[5px] text-white/40">{s.icon}</div>
            <div className="text-[6px] font-bold">{s.val}</div>
          </div>
        ))}
      </div>
      <Btn>Contact Creator</Btn>
    </div>
  </div>
);

const VerificationPipeline = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">Verification Pipeline</div>
      {[
        { phase: "Identity", status: "complete", desc: "Government ID matched" },
        { phase: "Service", status: "complete", desc: "DD-214 verified" },
        { phase: "Content", status: "active", desc: "Reviewing posts..." },
        { phase: "Score", status: "pending", desc: "Awaiting review" },
      ].map((step, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div
            className={`w-3 h-3 rounded-full flex items-center justify-center text-[5px] font-bold flex-shrink-0 ${
              step.status === "complete"
                ? "bg-emerald-500 text-white"
                : step.status === "active"
                  ? "bg-[#6C5CE7] text-white"
                  : "bg-white/10 text-white/30"
            }`}
          >
            {step.status === "complete" ? "\u2713" : i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[6px] text-white/90 font-medium">{step.phase}</div>
            <div className="text-[5px] text-white/40">{step.desc}</div>
          </div>
          {step.status === "active" && (
            <div className="w-2 h-2 rounded-full border border-[#6C5CE7] border-t-transparent animate-spin flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  </div>
);

const CreatorLists = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-[7px] font-semibold">Campaign Lists</div>
        <Btn sm>+ New List</Btn>
      </div>
      {[
        { name: "VetFit_Mike", list: "Q1 Campaign", checked: true },
        { name: "MilSpouse_Sarah", list: "Q1 Campaign", checked: true },
        { name: "CombatChef", list: "Q1 Campaign", checked: false },
        { name: "TacticalDad", list: "Podcast Guests", checked: true },
        { name: "NavyNurse_J", list: "Podcast Guests", checked: false },
      ].map((c, i) => (
        <div key={i} className="bg-white/[0.05] rounded p-1 flex items-center gap-1.5">
          <div
            className={`w-2.5 h-2.5 rounded border flex-shrink-0 flex items-center justify-center text-[5px] ${
              c.checked
                ? "bg-[#6C5CE7] border-[#6C5CE7] text-white"
                : "border-white/20 bg-transparent"
            }`}
          >
            {c.checked && "\u2713"}
          </div>
          <Avatar size={8} />
          <div className="flex-1 min-w-0">
            <div className="text-[5px] text-white/80 truncate">@{c.name}</div>
          </div>
          <div className="text-[4px] text-white/30 truncate">{c.list}</div>
        </div>
      ))}
    </div>
  </div>
);

const BrandSafetyScore = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 flex flex-col items-center justify-center space-y-1.5">
      <div className="text-[7px] font-semibold">Brand Safety Score</div>
      {/* Gauge */}
      <div className="relative w-16 h-8">
        <svg viewBox="0 0 64 32" className="w-full h-full">
          <path d="M 4 30 A 28 28 0 0 1 60 30" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" strokeLinecap="round" />
          <path d="M 4 30 A 28 28 0 0 1 57 18" fill="none" stroke="#10B981" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-0.5">
          <span className="text-[10px] font-bold text-emerald-400">94</span>
          <span className="text-[5px] text-white/40 ml-0.5">/100</span>
        </div>
      </div>
      <div className="w-full space-y-0.5">
        {[
          { label: "Content Safety", ok: true },
          { label: "Audience Quality", ok: true },
          { label: "Service Verified", ok: true },
          { label: "Brand Alignment", ok: true },
        ].map((r) => (
          <div key={r.label} className="flex items-center justify-between px-2">
            <span className="text-[5px] text-white/60">{r.label}</span>
            <span className="text-[5px] text-emerald-400">{r.ok ? "Pass" : "Review"}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const OnboardingFlow = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">Creator Onboarding</div>
      {/* Step indicators */}
      <div className="flex items-center gap-0.5 px-1">
        {["Profile", "Socials", "Branch", "Review"].map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-3 h-3 rounded-full flex items-center justify-center text-[5px] font-bold ${
                  i < 2
                    ? "bg-emerald-500 text-white"
                    : i === 2
                      ? "bg-[#6C5CE7] text-white"
                      : "bg-white/10 text-white/30"
                }`}
              >
                {i < 2 ? "\u2713" : i + 1}
              </div>
              <span className="text-[4px] text-white/40">{s}</span>
            </div>
            {i < 3 && <div className="flex-1 h-px bg-white/10 mb-2" />}
          </React.Fragment>
        ))}
      </div>
      {/* Current step content */}
      <div className="bg-white/[0.05] rounded p-2 space-y-1">
        <div className="text-[6px] font-semibold">Select your branch</div>
        {["Army", "Navy", "Air Force", "Marines", "Coast Guard"].map((b) => (
          <div
            key={b}
            className={`flex items-center gap-1 p-0.5 rounded text-[5px] ${
              b === "Army" ? "bg-[#6C5CE7]/20 text-[#6C5CE7]" : "text-white/50"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full border ${
                b === "Army" ? "bg-[#6C5CE7] border-[#6C5CE7]" : "border-white/20"
              }`}
            />
            {b}
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  TAB 4 — 365 Insights                                              */
/* ------------------------------------------------------------------ */

const SponsorDashboard = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">Sponsor Dashboard</div>
      <div className="flex-1 flex items-end gap-1 px-1 pb-1">
        {[
          { sponsor: "USAA", h: "70%" },
          { sponsor: "Boeing", h: "55%" },
          { sponsor: "L3Harris", h: "40%" },
          { sponsor: "Raytheon", h: "65%" },
          { sponsor: "Lockheed", h: "50%" },
        ].map((b) => (
          <div key={b.sponsor} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full bg-[#6C5CE7]/80 rounded-t" style={{ height: b.h }} />
            <span className="text-[4px] text-white/40 truncate w-full text-center">{b.sponsor}</span>
          </div>
        ))}
      </div>
      <div className="text-[5px] text-white/40 text-center">Impressions by sponsor (thousands)</div>
    </div>
  </div>
);

const MonthTimeline = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">12-Month Engagement</div>
      {/* Mini line chart */}
      <div className="flex-1 relative px-1">
        <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
          <polyline
            points="0,35 8,30 17,32 25,20 33,22 42,15 50,10 58,12 67,8 75,14 83,11 92,6 100,4"
            fill="none"
            stroke="#6C5CE7"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <polyline
            points="0,35 8,30 17,32 25,20 33,22 42,15 50,10 58,12 67,8 75,14 83,11 92,6 100,4"
            fill="url(#grad)"
            stroke="none"
          />
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6C5CE7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6C5CE7" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="flex justify-between px-1">
        {["Jan", "Mar", "May", "Jul", "Sep", "Nov"].map((m) => (
          <span key={m} className="text-[4px] text-white/30">
            {m}
          </span>
        ))}
      </div>
    </div>
  </div>
);

const ROISummary = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">ROI Summary</div>
      <div className="grid grid-cols-2 gap-1">
        <StatCard label="Impressions" value="2.4M" />
        <StatCard label="Reach" value="890K" />
        <StatCard label="Engagements" value="145K" />
        <StatCard label="Est. Value" value="$128K" />
      </div>
      <div className="bg-white/[0.05] rounded p-1.5">
        <div className="text-[5px] text-white/40 mb-0.5">Top performing content</div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-4 rounded bg-[#6C5CE7]/20 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[5px] text-white/80 truncate">Keynote Highlight Reel</div>
            <div className="text-[4px] text-white/40">42K views</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const YoYComparison = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1">
      <div className="text-[7px] font-semibold">YoY Comparison</div>
      <div className="bg-white/[0.05] rounded overflow-hidden">
        <TableRow cells={["Metric", "2024", "2025", ""]} header />
        {[
          { metric: "Impressions", v1: "1.2M", v2: "2.4M", up: true },
          { metric: "Sponsors", v1: "8", v2: "14", up: true },
          { metric: "Engagement", v1: "2.1%", v2: "3.8%", up: true },
          { metric: "Revenue", v1: "$85K", v2: "$142K", up: true },
        ].map((r) => (
          <div key={r.metric} className="flex gap-1 px-1.5 py-0.5 border-t border-white/5">
            <span className="flex-1 text-[5px] text-white/80">{r.metric}</span>
            <span className="flex-1 text-[5px] text-white/40">{r.v1}</span>
            <span className="flex-1 text-[5px] text-white/80">{r.v2}</span>
            <span className="text-[5px] text-emerald-400">{r.up ? "\u2191" : ""}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SponsorReport = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      {/* PDF-style header */}
      <div className="bg-white/[0.06] rounded p-1.5 flex items-center gap-1.5 border border-white/10">
        <div className="w-5 h-5 rounded bg-[#6C5CE7]/30 flex items-center justify-center text-[5px] text-[#6C5CE7] font-bold flex-shrink-0">
          RX
        </div>
        <div>
          <div className="text-[6px] font-semibold">Sponsor ROI Report</div>
          <div className="text-[4px] text-white/40">USAA - Q4 2025</div>
        </div>
      </div>
      {/* Data table */}
      <div className="bg-white/[0.05] rounded overflow-hidden">
        <TableRow cells={["Channel", "Impressions", "Clicks", "CTR"]} header />
        <TableRow cells={["Event App", "340K", "12.4K", "3.6%"]} />
        <TableRow cells={["Social Media", "890K", "28.1K", "3.2%"]} />
        <TableRow cells={["Livestream", "1.2M", "45.2K", "3.8%"]} />
      </div>
      <div className="flex gap-1">
        <Btn sm>Export PDF</Btn>
        <Btn sm>Share</Btn>
      </div>
    </div>
  </div>
);

const RenewalPipeline = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">Renewal Pipeline</div>
      {[
        { name: "USAA", status: "Renewed", color: "bg-emerald-500/20 text-emerald-400" },
        { name: "Boeing", status: "In Review", color: "bg-amber-500/20 text-amber-400" },
        { name: "L3Harris", status: "Renewed", color: "bg-emerald-500/20 text-emerald-400" },
        { name: "Raytheon", status: "Pending", color: "bg-blue-500/20 text-blue-400" },
        { name: "Lockheed", status: "At Risk", color: "bg-red-500/20 text-red-400" },
      ].map((s) => (
        <div key={s.name} className="bg-white/[0.05] rounded p-1.5 flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-white/10 flex items-center justify-center text-[5px] font-bold text-white/60 flex-shrink-0">
            {s.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[6px] text-white/90 truncate">{s.name}</div>
          </div>
          <Badge color={s.color}>{s.status}</Badge>
        </div>
      ))}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  TAB 5 — Streaming & Media                                         */
/* ------------------------------------------------------------------ */

const LiveStreamStudio = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      {/* Camera feed */}
      <div className="relative flex-1 bg-white/[0.03] rounded border border-white/10 flex items-center justify-center min-h-[40px]">
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
          <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-white/30 ml-0.5" />
        </div>
        {/* LIVE badge */}
        <div className="absolute top-1 left-1 bg-red-500 text-white text-[5px] px-1 py-0.5 rounded font-bold flex items-center gap-0.5">
          <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
          LIVE
        </div>
        <div className="absolute top-1 right-1 text-[5px] text-white/60 bg-black/40 px-1 rounded">
          1,247 viewers
        </div>
      </div>
      {/* Controls */}
      <div className="flex items-center gap-1">
        <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
        </div>
        <div className="w-4 h-4 rounded bg-white/10 flex items-center justify-center text-[6px]">
          M
        </div>
        <div className="w-4 h-4 rounded bg-white/10 flex items-center justify-center text-[6px]">
          C
        </div>
        <div className="flex-1" />
        <Btn sm>End Stream</Btn>
      </div>
    </div>
  </div>
);

const MultiDestination = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">Multi-Destination</div>
      {[
        { name: "YouTube", color: "bg-red-500", connected: true },
        { name: "Facebook", color: "bg-blue-500", connected: true },
        { name: "Twitch", color: "bg-purple-500", connected: true },
        { name: "Custom RTMP", color: "bg-gray-500", connected: false },
      ].map((p) => (
        <div key={p.name} className="bg-white/[0.05] rounded p-1.5 flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded ${p.color} flex-shrink-0`} />
          <div className="flex-1 text-[6px] text-white/80">{p.name}</div>
          {p.connected ? (
            <div className="flex items-center gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[5px] text-emerald-400">Connected</span>
            </div>
          ) : (
            <Btn sm>Connect</Btn>
          )}
        </div>
      ))}
      <div className="text-[5px] text-white/40 text-center">3 destinations active</div>
    </div>
  </div>
);

const AIClipGenerator = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">AI Clip Generator</div>
      {/* Timeline */}
      <div className="bg-white/[0.06] rounded p-1.5 space-y-1">
        <div className="relative h-2 bg-white/10 rounded-full">
          <div className="absolute h-full bg-[#6C5CE7]/40 rounded-full" style={{ left: "10%", width: "15%" }} />
          <div className="absolute h-full bg-[#6C5CE7]/40 rounded-full" style={{ left: "40%", width: "20%" }} />
          <div className="absolute h-full bg-[#6C5CE7]/40 rounded-full" style={{ left: "75%", width: "12%" }} />
          {/* Markers */}
          <div className="absolute top-0 h-full w-0.5 bg-[#6C5CE7]" style={{ left: "10%" }} />
          <div className="absolute top-0 h-full w-0.5 bg-[#6C5CE7]" style={{ left: "40%" }} />
          <div className="absolute top-0 h-full w-0.5 bg-[#6C5CE7]" style={{ left: "75%" }} />
        </div>
        <div className="flex justify-between text-[4px] text-white/30">
          <span>0:00</span>
          <span>1:42:30</span>
        </div>
      </div>
      <div className="text-[5px] text-white/50">3 clips detected by AI</div>
      {["Keynote Highlight (0:42)", "Audience Reaction (0:18)", "Q&A Best Moment (0:55)"].map(
        (c, i) => (
          <div key={i} className="bg-white/[0.05] rounded p-1 flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-[#6C5CE7]/30 flex-shrink-0" />
            <span className="text-[5px] text-white/70 flex-1 truncate">{c}</span>
          </div>
        )
      )}
      <Btn>Generate Clips</Btn>
    </div>
  </div>
);

const HighlightReel = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">Highlight Reel</div>
      {/* Video card */}
      <div className="relative bg-white/[0.03] rounded border border-white/10 flex items-center justify-center min-h-[40px]">
        <div className="w-6 h-6 rounded-full bg-[#6C5CE7]/30 flex items-center justify-center">
          <div className="w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[5px] border-l-[#6C5CE7] ml-0.5" />
        </div>
        <div className="absolute bottom-1 right-1 bg-black/60 text-[5px] px-1 rounded">3:24</div>
      </div>
      <div className="text-[6px] font-medium">VPA 2025 Keynote Highlights</div>
      <div className="text-[5px] text-white/40">Generated from 1:42:30 stream</div>
      <div className="flex gap-1">
        <Btn sm>Export MP4</Btn>
        <Btn sm>Share</Btn>
      </div>
    </div>
  </div>
);

const SocialDistribution = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">Social Distribution</div>
      {["Mon 9 AM", "Wed 12 PM", "Fri 6 PM", "Sun 10 AM"].map((slot, i) => (
        <div key={i} className="bg-white/[0.05] rounded p-1 flex items-center gap-1.5">
          <div className="text-[5px] text-white/40 w-10 flex-shrink-0">{slot}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[5px] text-white/80 truncate">
              {["Keynote Clip #1", "Panel Highlight", "Audience Moment", "Full Recap"][i]}
            </div>
          </div>
          <div className="flex gap-0.5">
            {[
              ["bg-red-500", "bg-blue-500"],
              ["bg-pink-500", "bg-gray-800"],
              ["bg-red-500", "bg-blue-500", "bg-pink-500"],
              ["bg-red-500"],
            ][i].map((c, j) => (
              <div key={j} className={`w-1.5 h-1.5 rounded-full ${c} flex-shrink-0`} />
            ))}
          </div>
        </div>
      ))}
      <Btn>Schedule All</Btn>
    </div>
  </div>
);

const StreamAnalytics = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">Stream Analytics</div>
      <div className="grid grid-cols-2 gap-1">
        <StatCard label="Peak Viewers" value="2,847" />
        <StatCard label="Watch Time" value="4,215h" />
        <StatCard label="Clips Made" value="12" />
        <StatCard label="Social Reach" value="84K" />
      </div>
      {/* Mini viewer chart */}
      <div className="bg-white/[0.05] rounded p-1.5">
        <div className="text-[5px] text-white/40 mb-0.5">Viewers over time</div>
        <div className="flex items-end gap-px h-6">
          {[20, 35, 50, 65, 80, 95, 100, 90, 85, 70, 55, 40, 30].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-[#6C5CE7]/60 rounded-t"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  TAB 6 — Partnership Model                                         */
/* ------------------------------------------------------------------ */

const WhiteLabelConfig = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">White Label Config</div>
      <div className="space-y-1">
        <div>
          <div className="text-[5px] text-white/40 mb-0.5">Company Logo</div>
          <div className="h-5 bg-white/[0.06] rounded border border-dashed border-white/20 flex items-center justify-center text-[5px] text-white/30">
            Upload logo
          </div>
        </div>
        <div>
          <div className="text-[5px] text-white/40 mb-0.5">Brand Color</div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-3 rounded bg-[#6C5CE7] border border-white/20" />
            <span className="text-[5px] text-white/60 font-mono">#6C5CE7</span>
          </div>
        </div>
        <div>
          <div className="text-[5px] text-white/40 mb-0.5">Custom Domain</div>
          <div className="h-3 bg-white/[0.06] rounded border border-white/10 flex items-center px-1">
            <span className="text-[5px] text-white/50">app.recurrent.io</span>
          </div>
        </div>
        <div>
          <div className="text-[5px] text-white/40 mb-0.5">Favicon</div>
          <div className="h-3 bg-white/[0.06] rounded border border-dashed border-white/20 flex items-center justify-center text-[4px] text-white/30">
            Upload
          </div>
        </div>
      </div>
      <Btn>Save Configuration</Btn>
    </div>
  </div>
);

const LicenseDashboard = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">License Dashboard</div>
      <div className="bg-white/[0.05] rounded overflow-hidden">
        <TableRow cells={["Event", "Tier", "MRR"]} header />
        {[
          ["VPA 2025", "Enterprise", "$4,500"],
          ["MilTech Summit", "Pro", "$2,500"],
          ["Warrior Games", "Enterprise", "$4,500"],
          ["VetNet Expo", "Pro", "$2,500"],
        ].map((row, i) => (
          <div key={i} className="flex gap-1 px-1.5 py-0.5 border-t border-white/5">
            <span className="flex-1 text-[5px] text-white/80 truncate">{row[0]}</span>
            <span className="flex-1 text-[5px] text-white/50">{row[1]}</span>
            <span className="flex-1 text-[5px] text-emerald-400 text-right">{row[2]}</span>
          </div>
        ))}
      </div>
      <div className="bg-[#6C5CE7]/10 rounded p-1.5 text-center">
        <span className="text-[5px] text-white/40">Total MRR: </span>
        <span className="text-[7px] font-bold text-[#6C5CE7]">$14,000</span>
      </div>
    </div>
  </div>
);

const RevenueCalculator = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">Revenue Calculator</div>
      {[
        { label: "Events", value: "4", max: 10 },
        { label: "Sponsors/Event", value: "12", max: 20 },
        { label: "Add-On Rate", value: "$7.5K", max: 100 },
      ].map((s) => (
        <div key={s.label} className="space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[5px] text-white/40">{s.label}</span>
            <span className="text-[6px] font-bold text-white">{s.value}</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full">
            <div
              className="h-full bg-[#6C5CE7] rounded-full"
              style={{ width: `${(parseInt(s.value) / s.max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      <div className="bg-[#6C5CE7]/10 rounded-lg p-2 text-center mt-1">
        <div className="text-[5px] text-white/40 mb-0.5">Projected MRR</div>
        <div className="text-[10px] font-extrabold text-[#6C5CE7]">$47,500</div>
        <div className="text-[5px] text-white/40">$570K ARR</div>
      </div>
    </div>
  </div>
);

const SponsorAddOn = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 flex flex-col items-center justify-center space-y-1.5">
      <div className="w-8 h-8 rounded-full bg-[#6C5CE7]/20 flex items-center justify-center">
        <span className="text-[10px]">&#9734;</span>
      </div>
      <div className="text-[7px] font-bold text-center">Sponsor Intelligence Dashboard</div>
      <div className="text-[5px] text-white/50 text-center">
        Real-time analytics & ROI tracking
      </div>
      <div className="bg-[#6C5CE7]/10 rounded p-1.5 text-center w-full">
        <div className="text-[5px] text-white/40">Add-on per sponsor</div>
        <div className="text-[9px] font-bold text-[#6C5CE7]">$7,500</div>
      </div>
      <div className="w-full space-y-0.5">
        {["Live impression tracking", "Custom ROI reports", "Renewal automation"].map((f) => (
          <div key={f} className="flex items-center gap-1">
            <span className="text-[5px] text-emerald-400">{"\u2713"}</span>
            <span className="text-[5px] text-white/60">{f}</span>
          </div>
        ))}
      </div>
      <Btn>Add to License</Btn>
    </div>
  </div>
);

const APIAccess = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1.5">
      <div className="text-[7px] font-semibold">API Access</div>
      <div className="bg-[#0D1117] rounded border border-white/10 p-1.5 space-y-0.5 font-mono">
        <div className="text-[5px] text-emerald-400">GET /api/v1/events</div>
        <div className="text-[5px] text-white/30">Authorization: Bearer sk_live_...</div>
        <div className="h-px bg-white/10 my-0.5" />
        <div className="text-[5px] text-white/40">{"{"}</div>
        <div className="text-[5px] text-white/40 pl-2">
          <span className="text-[#6C5CE7]">"events"</span>: [...]
        </div>
        <div className="text-[5px] text-white/40 pl-2">
          <span className="text-[#6C5CE7]">"total"</span>: <span className="text-amber-400">42</span>
        </div>
        <div className="text-[5px] text-white/40">{"}"}</div>
      </div>
      <div className="flex gap-1">
        {["/events", "/creators", "/sponsors", "/analytics"].map((ep) => (
          <span key={ep} className="text-[4px] bg-white/[0.06] px-1 py-0.5 rounded text-white/50">
            {ep}
          </span>
        ))}
      </div>
      <Btn sm>View Docs</Btn>
    </div>
  </div>
);

const PlatformComparison = () => (
  <div className="h-full flex flex-col bg-[#0A0F1E] text-white">
    <Nav />
    <div className="flex-1 p-2 space-y-1">
      <div className="text-[7px] font-semibold">Platform Comparison</div>
      <div className="bg-white/[0.05] rounded overflow-hidden">
        <div className="flex gap-0.5 px-1.5 py-1 border-b border-white/10">
          <span className="flex-1 text-[5px] text-white/40">Feature</span>
          <span className="w-8 text-[5px] text-[#6C5CE7] font-bold text-center">RX</span>
          <span className="w-8 text-[5px] text-white/40 text-center">Whova</span>
          <span className="w-8 text-[5px] text-white/40 text-center">Grin</span>
        </div>
        {[
          "Events",
          "Creators",
          "Streaming",
          "Sponsors",
          "Verification",
          "White-label",
        ].map((f) => (
          <div key={f} className="flex gap-0.5 px-1.5 py-0.5 border-t border-white/5">
            <span className="flex-1 text-[5px] text-white/70">{f}</span>
            <span className="w-8 text-[5px] text-emerald-400 text-center">{"\u2713"}</span>
            <span className="w-8 text-[5px] text-center">
              {["Events", "Sponsors"].includes(f) ? (
                <span className="text-emerald-400">{"\u2713"}</span>
              ) : (
                <span className="text-white/20">{"\u2013"}</span>
              )}
            </span>
            <span className="w-8 text-[5px] text-center">
              {f === "Creators" ? (
                <span className="text-emerald-400">{"\u2713"}</span>
              ) : (
                <span className="text-white/20">{"\u2013"}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Exported screenshot data map                                       */
/* ------------------------------------------------------------------ */

export interface ScreenshotItem {
  label: string;
  mockup: React.ReactNode;
}

export const SCREENSHOTS: Record<string, ScreenshotItem[]> = {
  "Events & Attendee App": [
    { label: "Event Schedule", mockup: <EventSchedule /> },
    { label: "Registration Flow", mockup: <RegistrationFlow /> },
    { label: "Community Feed", mockup: <CommunityFeed /> },
    { label: "Speaker Profiles", mockup: <SpeakerProfiles /> },
    { label: "Lead Retrieval", mockup: <LeadRetrieval /> },
    { label: "Attendee App QR", mockup: <AttendeeQR /> },
  ],
  "Creator Network": [
    { label: "Creator Discovery", mockup: <CreatorDiscovery /> },
    { label: "Creator Profile", mockup: <CreatorProfile /> },
    { label: "Verification Pipeline", mockup: <VerificationPipeline /> },
    { label: "Creator Lists", mockup: <CreatorLists /> },
    { label: "Brand Safety Score", mockup: <BrandSafetyScore /> },
    { label: "Onboarding Flow", mockup: <OnboardingFlow /> },
  ],
  "365 Insights": [
    { label: "Sponsor Dashboard", mockup: <SponsorDashboard /> },
    { label: "12-Month Timeline", mockup: <MonthTimeline /> },
    { label: "ROI Summary", mockup: <ROISummary /> },
    { label: "YoY Comparison", mockup: <YoYComparison /> },
    { label: "Sponsor Report", mockup: <SponsorReport /> },
    { label: "Renewal Pipeline", mockup: <RenewalPipeline /> },
  ],
  "Streaming & Media": [
    { label: "Live Stream Studio", mockup: <LiveStreamStudio /> },
    { label: "Multi-Destination", mockup: <MultiDestination /> },
    { label: "AI Clip Generator", mockup: <AIClipGenerator /> },
    { label: "Highlight Reel", mockup: <HighlightReel /> },
    { label: "Social Distribution", mockup: <SocialDistribution /> },
    { label: "Stream Analytics", mockup: <StreamAnalytics /> },
  ],
  "Partnership Model": [
    { label: "White Label Config", mockup: <WhiteLabelConfig /> },
    { label: "License Dashboard", mockup: <LicenseDashboard /> },
    { label: "Revenue Calculator", mockup: <RevenueCalculator /> },
    { label: "Sponsor Add-On", mockup: <SponsorAddOn /> },
    { label: "API Access", mockup: <APIAccess /> },
    { label: "Platform Comparison", mockup: <PlatformComparison /> },
  ],
};

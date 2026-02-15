# CLAUDE.md — RecurrentX Project Context

## Project Overview

**RecurrentX** (milcrunch.com) — a two-sided military creator & experience platform.
- **Brands** discover, verify, and manage military/veteran influencers for events, campaigns, and partnerships
- **Creators** connect socials, get a bio page, schedule content, and track analytics
- **PDX** (RecurrentX Experience) — mobile streaming stage for military events

**Tagline:** "Stop juggling your events, creators, sponsors, and media. RecurrentX brings it all into one command center — so you can focus on the mission."
**Brand:** "recurrent" in black/white + "X" in teal (#10B981) bold. The "X" stands for "Experience".

**Owner:** Andrew Appleton (andrew@podlogix.co)
**Board Chairman:** Paul Majano

---

## Tech Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Hosting:** Vercel (auto-deploys on push to main)
- **Domain:** milcrunch.com + www.milcrunch.com (DNS via GoDaddy) — user-facing brand is RecurrentX
- **Repo:** github.com/Business-Management-Company/Veteran-Network-Hub (main branch)
- **Vercel Project:** parade-deck-demo (under Podlogix Pro team)

---

## Deploy Steps

```bash
cd ~/parade-deck
npm run build          # verify build succeeds locally
git add .
git commit -m "description of changes"
git push origin main   # triggers Vercel auto-deploy
```

Check Vercel dashboard → Deployments tab for green status.

---

## Key Directory Structure

```
~/parade-deck/
├── api/                          # Vercel serverless functions
│   ├── influencers.js            # Proxy to Influencers.club API (search/discovery)
│   ├── enrich.js                 # Proxy to Influencers.club enrichment API
│   └── credits.js                # Proxy to Influencers.club credits endpoint
├── src/
│   ├── App.tsx                   # Main router — all routes defined here
│   ├── components/
│   │   ├── auth/                 # ProtectedRoute, BrandRoute, SuperAdminRoute
│   │   ├── ui/                   # shadcn components
│   │   ├── brand/                # Brand-specific components
│   │   └── layout/               # Sidebar, TopBar, AppLayout
│   ├── integrations/supabase/    # Supabase client config
│   ├── lib/
│   │   └── influencers-club.ts   # API functions: searchCreators(), enrichCreator(), fetchCredits()
│   ├── pages/
│   │   ├── brand/                # Brand dashboard pages
│   │   │   ├── BrandDiscover.tsx # Creator discovery with search, filters, confidence scoring
│   │   │   ├── BrandDirectory.tsx
│   │   │   ├── BrandLists.tsx
│   │   │   └── ...
│   │   ├── admin/                # Admin pages (events, sponsors, etc.)
│   │   ├── superadmin/           # Super Admin pages
│   │   │   └── AdminTasks.tsx    # Kanban task board
│   │   ├── SummaryDashboard.tsx  # Main dashboard with stats + credits bar
│   │   └── Homepage.tsx          # Public homepage
│   └── contexts/                 # Auth context
├── vercel.json                   # Serverless function routing
├── .env                          # Local env vars (not committed)
└── public/                       # Static assets
```

---

## Supabase

- **Project:** swposmlpipmdwocpkfwc.supabase.co
- **Auth:** Email/password with role in user_metadata (creator | brand | admin | super_admin)
- **Super Admin account:** andrew@podlogix.co (role = super_admin)

### Key Tables
- `creator_profiles` — Creator data
- `influencer_lists` — Saved lists of creators
- `influencer_list_items` — Creators in lists
- `admin_tasks` — Task board items (kanban columns: backlog, in_progress, testing, done, bugs)
- `admin_task_checklist` — Checklist items per task
- `admin_task_notes` — Notes/comments on tasks
- `events` — Event management
- `sponsors` — Sponsor management
- `featured_creators` — Homepage featured creators

### RLS Notes
- Most tables have RLS enabled
- If inserts silently fail, check RLS policies in Supabase Dashboard → Authentication → Policies
- Super Admin tables (admin_tasks, etc.) need policies allowing super_admin role
- Common fix: Add policy "Allow authenticated users" or check role in user_metadata

---

## Environment Variables

All must be set in both `.env` (local) and Vercel (production).
**CRITICAL:** No quotes, no trailing spaces in Vercel values.

```
VITE_SUPABASE_URL=https://swposmlpipmdwocpkfwc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PROJECT_ID=swposmlpipmdwocpkfwc
VITE_INFLUENCERS_CLUB_API_KEY=<JWT token>
VITE_SERP_API_KEY=<key>
VITE_FIRECRAWL_API_KEY=<key>
VITE_PDL_API_KEY=<key>
VITE_ANTHROPIC_API_KEY=<key>
VITE_RESEND_API_KEY=<key>
VITE_UPLOAD_POST_API_KEY=<key>
```

---

## API Integrations

### Influencers.club (Primary — Creator Discovery & Enrichment)
- **Base URL:** https://api-dashboard.influencers.club
- **Search/Discovery:** POST via `/api/influencers` serverless proxy
- **Enrichment:** GET via `/api/enrich` proxy → `/public/v1/creators/enrich/handle/full/{platform}/{handle}`
- **Credits:** GET via `/api/credits` proxy → root `/` endpoint (currently 403 — awaiting permission fix)
- **Auth:** `Authorization: Bearer <JWT token>` header
- **Key file:** `src/lib/influencers-club.ts`
- **Key functions:** `searchCreators()`, `enrichCreator()`, `fetchCredits()`

### Other APIs
- **SerpAPI** — Google search data
- **Firecrawl** — Web scraping
- **PeopleDataLabs** — People enrichment
- **Anthropic** — AI assistant (Claude API for in-app chat features)
- **Resend** — Email sending
- **Upload-Post** — Social media posting SDK

---

## Vercel Serverless Functions

Located in `/api/` directory. Proxy API calls to avoid CORS and protect keys.

| Route | Upstream | Purpose |
|-------|----------|---------|
| `/api/influencers` | `api-dashboard.influencers.club` | Search/discovery |
| `/api/enrich` | `api-dashboard.influencers.club/public/v1/creators/enrich/handle/full/` | Creator enrichment |
| `/api/credits` | `api-dashboard.influencers.club/` | Credit usage |

Functions read API key from `Authorization` header passed by the frontend, or fall back to `process.env.VITE_INFLUENCERS_CLUB_API_KEY`.

---

## Discovery Page (BrandDiscover.tsx)

The most complex page. Key details:

### Search & Filters
- AI search via `ai_search` parameter to Influencers.club
- Filters: Platform, Followers, Engagement, Location, Niche, Gender, Language, Keywords in Bio
- Military Branch toggles (Army, Navy, Air Force, Marines, Coast Guard)
- 50 results per page with "Load More" pagination

### Confidence Scoring (Client-Side)
- High Match (green, ≥60%), Mid Match (yellow, ≥30%), Low Match (red, <30%)
- Checks: bio keywords, hashtags, niche, category, specialties, name, username, external links
- Military boost: +40% for bio matches, +30% for name/username matches

### Creator Cards
- Avatar, name, username, verified badge, email badge (blue)
- Platform icons (bordered square style)
- Stats row: Followers, Engagement Rate, External Links count
- Bio preview (2-line clamp), niche tags (max 3)
- "Add to List" button, click card → enrichment profile modal

---

## Role-Based Routing

```
/                    → Homepage (public)
/login, /signup      → Auth pages
/brand/*             → Brand dashboard (brand or super_admin role)
/brand/discover      → Creator discovery
/brand/lists         → Saved lists
/brand/directory     → Directories (placeholder)
/admin/*             → Admin panel (events, sponsors, etc.)
/admin/tasks         → Task board (super_admin only)
```

---

## Coding Conventions

- **sed on Mac:** `sed -i '' 's|old|new|' file` (BSD sed needs empty string after -i)
- **Always build before push:** `npm run build` catches TypeScript/syntax errors
- **Inspect before editing:** `grep -n` or `sed -n 'start,endp'` to find exact lines
- **Tailwind classes:** Use `cn()` utility for conditional classes
- **shadcn imports:** `@/components/ui/`
- **Supabase client:** `@/integrations/supabase/client`
- **Icons:** Lucide React
- **Brand colors:** Navy (#000741), Blue (#0064B1), pd-blue, pd-darkblue
- **Serverless functions:** `/api/` directory as `.js` files
- **Error handling:** Always destructure `{ data, error }` from Supabase, log and alert on failure
- **Never use heredocs in sed:** They corrupt files. Use `str_replace` or write temp files.

---

## Common Issues & Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| Build fails after sed | Duplicate code blocks from multi-line sed | Inspect with `sed -n`, delete duplicates |
| White page on deploy | Quoted env var in Vercel | Remove quotes from all VITE_* values |
| API returning 401 | Missing Bearer prefix | Ensure `Authorization: Bearer <token>` |
| Supabase insert fails silently | RLS policy blocking | Add appropriate policy in Supabase dashboard |
| vercel.json build error | Non-JSON content in file | Ensure only valid JSON, no comments/bash |
| Discovery returns 0 results | Wrong API proxy path | Check `/api/influencers` proxy → correct upstream URL |

---

## Current Priorities (February 2026)

1. **Fix task board** — admin_tasks RLS policy likely blocking inserts
2. **Discovery card icons** — Replace letter circles with real platform icons, make clickable
3. **Credits dashboard** — Waiting on Influencers.club to enable credits endpoint access
4. **AI Chat in Super Admin** — Full spec exists for Claude-powered task management
5. **Save search feature** — Save filter combinations for reuse
6. **Lists page redesign** — Match Influencers.club style
7. **Email system** — Credit-based email tool with in-app send/receive
8. **Tag system** — Create, assign, and search by tags
9. **Recurrent.io pitch** — Position ParadeDeck as year-round community for Military.com

---

## Planned Feature: Super Admin AI Chat

Full spec exists for `/admin/chat`:
- Claude API-powered chat inside Super Admin
- Function calling: createTask(), updateTask(), toggleChecklistItem(), addTaskNote(), logDeployment()
- Chat history in Supabase (`admin_chat_messages` table)
- Floating chat bubble on all /admin pages
- Context injection: current board state included in every system prompt
- Quick action buttons: Project Status, What's Next, Generate Checklist

---

## Related Projects

- **CreatorPixel** (creatorpixel.app) — First-party data platform, Linktree alternative
  - Repo: Business-Management-Company/creator-data-platform
  - Supabase: ptgidiolwzkrkajezvhs.supabase.co
- **TruckingLanes.com** — AI dashboard for freight brokers

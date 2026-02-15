type Branch = "Army" | "Navy" | "Air Force" | "Marines" | "Coast Guard";

export interface SmartParseResult {
  remainingQuery: string;
  platform: string | null;
  followersRange: string | null;
  engagementMin: string | null;
  branches: Branch[];
  location: string | null;
  appliedLabels: string[];
}

function parseNumber(s: string): number | null {
  s = s.replace(/,/g, "").trim();
  const mMatch = s.match(/^([\d.]+)\s*[mM]$/);
  if (mMatch) return parseFloat(mMatch[1]) * 1_000_000;
  const kMatch = s.match(/^([\d.]+)\s*[kK]$/);
  if (kMatch) return parseFloat(kMatch[1]) * 1_000;
  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

const FOLLOWER_THRESHOLDS = [
  { min: 1_000_000, value: "mega", label: "1M+" },
  { min: 500_000, value: "macro", label: "500K+" },
  { min: 100_000, value: "mid", label: "100K+" },
  { min: 50_000, value: "mid-micro", label: "50K+" },
  { min: 10_000, value: "micro", label: "10K+" },
  { min: 1_000, value: "nano", label: "1K+" },
] as const;

function findFollowerRange(minVal: number): { value: string; label: string } {
  for (const t of FOLLOWER_THRESHOLDS) {
    if (minVal >= t.min) return { value: t.value, label: t.label };
  }
  return { value: "nano", label: "1K+" };
}

export function parseSmartQuery(query: string): SmartParseResult {
  // Skip smart parsing for username searches
  if (query.trim().startsWith("@")) {
    return { remainingQuery: query, platform: null, followersRange: null, engagementMin: null, branches: [], location: null, appliedLabels: [] };
  }

  let remaining = query;
  const appliedLabels: string[] = [];
  let platform: string | null = null;
  let followersRange: string | null = null;
  let engagementMin: string | null = null;
  const branches: Branch[] = [];
  let location: string | null = null;

  // --- Branch detection ---
  const branchPatterns: { pattern: RegExp; branch: Branch; label: string }[] = [
    { pattern: /\b(?:marine\s+corps|marines|usmc)\b/i, branch: "Marines", label: "Marines" },
    { pattern: /\b(?:army)\b/i, branch: "Army", label: "Army" },
    { pattern: /\b(?:navy|usn)\b/i, branch: "Navy", label: "Navy" },
    { pattern: /\b(?:air\s+force|usaf)\b/i, branch: "Air Force", label: "Air Force" },
    { pattern: /\b(?:coast\s+guard|uscg)\b/i, branch: "Coast Guard", label: "Coast Guard" },
  ];
  for (const bp of branchPatterns) {
    if (bp.pattern.test(remaining)) {
      remaining = remaining.replace(bp.pattern, " ");
      if (!branches.includes(bp.branch)) {
        branches.push(bp.branch);
        appliedLabels.push(bp.label);
      }
    }
  }

  // --- Follower count detection ---
  const followerMinPatterns = [
    /(?:over|more\s+than|at\s+least|above)\s+([\d,.]+\s*[kKmM]?)\+?\s*(?:followers?)?/i,
    /([\d,.]+\s*[kKmM]?)\+\s*(?:followers?)?/i,
    /([\d,.]+\s*[kKmM]?)\s+(?:or\s+more|and\s+above|and\s+up)\s*(?:followers?)?/i,
    /\b([\d,.]+\s*[kKmM]?)\s+followers?\b/i,
  ];
  for (const fp of followerMinPatterns) {
    const match = remaining.match(fp);
    if (match && !followersRange) {
      const num = parseNumber(match[1]);
      if (num && num >= 1000) {
        const range = findFollowerRange(num);
        followersRange = range.value;
        appliedLabels.push(`${range.label} followers`);
        remaining = remaining.replace(match[0], " ");
        break;
      }
    }
  }
  // Clean up orphaned "followers" word
  remaining = remaining.replace(/\bfollowers?\b/i, " ");

  // --- Engagement detection ---
  const engagementPatterns = [
    /(?:over|more\s+than|at\s+least|above|>)\s*([\d.]+)\s*%?\s*engagement(?:\s*rate)?/i,
    /([\d.]+)\s*%\+?\s*engagement(?:\s*rate)?/i,
    /\bhigh\s+engagement\b/i,
  ];
  for (const ep of engagementPatterns) {
    const match = remaining.match(ep);
    if (match && !engagementMin) {
      if (/high\s+engagement/i.test(match[0])) {
        engagementMin = "3";
        appliedLabels.push(">3% engagement");
      } else {
        const val = parseFloat(match[1]);
        if (val >= 1) {
          const options = [1, 2, 3, 5];
          const closest = options.reduce((prev, curr) =>
            Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev
          );
          engagementMin = String(closest);
          appliedLabels.push(`>${closest}% engagement`);
        }
      }
      remaining = remaining.replace(match[0], " ");
      break;
    }
  }

  // --- Platform detection ---
  const platformPatterns: { pattern: RegExp; value: string; label: string }[] = [
    { pattern: /\b(?:on\s+)?tiktok\b/i, value: "tiktok", label: "TikTok" },
    { pattern: /\b(?:on\s+)?youtube\b/i, value: "youtube", label: "YouTube" },
    { pattern: /\b(?:on\s+)?instagram\b/i, value: "instagram", label: "Instagram" },
    { pattern: /\b(?:on\s+)?(?:twitter(?:\/x)?|x\.com)\b/i, value: "twitter", label: "Twitter/X" },
  ];
  for (const pp of platformPatterns) {
    const match = remaining.match(pp.pattern);
    if (match && !platform) {
      platform = pp.value;
      appliedLabels.push(pp.label);
      remaining = remaining.replace(match[0], " ");
      break;
    }
  }

  // --- Location detection ---
  const locationMatch = remaining.match(
    /\b(based\s+in|located\s+in|in|from)\s+([A-Za-z][A-Za-z\s,]{1,40}?)(?=\s+(?:with|who|that|and|over|more|at|on|under|having|above)\b|\s*$)/i
  );
  if (locationMatch && !location) {
    const loc = locationMatch[2].trim().replace(/,\s*$/, "");
    if (loc.length >= 2) {
      location = loc;
      appliedLabels.push(loc);
      remaining = remaining.replace(locationMatch[0], " ");
    }
  }

  // --- Clean up remaining text ---
  remaining = remaining
    .replace(/\bwith\b/gi, " ")
    .replace(/\bwho\s+(?:have|has|are|is)\b/gi, " ")
    .replace(/\bthat\s+(?:have|has|are|is)\b/gi, " ")
    .replace(/\bhaving\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { remainingQuery: remaining, platform, followersRange, engagementMin, branches, location, appliedLabels };
}

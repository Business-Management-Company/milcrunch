import Papa from "papaparse";
import type { ListCreator } from "@/contexts/ListContext";

/** Shape of a single parsed IC CSV row after column mapping */
export interface ICImportRow {
  contact_email: string | null;
  contact_phone: string | null;
  display_name: string;
  handle: string;
  instagram_url: string | null;
  location: string | null;
  gender: string | null;
  bio: string | null;
  language: string | null;
  follower_count: number;
  engagement_rate: number;
  avatar_url: string | null;
  platform: string;
  ic_data: Record<string, string>;
}

export interface CSVParseResult {
  rows: ICImportRow[];
  totalRawRows: number;
  skippedRows: number;
  columnsMapped: string[];
}

function findCol(fields: string[], pattern: RegExp): string | undefined {
  return fields.find((f) => pattern.test(f.trim()));
}

export function parseICCSV(text: string): CSVParseResult {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const fields = result.meta.fields ?? [];

  const emailKey = findCol(fields, /^email$/i);
  const phoneKey = findCol(fields, /^phone[_\s]?number$/i);
  const nameKey = findCol(fields, /^full[_\s]?name$/i);
  const usernameKey = findCol(fields, /^username$/i);
  const urlKey = findCol(fields, /^url$/i);
  const cityKey = findCol(fields, /^city$/i);
  const stateKey = findCol(fields, /^state$/i);
  const genderKey = findCol(fields, /^gender$/i);
  const bioKey = findCol(fields, /^biography$/i);
  const langKey = findCol(fields, /^language$/i);
  const followersKey = findCol(fields, /^followers$/i);
  const engRateKey = findCol(fields, /^engagement[_\s]?rate$/i);
  const avatarKey =
    findCol(fields, /^picture$/i) ||
    findCol(fields, /^profile[_\s]?pic/i) ||
    findCol(fields, /^avatar/i);
  const platformKey = findCol(fields, /^platform$/i);

  const columnsMapped = [
    emailKey, phoneKey, nameKey, usernameKey, urlKey, cityKey,
    stateKey, genderKey, bioKey, langKey, followersKey, engRateKey,
    avatarKey, platformKey,
  ].filter(Boolean) as string[];

  const rows: ICImportRow[] = [];
  let skippedRows = 0;

  for (const raw of result.data) {
    const username = usernameKey ? (raw[usernameKey] ?? "").trim() : "";
    const name = nameKey ? (raw[nameKey] ?? "").trim() : "";

    if (!username && !name) {
      skippedRows++;
      continue;
    }

    const city = cityKey ? (raw[cityKey] ?? "").trim() : "";
    const state = stateKey ? (raw[stateKey] ?? "").trim() : "";
    const location = [city, state].filter(Boolean).join(", ") || null;

    const followersStr = followersKey ? (raw[followersKey] ?? "0").trim() : "0";
    const engRateStr = engRateKey ? (raw[engRateKey] ?? "0").trim() : "0";

    rows.push({
      contact_email: emailKey ? (raw[emailKey] ?? "").trim() || null : null,
      contact_phone: phoneKey ? (raw[phoneKey] ?? "").trim() || null : null,
      display_name: name || username,
      handle: username,
      instagram_url: urlKey ? (raw[urlKey] ?? "").trim() || null : null,
      location,
      gender: genderKey ? (raw[genderKey] ?? "").trim() || null : null,
      bio: bioKey ? (raw[bioKey] ?? "").trim() || null : null,
      language: langKey ? (raw[langKey] ?? "").trim() || null : null,
      follower_count: parseFloat(followersStr) || 0,
      engagement_rate: parseFloat(engRateStr) || 0,
      avatar_url: avatarKey ? (raw[avatarKey] ?? "").trim() || null : null,
      platform: platformKey
        ? (raw[platformKey] ?? "instagram").trim().toLowerCase()
        : "instagram",
      ic_data: { ...raw },
    });
  }

  return { rows, totalRawRows: result.data.length, skippedRows, columnsMapped };
}

export function importRowToListCreator(row: ICImportRow): ListCreator {
  return {
    id: `ic-${row.handle || row.display_name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: row.display_name,
    username: row.handle || undefined,
    avatar:
      row.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(row.display_name)}&background=6C5CE7&color=fff&size=128`,
    followers: row.follower_count,
    engagementRate: row.engagement_rate,
    platforms: [row.platform],
    bio: row.bio || "",
    location: row.location || undefined,
    email: row.contact_email || undefined,
    enrichmentStatus: row.contact_email ? "enriched" : "none",
    importSource: "influencers_club",
  };
}

export function importRowToSupabaseItem(row: ICImportRow, listId: string) {
  return {
    list_id: listId,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    display_name: row.display_name,
    handle: row.handle,
    instagram_url: row.instagram_url,
    location: row.location,
    gender: row.gender,
    bio: row.bio,
    language: row.language,
    follower_count: row.follower_count,
    engagement_rate: row.engagement_rate,
    ic_data: row.ic_data,
    import_source: "influencers_club",
    imported_at: new Date().toISOString(),
  };
}

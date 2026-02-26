/**
 * Resolve the best avatar URL from a creator-like object.
 * Works with any shape: directory_members, creator_profiles, verifications, speakers, etc.
 * Returns the first non-empty HTTPS URL, or null.
 */
export function getCreatorAvatar(creator: any): string | null {
  const url = (
    creator?.ic_avatar_url
    || creator?.avatar_url
    || creator?.profile_image_url
    || creator?.profile_photo
    || creator?.photo_url
    || creator?.profile_photo_url
    || null
  );
  if (!url) return null;
  if (typeof url === 'string' && url.startsWith('https://')) return url;
  // Accept http:// URLs too (e.g. CloudFront) — upgrade to https
  if (typeof url === 'string' && url.startsWith('http://')) return url.replace('http://', 'https://');
  return null;
}

/** First letter of name, uppercased. Returns '?' if name is empty. */
export function getAvatarFallback(name: string): string {
  return name?.trim()?.charAt(0)?.toUpperCase() || '?';
}

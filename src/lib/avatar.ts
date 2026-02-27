/**
 * Sanitise a candidate URL: accept https:// and upgrade http:// to https://.
 * Returns null for anything else (empty, data-uri, blob, etc.).
 */
function sanitiseUrl(url: unknown): string | null {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('https://')) return url;
  if (url.startsWith('http://')) return url.replace('http://', 'https://');
  return null;
}

/**
 * Resolve the best avatar URL from a creator-like object.
 *
 * Priority (matches the directory_members image fields):
 *   profile_image_url → avatar_url → ic_avatar_url
 *
 * Additional fallbacks for speaker / verification shapes:
 *   photo_url → profile_photo_url → profile_photo
 */
export function getCreatorAvatar(creator: any): string | null {
  return (
    sanitiseUrl(creator?.profile_image_url)
    ?? sanitiseUrl(creator?.avatar_url)
    ?? sanitiseUrl(creator?.ic_avatar_url)
    ?? sanitiseUrl(creator?.photo_url)
    ?? sanitiseUrl(creator?.profile_photo_url)
    ?? sanitiseUrl(creator?.profile_photo)
    ?? null
  );
}

/** First letter of name, uppercased. Returns '?' if name is empty. */
export function getAvatarFallback(name: string): string {
  return name?.trim()?.charAt(0)?.toUpperCase() || '?';
}

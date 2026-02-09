/**
 * Extract dominant color from an image (URL or img element) for bio page background blur.
 * Uses colorthief; returns hex string or null.
 */
// @ts-expect-error colorthief has no types
import ColorThief from "colorthief";
const colorThief = new ColorThief();

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("");
}

function parseRgb(rgb: unknown): [number, number, number] | null {
  if (Array.isArray(rgb) && rgb.length >= 3) {
    return [Number(rgb[0]), Number(rgb[1]), Number(rgb[2])];
  }
  if (rgb && typeof rgb === "object" && "r" in rgb && "g" in rgb && "b" in rgb) {
    const o = rgb as { r: number; g: number; b: number };
    return [o.r, o.g, o.b];
  }
  return null;
}

/** Get dominant color from an image URL. Returns hex (e.g. "#3a7d44") or null. */
export function getDominantColorFromUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const rgb = colorThief.getColor(img);
        const parsed = parseRgb(rgb);
        resolve(parsed ? rgbToHex(parsed[0], parsed[1], parsed[2]) : null);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Get dominant color from a File (e.g. user upload). Uses object URL. */
export async function getDominantColorFromFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    return await getDominantColorFromUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

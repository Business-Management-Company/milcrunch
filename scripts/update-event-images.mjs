import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://swposmlpipmdwocpkfwc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3cG9zbWxwaXBtZHdvY3BrZndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjUyNjYsImV4cCI6MjA4MDM0MTI2Nn0.354lgZU9NPfQndeFR9-BCuI2Bkkc00FIQoudoFHK9c8"
);

// City image mappings - match on title OR city column
const CITY_IMAGES = [
  { match: "San Antonio", image: "https://images.unsplash.com/photo-1595880500386-4b33c4ccd811?w=800&q=80" },
  { match: "Fort Campbell", image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80" },
  { match: "Fort Benning", image: "https://images.unsplash.com/photo-1570366583862-f91883984fde?w=800&q=80" },
  { match: "Columbus", image: "https://images.unsplash.com/photo-1570366583862-f91883984fde?w=800&q=80" },
  { match: "Colorado Springs", image: "https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=800&q=80" },
  { match: "San Diego", image: "https://images.unsplash.com/photo-1538964173425-93884e1dc85f?w=800&q=80" },
  { match: "Norfolk", image: "https://images.unsplash.com/photo-1569171083498-a0e6c1e63060?w=800&q=80" },
  { match: "San Juan", image: "https://images.unsplash.com/photo-1513622470380-eb4f8918be84?w=800&q=80" },
  { match: "Osan", image: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80" },
  { match: "Humphreys", image: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80" },
  { match: "Washington", image: "https://images.unsplash.com/photo-1617581629397-a72507c3de9e?w=800&q=80" },
];

// Fallback images for events that don't match any city
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80", // conference crowd
  "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80", // conference stage
  "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80", // event hall
  "https://images.unsplash.com/photo-1559223607-a43c990c692c?w=800&q=80", // military event
  "https://images.unsplash.com/photo-1587825140708-dfaf18c9c7c5?w=800&q=80", // networking
];

async function main() {
  // Fetch all events
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, city, state, venue, cover_image_url");

  if (error) {
    console.error("Failed to fetch events:", error.message);
    return;
  }

  console.log(`Found ${events.length} events total`);

  let updated = 0;
  let fallbackIdx = 0;

  for (const event of events) {
    // Try to match by city or title
    let imageUrl = null;

    for (const mapping of CITY_IMAGES) {
      const searchTerm = mapping.match.toLowerCase();
      if (
        (event.title || "").toLowerCase().includes(searchTerm) ||
        (event.city || "").toLowerCase().includes(searchTerm) ||
        (event.venue || "").toLowerCase().includes(searchTerm)
      ) {
        imageUrl = mapping.image;
        break;
      }
    }

    // If no city match and no existing image, use fallback
    if (!imageUrl && !event.cover_image_url) {
      imageUrl = FALLBACK_IMAGES[fallbackIdx % FALLBACK_IMAGES.length];
      fallbackIdx++;
    }

    // If we matched a city image, always update (even if there's an existing image)
    // If it's a fallback, only update if there's no image
    if (imageUrl) {
      const { error: updateError } = await supabase
        .from("events")
        .update({ cover_image_url: imageUrl })
        .eq("id", event.id);

      if (updateError) {
        console.error(`  FAIL: ${event.title} - ${updateError.message}`);
      } else {
        console.log(`  OK: "${event.title}" -> ${imageUrl.split("?")[0].split("/").pop()}`);
        updated++;
      }
    } else {
      console.log(`  SKIP: "${event.title}" (already has image)`);
    }
  }

  console.log(`\nDone. Updated ${updated} events.`);
}

main();

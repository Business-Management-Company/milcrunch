/**
 * ~200 major US cities, military installations, and key international military locations.
 * Format: "City, ST" for US; "City, Country" for international.
 */
export interface CityOption {
  label: string;  // "San Antonio, TX"
  city: string;   // "San Antonio"
  state: string;  // "TX"
}

const CITIES_RAW = [
  // Top US cities
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ",
  "Philadelphia, PA", "San Antonio, TX", "San Diego, CA", "Dallas, TX", "San Jose, CA",
  "Austin, TX", "Jacksonville, FL", "Fort Worth, TX", "Columbus, OH", "Charlotte, NC",
  "Indianapolis, IN", "San Francisco, CA", "Seattle, WA", "Denver, CO", "Nashville, TN",
  "Oklahoma City, OK", "Washington, DC", "El Paso, TX", "Boston, MA", "Portland, OR",
  "Las Vegas, NV", "Memphis, TN", "Louisville, KY", "Baltimore, MD", "Milwaukee, WI",
  "Albuquerque, NM", "Tucson, AZ", "Fresno, CA", "Sacramento, CA", "Mesa, AZ",
  "Kansas City, MO", "Atlanta, GA", "Omaha, NE", "Colorado Springs, CO", "Raleigh, NC",
  "Long Beach, CA", "Virginia Beach, VA", "Miami, FL", "Oakland, CA", "Minneapolis, MN",
  "Tampa, FL", "Tulsa, OK", "Arlington, TX", "New Orleans, LA", "Wichita, KS",
  "Cleveland, OH", "Bakersfield, CA", "Aurora, CO", "Anaheim, CA", "Honolulu, HI",
  "Santa Ana, CA", "Riverside, CA", "Corpus Christi, TX", "Lexington, KY", "Pittsburgh, PA",
  "Anchorage, AK", "Stockton, CA", "Cincinnati, OH", "St. Paul, MN", "Greensboro, NC",
  "Toledo, OH", "Newark, NJ", "Plano, TX", "Henderson, NV", "Lincoln, NE",
  "Orlando, FL", "Jersey City, NJ", "Chandler, AZ", "St. Louis, MO", "Norfolk, VA",
  "Durham, NC", "Madison, WI", "Lubbock, TX", "Winston-Salem, NC", "Baton Rouge, LA",
  "Reno, NV", "Chesapeake, VA", "Irving, TX", "Scottsdale, AZ", "North Las Vegas, NV",
  "Fremont, CA", "Gilbert, AZ", "Boise, ID", "Richmond, VA", "Spokane, WA",
  "Des Moines, IA", "Montgomery, AL", "Fayetteville, NC", "Tacoma, WA", "Shreveport, LA",
  "Salt Lake City, UT", "Huntsville, AL", "Savannah, GA", "Tallahassee, FL",
  "Little Rock, AR", "Columbia, SC", "Charleston, SC", "Pensacola, FL", "Knoxville, TN",
  // Military installations / bases
  "Fort Liberty, NC", "Fort Cavazos, TX", "Fort Moore, GA", "Fort Campbell, KY",
  "Fort Eisenhower, GA", "Fort Johnson, LA", "Fort Novosel, AL", "Fort Drum, NY",
  "Fort Stewart, GA", "Fort Carson, CO", "Fort Bliss, TX", "Fort Riley, KS",
  "Fort Sill, OK", "Fort Huachuca, AZ", "Fort Leavenworth, KS", "Fort Leonard Wood, MO",
  "Fort Wainwright, AK", "Fort Gregg-Adams, VA", "Fort Meade, MD",
  "Joint Base Lewis-McChord, WA", "Joint Base San Antonio, TX", "Joint Base Pearl Harbor-Hickam, HI",
  "Joint Base Langley-Eustis, VA", "Joint Base Andrews, MD", "Joint Base McGuire-Dix-Lakehurst, NJ",
  "Camp Pendleton, CA", "Camp Lejeune, NC", "MCB Quantico, VA", "MCAS Miramar, CA",
  "Naval Station Norfolk, VA", "Naval Base San Diego, CA", "Naval Station Mayport, FL",
  "NAS Pensacola, FL", "NAS Jacksonville, FL", "NAS Oceana, VA",
  "Peterson SFB, CO", "Eglin AFB, FL", "Wright-Patterson AFB, OH", "Travis AFB, CA",
  "MacDill AFB, FL", "Nellis AFB, NV", "Offutt AFB, NE", "Scott AFB, IL",
  "Luke AFB, AZ", "Tinker AFB, OK", "Hill AFB, UT", "Barksdale AFB, LA",
  "Edwards AFB, CA", "Lackland AFB, TX", "Hurlburt Field, FL", "Robins AFB, GA",
  "Buckley SFB, CO", "Patrick SFB, FL",
  // Key international military-related locations
  "Osan, South Korea", "Pyeongtaek, South Korea", "Seoul, South Korea",
  "Yokosuka, Japan", "Yokota, Japan", "Okinawa, Japan", "Iwakuni, Japan",
  "Ramstein, Germany", "Stuttgart, Germany", "Grafenwoehr, Germany", "Wiesbaden, Germany",
  "Vicenza, Italy", "Naples, Italy", "Sigonella, Italy",
  "Rota, Spain", "Bahrain",
  "Guam, GU", "San Juan, PR", "Honolulu, HI",
];

export const US_CITIES: CityOption[] = CITIES_RAW.map((raw) => {
  const lastComma = raw.lastIndexOf(",");
  if (lastComma === -1) {
    return { label: raw, city: raw, state: "" };
  }
  const city = raw.slice(0, lastComma).trim();
  const state = raw.slice(lastComma + 1).trim();
  return { label: raw, city, state };
});

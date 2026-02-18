import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Hardcoded to prevent Vercel env var misconfiguration (anon key is public).
// Also accept env vars as override so local dev can point elsewhere if needed.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://swposmlpipmdwocpkfwc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3cG9zbWxwaXBtZHdvY3BrZndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjUyNjYsImV4cCI6MjA4MDM0MTI2Nn0.354lgZU9NPfQndeFR9-BCuI2Bkkc00FIQoudoFHK9c8";

// Temporary debug: see what Vercel actually injects
console.log('SUPABASE URL:', SUPABASE_URL);
console.log('ANON KEY (first 20 chars):', (import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'undefined')?.substring(0, 20));
console.log('PUBLISHABLE KEY (first 20 chars):', (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'undefined')?.substring(0, 20));
console.log('PUBLISHABLE KEY length:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.length ?? 'N/A');

// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
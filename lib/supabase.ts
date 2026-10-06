import { createClient } from "@supabase/supabase-js";

// Ensure environment variables are loaded correctly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Initialize the Supabase Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { supabase } from "../lib/supabase";

async function run() {
  // We can try to fetch one record to see the keys
  const { data, error } = await supabase.from('customers').select('*').limit(1);
  if (error) {
    console.error("Error fetching customer:", error);
    // If it fails because of a missing column, we can try to find all column names via a generic query
    // Supabase JS doesn't have a direct "describe table" but we can try to insert an empty object to get schema errors or similar
  } else {
    console.log("Customer record keys:", data?.[0] ? Object.keys(data[0]) : "No records found");
  }
}

run();

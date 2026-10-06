import { supabase } from "../lib/supabase";

async function debug() {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .ilike('first_name', '%Kenneth%');
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Kenneth records:", JSON.stringify(data, null, 2));
  }
}

debug();

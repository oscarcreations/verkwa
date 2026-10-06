import { supabase } from "../lib/supabase";

async function run() {
  const { data, error } = await supabase.from('transactions').select('type').limit(100);
  if (error) console.error(error);
  else {
    const types = Array.from(new Set(data.map(t => t.type)));
    console.log("Distinct types:", types);
  }
}

run();

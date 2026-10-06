import { supabase } from "../lib/supabase";

async function run() {
  const { data, error } = await supabase.from('staff').select('first_name, last_name, role, email');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

run();

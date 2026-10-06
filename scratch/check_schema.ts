import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
  const { data, error } = await supabase.from('transactions').select('type').limit(10);
  console.log('Types:', data);
  
  const { data: tables, error: tableError } = await supabase.rpc('get_tables'); // Mocking RPC check
  console.log('Tables:', tables);
}

// run(); // Not actually running since I don't have env vars in scratch scripts usually, 
// but I can use the existing supabase export if I was in the same environment.

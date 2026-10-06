const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if(match) process.env[match[1]] = match[2];
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  // Try calling the PostgREST RPC to check relations or just see if the error is exactly about the FK cache
  const { data, error } = await supabase
        .from('client_requests')
        .select('*, customers!inner(*)')
        .limit(1);
  console.log('Error:', error);
}
run();

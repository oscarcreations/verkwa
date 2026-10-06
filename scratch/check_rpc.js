const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if(match) process.env[match[1]] = match[2];
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.rpc('get_dashboard_stats', { p_employee_id: null });
  console.log('RPC Data:', JSON.stringify(data, null, 2));
  if (error) console.log('RPC Error:', error);
}
run();

const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if(match) process.env[match[1]] = match[2];
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.rpc('get_policies'); // Supabase RPCs usually don't exist by default for this
  // Let's test inserting as a client
  const { data: cust, error: custErr } = await supabase.from('customers').select('*').limit(1);
  if (cust && cust.length > 0) {
     const { error: reqError } = await supabase.from('client_requests').insert([{
       customer_id: cust[0].id, type: 'Deposit', amount: 10, details: 'Test', status: 'Approved'
     }]);
     console.log('Insert error:', reqError);
  }
}
run();

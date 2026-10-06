const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if(match) process.env[match[1]] = match[2];
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data: cols, error: err } = await supabase.from('customers').select('*').limit(1);
  console.log('customers:', cols && cols[0] ? Object.keys(cols[0]) : err);
  const { data: t, error: e } = await supabase.from('transactions').select('*').limit(1);
  console.log('transactions:', t && t[0] ? Object.keys(t[0]) : e);
  const { data: errorLog, error: logErr } = await supabase.from('transactions').insert([{customer_id: cols[0].id, amount: 10, type: 'Deposit', status: 'approved', deposit_by: 'Test'}]);
  console.log('test insert:', errorLog, logErr);
}
run();

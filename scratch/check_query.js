const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if(match) process.env[match[1]] = match[2];
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase
        .from('client_requests')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            account_num,
            branch_id
          )
        `)
        .eq('status', 'Pending')
        .order('created_at', { ascending: false });
  console.log('Query result:', JSON.stringify(data, null, 2));
  if (error) console.log('Error:', error);
}
run();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(url, key);

async function wipeData() {
  console.log('Initiating database wipe (using Anon Key)...');
  
  try {
    // We try to delete everything. If RLS blocks it, we might need a Service Role Key.
    const { error: err1 } = await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err1) console.error('Transactions error:', err1.message);
    else console.log('✓ Transactions wiped');

    const { error: err2 } = await supabase.from('client_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err2) console.error('Requests error:', err2.message);
    else console.log('✓ Client requests wiped');

    const { error: err3 } = await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err3) console.error('Customers error:', err3.message);
    else console.log('✓ Customers wiped');

    console.log('Database cleanup complete.');
  } catch (err) {
    console.error('Fatal error during wipe:', err);
  }
}

wipeData();

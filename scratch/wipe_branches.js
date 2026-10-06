const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(url, key);

async function wipeBranches() {
  console.log('Initiating branch wipe...');
  
  try {
    // 1. Unlink employees from branches (to avoid FK errors)
    const { error: err1 } = await supabase.from('employees').update({ branch_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    if (err1) console.error('Unlinking employees error:', err1.message);
    else console.log('✓ Employees unlinked from branches');

    // 2. Clear transactions (already done but safe to repeat)
    await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 3. Clear branches
    const { error: err2 } = await supabase.from('branches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err2) console.error('Branches error:', err2.message);
    else console.log('✓ Branches wiped');

    console.log('Branch cleanup complete.');
  } catch (err) {
    console.error('Fatal error during branch wipe:', err);
  }
}

wipeBranches();

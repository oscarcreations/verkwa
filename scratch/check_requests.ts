import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
  console.log('Checking client_requests table...');
  const { data, error } = await supabase.from('client_requests').select('*').limit(1);
  
  if (error) {
    console.error('Error selecting from client_requests:', error);
  } else {
    console.log('Successfully selected from client_requests. Data:', data);
  }

  // Check column names
  const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'client_requests' });
  if (colError) {
    // If RPC doesn't exist, try a simple query to see if columns are there
    const { error: refError } = await supabase.from('client_requests').select('reference').limit(1);
    console.log('Reference column check:', refError ? 'FAILED: ' + refError.message : 'OK');
  } else {
    console.log('Columns:', cols);
  }
}

check();

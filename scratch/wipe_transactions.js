const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://geybirnuvlhopiccbbiu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdleWJpcm51dmxob3BpY2NiYml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDU0MDMsImV4cCI6MjA5MjEyMTQwM30.2q_j2lSfZ4gt1Bg2avoUZSJBuuZ0MaoonhK8WbxHBwY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function wipeData() {
  console.log('Initiating data cleanup...');

  // Wipe transactions
  const { error: txError } = await supabase
    .from('transactions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (txError) {
    console.error('Error wiping transactions:', txError);
  } else {
    console.log('Successfully wiped transactions.');
  }

  // Wipe client requests
  const { error: reqError } = await supabase
    .from('client_requests')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (reqError) {
    console.error('Error wiping client requests:', reqError);
  } else {
    console.log('Successfully wiped client requests.');
  }

  console.log('Cleanup complete.');
}

wipeData();

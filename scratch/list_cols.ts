import { supabase } from '../lib/supabase';

async function listColumns() {
  const { data: customers, error: cErr } = await supabase.from('customers').select('*').limit(1);
  console.log('Customer Columns:', Object.keys(customers?.[0] || {}));
  
  const { data: transactions, error: tErr } = await supabase.from('transactions').select('*').limit(1);
  console.log('Transaction Columns:', Object.keys(transactions?.[0] || {}));
}

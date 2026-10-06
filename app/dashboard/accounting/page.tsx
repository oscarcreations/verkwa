"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthSync } from "@/lib/hooks/useAuthSync";
import Link from "next/link";

export default function AccountingPage() {
  const { resolvedRole, employeeId, isSyncing } = useAuthSync();
  const role = (resolvedRole || "").toLowerCase();
  const isAdmin = ["administrator", "admin", "superadmin"].includes(role);
  const isRestricted = !isAdmin && role !== "client" && role !== "";
  
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState({
    income: 0,
    expenses: 0,
    cashOnHand: 0,
    reservedCapital: 0
  });
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  
  // Reserve Management State
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [reserveFormData, setReserveFormData] = useState({
    amount: "",
    type: "Reserve" as "Reserve" | "Release",
    branch_id: "",
    details: ""
  });

  useEffect(() => {
    async function fetchAccountingData() {
      try {
        setLoading(true);
        const { data: rpcData, error } = await supabase.rpc('get_dashboard_stats', {
          p_employee_id: isRestricted ? employeeId : null
        });

        if (error) throw error;

        const income = rpcData?.financials?.revenue?.total || 0;
        const expenses = rpcData?.financials?.withdrawals?.total || 0;

        // Fetch total reserved capital from transactions (system-wide)
        const { data: resData } = await supabase
          .from('transactions')
          .select('amount, type')
          .in('type', ['Reserve', 'Release'])
          .in('status', ['ok', 'approved', 'completed', 'sent']);
        
        const totalReserved = (resData || []).reduce((acc: number, curr: any) => {
          if (curr.type === 'Reserve') return acc + Number(curr.amount);
          if (curr.type === 'Release') return acc - Number(curr.amount);
          return acc;
        }, 0);

        setFinancials({
          income,
          expenses,
          cashOnHand: income - expenses - totalReserved, // Subtracted reserved capital from operational income
          reservedCapital: totalReserved
        });

        // Fetch recent operational entries
        const { data: entries } = await supabase
          .from('transactions')
          .select('*, branches(name)')
          .or('deposit_by.ilike.INCOME%,deposit_by.ilike.RESERVE%') // Show both income and reserve transfers
          .order('created_at', { ascending: false })
          .limit(5);
        
        setRecentEntries(entries || []);

      } catch (err) {
        console.error("Error fetching accounting data:", err);
      } finally {
        setLoading(false);
      }
    }

    if (!isSyncing && (!isRestricted || employeeId)) fetchAccountingData();
  }, [isSyncing, isRestricted, employeeId]);

  useEffect(() => {
    async function fetchMetadata() {
      const { data: bData } = await supabase.from('branches').select('*');
      const { data: cData } = await supabase.from('customers').select('id, first_name, last_name, account_num').order('last_name');
      setBranches(bData || []);
      setCustomers(cData || []);
      if (bData?.[0]) setReserveFormData(prev => ({ ...prev, branch_id: bData[0].id }));
    }
    fetchMetadata();
  }, []);

  const handleReserveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reserveFormData.amount) return alert("Please fill all required fields");
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from('transactions').insert([{
        amount: Number(reserveFormData.amount),
        type: reserveFormData.type,
        branch_id: reserveFormData.branch_id,
        staff_id: employeeId,
        deposit_by: `RESERVE | ${reserveFormData.type}: ${reserveFormData.details}`,
        status: 'completed'
      }]);

      if (error) throw error;
      
      setIsReserveModalOpen(false);
      setReserveFormData(prev => ({ ...prev, amount: "", details: "" }));
      // Refresh data
      window.location.reload();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-12 pb-20 font-sans animate-in fade-in duration-700">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <div className="space-y-1">
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight leading-none">Accounting</h1>
          <p className="text-slate-600 font-bold text-[11px] tracking-widest uppercase">Manage system revenue and operational expenses</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
           <button 
             onClick={() => setIsReserveModalOpen(true)}
             className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-white border border-slate-200 text-slate-900 rounded-xl md:rounded-2xl font-bold text-[11px] md:text-xs shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
           >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
              Manage reserve
           </button>
           <Link href="/dashboard/ledgers" className="flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-slate-900 text-white rounded-xl md:rounded-2xl font-bold text-[11px] md:text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-center">
              Register income
           </Link>
        </div>
      </div>

      {/* Premium Stats Container */}
      <div className="bg-[#2EB67D] rounded-[32px] md:rounded-[40px] overflow-hidden shadow-2xl relative p-6 md:p-12 flex flex-col min-h-[350px] md:min-h-[400px] justify-between border-2 md:border-4 border-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-0">
          <div className="space-y-1">
             <h3 className="text-[20px] md:text-[28px] font-bold text-white tracking-tight">Financial performance</h3>
          </div>
          <div className="flex items-center gap-2 p-1 bg-white/10 rounded-full border border-white/20 w-full md:w-auto">
             <button className="flex-1 md:flex-none px-4 md:px-5 py-2 bg-white text-slate-900 rounded-full font-bold text-[10px] md:text-xs shadow-lg">Summary</button>
             <button className="flex-1 md:flex-none px-4 md:px-5 py-2 text-white hover:bg-white/10 rounded-full font-bold text-[10px] md:text-xs transition-colors">Statements</button>
          </div>
        </div>

        <div className="flex flex-col items-center py-6 md:py-10">
           <p className="text-[9px] md:text-[11px] font-bold text-white tracking-[0.2em] md:tracking-[0.4em] mb-2 uppercase opacity-80">Net operational income</p>
           <h2 className="text-[44px] md:text-[64px] font-bold text-white tracking-tighter leading-none">
              {loading ? "..." : `₵ ${financials.cashOnHand.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
           </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
           <div className="p-5 md:p-8 bg-white/10 rounded-2xl md:rounded-3xl border border-white/20 hover:bg-white/20 transition-all group">
              <p className="text-[8px] md:text-[9px] font-bold text-white tracking-widest mb-1 md:mb-2 uppercase opacity-60">Total yield</p>
              <p className="text-[18px] md:text-[24px] font-bold text-white tracking-tight leading-none">₵ {financials.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
           </div>
           <div className="p-5 md:p-8 bg-white/10 rounded-2xl md:rounded-3xl border border-white/20 hover:bg-white/20 transition-all group">
              <p className="text-[8px] md:text-[9px] font-bold text-white tracking-widest mb-1 md:mb-2 uppercase opacity-60">Total withdrawals</p>
              <p className="text-[18px] md:text-[24px] font-bold text-white tracking-tight leading-none">₵ {financials.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
           </div>
           <div className="p-5 md:p-8 bg-white/10 rounded-2xl md:rounded-3xl border border-white/20 hover:bg-white/20 transition-all group">
              <p className="text-[8px] md:text-[9px] font-bold text-white tracking-widest mb-1 md:mb-2 uppercase opacity-80">Reserved capital</p>
              <p className="text-[18px] md:text-[24px] font-bold text-white tracking-tight leading-none">
                ₵ {loading ? "..." : financials.reservedCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         {/* Recent Ledger Activity */}
         <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="text-[15px] font-black text-slate-900 tracking-tight">Recent ledger activity</h2>
               <Link href="/dashboard/ledgers" className="text-[11px] font-bold text-accent hover:underline tracking-widest uppercase">View full ledger ›</Link>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="bg-slate-50/50 border-b border-slate-50">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-600 tracking-widest uppercase">Entry details</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-600 tracking-widest uppercase">Branch</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-600 tracking-widest uppercase text-right">Amount</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {recentEntries.length === 0 ? (
                        <tr>
                           <td colSpan={3} className="px-8 py-10 text-center text-[12px] font-bold text-slate-300 italic">No recent operational activity detected</td>
                        </tr>
                     ) : (
                        recentEntries.map((entry) => (
                           <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-8 py-5">
                                 <div className="space-y-1">
                                    <p className="text-[13px] font-bold text-slate-900 tracking-tight">{entry.deposit_by || entry.type}</p>
                                    <p className="text-[10px] font-medium text-slate-600">{new Date(entry.created_at).toLocaleString()}</p>
                                 </div>
                              </td>
                              <td className="px-8 py-5">
                                 <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black tracking-widest uppercase">{entry.branches?.name || "System"}</span>
                              </td>
                              <td className="px-8 py-5 text-right">
                                 <p className={`text-[14px] font-black tracking-tight ${entry.type === 'Withdrawal' || entry.type === 'Reserve' ? 'text-red-500' : 'text-[#2EB67D]'}`}>
                                    {entry.type === 'Withdrawal' || entry.type === 'Reserve' ? '-' : '+'}₵ {entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                 </p>
                              </td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Secondary Stats/Actions */}
         <div className="space-y-8">
            <div className="bg-white border border-slate-200 p-10 rounded-[32px] shadow-sm space-y-8">
               <h3 className="text-[13px] font-bold text-slate-600 tracking-widest uppercase">System health</h3>
               <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                     <p className="text-[11px] font-bold text-slate-600 uppercase">Audit status</p>
                     <span className="px-3 py-1 bg-green-100 text-green-600 rounded-lg text-[9px] font-black tracking-widest uppercase">Verified</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                     <p className="text-[11px] font-bold text-slate-600 uppercase">Last reconciliation</p>
                     <span className="text-[11px] font-black text-slate-900">{new Date().toLocaleDateString()}</span>
                  </div>
                  <button className="w-full py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black text-slate-600 tracking-widest uppercase hover:bg-slate-100 transition-all">
                     Run manual reconcile
                  </button>
               </div>
            </div>

            <div className="p-10 bg-slate-900 rounded-[32px] text-white space-y-6 shadow-xl shadow-slate-200">
               <h3 className="text-[11px] font-bold text-slate-600 tracking-widest uppercase opacity-60">Action center</h3>
               <div className="space-y-4">
                  <Link href="/dashboard/generate" className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[11px] font-black text-white tracking-widest uppercase transition-all flex items-center justify-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                     Extract assets
                  </Link>
               </div>
            </div>
         </div>
      </div>

      {/* Reserve Modal */}
      {isReserveModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
           <div className="bg-white w-full max-w-lg border border-slate-100 shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 space-y-10">
                 <div className="flex items-center justify-between border-b border-slate-50 pb-8">
                    <h2 className="text-[24px] font-bold text-slate-900 tracking-tight leading-none">Reserved Capital</h2>
                    <button onClick={() => setIsReserveModalOpen(false)} className="w-10 h-10 border border-slate-100 rounded-full flex items-center justify-center text-slate-300 hover:border-slate-900 hover:text-slate-900 transition-all font-bold text-lg">✕</button>
                 </div>

                 <form onSubmit={handleReserveSubmit} className="space-y-8">
                    <div className="grid grid-cols-2 gap-4 p-1 bg-slate-100 rounded-2xl">
                        <button 
                          type="button"
                          onClick={() => setReserveFormData({...reserveFormData, type: 'Reserve'})}
                          className={`py-3 rounded-xl text-xs font-bold transition-all ${reserveFormData.type === 'Reserve' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-600'}`}
                        >
                          Reserve Funds
                        </button>
                        <button 
                          type="button"
                          onClick={() => setReserveFormData({...reserveFormData, type: 'Release'})}
                          className={`py-3 rounded-xl text-xs font-bold transition-all ${reserveFormData.type === 'Release' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-600'}`}
                        >
                          Release Funds
                        </button>
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-900 tracking-widest uppercase">Amount (₵)</label>
                       <input 
                         type="number" 
                         required
                         value={reserveFormData.amount}
                         onChange={(e) => setReserveFormData({...reserveFormData, amount: e.target.value})}
                         placeholder="0.00"
                         className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-[20px] font-bold text-slate-900 focus:outline-none focus:border-accent transition-all placeholder:text-slate-200"
                       />
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-900 tracking-widest uppercase">Source Branch</label>
                       <select 
                         required
                         value={reserveFormData.branch_id}
                         onChange={(e) => setReserveFormData({...reserveFormData, branch_id: e.target.value})}
                         className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:border-accent transition-all appearance-none"
                       >
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                       </select>
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-900 tracking-widest uppercase">Allocation Notes</label>
                       <textarea 
                         value={reserveFormData.details}
                         onChange={(e) => setReserveFormData({...reserveFormData, details: e.target.value})}
                         placeholder="Context for this allocation..."
                         className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-[14px] font-medium text-slate-600 focus:outline-none focus:border-accent transition-all placeholder:text-slate-200 h-24 resize-none"
                       />
                    </div>

                    <button 
                      type="submit"
                      disabled={submitting}
                      className="w-full py-5 bg-slate-900 text-white font-bold text-[11px] tracking-widest uppercase rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                       {submitting ? "Processing..." : "Confirm Allocation"}
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

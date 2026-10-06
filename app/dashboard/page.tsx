"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useAuthSync } from "@/lib/hooks/useAuthSync";
import { supabase } from "@/lib/supabase";
import { startOfMonth } from "date-fns";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const { resolvedRole, isSyncing, employeeId } = useAuthSync();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    customers: 0,
    employees: 0,
    branches: 0,
    transactions: 0,
    financials: {
      revenue: { today: 0, month: 0, total: 0 },
      deposits: { today: 0, month: 0, total: 0 },
      withdrawals: { today: 0, month: 0, total: 0 },
      loans: { today: 0, month: 0, total: 0 },
    },
    staffPerformance: [] as any[],
    pendingRequests: [] as any[]
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());

  // Initialize blacklist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('verkwa_cleared_queue');
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids)) setClearedIds(new Set(ids));
      } catch (e) {
        console.error("Local blacklist corrupted");
      }
    }
  }, []);

  // Use resolvedRole from Supabase fallback if available, otherwise Clerk metadata
  const roleRaw = resolvedRole || (user?.publicMetadata?.role as string) || "client";
  const role = roleRaw.toLowerCase();
  const isAdmin = ["administrator", "admin", "superadmin"].includes(role);
  const isRestricted = !isAdmin && role !== "client" && role !== "";
  const isStaff = ["administrator", "manager", "operator", "mobilizer", "admin", "superadmin", "employee"].includes(role);
  const canViewFinancials = ["administrator", "manager", "admin", "superadmin"].includes(role);

  useEffect(() => {
    async function fetchDashboardStats() {
      if (!isStaff) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch Stats via Optimized RPC
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_stats', {
          p_employee_id: isRestricted ? employeeId : null
        });

        if (rpcError) throw rpcError;

        // 2. Fetch Pending Requests (Separate as it's a specific UI component)
        let pendingRequests = [];
        if (isAdmin) {
          const { data: reqs } = await supabase
            .from('client_requests')
            .select('*, customers(first_name, last_name, account_num)')
            .eq('status', 'Pending')
            .order('created_at', { ascending: false })
            .limit(5);
          
          pendingRequests = (reqs || []).filter((r: any) => !clearedIds.has(r.id));
        }

        setStats({
          customers: rpcData.customers || 0,
          employees: rpcData.employees || 0,
          branches: rpcData.branches || 0,
          transactions: rpcData.transactions || 0,
          financials: rpcData.financials,
          staffPerformance: rpcData.staffPerformance || [],
          pendingRequests
        });

        // For employees: override customers/accounts with actual served counts
        if (isRestricted && employeeId) {
          const { data: txs } = await supabase
            .from("transactions")
            .select("customer_id, customers(first_name, last_name, account_num)")
            .eq("staff_id", employeeId)
            .not("type", "in", "(Commission,Interest,Service Fee,Other Income)");

          const uniqueCustomers = new Map();
          (txs || []).forEach((tx: any) => {
            if (tx.customer_id && tx.customers && !uniqueCustomers.has(tx.customer_id)) {
              uniqueCustomers.set(tx.customer_id, tx.customers);
            }
          });

          setStats(prev => ({
            ...prev,
            customers: uniqueCustomers.size,
            transactions: txs?.length || 0,
          }));

          // Fetch recent transactions
          const { data: recentTxs } = await supabase
            .from("transactions")
            .select("*, customers(first_name, last_name, account_num)")
            .eq("staff_id", employeeId)
            .order("created_at", { ascending: false })
            .limit(10);
          setRecentTransactions(recentTxs || []);
        }
      } catch (err) {
        console.error("Dashboard Stats Fetch Error:", err);
        // Fallback to minimal data if RPC fails
        setLoading(false);
      } finally {
        setLoading(false);
      }
    }

    if (isLoaded) fetchDashboardStats();
  }, [isLoaded, isStaff, isAdmin, isRestricted, employeeId, clearedIds]);


  if (!isLoaded || loading || isSyncing) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (role === 'client') {
    return <ClientDashboardView user={user} />;
  }





  const tabs = ["Overview", "Deposits", "Withdrawals", "Loans"];
  
  const heroStats = [
    { 
      title: "Account", 
      today: ((stats?.financials?.deposits?.today ?? 0) - (stats?.financials?.withdrawals?.today ?? 0)).toFixed(2), 
      month: ((stats?.financials?.deposits?.month ?? 0) - (stats?.financials?.withdrawals?.month ?? 0)).toFixed(2), 
      lifetime: ((stats?.financials?.deposits?.total ?? 0) - (stats?.financials?.withdrawals?.total ?? 0)).toFixed(2), 
      icon: "coins", 
      visible: canViewFinancials,
      link: "/dashboard/ledgers",
      actionLabel: "View Ledgers"
    },
    { 
      title: "Revenue", 
      today: (stats?.financials?.revenue?.today ?? 0).toFixed(2), 
      month: (stats?.financials?.revenue?.month ?? 0).toFixed(2), 
      lifetime: (stats?.financials?.revenue?.total ?? 0).toFixed(2), 
      icon: "banknote", 
      visible: canViewFinancials,
      link: "/dashboard/reports",
      actionLabel: "View Reports"
    },
    { 
      title: "Deposits", 
      today: (stats?.financials?.deposits?.today ?? 0).toFixed(2), 
      month: (stats?.financials?.deposits?.month ?? 0).toFixed(2), 
      lifetime: (stats?.financials?.deposits?.total ?? 0).toFixed(2), 
      icon: "wallet", 
      visible: true,
      link: "/dashboard/transactions/deposit",
      actionLabel: "Add Deposit"
    },
    { 
      title: "Withdrawals", 
      today: (stats?.financials?.withdrawals?.today ?? 0).toFixed(2), 
      month: (stats?.financials?.withdrawals?.month ?? 0).toFixed(2), 
      lifetime: (stats?.financials?.withdrawals?.total ?? 0).toFixed(2), 
      icon: "arrow-down", 
      visible: true,
      link: "/dashboard/transactions/withdrawal",
      actionLabel: "Initialize Debit"
    },
  ].filter(s => s.visible);

  const generalStats = [
    { value: (stats?.customers ?? 0).toString(), label: "Customers", visible: true },
    { value: (stats?.customers ?? 0).toString(), label: "Accounts", visible: true },
    { value: (stats?.employees ?? 0).toString(), label: "Employees", visible: isAdmin },
    { value: (stats?.branches ?? 0).toString(), label: "Branches", visible: isAdmin },
    { value: (stats?.transactions ?? 0).toString(), label: "Transactions", visible: true },
    { value: "0", label: "Complaints", visible: isAdmin },
  ].filter(s => s.visible);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 pb-20 font-sans">
      
      {/* Navigation Tabs */}
      <div className="flex items-center gap-8 border-b border-slate-100 pb-1 overflow-x-auto no-scrollbar snap-x">
        {tabs.map((tab) => (
          <Link
            key={tab}
            href={
              tab === "Overview" ? "/dashboard" :
              tab === "Deposits" ? "/dashboard/transactions?tab=DEPOSITS" :
              tab === "Withdrawals" ? "/dashboard/transactions?tab=WITHDRAWALS" :
              tab === "Loans" ? "/dashboard/transactions?tab=LOANS" :
              "/dashboard/reports"
            }
            className="pb-4 text-[13px] font-bold border-b-2 transition-all whitespace-nowrap border-accent text-slate-900"
          >
            {tab}
          </Link>
        ))}
      </div>

      {/* Hero Cards */}
      <div className="flex md:grid overflow-x-auto md:overflow-x-visible md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 snap-x snap-mandatory no-scrollbar pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
        {heroStats.map((stat, i) => {
          const isBlue = i % 2 === 0;
          const bgClass = isBlue ? "bg-blue-600" : "bg-red-500";
          const borderClass = isBlue ? "border-blue-500" : "border-red-400";
          const titleColor = isBlue ? "text-blue-100" : "text-red-100";
          const valColor = "text-white";
          const iconBg = isBlue ? "bg-blue-500/50" : "bg-red-400/50";
          const iconColor = "text-white";
          const subTitleColor = isBlue ? "text-blue-200" : "text-red-200";
          const subValColor = "text-white";
          const divBorderClass = isBlue ? "border-blue-500" : "border-red-400";
          const linkColor = "text-white";

          return (
            <div key={i} className={`min-w-[85vw] md:min-w-0 snap-center shrink-0 border ${borderClass} rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[160px] ${bgClass}`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} ${iconColor}`}>
                  {stat.title === "Revenue" && <span className={`text-sm font-bold leading-none ${iconColor}`}>₵</span>}
                  {stat.title === "Deposits" && <div className={`w-2.5 h-2.5 rounded-full bg-white`} />}
                  {stat.title === "Withdrawals" && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>}
                  {stat.title === "Account" && <span className="text-sm font-bold">L</span>}
                </div>
              </div>

              <div className="space-y-1">
                <p className={`text-[10px] md:text-[11px] font-bold tracking-widest uppercase ${titleColor}`}>{stat.title}</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-[28px] md:text-[32px] font-bold tracking-tight ${valColor}`}>{stat.lifetime}</span>
                  <span className={`text-[9px] md:text-[10px] font-semibold px-2 py-0.5 rounded-full ${isBlue ? 'bg-blue-500/50 text-white' : 'bg-red-400/50 text-white'}`}>Lifetime</span>
                </div>
              </div>

              <div className={`mt-4 pt-4 border-t flex items-center justify-between ${divBorderClass}`}>
                <div className="flex gap-4">
                  <div className="space-y-0.5">
                    <p className={`text-[9px] font-bold tracking-widest leading-none ${subTitleColor}`}>Today</p>
                    <p className={`text-[13px] font-bold tracking-tight ${subValColor}`}>{stat.today}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className={`text-[9px] font-bold tracking-widest leading-none ${subTitleColor}`}>Monthly</p>
                    <p className={`text-[13px] font-bold tracking-tight ${subValColor}`}>{stat.month}</p>
                  </div>
                </div>
                <Link 
                  href={stat.link}
                  className={`text-[10px] font-black uppercase tracking-tighter hover:underline flex items-center gap-1 ${linkColor}`}
                >
                  {stat.actionLabel}
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Pending Requests Queue */}
      {isAdmin && stats.pendingRequests.length > 0 && (
        <div className="bg-white border-2 border-accent/20 rounded-2xl shadow-xl shadow-accent/5 overflow-hidden animate-in slide-in-from-top duration-500">
          <div className="p-6 bg-accent/5 border-b border-accent/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-bold animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4-4-4"/><path d="M3 10h13a5 5 0 0 1 5 5v2"/></svg>
               </div>
               <h2 className="text-[15px] font-black text-slate-800 uppercase tracking-tight">Requests Awaiting Approval</h2>
            </div>
            <Link href="/dashboard/authorizations" className="text-[11px] font-black text-accent uppercase tracking-widest hover:underline">Clearance Terminal</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest uppercase">Client</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest uppercase">Type</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest uppercase text-right">Amount</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-medium">
                {stats.pendingRequests.map((req, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5">
                       <p className="font-bold text-slate-900 leading-none">{req.customers?.first_name} {req.customers?.last_name}</p>
                       <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-tighter">{req.customers?.account_num}</p>
                    </td>
                    <td className="px-8 py-5">
                       <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase ${
                          req.type === 'Withdrawal' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
                       }`}>
                          {req.type}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-slate-900">₵ {Number(req.amount).toLocaleString()}</td>
                    <td className="px-8 py-5 text-right">
                       <Link href="/dashboard/authorizations" className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-[11px] font-black text-slate-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm">Review</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Collection Summary Table */}
      {!isRestricted && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-slate-800">Collection Summary</h2>
            <div className="flex gap-1.5">
               <div className="w-1.5 h-1.5 bg-accent rounded-full" />
               <div className="w-1.5 h-1.5 bg-slate-100 rounded-full" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest uppercase">STAFF</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest uppercase">TODAY</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest uppercase">WEEK</th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest uppercase">MONTH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-medium">
                {stats.staffPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center text-slate-300 font-semibold tracking-widest text-[11px]">
                      No data found.
                    </td>
                  </tr>
                ) : (
                  stats.staffPerformance.map((staff, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-8 py-5 font-bold text-slate-900">{staff.name}</td>
                      <td className="px-8 py-5 text-slate-600">{staff.today.toFixed(2)}</td>
                      <td className="px-8 py-5 text-slate-600">{staff.week.toFixed(2)}</td>
                      <td className="px-8 py-5 text-slate-900 font-bold">{staff.month.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* General Summaries Grid */}
      <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
        <h2 className="text-[11px] md:text-[13px] font-bold text-slate-600 tracking-widest uppercase">Global parameters</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {generalStats.map((stat, i) => (
            <div key={i} className="flex flex-col items-start p-4 rounded-xl hover:bg-slate-50 transition-colors group">
              <span className="text-[24px] md:text-[28px] font-bold text-slate-900 tracking-tight mb-1">{stat.value}</span>
              <span className="text-[8px] md:text-[9px] font-bold text-slate-600 tracking-[0.2em] uppercase">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid - Admin only */}
      {!isRestricted && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[
            { title: "Deposits by Branch", visible: true },
            { title: "Withdrawals by Branch", visible: true },
          ].filter(c => c.visible).map((chart, i) => (
            <div key={i} className="bg-white border border-slate-100 p-8 rounded-2xl shadow-sm space-y-8 flex flex-col min-h-[420px]">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h2 className="text-[15px] font-bold text-slate-800">{chart.title}</h2>
                  <p className="text-[10px] font-semibold text-slate-300 tracking-widest">Active data visualization</p>
                </div>
              </div>
              <div className="flex items-center gap-6 border-b border-slate-50 pb-4">
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-slate-900 rounded-full" /><span className="text-[10px] font-bold text-slate-600 capitalize">Today</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-slate-400 rounded-full" /><span className="text-[10px] font-bold text-slate-600 capitalize">Month</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-slate-200 rounded-full" /><span className="text-[10px] font-bold text-slate-600 capitalize">Session</span></div>
              </div>
              <div className="relative flex-1 mt-4 ml-6 border-l border-b border-slate-100 flex items-end">
                <div className="absolute -left-8 inset-y-0 w-6 flex flex-col justify-between text-[10px] font-semibold text-slate-300 py-1">
                  <span>100</span><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Employee Recent Activity */}
      {isRestricted && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-slate-800">My Recent Transactions</h2>
            <a href="/dashboard/transactions" className="text-[11px] font-bold text-accent hover:underline">View all</a>
          </div>
          {recentTransactions.length === 0 ? (
            <div className="p-10 text-center text-[12px] font-bold text-slate-400">No transactions yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Date</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Customer</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Type</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase text-right">Amount</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentTransactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-[12px] font-bold text-slate-600">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[13px] font-bold text-slate-900">{tx.customers?.first_name} {tx.customers?.last_name}</p>
                        <p className="text-[10px] font-bold text-slate-500">{tx.customers?.account_num}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          tx.type === "Deposit" ? "bg-green-50 text-green-600" :
                          tx.type === "Withdrawal" ? "bg-red-50 text-red-500" :
                          tx.type === "Loan" ? "bg-blue-50 text-blue-600" :
                          tx.type === "Loan Payment" ? "bg-purple-50 text-purple-600" :
                          "bg-slate-50 text-slate-600"
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right text-[13px] font-black ${
                        tx.type === "Deposit" || tx.type === "Loan" ? "text-green-600" : "text-red-500"
                      }`}>
                        {tx.type === "Deposit" || tx.type === "Loan" ? "+" : "-"}₵ {Number(tx.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          tx.status === "approved" ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-500"
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

function ClientDashboardView({ user }: { user: any }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    balance: 0,
    lifetimeDeposits: 0,
    reservedBalance: 0,
    loan: { amount: 0, status: "n/a" },
    customer: null as any,
    recentTransactions: [] as any[],
    recentRequests: [] as any[],
    branch: null as any
  });

  const tabs = ["Overview", "Requests", "Activity", "Profile"];

  useEffect(() => {
    async function fetchClientData() {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return setLoading(false);

      try {
        const { data: customer } = await supabase
          .from('customers')
          .select('*, branches(*)')
          .eq('email', email)
          .single();

        if (customer) {
          const [txsResponse, reqsResponse] = await Promise.all([
            supabase.from('transactions').select('*, staff(first_name, last_name)').eq('customer_id', customer.id).order('created_at', { ascending: false }),
            supabase.from('client_requests').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(5)
          ]);

          const txs = (txsResponse.data || []).filter(tx => tx.status !== 'rejected' && tx.status !== 'denied');
          const reqs = reqsResponse.data;

          let balance = 0;
          let lifetimeDeposits = 0;
          let latestLoan = { amount: 0, status: "n/a" };

          txs?.forEach(tx => {
            const amt = Number(tx.amount || 0);
            if (tx.type === 'Deposit') {
              balance += amt;
              lifetimeDeposits += amt;
            }
            if (tx.type === 'Loan') balance += amt;
            if (tx.type === 'Withdrawal' || tx.type === 'Loan Payment' || tx.type === 'Commission' || tx.type === 'Service Fee') balance -= amt;
            if (tx.type === 'Loan' && (latestLoan.status === "n/a" || latestLoan.status === "pending")) {
               latestLoan = { amount: amt, status: tx.status || "pending" };
            }
          });

          setData({ 
            balance, 
            lifetimeDeposits,
            reservedBalance: customer.reserved_balance || 0,
            loan: latestLoan, 
            customer, 
            recentTransactions: txs?.slice(0, 5) || [],
            recentRequests: reqs || [],
            branch: customer.branches
          });
        }
      } catch (err) {
        console.error("Error fetching client data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchClientData();
  }, [user]);

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!data.customer) {
    return (
      <div className="w-full max-w-2xl mx-auto py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-600">
           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="16" x2="22" y1="11" y2="11"/></svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Linking Pending</h1>
        <p className="text-slate-600 font-medium leading-relaxed max-w-md mx-auto">
          Welcome, <span className="font-bold text-slate-800">{user?.firstName}</span>! We couldn't find a customer record linked to your email.
          Please contact your branch manager to activate your portal.
        </p>
        <div className="pt-6">
          <Link href="/" className="px-8 py-3 bg-slate-900 text-white rounded-full font-bold text-xs tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200">Go Back Home</Link>
        </div>
      </div>
    );
  }

  const timeline = [
    ...data.recentTransactions.map(tx => ({ ...tx, timelineType: 'transaction' })),
    ...data.recentRequests.map(req => ({ ...req, timelineType: 'request' }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 pb-20 font-sans animate-in fade-in duration-700">
      
      {/* Navigation Tabs */}
      <div className="flex items-center gap-8 border-b border-slate-100 pb-1 overflow-x-auto no-scrollbar snap-x">
        {tabs.map((tab) => (
          <Link
            key={tab}
            href={
              tab === "Overview" ? "/dashboard" :
              tab === "Requests" ? "/dashboard/client/requests" :
              tab === "Activity" ? "/dashboard/client/activity" :
              "/dashboard/client/profile"
            }
            className="pb-4 text-[13px] font-bold border-b-2 transition-all whitespace-nowrap border-accent text-slate-900"
          >
            {tab}
          </Link>
        ))}
      </div>

      {/* Financial Health Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Balance Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] md:text-[11px] font-bold text-slate-600 tracking-widest uppercase">Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] md:text-[32px] font-bold text-slate-900 tracking-tight">₵ {data.balance.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
            <div className="flex gap-4">
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-slate-300 tracking-widest leading-none">Status</p>
                <p className="text-[13px] font-bold text-green-500 tracking-tight">Active</p>
              </div>
            </div>
            <Link 
              href="/dashboard/client/requests?type=withdrawal"
              className="text-[10px] font-black text-accent uppercase tracking-tighter hover:underline flex items-center gap-1"
            >
              Withdraw funds
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </div>
        </div>

        {/* Lifetime Deposits Card */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[160px]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-600 tracking-widest uppercase">Lifetime Savings</p>
            <div className="flex items-baseline gap-2">
              <span className="text-[32px] font-bold text-slate-900 tracking-tight">₵ {data.lifetimeDeposits.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
            <div className="flex gap-4">
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-slate-300 tracking-widest leading-none">Security</p>
                <p className="text-[13px] font-bold text-slate-600 tracking-tight">Protected</p>
              </div>
            </div>
            <Link 
              href="/dashboard/client/requests?type=deposit"
              className="text-[10px] font-black text-accent uppercase tracking-tighter hover:underline flex items-center gap-1"
            >
              Deposit more
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </div>
        </div>

        {/* Support/Quick Help Card */}
        <div className="lg:col-span-1 bg-accent border border-accent rounded-2xl p-6 shadow-xl flex flex-col justify-between min-h-[160px] text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          </div>
          <p className="text-[11px] font-bold text-white/50 tracking-widest uppercase relative z-10">Direct assistance</p>
          <div className="space-y-4 relative z-10">
            <h2 className="text-[18px] font-bold tracking-tight">Need help with your account?</h2>
            <Link 
              href="/dashboard/client/support"
              className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold text-[11px] tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-slate-50 transition-all text-center"
            >
              Open support link
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: Timeline & Activity */}
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-[15px] font-bold text-slate-800">Account activity</h3>
                 <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                    <div className="w-1.5 h-1.5 bg-slate-100 rounded-full" />
                 </div>
              </div>
              <div className="divide-y divide-slate-50 min-h-[400px]">
                 {timeline.length === 0 ? (
                    <div className="p-20 text-center text-slate-300 font-semibold tracking-widest text-[11px] uppercase">
                       NO LOG ENTRY DETECTED WITHIN ACTIVE PARAMETERS.
                    </div>
                 ) : (
                   timeline.map((item, i) => (
                     <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50/80 transition-all group">
                        <div className="flex items-center gap-5">
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                             item.type === 'Deposit' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-600'
                           }`}>
                              {item.type === 'Deposit' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m16 12-4-4-4 4"/><path d="M12 16V8"/></svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m8 12 4 4 4-4"/><path d="M12 8v8"/></svg>
                              )}
                           </div>
                           <div className="space-y-0.5">
                              <p className="text-[15px] font-bold text-slate-900 tracking-tight leading-none">
                                {item.type}
                              </p>
                              <p className="text-[11px] font-bold text-slate-600 tracking-widest uppercase">
                                {new Date(item.created_at).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                           </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1.5 md:gap-2">
                           <p className="text-[15px] md:text-[18px] font-bold text-slate-900 tracking-tight leading-none underline decoration-slate-100 underline-offset-4">
                             ₵ {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                           </p>
                           <span className={`text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                             item.status === 'rejected' || item.status === 'denied' || item.status === 'Failed' 
                               ? 'bg-red-50 text-red-600' 
                               : item.status === 'ok' || item.status === 'approved' || item.status === 'completed' || item.status === 'sent'
                               ? 'bg-green-50 text-green-600'
                               : 'bg-slate-50 text-slate-600'
                           }`}>
                             {item.status || "Verified"}
                           </span>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>
        </div>

        {/* RIGHT: Portfolio Summaries */}
        <div className="space-y-8">
           
           <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm space-y-6">
              <h3 className="text-[13px] font-bold text-slate-600 tracking-widest uppercase">Balance overview</h3>
              <div className="space-y-6">
                 <div className="flex flex-col gap-1 p-4 rounded-xl hover:bg-slate-50 transition-colors group">
                    <span className="text-[11px] font-bold text-slate-600 tracking-[0.1em] uppercase">Operating Wallet</span>
                    <span className="text-[28px] font-bold text-slate-900 tracking-tight">₵ {data.balance.toFixed(2)}</span>
                 </div>
                 
                 <div className="pt-2">
                    <Link href="/dashboard/client/activity" className="w-full py-4 border border-slate-100 bg-white rounded-2xl text-slate-600 font-bold text-[12px] flex items-center justify-center gap-2 transition-all hover:bg-slate-50 shadow-sm">
                       Access detailed activity
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </Link>
                 </div>
              </div>
           </div>

           <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm">
              <h3 className="text-[13px] font-bold text-slate-600 tracking-widest uppercase">Branch</h3>
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center font-black text-xl">
                    {data.branch?.name?.[0] || "M"}
                 </div>
                 <div>
                    <p className="text-[15px] font-bold text-slate-900 leading-none">{data.branch?.name || "Main Terminal"}</p>
                 </div>
              </div>
           </div>

        </div>

      </div>
    </div>
  );
}

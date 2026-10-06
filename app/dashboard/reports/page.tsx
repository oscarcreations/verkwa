"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthSync } from "@/lib/hooks/useAuthSync";
import Link from "next/link";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";
import { format, subDays, eachDayOfInterval, startOfDay, isSameDay } from "date-fns";

export default function ReportsPage() {
  const { resolvedRole, employeeId, isSyncing } = useAuthSync();
  const role = (resolvedRole || "").toLowerCase();
  const isAdmin = ["administrator", "admin", "superadmin"].includes(role);
  const isRestricted = !isAdmin && role !== "client" && role !== "";

  const tabs = ["Highlight", "Generate"];
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    depositTotal: 0,
    withdrawalTotal: 0,
    loanTotal: 0,
    commissionTotal: 0,
    timeSeries: [] as any[]
  });

  useEffect(() => {
    async function fetchReportData() {

      try {
        setLoading(true);
        
        // 1. Fetch Daily Aggregates via RPC (High Performance)
        const { data: dailyData, error: rpcError } = await supabase.rpc('get_daily_aggregates', {
          p_days: 30,
          p_employee_id: isRestricted ? employeeId : null
        });

        if (rpcError) throw rpcError;

        // 2. Create 30-day timeline and map data
        const days = eachDayOfInterval({
          start: subDays(new Date(), 29),
          end: new Date()
        });

        let totalDeposit = 0;
        let totalWithdrawal = 0;
        let totalLoan = 0;
        let totalCommission = 0;

        const timeSeries = days.map(day => {
          const dateStr = format(day, "MMM dd");
          const dbDateStr = format(day, "yyyy-MM-dd");
          
          // Find match in RPC data (date string comparison)
          const dayMatch = dailyData?.find((d: any) => d.day === dbDateStr);
          
          const d = dayMatch?.deposit || 0;
          const w = dayMatch?.withdrawal || 0;
          const l = dayMatch?.loan || 0;
          const c = dayMatch?.commission || 0;

          totalDeposit += d;
          totalWithdrawal += w;
          totalLoan += l;
          totalCommission += c;

          return {
            name: dateStr,
            Deposit: d,
            Withdrawal: w,
            Loan: l,
            Commission: c
          };
        });

        setReportData({
          depositTotal: totalDeposit,
          withdrawalTotal: totalWithdrawal,
          loanTotal: totalLoan,
          commissionTotal: totalCommission,
          timeSeries
        });
      } catch (err: any) {
        console.error("Error fetching report data:", err?.message || err);
      } finally {
        setLoading(false);
      }
    }

    if (!isSyncing && (!isRestricted || employeeId)) {
      fetchReportData();
    }
  }, [isSyncing, isRestricted, employeeId]);


  const charts = [
    { title: "Deposit", total: reportData.depositTotal.toFixed(2), subtitle: "Daily volume (30d)", hasData: reportData.depositTotal > 0, color: "#2EB67D", dataKey: "Deposit" },
    { title: "Withdrawal", total: reportData.withdrawalTotal.toFixed(2), subtitle: "Daily volume (30d)", hasData: reportData.withdrawalTotal > 0, color: "#F87171", dataKey: "Withdrawal" },
    { title: "Loan", total: reportData.loanTotal.toFixed(2), subtitle: "Daily volume (30d)", hasData: reportData.loanTotal > 0, color: "#FBBF24", dataKey: "Loan" },
    { title: "Revenue", total: reportData.commissionTotal.toFixed(2), subtitle: "Manual commissions (30d)", hasData: reportData.commissionTotal > 0, color: "#818CF8", dataKey: "Commission" }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto pb-20 space-y-8 font-sans animate-in fade-in duration-700">
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Tabs Row */}
        <div className="flex items-center px-6 pt-4 border-b border-slate-50 gap-8">
          {[
            { name: "Highlight", href: "/dashboard/reports" },
            { name: "Generate", href: "/dashboard/generate" },
          ].map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={`pb-3 text-[13px] font-bold border-b-2 transition-colors ${
                tab.name === "Highlight" 
                ? "border-accent text-slate-900" 
                : "border-transparent text-slate-600 hover:text-slate-600"
              }`}
            >
              {tab.name}
            </Link>
          ))}
        </div>

        {/* Highlight Summary Banner */}
        <div className="p-8 bg-slate-50/50">
          <div className="flex items-center gap-5">
            <div className="flex items-end gap-1 h-10">
              <div className="w-2.5 h-6 bg-slate-200 rounded-full animate-pulse"></div>
              <div className="w-2.5 h-10 bg-slate-600 rounded-full animate-pulse " style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2.5 h-8 bg-[#2EB67D] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <div>
              <h2 className="text-[20px] font-bold text-slate-900 tracking-tight leading-tight">Business intelligence summary</h2>
              <p className="text-[12px] font-bold text-slate-600 tracking-widest mt-1 uppercase">Status: Live Analytics Engine Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.map((chart, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col h-[420px] overflow-hidden group hover:border-accent/20 transition-all">
            <div className="p-8 flex items-start justify-between">
               <div className="space-y-1">
                  <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">{chart.title} analytics</h3>
                  <p className="text-[11px] font-bold text-slate-600 tracking-widest uppercase">{chart.subtitle}</p>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                 <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Real-time</span>
               </div>
            </div>

            <div className="px-8 flex flex-col mb-4">
              <span className="text-4xl font-bold text-slate-900 tracking-tighter">
                {loading ? "..." : `₵ ${Number(chart.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              </span>
            </div>

            {/* Recharts Area */}
            <div className="flex-1 w-full px-2">
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-slate-300 text-xs font-medium h-full">
                  Calculating trajectory...
                </div>
              ) : chart.hasData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportData.timeSeries}>
                    <defs>
                      <linearGradient id={`color${chart.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chart.color} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={chart.color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      hide 
                    />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '12px'
                      }}
                      cursor={{ stroke: '#f0f0f0', strokeWidth: 2 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={chart.dataKey} 
                      stroke={chart.color} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill={`url(#color${chart.dataKey})`} 
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-300 text-xs font-medium h-full">
                   Insufficient data for 30-day visualization
                </div>
              )}
            </div>

            <div className="px-8 py-5 bg-slate-50/50 flex items-center justify-between mt-auto">
              <span className="text-[12px] font-bold text-slate-600">View detailed audit trail</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 group-hover:text-accent transition-colors"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

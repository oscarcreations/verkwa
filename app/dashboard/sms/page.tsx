"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import Link from "next/link";
import { showToast, ToastContainer } from "@/components/Toast";

export default function SMSPage() {
  const tabs = ["Usage", "Control", "Custom", "Top Up"];
  const [activeTab, setActiveTab] = useState("Usage");

  // Usage Tab State
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageLimit, setUsageLimit] = useState(10);
  const [totalUsed, setTotalUsed] = useState(0);
  const [arkeselBalance, setArkeselBalance] = useState<number | null>(null);

  // Control Tab State
  const [customers, setCustomers] = useState<any[]>([]);
  const [controlLoading, setControlLoading] = useState(true);
  const [controlLimit, setControlLimit] = useState(10);

  // Custom Tab State
  const [customLogs, setCustomLogs] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === "Usage") {
      fetchUsage();
    } else if (activeTab === "Control") {
      fetchCustomers();
    } else if (activeTab === "Custom") {
      fetchCustomLogs();
    }
  }, [activeTab, usageLimit, controlLimit]);

  async function fetchUsage() {
    setUsageLoading(true);
    try {
      // Fetch local logs
      const { data, count } = await supabase
        .from("sms_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(usageLimit);
      setSmsLogs(data || []);
      
      const { count: totalCount } = await supabase
        .from("sms_logs")
        .select("*", { count: "exact", head: true });
      setTotalUsed(totalCount || 0);

      // Fetch live Arkesel balance
      const balRes = await fetch("/api/sms/balance");
      const balData = await balRes.json();
      if (balRes.ok && balData) {
        let balanceVal = null;
        if (typeof balData.balance !== "undefined") {
          balanceVal = balData.balance;
        } else if (balData.data !== undefined) {
          balanceVal = typeof balData.data === "number" 
            ? balData.data 
            : (balData.data.sms_balance ?? balData.data.balance ?? balData.data.main_balance);
        }
        setArkeselBalance(balanceVal);
      }
    } catch (err) {
      console.error("Error fetching usage data:", err);
    }
    setUsageLoading(false);
  }

  async function fetchCustomers() {
    setControlLoading(true);
    try {
      const { data } = await supabase
        .from("customers")
        .select("id, first_name, last_name, phone, mobile_number, allow_sms")
        .order("first_name", { ascending: true })
        .limit(controlLimit);
      setCustomers(data || []);
    } catch (err) {
      console.error(err);
    }
    setControlLoading(false);
  }

  async function fetchCustomLogs() {
    try {
      const { data } = await supabase
        .from("sms_logs")
        .select("*")
        .eq("type", "Custom")
        .order("created_at", { ascending: false })
        .limit(10);
      setCustomLogs(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleSms(customerId: string, currentVal: boolean) {
    try {
      setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, allow_sms: !currentVal } : c));
      const { error } = await supabase
        .from("customers")
        .update({ allow_sms: !currentVal })
        .eq("id", customerId);
      if (error) throw error;
      showToast("SMS setting updated successfully");
    } catch (err: any) {
      showToast("Failed to update: " + err.message, "error");
      setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, allow_sms: currentVal } : c));
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      <ToastContainer />
      <div className="flex items-center gap-2 text-[20px] font-black tracking-tight text-slate-900">
        <span>SMS</span>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden pb-12">
        <div className="flex items-center px-6 pt-4 border-b border-slate-50 gap-8">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-[13px] font-bold border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-accent text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* USAGE TAB */}
        {activeTab === "Usage" && (
          <div className="p-8 space-y-6">
            <div className="flex gap-6 mb-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 min-w-[200px]">
                <p className="text-[12px] font-bold text-slate-500 tracking-widest uppercase mb-1">Live SMS Balance</p>
                <p className="text-3xl font-black text-green-600">
                  {arkeselBalance !== null ? arkeselBalance : <span className="text-sm text-red-500">Restart Server / Key Missing</span>}
                </p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 min-w-[200px]">
                <p className="text-[12px] font-bold text-slate-500 tracking-widest uppercase mb-1">Platform Used</p>
                <p className="text-3xl font-black text-slate-800">{totalUsed}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[13px] text-slate-500">
              <p>({totalUsed}) records</p>
              <div className="flex items-center gap-2">
                <span>Show:</span>
                {[10, 20, 30, 50, 100].map(num => (
                  <button key={num} onClick={() => setUsageLimit(num)} className={`hover:text-slate-900 ${usageLimit === num ? "font-bold text-slate-900" : ""}`}>
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Number</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Date</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Transaction</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usageLoading ? (
                    <tr><td colSpan={5} className="text-center py-10 text-slate-500">Loading...</td></tr>
                  ) : smsLogs.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-slate-500">No records found</td></tr>
                  ) : (
                    smsLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-[14px] font-bold text-slate-700">{log.phone}</td>
                        <td className="px-6 py-4 text-[13px] text-slate-600">{format(new Date(log.created_at), "dd MMM yyyy, HH:mm")}</td>
                        <td className="px-6 py-4 text-[13px] font-medium text-slate-700">{log.type}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider ${log.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="text-accent text-[13px] font-bold hover:underline">review</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTROL TAB */}
        {activeTab === "Control" && (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between text-[13px] text-slate-500">
              <p>({customers.length}) records shown</p>
              <div className="flex items-center gap-2">
                <span>Show:</span>
                {[10, 20, 30, 50, 100].map(num => (
                  <button key={num} onClick={() => setControlLimit(num)} className={`hover:text-slate-900 ${controlLimit === num ? "font-bold text-slate-900" : ""}`}>
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Name</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Phone</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase text-right">Allow SMS</th>
                  </tr>
                </thead>
                <tbody>
                  {controlLoading ? (
                    <tr><td colSpan={3} className="text-center py-10 text-slate-500">Loading...</td></tr>
                  ) : customers.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-10 text-slate-500">No records found</td></tr>
                  ) : (
                    customers.map((c) => (
                      <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-[14px] font-bold text-slate-700">{c.first_name} {c.last_name}</td>
                        <td className="px-6 py-4 text-[13px] text-slate-600">{c.phone || c.mobile_number || "N/A"}</td>
                        <td className="px-6 py-4 text-right">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={c.allow_sms !== false} onChange={() => toggleSms(c.id, c.allow_sms !== false)} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                          </label>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CUSTOM TAB */}
        {activeTab === "Custom" && (
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-[13px] text-slate-500">({customLogs.length}) records</p>
              <Link href="/dashboard/sms/custom-sms" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-[13px] hover:bg-black transition-all shadow-md">
                New Custom SMS
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Date</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Message</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Recipient</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customLogs.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-10 text-slate-500">No custom SMS sent yet</td></tr>
                  ) : (
                    customLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-[13px] text-slate-600">{format(new Date(log.created_at), "dd MMM yyyy")}</td>
                        <td className="px-6 py-4 text-[13px] font-medium text-slate-700 max-w-xs truncate">{log.message}</td>
                        <td className="px-6 py-4 text-[13px] text-slate-600">{log.phone}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider ${log.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TOP UP TAB */}
        {activeTab === "Top Up" && (
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-[18px] font-black text-slate-900 tracking-tight">Arkesel SMS Plans</h3>
                <p className="text-[13px] text-slate-500 mt-1">Select a plan to redirect to your Arkesel dashboard for purchase.</p>
              </div>
              <a 
                href="https://sms.arkesel.com/user/sms/purchase-sms-plan" 
                target="_blank" 
                rel="noreferrer"
                className="bg-accent text-white px-6 py-3 rounded-xl font-bold text-[13px] hover:bg-accent/90 transition-all shadow-md flex items-center gap-2"
              >
                Top Up on Arkesel
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
              </a>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { id: 2, name: "1,812 Messages (Expires)", price: 50, isPopular: true },
                { id: 1, name: "696 Messages (Expires)", price: 20, isPopular: false },
                { id: 4, name: "645 Messages (No Expiry)", price: 20, isPopular: false },
                { id: 3, name: "3,781 Messages (Expires)", price: 100, isPopular: false },
                { id: 5, name: "1,667 Messages (No Expiry)", price: 50, isPopular: false },
                { id: 6, name: "3,448 Messages (No Expiry)", price: 100, isPopular: false },
                { id: 7, name: "7,905 Messages (Expires)", price: 200, isPopular: false },
                { id: 11, name: "7,143 Messages (No Expiry)", price: 200, isPopular: false },
                { id: 8, name: "20,704 Messages (Expires)", price: 500, isPopular: false },
                { id: 12, name: "18,519 Messages (No Expiry)", price: 500, isPopular: false },
                { id: 9, name: "43,478 Messages (Expires)", price: 1000, isPopular: false },
                { id: 13, name: "38,462 Messages (No Expiry)", price: 1000, isPopular: false },
                { id: 10, name: "99,533 Messages (Expires)", price: 2000, isPopular: false },
                { id: 14, name: "80,000 Messages (No Expiry)", price: 2000, isPopular: false },
                { id: 15, name: "228,311 Messages (Expires)", price: 5000, isPopular: false },
                { id: 16, name: "200,000 Messages (No Expiry)", price: 5000, isPopular: false },
              ].map(plan => (
                <div key={plan.id} className={`relative p-6 rounded-2xl border transition-all hover:shadow-lg ${plan.isPopular ? 'border-accent bg-accent/5' : 'border-slate-200 bg-white'}`}>
                  {plan.isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Popular
                    </span>
                  )}
                  <h4 className="text-[14px] font-bold text-slate-500 mb-2">{plan.name}</h4>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-[24px] font-black text-slate-900">GHS {plan.price}</span>
                  </div>
                  <a 
                    href="https://sms.arkesel.com/user/sms/purchase-sms-plan" 
                    target="_blank" 
                    rel="noreferrer"
                    className={`block w-full text-center py-3 rounded-xl font-bold text-[13px] transition-all ${
                      plan.isPopular 
                        ? 'bg-accent text-white hover:bg-accent/90' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Buy Now
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

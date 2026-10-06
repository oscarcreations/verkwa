"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { showToast, ToastContainer } from "@/components/Toast";

type DateFilterType = "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "this_year" | "last_year" | "custom" | "all";

function getDateRange(filter: DateFilterType, customFrom?: string, customTo?: string) {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (filter) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "yesterday":
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "this_week":
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case "last_week":
      start.setDate(start.getDate() - start.getDay() - 7);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case "this_month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "last_month":
      start.setMonth(start.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case "this_year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "last_year":
      start.setFullYear(start.getFullYear() - 1, 0, 1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(start.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    case "custom":
      if (customFrom && customTo) {
        return { from: new Date(customFrom).toISOString(), to: new Date(customTo + "T23:59:59").toISOString() };
      }
      return null;
    case "all":
      return null;
    default:
      return null;
  }

  return { from: start.toISOString(), to: end.toISOString() };
}

const dateOptions = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This week", value: "this_week" },
  { label: "Last week", value: "last_week" },
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
  { label: "This year", value: "this_year" },
  { label: "Last year", value: "last_year" },
  { label: "Custom", value: "custom" },
  { label: "All time", value: "all" },
];

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [txPage, setTxPage] = useState(0);
  const txLimit = 10;

  const [stmtFrom, setStmtFrom] = useState("");
  const [stmtTo, setStmtTo] = useState("");
  const [settings, setSettings] = useState<any>(null);

  const [balanceData, setBalanceData] = useState({
    currentBalance: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalLoanPayments: 0,
    outstandingLoan: 0,
    totalCommission: 0,
  });

  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    setTxPage(0);
  }, [typeFilter, searchQuery, dateFilter, customFrom, customTo]);

  const dateRange = dateFilter === "custom" ? getDateRange("custom", customFrom, customTo) : getDateRange(dateFilter as DateFilterType);
  const filteredTransactions = transactions
    .filter(tx => typeFilter === "All" || tx.type === typeFilter)
    .filter(tx => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        tx.type?.toLowerCase().includes(query) ||
        tx.deposit_by?.toLowerCase().includes(query) ||
        tx.status?.toLowerCase().includes(query) ||
        String(tx.amount).includes(query)
      );
    })
    .filter(tx => {
      if (!dateRange) return true;
      const txDate = new Date(tx.created_at);
      return txDate >= new Date(dateRange.from) && txDate <= new Date(dateRange.to);
    });
  const txTotalPages = Math.ceil(filteredTransactions.length / txLimit);
  const paginatedTransactions = filteredTransactions.slice(txPage * txLimit, (txPage + 1) * txLimit);

  useEffect(() => {
    if (!customerId) return;

    async function fetchCustomerData() {
      setLoading(true);

      // Fetch customer
      const { data: cust } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .single();

      if (cust) {
        setCustomer(cust);
      }

      // Fetch transactions
      const { data: txns } = await supabase
        .from("transactions")
        .select("*, staff (first_name, last_name)")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      setTransactions(txns || []);

      // Fetch settings
      const { data: settingsData } = await supabase
        .from("settings")
        .select("*")
        .limit(1);
      if (settingsData && settingsData.length > 0) {
        setSettings(settingsData[0]);
      }

      // Calculate balances
      let totalDeposits = 0;
      let totalWithdrawals = 0;
      let totalLoanPayments = 0;
      let outstandingLoan = 0;
      let totalCommission = 0;

      (txns || []).forEach((tx: any) => {
        const amt = Number(tx.amount || 0);
        if (tx.type === "Deposit") totalDeposits += amt;
        if (tx.type === "Withdrawal") totalWithdrawals += amt;
        if (tx.type === "Loan") outstandingLoan += amt;
        if (tx.type === "Loan Payment") totalLoanPayments += amt;
        if (tx.type === "Commission" || tx.type === "Interest" || tx.type === "Service Fee") totalCommission += amt;
      });

      const currentBalance = totalDeposits + outstandingLoan - totalWithdrawals - totalLoanPayments - totalCommission;

      setBalanceData({
        currentBalance,
        totalDeposits,
        totalWithdrawals,
        totalLoanPayments,
        outstandingLoan: outstandingLoan - totalLoanPayments,
        totalCommission,
      });

      setLoading(false);
    }

    fetchCustomerData();
  }, [customerId]);

  const tabs = ["Overview", "Transactions", "Statements", "Complaints"];

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-4">
        <div className="text-center py-20">
          <p className="text-slate-500 font-bold">Customer not found</p>
          <Link href="/dashboard/accounts" className="text-accent font-bold text-sm mt-2 inline-block">
            Back to Accounts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      <ToastContainer className="no-print" />

      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/accounts"
              className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </Link>
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
              {customer.photo_url ? (
                <img src={customer.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M22 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              )}
            </div>
            <div>
              <h1 className="text-[20px] font-black text-slate-900 tracking-tight">
                {customer.last_name}, {customer.first_name}
              </h1>
              <p className="text-[12px] font-bold text-slate-500 tracking-widest">
                {customer.account_num}
              </p>
            </div>
          </div>
          {activeTab !== "Overview" && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or account ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-72 px-5 py-2.5 bg-white border border-slate-200 rounded-full text-sm italic placeholder:text-slate-300 focus:outline-none focus:border-slate-300 shadow-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-slate-100">
          <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-[13px] font-bold border-b-2 transition-colors whitespace-nowrap capitalize ${
                  activeTab === tab
                    ? "border-accent text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === "Overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Account Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Card */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 tracking-widest uppercase">Account Number</p>
                    <p className="text-[18px] font-black text-slate-900 tracking-tight mt-1">{customer.account_num}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold ${
                    customer.status === "Active"
                      ? "bg-green-50 text-green-600"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    <span className={`mr-1.5 inline-block w-1.5 h-1.5 rounded-full ${
                      customer.status === "Active" ? "bg-green-500" : "bg-slate-300"
                    }`} />
                    {customer.status}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Current Balance</p>
                    <p className="text-[20px] font-black text-slate-900 mt-1">
                      GH₵ {balanceData.currentBalance.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Total Deposits</p>
                    <p className="text-[20px] font-black text-green-600 mt-1">
                      GH₵ {balanceData.totalDeposits.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Total Withdrawals</p>
                    <p className="text-[20px] font-black text-red-500 mt-1">
                      GH₵ {balanceData.totalWithdrawals.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Outstanding Loan</p>
                    <p className="text-[20px] font-black text-blue-600 mt-1">
                      GH₵ {balanceData.outstandingLoan.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-[14px] font-black text-slate-900">Customer Details</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Full Name</p>
                    <p className="text-[14px] font-bold text-slate-900 mt-1">
                      {customer.last_name} {customer.first_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Account Type</p>
                    <p className="text-[14px] font-bold text-slate-900 mt-1 capitalize">
                      {customer.account_type || "susu account"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Gender</p>
                    <p className="text-[14px] font-bold text-slate-900 mt-1 capitalize">
                      {customer.gender || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Date of Birth</p>
                    <p className="text-[14px] font-bold text-slate-900 mt-1">
                      {customer.date_of_birth || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Phone</p>
                    <p className="text-[14px] font-bold text-slate-900 mt-1">
                      {customer.phone || customer.mobile_number || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Email</p>
                    <p className="text-[14px] font-bold text-slate-900 mt-1">
                      {customer.email || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Region</p>
                    <p className="text-[14px] font-bold text-slate-900 mt-1">
                      {customer.region || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Town</p>
                    <p className="text-[14px] font-bold text-slate-900 mt-1">
                      {customer.town || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">ID Type</p>
                    <p className="text-[14px] font-bold text-slate-900 mt-1 capitalize">
                      {customer.id_type || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">ID Number</p>
                    <p className="text-[14px] font-bold text-slate-900 mt-1">
                      {customer.id_number || "Not specified"}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Digital Address</p>
                    <p className="text-[14px] font-bold text-slate-900 mt-1">
                      {customer.digital_address || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-[14px] font-black text-slate-900">Quick Actions</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href={`/dashboard/transactions/deposit?customer=${customer.id}`}
                    className="p-4 bg-green-50 border border-green-200 rounded-xl text-center hover:bg-green-100 transition-all"
                  >
                    <div className="w-10 h-10 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                    </div>
                    <p className="text-[11px] font-bold text-green-700">Deposit</p>
                  </Link>
                  <Link
                    href={`/dashboard/transactions/withdrawal?customer=${customer.id}`}
                    className="p-4 bg-red-50 border border-red-200 rounded-xl text-center hover:bg-red-100 transition-all"
                  >
                    <div className="w-10 h-10 mx-auto mb-2 bg-red-100 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M5 12h14"/></svg>
                    </div>
                    <p className="text-[11px] font-bold text-red-700">Withdraw</p>
                  </Link>
                  <Link
                    href={`/dashboard/transactions/loan?customer=${customer.id}`}
                    className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center hover:bg-blue-100 transition-all"
                  >
                    <div className="w-10 h-10 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M11 15h2a2 2 0 1 0 0-4h-3c-1.1 0-2-.9-2-2s.9-2 2-2h2"/><path d="M12 5v14"/></svg>
                    </div>
                    <p className="text-[11px] font-bold text-blue-700">Loan</p>
                  </Link>
                  <Link
                    href={`/dashboard/accounts/add?id=${customer.id}`}
                    className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center hover:bg-amber-100 transition-all"
                  >
                    <div className="w-10 h-10 mx-auto mb-2 bg-amber-100 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </div>
                    <p className="text-[11px] font-bold text-amber-700">Settings</p>
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-[14px] font-black text-slate-900">Recent Transactions</h3>
                <button
                  onClick={() => setActiveTab("Transactions")}
                  className="text-[11px] font-bold text-accent hover:underline"
                >
                  All transactions
                </button>
              </div>
              <div className="p-6">
                {transactions.length === 0 ? (
                  <p className="text-center text-[12px] font-bold text-slate-400 py-4">No transactions yet</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                        <div>
                          <p className="text-[12px] font-bold text-slate-900">{tx.type}</p>
                          <p className="text-[10px] font-bold text-slate-500">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <p className={`text-[14px] font-black ${
                          tx.type === "Deposit" || tx.type === "Loan"
                            ? "text-green-600"
                            : "text-red-500"
                        }`}>
                          {tx.type === "Deposit" || tx.type === "Loan" ? "+" : "-"}₵ {Number(tx.amount).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Transactions" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
              <h3 className="text-[14px] font-black text-slate-900">All Transactions</h3>
              <div className="flex flex-wrap items-center gap-2">
                {["All", "Deposit", "Withdrawal", "Loan", "Loan Payment"].map((type) => (
                  <button
                    key={type}
                    onClick={() => { setTypeFilter(type); setTxPage(0); }}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                      typeFilter === type
                        ? type === "Deposit" ? "bg-green-100 text-green-700" :
                          type === "Withdrawal" ? "bg-red-100 text-red-600" :
                          type === "Loan" ? "bg-blue-100 text-blue-700" :
                          type === "Loan Payment" ? "bg-purple-100 text-purple-700" :
                          "bg-slate-200 text-slate-700"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative w-full sm:w-auto">
                <button
                  onClick={() => setShowDateDropdown(!showDateDropdown)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                  {dateOptions.find(o => o.value === dateFilter)?.label || "All time"}
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                {showDateDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDateDropdown(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                      {dateOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setDateFilter(opt.value as DateFilterType);
                            setTxPage(0);
                            if (opt.value !== "custom") setShowDateDropdown(false);
                          }}
                          className={`w-full text-left px-5 py-2.5 text-[13px] font-medium transition-colors ${
                            dateFilter === opt.value ? "bg-accent/5 text-accent font-bold" : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {dateFilter === "custom" && (
                <>
                  <input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setTxPage(0); }}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-accent/30" />
                  <span className="text-[11px] font-bold text-slate-500">to</span>
                  <input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setTxPage(0); }}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-accent/30" />
                </>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Date</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Type</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase text-right">Amount</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[12px] font-bold text-slate-400">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-[12px] font-bold text-slate-600">
                        {new Date(tx.created_at).toLocaleDateString()}
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
                      <td className={`px-6 py-4 text-right text-[14px] font-black ${
                        tx.type === "Deposit" || tx.type === "Loan" ? "text-green-600" : "text-red-500"
                      }`}>
                        {tx.type === "Deposit" || tx.type === "Loan" ? "+" : "-"}₵ {Number(tx.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          tx.status === "approved" || tx.status === "completed"
                            ? "bg-green-50 text-green-600"
                            : "bg-slate-50 text-slate-500"
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[12px] font-bold text-slate-600 capitalize">
                        {tx.deposit_by || "System"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {txTotalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
              <p className="text-[11px] font-bold text-slate-500">
                Showing {txPage * txLimit + 1} to {Math.min((txPage + 1) * txLimit, filteredTransactions.length)} of {filteredTransactions.length}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setTxPage(Math.max(0, txPage - 1))} disabled={txPage === 0}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  Previous
                </button>
                {Array.from({ length: Math.min(txTotalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (txTotalPages <= 5) {
                    pageNum = i;
                  } else if (txPage < 3) {
                    pageNum = i;
                  } else if (txPage > txTotalPages - 4) {
                    pageNum = txTotalPages - 5 + i;
                  } else {
                    pageNum = txPage - 2 + i;
                  }
                  return (
                    <button key={pageNum} onClick={() => setTxPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all ${
                        txPage === pageNum ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}>
                      {pageNum + 1}
                    </button>
                  );
                })}
                <button onClick={() => setTxPage(Math.min(txTotalPages - 1, txPage + 1))} disabled={txPage >= txTotalPages - 1}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "Statements" && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-[14px] font-black text-slate-900">Account Statement</h3>
              <p className="text-[11px] font-bold text-slate-500 mt-1">Select a date range and generate a downloadable statement</p>
            </div>
            <div className="p-6 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-2">From</label>
                <input type="date" value={stmtFrom} onChange={(e) => setStmtFrom(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 focus:outline-none focus:border-accent/30 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-2">To</label>
                <input type="date" value={stmtTo} onChange={(e) => setStmtTo(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-bold text-slate-700 focus:outline-none focus:border-accent/30 transition-all" />
              </div>
              <button onClick={() => { setStmtFrom(""); setStmtTo(""); }}
                className="px-4 py-2.5 bg-slate-100 rounded-xl text-[12px] font-bold text-slate-600 hover:bg-slate-200 transition-all">
                Clear
              </button>
              <button onClick={() => { if (!stmtFrom || !stmtTo) { showToast("Select both dates", "error"); return; } const el = document.getElementById("statement-wrapper"); if (!el) return; const w = window.open("", "_blank"); if (!w) { showToast("Pop-up blocked — allow pop-ups for this site", "error"); return; } const styles = Array.from(document.querySelectorAll("link[rel=stylesheet], style")).map(s => s.outerHTML).join(""); w.document.write(`<!DOCTYPE html><html><head><title>Account Statement - ${customer?.account_num || ""}</title>${styles}<style>@page{margin:0.4in;size:A4 portrait}body{margin:0;padding:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact}table{width:100%;border-collapse:collapse}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #e2e8f0}th{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.1em}tr{page-break-inside:avoid}</style></head><body></body></html>`); const clone = el.cloneNode(true); w.document.body.appendChild(clone); w.document.close(); setTimeout(() => { w.print(); }, 500); }}
                className="px-6 py-2.5 bg-slate-900 rounded-xl text-[12px] font-bold text-white hover:bg-slate-800 transition-all flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                Print / Download
              </button>
            </div>
          </div>

          {/* Statement Preview */}
          {stmtFrom && stmtTo && (
            <div id="statement-wrapper">
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm" id="statement-preview">
                {/* Print styles */}
              <style>{`
                @media print {
                  @page { margin: 0.4in; size: A4 portrait; }
                  html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                  #statement-wrapper table tr { page-break-inside: avoid; }
                  #statement-wrapper table thead { display: table-header-group; }
                  #statement-wrapper table tbody { display: table-row-group; }
                }
              `}</style>

              {/* Business Header */}
              <div className="p-8 border-b border-slate-200 text-center">
                {settings?.logo_url && (
                  <img src={settings.logo_url} alt="Logo" className="h-16 mx-auto mb-3 object-contain" />
                )}
                <h1 className="text-[20px] font-black text-slate-900 tracking-tight">{settings?.business_name || "VERKWA SAVINGS AND SUSU"}</h1>
                <p className="text-[11px] font-bold text-slate-500 mt-1">{settings?.address || "Tema west Adjei Kojo"}</p>
                <div className="flex items-center justify-center gap-4 mt-2">
                  <span className="text-[10px] font-bold text-slate-500">{settings?.phone || "0592728838"}</span>
                  <span className="text-[10px] font-bold text-slate-500">{settings?.email || "verkwasusu@gmail.com"}</span>
                </div>
                <div className="mt-4 inline-block px-6 py-2 bg-slate-900 rounded-full">
                  <p className="text-[12px] font-black text-white tracking-widest uppercase">Account Statement</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-8 border-b border-slate-200 flex items-center gap-6">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                  {customer?.photo_url ? (
                    <img src={customer.photo_url} alt="Customer" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Name</p>
                    <p className="text-[13px] font-black text-slate-900 mt-1">{customer?.first_name} {customer?.last_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Phone</p>
                    <p className="text-[13px] font-black text-slate-900 mt-1">{customer?.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Account No.</p>
                    <p className="text-[13px] font-black text-slate-900 mt-1">{customer?.account_num || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Statement Period</p>
                    <p className="text-[13px] font-black text-slate-900 mt-1">{new Date(stmtFrom).toLocaleDateString()} — {new Date(stmtTo).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {(() => {
                const stmtDateRange = { from: new Date(stmtFrom).toISOString(), to: new Date(stmtTo + "T23:59:59").toISOString() };
                const stmtTxs = transactions.filter(tx => {
                  const txDate = new Date(tx.created_at);
                  return txDate >= new Date(stmtDateRange.from) && txDate <= new Date(stmtDateRange.to);
                }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                let runningBalance = 0;
                const txsWithBalance = stmtTxs.map(tx => {
                  const amt = Number(tx.amount || 0);
                  if (tx.type === "Deposit" || tx.type === "Loan") runningBalance += amt;
                  else runningBalance -= amt;
                  return { ...tx, runningBalance };
                });

                const totalDeposits = stmtTxs.filter(t => t.type === "Deposit").reduce((s, t) => s + Number(t.amount || 0), 0);
                const totalWithdrawals = stmtTxs.filter(t => t.type === "Withdrawal").reduce((s, t) => s + Number(t.amount || 0), 0);
                const totalLoans = stmtTxs.filter(t => t.type === "Loan").reduce((s, t) => s + Number(t.amount || 0), 0);
                const totalLoanPayments = stmtTxs.filter(t => t.type === "Loan Payment").reduce((s, t) => s + Number(t.amount || 0), 0);
                const totalFees = stmtTxs.filter(t => ["Commission", "Service Fee", "Interest", "Other Income"].includes(t.type)).reduce((s, t) => s + Number(t.amount || 0), 0);

                return (
                  <>
                    {/* Summary Cards */}
                    <div className="p-8 border-b border-slate-200 grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="p-4 bg-green-50 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-green-600 tracking-widest uppercase">Deposits</p>
                        <p className="text-[16px] font-black text-green-700 mt-1">₵ {totalDeposits.toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-red-500 tracking-widest uppercase">Withdrawals</p>
                        <p className="text-[16px] font-black text-red-600 mt-1">₵ {totalWithdrawals.toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-blue-600 tracking-widest uppercase">Loans</p>
                        <p className="text-[16px] font-black text-blue-700 mt-1">₵ {totalLoans.toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-purple-600 tracking-widest uppercase">Loan Payments</p>
                        <p className="text-[16px] font-black text-purple-700 mt-1">₵ {totalLoanPayments.toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-amber-600 tracking-widest uppercase">Fees</p>
                        <p className="text-[16px] font-black text-amber-700 mt-1">₵ {totalFees.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Transaction Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/80">
                            <th className="px-6 py-3 text-[10px] font-bold text-slate-500 tracking-widest uppercase">#</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-slate-500 tracking-widest uppercase">Date</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-slate-500 tracking-widest uppercase">Type</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-slate-500 tracking-widest uppercase text-right">Amount</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-slate-500 tracking-widest uppercase">Status</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-slate-500 tracking-widest uppercase text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {txsWithBalance.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-[12px] font-bold text-slate-400">
                                No transactions in this period
                              </td>
                            </tr>
                          ) : (
                            txsWithBalance.map((tx, idx) => (
                              <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-3 text-[11px] font-bold text-slate-400">{idx + 1}</td>
                                <td className="px-6 py-3 text-[12px] font-bold text-slate-600">
                                  {new Date(tx.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-3">
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
                                <td className={`px-6 py-3 text-right text-[13px] font-black ${
                                  tx.type === "Deposit" || tx.type === "Loan" ? "text-green-600" : "text-red-500"
                                }`}>
                                  {tx.type === "Deposit" || tx.type === "Loan" ? "+" : "-"}₵ {Number(tx.amount).toFixed(2)}
                                </td>
                                <td className="px-6 py-3">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                    tx.status === "approved" || tx.status === "completed"
                                      ? "bg-green-50 text-green-600"
                                      : "bg-slate-50 text-slate-500"
                                  }`}>
                                    {tx.status}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-right text-[13px] font-black text-slate-700">
                                  ₵ {tx.runningBalance.toFixed(2)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-slate-200 flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400">
                        Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                      </p>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Net Movement</p>
                        <p className={`text-[16px] font-black ${
                          (totalDeposits + totalLoans - totalWithdrawals - totalLoanPayments - totalFees) >= 0
                            ? "text-green-600" : "text-red-500"
                        }`}>
                          ₵ {(totalDeposits + totalLoans - totalWithdrawals - totalLoanPayments - totalFees).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            </div>
          )}

          {!stmtFrom && !stmtTo && (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
              </div>
              <p className="text-[13px] font-bold text-slate-600">Select a date range above to generate a statement</p>
              <p className="text-[11px] font-bold text-slate-400 mt-1">The statement will include all transactions within the selected period</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "Complaints" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-10 text-center">
          <p className="text-slate-500 font-bold">Complaints coming soon</p>
        </div>
      )}
    </div>
  );
}

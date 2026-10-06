"use client";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthSync } from "@/lib/hooks/useAuthSync";
import { showToast, ToastContainer, showConfirm } from "@/components/Toast";

type DateFilter = "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "this_year" | "last_year" | "custom" | "all";

function getDateRange(filter: DateFilter, customFrom?: string, customTo?: string) {
  const now = new Date();
  const start = new Date();
  const end = new Date();
  switch (filter) {
    case "today":
      start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); break;
    case "yesterday":
      start.setDate(now.getDate() - 1); start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1); end.setHours(23, 59, 59, 999); break;
    case "this_week":
      start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); break;
    case "last_week":
      start.setDate(now.getDate() - now.getDay() - 7); start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - now.getDay() - 1); end.setHours(23, 59, 59, 999); break;
    case "this_month":
      start.setDate(1); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); break;
    case "last_month":
      start.setMonth(now.getMonth() - 1, 1); start.setHours(0, 0, 0, 0);
      end.setDate(0); end.setHours(23, 59, 59, 999); break;
    case "this_year":
      start.setMonth(0, 1); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999); break;
    case "last_year":
      start.setFullYear(now.getFullYear() - 1, 0, 1); start.setHours(0, 0, 0, 0);
      end.setFullYear(now.getFullYear() - 1, 11, 31); end.setHours(23, 59, 59, 999); break;
    case "custom":
      if (customFrom && customTo) {
        const f = new Date(customFrom); f.setHours(0, 0, 0, 0);
        const t = new Date(customTo); t.setHours(23, 59, 59, 999);
        return { from: f.toISOString(), to: t.toISOString() };
      }
      return null;
    case "all": return null;
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

const dateOptions: { label: string; value: DateFilter }[] = [
  { label: "All time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "this_week" },
  { label: "Last Week", value: "last_week" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "This Year", value: "this_year" },
  { label: "Last Year", value: "last_year" },
  { label: "Custom Range", value: "custom" },
];

function generateTxRef(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${dd}${mm}${yy}${hh}${mi}${ss}${ms}`;
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div></div>}>
      <TransactionsContent />
    </Suspense>
  );
}

function TransactionsContent() {
  const { resolvedRole, employeeId, isSyncing } = useAuthSync();
  const role = (resolvedRole || "").toLowerCase();
  const isAdmin = ["administrator", "admin", "superadmin"].includes(role);
  const isRestricted = !isAdmin && role !== "client" && role !== "";

  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get("tab")?.toUpperCase() || "ALL";
  const initialCustomer = searchParams.get("customer") || "";

  const tabs = ["All", "Deposits", "Withdrawals", "Loans", "Loan payments", ...(isAdmin ? ["Revenue"] : [])];
  const [activeTab, setActiveTab] = useState(initialTab);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomer);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const [totals, setTotals] = useState({
    amount: 0, count: 0, payable: 0, paid: 0, outstanding: 0,
    principal: 0, interest: 0, rejected: 0, approved: 0,
  });

  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<any>(null);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [editForm, setEditForm] = useState({ amount: "", deposit_by: "", status: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ customer_id: "", amount: "", details: "", branch_id: "" });

  useEffect(() => {
    async function fetchMetadata() {
      if (isSyncing) return;
      const { data: custData } = await supabase.from("customers").select("id, first_name, last_name, account_num").order("last_name");
      const { data: branchData } = await supabase.from("branches").select("id, name").order("name");
      const { data: empData } = await supabase.from("staff").select("id, first_name, last_name").eq("status", true).order("last_name");
      setCustomers(custData || []);
      setBranches(branchData || []);
      setEmployees(empData || []);
    }
    fetchMetadata();
  }, [isSyncing]);

  useEffect(() => { setPage(0); setSelectedIds(new Set()); }, [dateFilter, customFrom, customTo, searchQuery, activeTab]);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        if (isSyncing) return;
        setLoading(true);
        if (isRestricted && !employeeId) { setLoading(false); return; }

        const currentTab = activeTab.toUpperCase();
        const dbType = currentTab === "ALL" ? null :
          currentTab === "DEPOSITS" ? "Deposit" :
          currentTab === "WITHDRAWALS" ? "Withdrawal" :
          currentTab === "LOANS" ? "Loan" :
          currentTab === "LOAN PAYMENTS" ? "Loan Payment" :
          currentTab === "REVENUE" ? "REVENUE" : null;

        const selectFields = isRestricted && employeeId
          ? `*, customers(first_name, last_name, account_num, added_by), staff (first_name, last_name), branches (name)`
          : `*, customers (first_name, last_name, account_num), staff (first_name, last_name), branches (name)`;

        let query = supabase.from("transactions").select(selectFields, { count: "exact" })
          .order("created_at", { ascending: false });

        if (dbType) {
          if (dbType === "REVENUE") query = query.in("type", ["Commission", "Service Fee", "Interest", "Other Income"]);
          else query = query.eq("type", dbType);
        }
        if (selectedCustomerId) query = query.eq("customer_id", selectedCustomerId);
        if (selectedBranchId) query = query.eq("branch_id", selectedBranchId);
        if (selectedStatus) query = query.eq("status", selectedStatus);
        if (isRestricted && employeeId) query = query.eq("staff_id", employeeId);

        if (searchQuery.trim()) {
          query = query.or(`deposit_by.ilike.%${searchQuery}%`);
        }

        const dateRange = dateFilter === "custom" ? getDateRange("custom", customFrom, customTo) : getDateRange(dateFilter);
        if (dateRange) query = query.gte("created_at", dateRange.from).lte("created_at", dateRange.to);

        const { data, error, count } = await query.range(page * limit, (page + 1) * limit - 1);
        if (error) throw error;

        const txs = (data || []).filter((tx: any) => tx.status !== "rejected" && tx.status !== "denied" && tx.status !== "failed");
        setRecords(txs);
        setTotalCount(count || 0);

        const { data: aggData } = await supabase.rpc("get_transaction_aggregates", {
          p_type: dbType, p_employee_id: isRestricted ? employeeId : null,
        });
        if (aggData) {
          setTotals({
            amount: aggData.total_amount, count: aggData.count,
            payable: aggData.payable || 0, paid: aggData.paid || 0,
            outstanding: (aggData.payable || 0) - (aggData.paid || 0),
            approved: aggData.approved_count || 0, rejected: aggData.rejected_count || 0,
            principal: (aggData.payable || 0) * 0.9, interest: (aggData.payable || 0) * 0.1,
          });
        }
      } catch (err: any) {
        console.error("Error fetching transactions:", err.message || err);
      } finally {
        setLoading(false);
      }
    }
    fetchTransactions();
  }, [isSyncing, activeTab, page, resolvedRole, employeeId, selectedCustomerId, selectedBranchId, selectedStatus, dateFilter, customFrom, customTo, searchQuery]);

  const totalPages = Math.ceil(totalCount / limit);

  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(records.map((r) => r.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!isAdmin) { showToast("Only administrators can delete", "error"); return; }
    if (!(await showConfirm("Delete transactions", `Delete ${selectedIds.size} selected transaction(s)? This cannot be undone.`))) return;

    setDeleting(true);
    const { error } = await supabase.from("transactions").delete().in("id", Array.from(selectedIds));
    if (error) {
      showToast("Error deleting: " + error.message, "error");
    } else {
      setRecords((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setTotalCount((prev) => prev - selectedIds.size);
      setSelectedIds(new Set());
      showToast("Deleted successfully");
    }
    setDeleting(false);
  };

  const handleLogPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.customer_id || !paymentForm.amount) { showToast("Fill all required fields", "error"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("transactions").insert([{
        amount: Number(paymentForm.amount), type: "Loan Payment", customer_id: paymentForm.customer_id,
        branch_id: paymentForm.branch_id || branches[0]?.id, staff_id: employeeId,
        deposit_by: `LOAN_PAYMENT | ${paymentForm.details}`, status: "completed", tx_ref: generateTxRef(),
      }]);
      if (error) throw error;
      setIsPaymentDrawerOpen(false);
      setPaymentForm({ customer_id: "", amount: "", details: "", branch_id: "" });
      showToast("Payment logged!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    } finally { setSubmitting(false); }
  };


  const openEditDrawer = (rec: any) => {
    setEditingRecord(rec);
    setEditForm({
      amount: rec.amount?.toString() || "",
      deposit_by: rec.deposit_by || "",
      status: rec.status || "",
      note: rec.note || "",
    });
    setIsEditDrawerOpen(true);
  };

  const handleUpdateTransaction = async () => {
    if (!editingRecord) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("transactions")
        .update({
          amount: Number(editForm.amount),
          deposit_by: editForm.deposit_by,
          status: editForm.status,
          note: editForm.note || null,
        })
        .eq("id", editingRecord.id);
      if (error) throw error;
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingRecord.id
            ? { ...r, amount: Number(editForm.amount), deposit_by: editForm.deposit_by, status: editForm.status, note: editForm.note }
            : r
        )
      );
      setIsEditDrawerOpen(false);
      showToast("Transaction updated");
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    } finally { setSubmitting(false); }
  };

  const activeLabel = dateOptions.find((o) => o.value === dateFilter)?.label || "All time";

  const getTabLabel = () => {
    if (activeTab === "DEPOSITS") return "Deposit";
    if (activeTab === "WITHDRAWALS") return "Withdrawal";
    return activeTab.charAt(0) + activeTab.slice(1).toLowerCase();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      <ToastContainer />

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center px-6 pt-4 border-b border-slate-50 gap-8 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab.toUpperCase()); setPage(0); setSelectedIds(new Set()); }}
              className={`pb-3 text-[13px] font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab.toUpperCase() === tab.toUpperCase()
                  ? "border-accent text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Actions Row */}
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 bg-slate-50/50">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-72 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs focus:outline-none focus:border-accent/30 transition-all placeholder:text-slate-300"
              />
            </div>

            {/* Date Filter */}
            <div className="relative">
              <button
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                {activeLabel}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              {showDateDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDateDropdown(false)} />
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden">
                    {dateOptions.map((opt) => (
                      <button key={opt.value} onClick={() => { setDateFilter(opt.value); if (opt.value !== "custom") setShowDateDropdown(false); }}
                        className={`w-full text-left px-5 py-2.5 text-[13px] font-medium transition-colors ${dateFilter === opt.value ? "bg-accent/5 text-accent font-bold" : "text-slate-600 hover:bg-slate-50"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
              ({totalCount}) records
            </span>
            {selectedIds.size > 0 && isAdmin && (
              <button onClick={handleBulkDelete} disabled={deleting}
                className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-full font-bold text-xs hover:bg-red-100 transition-all flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                Delete ({selectedIds.size})
              </button>
            )}
            {activeTab === "DEPOSITS" ? (
              <Link href="/dashboard/transactions/deposit"
                className="px-6 py-2.5 bg-[#2EB67D] text-white rounded-full font-bold text-xs hover:bg-[#259465] transition-all shadow-md shadow-slate-200 whitespace-nowrap flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                New deposit
              </Link>
            ) : activeTab === "ALL" || activeTab === "REVENUE" ? null : (
              <button onClick={() => {
                if (activeTab === "LOAN PAYMENTS") router.push("/dashboard/transactions/loan-repayment");
                if (activeTab === "WITHDRAWALS") router.push("/dashboard/transactions/withdrawal");
                if (activeTab === "LOANS") router.push("/dashboard/transactions/loan");
              }}
                className="px-6 py-2.5 bg-[#2EB67D] text-white rounded-full font-bold text-xs hover:bg-[#259465] transition-all shadow-md shadow-slate-200 whitespace-nowrap">
                {activeTab === "WITHDRAWALS" && "＋ New debit"}
                {activeTab === "LOANS" && "＋ New loan"}
                {activeTab === "LOAN PAYMENTS" && "＋ Log payment"}
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range */}
        {dateFilter === "custom" && (
          <div className="px-6 pb-4 flex items-center gap-3 bg-slate-50/50 border-b border-slate-50">
            <span className="text-[11px] font-bold text-slate-500">From</span>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-accent/30" />
            <span className="text-[11px] font-bold text-slate-500">To</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-accent/30" />
          </div>
        )}

        {/* Filters Row */}
        <div className="p-6 border-b border-slate-50 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-900 tracking-widest uppercase">Customer</label>
            <select value={selectedCustomerId} onChange={(e) => { setSelectedCustomerId(e.target.value); setPage(0); }}
              className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:border-accent/30 transition-all appearance-none cursor-pointer">
              <option value="">All customers</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.last_name}, {c.first_name} ({c.account_num})</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-900 tracking-widest uppercase">Branch</label>
            <select value={selectedBranchId} onChange={(e) => { setSelectedBranchId(e.target.value); setPage(0); }}
              className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:border-accent/30 transition-all appearance-none cursor-pointer">
              <option value="">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-900 tracking-widest uppercase">Status</label>
            <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setPage(0); }}
              className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:border-accent/30 transition-all appearance-none cursor-pointer">
              <option value="">All status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="px-6 py-5 border-b border-slate-50 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/30">
          {activeTab === "ALL" && (
            <>
              <SummaryCard label="Total Transactions" value={totals.count} isNumber />
              <SummaryCard label="Total Volume" value={totals.amount} />
            </>
          )}
          {activeTab === "DEPOSITS" && (
            <>
              <SummaryCard label="Total Deposits" value={totals.amount} />
              <SummaryCard label="Transactions" value={totals.count} isNumber />
            </>
          )}
          {activeTab === "WITHDRAWALS" && (
            <>
              <SummaryCard label="Total Withdrawals" value={totals.amount} />
              <SummaryCard label="Transactions" value={totals.count} isNumber />
            </>
          )}
          {activeTab === "LOANS" && (
            <>
              <SummaryCard label="Principal" value={totals.principal} />
              <SummaryCard label="Liabilities" value={totals.payable} />
              <SummaryCard label="Authorized" value={totals.approved} isNumber />
            </>
          )}
          {activeTab === "LOAN PAYMENTS" && (
            <>
              <SummaryCard label="Target" value={totals.payable} />
              <SummaryCard label="Recovered" value={totals.paid} />
              <SummaryCard label="Balance" value={totals.outstanding} color="text-red-500" />
            </>
          )}
          {activeTab === "REVENUE" && (
            <SummaryCard label="Net Revenue" value={totals.amount} />
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[150px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                {isAdmin && (
                  <th className="px-6 py-4 w-10">
                    <input type="checkbox" checked={selectedIds.size === records.length && records.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent/30 cursor-pointer" />
                  </th>
                )}
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Date</th>
                {activeTab === "ALL" ? (
                  <>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Customer</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Type</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase text-right">Amount</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Agent</th>
                  </>
                ) : activeTab === "REVENUE" ? (
                  <>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Customer</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase text-right">Yield</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Source</th>
                  </>
                ) : activeTab === "LOAN PAYMENTS" ? (
                  <>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Customer</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase text-right">Repayment</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Agent</th>
                  </>
                ) : activeTab === "LOANS" ? (
                  <>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Customer</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase text-right">Amount</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Status</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Customer</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase text-right">Amount</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Agent</th>
                  </>
                )}
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-slate-500">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-10 py-20 text-center text-[11px] font-bold text-slate-300 tracking-widest">
                    No records found.
                  </td>
                </tr>
              ) : (
                records.map((rec, i) => (
                  <tr key={rec.id || i} className="hover:bg-slate-50/80 transition-colors">
                    {isAdmin && (
                      <td className="px-6 py-4 w-10">
                        <input type="checkbox" checked={selectedIds.has(rec.id)}
                          onChange={() => toggleSelect(rec.id)}
                          className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent/30 cursor-pointer" />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-bold text-slate-900 leading-none mb-1">
                        {new Date(rec.created_at).toLocaleDateString([], { day: "2-digit", month: "short" })}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-500">
                        {new Date(rec.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </td>

                    {activeTab === "ALL" ? (
                      <>
                        <td className="px-6 py-4">
                          <p className="text-[14px] font-bold text-slate-800">{rec.customers ? `${rec.customers.last_name}, ${rec.customers.first_name}` : "Admin"}</p>
                          <p className="text-[11px] font-medium text-slate-500">{rec.customers?.account_num}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                            rec.type === "Deposit" ? "bg-green-50 text-green-600" :
                            rec.type === "Withdrawal" ? "bg-red-50 text-red-500" :
                            rec.type === "Loan" ? "bg-blue-50 text-blue-600" :
                            "bg-slate-50 text-slate-500"
                          }`}>{rec.type}</span>
                        </td>
                        <td className="px-6 py-4 text-right"><p className="text-[16px] font-bold text-slate-900">₵ {Number(rec.amount).toFixed(2)}</p></td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                            rec.status === "ok" || rec.status === "sent" || rec.status === "approved" || rec.status === "completed"
                              ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-500"
                          }`}>{rec.status || "Pending"}</span>
                        </td>
                        <td className="px-6 py-4"><p className="text-[12px] font-bold text-slate-600 capitalize">{rec.deposit_by || "System"}</p></td>
                      </>
                    ) : activeTab === "REVENUE" ? (
                      <>
                        <td className="px-6 py-4">
                          <p className="text-[14px] font-bold text-slate-800">{rec.customers ? `${rec.customers.last_name}, ${rec.customers.first_name}` : "Admin"}</p>
                          <p className="text-[11px] font-medium text-slate-500">{rec.customers?.account_num}</p>
                        </td>
                        <td className="px-6 py-4 text-right"><p className="text-[16px] font-bold text-slate-900">₵ {Number(rec.amount).toFixed(2)}</p></td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                            rec.deposit_by?.includes("Deposit") ? "bg-green-50 text-green-600" :
                            rec.deposit_by?.includes("Withdrawal") ? "bg-red-50 text-red-600" :
                            rec.deposit_by?.includes("Loan Payment") ? "bg-purple-50 text-purple-600" :
                            rec.deposit_by?.includes("Loan") ? "bg-blue-50 text-blue-600" :
                            "bg-slate-50 text-slate-600"
                          }`}>
                            {rec.deposit_by?.includes("Deposit") ? "Deposit" :
                             rec.deposit_by?.includes("Withdrawal") ? "Withdrawal" :
                             rec.deposit_by?.includes("Loan Payment") ? "Loan Payment" :
                             rec.deposit_by?.includes("Loan") ? "Loan" :
                             rec.type}
                          </span>
                        </td>
                      </>
                    ) : activeTab === "LOAN PAYMENTS" ? (
                      <>
                        <td className="px-6 py-4">
                          <p className="text-[14px] font-bold text-slate-800">{rec.customers ? `${rec.customers.last_name}, ${rec.customers.first_name}` : "Admin"}</p>
                          <p className="text-[11px] font-medium text-slate-500">{rec.customers?.account_num}</p>
                        </td>
                        <td className="px-6 py-4 text-right"><p className="text-[16px] font-bold text-slate-900">₵ {Number(rec.amount).toFixed(2)}</p></td>
                        <td className="px-6 py-4"><p className="text-[12px] font-bold text-slate-600 capitalize">{rec.deposit_by || "System"}</p></td>
                      </>
                    ) : activeTab === "LOANS" ? (
                      <>
                        <td className="px-6 py-4">
                          <p className="text-[14px] font-bold text-slate-800">{rec.customers ? `${rec.customers.last_name}, ${rec.customers.first_name}` : "Admin"}</p>
                          <p className="text-[11px] font-medium text-slate-500">{rec.customers?.account_num}</p>
                        </td>
                        <td className="px-6 py-4 text-right"><p className="text-[16px] font-bold text-slate-900">₵ {Number(rec.amount).toFixed(2)}</p></td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                            rec.status === "ok" || rec.status === "sent" || rec.status === "approved" || rec.status === "completed"
                              ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-500"
                          }`}>{rec.status || "Pending"}</span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4">
                          <p className="text-[14px] font-bold text-slate-800">{rec.customers ? `${rec.customers.last_name}, ${rec.customers.first_name}` : "Admin"}</p>
                          <p className="text-[11px] font-medium text-slate-500">{rec.customers?.account_num}</p>
                        </td>
                        <td className="px-6 py-4 text-right"><p className="text-[16px] font-bold text-slate-900">₵ {Number(rec.amount).toFixed(2)}</p></td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                            rec.status === "ok" || rec.status === "sent" || rec.status === "approved"
                              ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-500"
                          }`}>{rec.status || "Pending"}</span>
                        </td>
                        <td className="px-6 py-4"><p className="text-[12px] font-bold text-slate-600 capitalize">{rec.deposit_by || "System"}</p></td>
                      </>
                    )}

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => { setViewingRecord(rec); setIsViewDrawerOpen(true); }} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm" title="View details">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button onClick={() => openEditDrawer(rec)} className={`p-2 bg-white border border-slate-200 rounded-lg transition-all shadow-sm ${!isAdmin && rec.staff_id !== employeeId ? "text-slate-300 cursor-not-allowed" : "text-slate-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600"}`} title={!isAdmin && rec.staff_id !== employeeId ? "Cannot edit other staff's transactions" : "Edit"} disabled={!isAdmin && rec.staff_id !== employeeId}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </button>
                        {isAdmin && (
                          <button onClick={async () => {
                            if (!(await showConfirm("Delete transaction", "Delete this transaction?"))) return;
                            const { error } = await supabase.from("transactions").delete().eq("id", rec.id);
                            if (error) { showToast("Error: " + error.message, "error"); }
                            else { setRecords((prev) => prev.filter((r) => r.id !== rec.id)); setTotalCount((p) => p - 1); showToast("Deleted"); }
                          }}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all shadow-sm" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {records.length > 0 && (
          <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Page {page + 1} of {totalPages} ({totalCount} total)
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page === 0 || loading} onClick={() => setPage(0)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm">«</button>
              <button disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm">‹</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) pageNum = i;
                else if (page < 3) pageNum = i;
                else if (page > totalPages - 4) pageNum = totalPages - 7 + i;
                else pageNum = page - 3 + i;
                return (
                  <button key={pageNum} onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all shadow-sm ${page === pageNum ? "bg-slate-900 text-white border border-slate-900" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {pageNum + 1}
                  </button>
                );
              })}
              <button disabled={page >= totalPages - 1 || loading} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm">›</button>
              <button disabled={page >= totalPages - 1 || loading} onClick={() => setPage(totalPages - 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm">»</button>
            </div>
          </div>
        )}
      </div>

      {/* TAKE DEDUCTION DRAWER */}
      {/* NEW PAYMENT DRAWER */}
      {isPaymentDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60] backdrop-blur-sm" onClick={() => setIsPaymentDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-8 border-b border-slate-50">
              <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">Log Payment</h2>
              <button onClick={() => setIsPaymentDrawerOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all font-bold">✕</button>
            </div>
            <div className="p-10 space-y-10 overflow-y-auto flex-1 scrollbar-hide">
              <form onSubmit={handleLogPaymentSubmit} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">Member profile</label>
                  <select required value={paymentForm.customer_id} onChange={(e) => setPaymentForm({ ...paymentForm, customer_id: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] font-bold focus:outline-none appearance-none cursor-pointer">
                    <option value="">Select member...</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.last_name}, {c.first_name} ({c.account_num})</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">Branch</label>
                  <select required value={paymentForm.branch_id} onChange={(e) => setPaymentForm({ ...paymentForm, branch_id: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] font-bold focus:outline-none appearance-none cursor-pointer">
                    <option value="">Select branch...</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">Amount (₵)</label>
                  <input type="number" required placeholder="0.00" value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[24px] font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-accent/20 transition-all placeholder:text-slate-200" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">Note</label>
                  <textarea placeholder="Enter remarks..." value={paymentForm.details}
                    onChange={(e) => setPaymentForm({ ...paymentForm, details: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] font-semibold focus:outline-none focus:bg-white focus:border-accent/20 transition-all min-h-[120px]" />
                </div>
                <div className="pt-6 space-y-3 border-t border-slate-50">
                  <button type="submit" disabled={submitting}
                    className="w-full py-4 bg-[#2EB67D] text-white rounded-2xl font-bold text-[13px] hover:bg-[#259465] transition-all shadow-xl shadow-slate-200 disabled:opacity-50">
                    {submitting ? "Syncing..." : "Verify and Log"}
                  </button>
                  <button type="button" onClick={() => setIsPaymentDrawerOpen(false)}
                    className="w-full py-4 bg-white text-slate-500 rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:text-slate-900 transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* VIEW TRANSACTION DRAWER */}
      {isViewDrawerOpen && viewingRecord && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60] backdrop-blur-sm" onClick={() => setIsViewDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-8 border-b border-slate-50">
              <div>
                <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">Transaction Details</h2>
                <p className="text-[12px] text-slate-500 mt-1">{viewingRecord.customers ? `${viewingRecord.customers.last_name}, ${viewingRecord.customers.first_name}` : "System"}</p>
              </div>
              <button onClick={() => setIsViewDrawerOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-800 transition-all font-bold">✕</button>
            </div>

            <div className="p-8 space-y-6 flex-1 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Transaction ID</label>
                  <p className="text-[13px] font-bold text-slate-900">{viewingRecord.tx_ref || viewingRecord.id}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Type</label>
                  <p className="text-[13px] font-bold text-slate-900">{viewingRecord.type}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Amount</label>
                  <p className="text-[20px] font-bold text-slate-900">₵ {Number(viewingRecord.amount).toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Status</label>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                    viewingRecord.status === "approved" || viewingRecord.status === "completed"
                      ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-500"
                  }`}>{viewingRecord.status || "Pending"}</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Deposit by</label>
                  <p className="text-[13px] font-bold text-slate-900">{viewingRecord.deposit_by || "System"}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Branch</label>
                  <p className="text-[13px] font-bold text-slate-900">{viewingRecord.branches?.name || "—"}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Account</label>
                  <p className="text-[13px] font-bold text-slate-900">{viewingRecord.customers?.account_num || "—"}</p>
                </div>
              </div>

              {viewingRecord.note && (
                <div className="space-y-2 pt-4 border-t border-slate-50">
                  <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Note</label>
                  <p className="text-[13px] font-bold text-slate-900">{viewingRecord.note}</p>
                </div>
              )}

              <div className="space-y-1 pt-4 border-t border-slate-50">
                <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Created</label>
                <p className="text-[13px] font-bold text-slate-900">{new Date(viewingRecord.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="p-8 border-t border-slate-50">
              <button onClick={() => setIsViewDrawerOpen(false)}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-[13px] hover:bg-slate-200 transition-all">
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* EDIT TRANSACTION DRAWER */}
      {isEditDrawerOpen && editingRecord && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60] backdrop-blur-sm" onClick={() => setIsEditDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-8 border-b border-slate-50">
              <div>
                <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">Edit Transaction</h2>
                <p className="text-[12px] text-slate-500 mt-1">{editingRecord.customers ? `${editingRecord.customers.last_name}, ${editingRecord.customers.first_name}` : "System"} — {new Date(editingRecord.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setIsEditDrawerOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-800 transition-all font-bold">✕</button>
            </div>

            <div className="p-8 space-y-6 flex-1 overflow-y-auto scrollbar-hide">
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-slate-500 tracking-wide">Amount (₵)</label>
                <input type="number" value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[20px] font-bold text-slate-900 focus:outline-none focus:border-accent/30 transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold text-slate-500 tracking-wide">Deposit by</label>
                <select value={editForm.deposit_by}
                  onChange={(e) => setEditForm({ ...editForm, deposit_by: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-900 focus:outline-none focus:border-accent/30 transition-all appearance-none cursor-pointer">
                  <option value="">Select staff</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={`${emp.first_name} ${emp.last_name}`}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold text-slate-500 tracking-wide">Status</label>
                <select value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-900 focus:outline-none focus:border-accent/30 transition-all appearance-none cursor-pointer">
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold text-slate-500 tracking-wide">Note</label>
                <textarea placeholder="Add a note..." value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-semibold focus:outline-none focus:border-accent/30 transition-all min-h-[120px]" />
              </div>
            </div>

            <div className="p-8 border-t border-slate-50 space-y-3">
              <button onClick={handleUpdateTransaction} disabled={submitting}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-[13px] hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50">
                {submitting ? "Saving..." : "Save changes"}
              </button>
              <button onClick={() => setIsEditDrawerOpen(false)}
                className="w-full py-4 bg-white text-slate-500 rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:text-slate-900 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, isNumber = false, color = "text-slate-900" }: { label: string; value: number; isNumber?: boolean; color?: string }) {
  return (
    <div className="p-4 bg-white rounded-xl border border-slate-100 flex flex-col hover:shadow-sm transition-all">
      <span className="text-[10px] font-bold text-slate-500 tracking-widest mb-1 uppercase">{label}</span>
      <span className={`text-[18px] font-bold tracking-tight ${color} leading-none`}>
        {isNumber ? value : `₵ ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
      </span>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthSync } from "@/lib/hooks/useAuthSync";
import { showToast, showConfirm, ToastContainer } from "@/components/Toast";

type DateFilter = "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "this_year" | "last_year" | "custom" | "all";

function getDateRange(filter: DateFilter, customFrom?: string, customTo?: string) {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (filter) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "yesterday":
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "this_week":
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "last_week":
      start.setDate(now.getDate() - now.getDay() - 7);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - now.getDay() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "this_month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "last_month":
      start.setMonth(now.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case "this_year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "last_year":
      start.setFullYear(now.getFullYear() - 1, 0, 1);
      start.setHours(0, 0, 0, 0);
      end.setFullYear(now.getFullYear() - 1, 11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    case "custom":
      if (customFrom && customTo) {
        const f = new Date(customFrom);
        f.setHours(0, 0, 0, 0);
        const t = new Date(customTo);
        t.setHours(23, 59, 59, 999);
        return { from: f.toISOString(), to: t.toISOString() };
      }
      return null;
    case "all":
      return null;
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

export default function AccountsPage() {
  const { resolvedRole, employeeId, isSyncing } = useAuthSync();
  const role = (resolvedRole || "").toLowerCase();
  const isAdmin = ["administrator", "admin", "superadmin"].includes(role);
  const isRestricted = !isAdmin && role !== "client" && role !== "";

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;
  const [activeTab, setActiveTab] = useState<"Customers" | "Accounts">("Customers");

  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [customerTransactions, setCustomerTransactions] = useState<any[]>([]);
  const [fetchingTxs, setFetchingTxs] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(records.map((r) => r.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!isAdmin) {
      showToast("Only administrators can delete customers", "error");
      return;
    }
    const confirmed = await showConfirm(
      "Delete Customers",
      `Delete ${selectedIds.size} selected customer(s)? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    const { error } = await supabase.from("customers").delete().in("id", Array.from(selectedIds));
    if (error) {
      if (error.code === "23503") {
        showToast("Cannot delete — some customers have transaction records", "error");
      } else {
        showToast("Error deleting: " + error.message, "error");
      }
    } else {
      setRecords((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setTotalCount((prev) => prev - selectedIds.size);
      setSelectedIds(new Set());
      showToast(`${selectedIds.size} customer(s) deleted`);
    }
    setDeleting(false);
  };

  useEffect(() => {
    if (isDrawerOpen && selectedCustomer) {
      const fetchTxs = async () => {
        setFetchingTxs(true);
        const { data } = await supabase
          .from("transactions")
          .select(`*, staff (first_name, last_name)`)
          .eq("customer_id", selectedCustomer.id)
          .order("created_at", { ascending: false })
          .limit(10);
        setCustomerTransactions(data || []);
        setFetchingTxs(false);
      };
      fetchTxs();
    } else {
      setCustomerTransactions([]);
    }
  }, [isDrawerOpen, selectedCustomer]);

  useEffect(() => {
    setPage(0);
    setSelectedIds(new Set());
  }, [dateFilter, customFrom, customTo, search, sortBy]);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        setLoading(true);

        let query = supabase
          .from("customers")
          .select(`*, staff (first_name, last_name)`, { count: "exact" });

        const sortMap: Record<string, { column: string; ascending: boolean }> = {
          newest: { column: "created_at", ascending: false },
          oldest: { column: "created_at", ascending: true },
          name_asc: { column: "first_name", ascending: true },
          name_desc: { column: "first_name", ascending: false },
        };
        const sort = sortMap[sortBy] || sortMap.newest;
        query = query.order(sort.column, { ascending: sort.ascending });

        if (isRestricted && employeeId) {
          query = query.eq("added_by", employeeId);
        }

        if (search.trim()) {
          query = query.or(
            `first_name.ilike.%${search}%,last_name.ilike.%${search}%,account_num.ilike.%${search}%,email.ilike.%${search}%`
          );
        }

        const dateRange =
          dateFilter === "custom"
            ? getDateRange("custom", customFrom, customTo)
            : getDateRange(dateFilter);

        if (dateRange) {
          query = query.gte("created_at", dateRange.from).lte("created_at", dateRange.to);
        }

        const { data, error, count } = await query.range(
          page * limit,
          (page + 1) * limit - 1
        );

        if (error) throw error;

        setRecords(data || []);
        setTotalCount(count || 0);
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCustomers();
  }, [page, resolvedRole, employeeId, dateFilter, customFrom, customTo, search, sortBy]);

  const totalPages = Math.ceil(totalCount / limit);

  const handleCustomerDelete = async () => {
    if (!selectedCustomer) return;
    if (!isAdmin) {
      showToast("Only administrators can delete customers", "error");
      return;
    }

    const confirmed = await showConfirm(
      "Delete Customer",
      `Are you sure you want to delete ${selectedCustomer.first_name} ${selectedCustomer.last_name}? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", selectedCustomer.id);

    if (error) {
      if (error.code === "23503") {
        showToast("Cannot delete — customer has transaction records", "error");
      } else {
        showToast("Error deleting: " + error.message, "error");
      }
    } else {
      setIsDrawerOpen(false);
      setRecords((prev) => prev.filter((r) => r.id !== selectedCustomer.id));
      setTotalCount((prev) => prev - 1);
      showToast("Customer deleted");
    }
    setDeleting(false);
  };

  const activeLabel =
    dateOptions.find((o) => o.value === dateFilter)?.label || "All time";

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      <ToastContainer />

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Tabs Row */}
        <div className="flex items-center px-6 pt-4 border-b border-slate-50 gap-8">
          {(["Customers", "Accounts"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setPage(0);
              }}
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

        {/* Actions Row */}
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={activeTab === "Customers" ? "Search customers..." : "Search by name or account..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-72 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs focus:outline-none focus:border-accent/30 transition-all placeholder:text-slate-300"
              />
            </div>

            {/* Date Filter */}
            <div className="relative">
              <button
                onClick={() => setShowDateDropdown(!showDateDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
                {activeLabel}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {showDateDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDateDropdown(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden">
                    {dateOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setDateFilter(opt.value);
                          if (opt.value !== "custom") setShowDateDropdown(false);
                        }}
                        className={`w-full text-left px-5 py-2.5 text-[13px] font-medium transition-colors ${
                          dateFilter === opt.value
                            ? "bg-accent/5 text-accent font-bold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => { setShowSortDropdown(!showSortDropdown); setShowDateDropdown(false); }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
                {sortBy === "newest" ? "Newest" : sortBy === "oldest" ? "Oldest" : sortBy === "name_asc" ? "Name A–Z" : "Name Z–A"}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>

              {showSortDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 py-2 overflow-hidden">
                    {[
                      { label: "Newest first", value: "newest" },
                      { label: "Oldest first", value: "oldest" },
                      { label: "Name A–Z", value: "name_asc" },
                      { label: "Name Z–A", value: "name_desc" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setSortBy(opt.value); setShowSortDropdown(false); }}
                        className={`w-full text-left px-5 py-2.5 text-[13px] font-medium transition-colors ${
                          sortBy === opt.value ? "bg-accent/5 text-accent font-bold" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              ({totalCount}) records
            </span>
            {selectedIds.size > 0 && isAdmin && (
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="px-5 py-2 bg-red-50 border border-red-200 text-red-600 rounded-full font-bold text-xs hover:bg-red-100 transition-all flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                Delete ({selectedIds.size})
              </button>
            )}
            <Link
              href="/dashboard/accounts/add"
              className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-bold text-xs hover:bg-black transition-all shadow-md shadow-slate-200"
            >
              Add Customer
            </Link>
          </div>
        </div>

        {/* Custom Date Range */}
        {dateFilter === "custom" && (
          <div className="px-6 pb-4 flex items-center gap-3 bg-slate-50/50">
            <span className="text-[11px] font-bold text-slate-500">From</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-accent/30"
            />
            <span className="text-[11px] font-bold text-slate-500">To</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-accent/30"
            />
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto min-h-[150px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                {activeTab === "Customers" ? (
                  <>
                    {isAdmin && (
                      <th className="px-6 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === records.length && records.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent/30 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="hidden md:table-cell px-8 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                      ID
                    </th>
                    <th className="px-6 md:px-8 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                      Account
                    </th>
                    <th className="px-6 md:px-8 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                      Customer
                    </th>
                    <th className="hidden sm:table-cell px-8 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                      Status
                    </th>
                    <th className="px-6 md:px-8 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase text-right">
                      Actions
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-6 md:px-8 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                      Account No.
                    </th>
                    <th className="px-6 md:px-8 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                      Customer
                    </th>
                    <th className="hidden sm:table-cell px-8 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                      Mode
                    </th>
                    <th className="hidden sm:table-cell px-8 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">
                      Status
                    </th>
                    <th className="px-6 md:px-8 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase text-right">
                      Actions
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading || isSyncing ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-slate-500">
                        Querying database...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-10 py-20 text-center text-slate-300 font-black tracking-widest text-[11px] italic"
                  >
                    No records found.
                  </td>
                </tr>
              ) : activeTab === "Customers" ? (
                records.map((rec, i) => (
                  <tr
                    key={rec.id || i}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(rec.id)}
                          onChange={() => toggleSelect(rec.id)}
                          className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent/30 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="hidden md:table-cell px-8 py-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-500 overflow-hidden shadow-sm">
                        {rec.photo_url ? (
                          <img
                            src={rec.photo_url}
                            alt="User"
                            className="w-full h-full object-cover grayscale transition-all duration-500 hover:grayscale-0"
                          />
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="px-6 md:px-8 py-4 font-bold text-[13px] md:text-[14px] text-slate-900 tracking-tight">
                      {rec.account_num}
                    </td>
                    <td className="px-6 md:px-8 py-4">
                      <p className="font-bold text-[13px] md:text-[14px] text-slate-900">
                        {rec.last_name} {rec.first_name}
                      </p>
                      <p className="text-[10px] md:text-[11px] font-medium text-slate-500">
                        Handed by{" "}
                        {rec.staff ? rec.staff.first_name : "System"}
                      </p>
                    </td>
                    <td className="hidden sm:table-cell px-8 py-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          rec.status === "Active"
                            ? "bg-green-50 text-green-600"
                            : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        <span
                          className={`mr-1.5 inline-block w-1.5 h-1.5 rounded-full ${
                            rec.status === "Active"
                              ? "bg-green-500"
                              : "bg-slate-300"
                          }`}
                        />
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-6 md:px-8 py-4">
                      <div className="flex items-center justify-end gap-1.5 md:gap-2 text-right">
                        <Link
                          href={`/dashboard/accounts/${rec.id}`}
                          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                          title="View"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </Link>
                        <Link
                          href={`/dashboard/accounts/add?id=${rec.id}`}
                          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 transition-all shadow-sm"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setSelectedCustomer(rec);
                              handleCustomerDelete();
                            }}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all shadow-sm"
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                records.map((rec, i) => (
                  <tr
                    key={rec.id || i}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="px-6 md:px-8 py-4 font-bold text-[13px] md:text-[14px] text-slate-900 tracking-tight">
                      {rec.account_num}
                    </td>
                    <td className="px-6 md:px-8 py-4">
                      <p className="font-bold text-[13px] md:text-[14px] text-slate-900">
                        {rec.last_name} {rec.first_name}
                      </p>
                    </td>
                    <td className="hidden sm:table-cell px-8 py-4">
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">
                        {rec.account_type || "susu account"}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-8 py-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          rec.status === "Active"
                            ? "bg-green-50 text-green-600"
                            : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        <span
                          className={`mr-1.5 inline-block w-1.5 h-1.5 rounded-full ${
                            rec.status === "Active"
                              ? "bg-green-500"
                              : "bg-slate-300"
                          }`}
                        />
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-6 md:px-8 py-4">
                      <div className="flex items-center justify-end gap-1.5 md:gap-2 text-right">
                        <Link
                          href={`/dashboard/accounts/${rec.id}`}
                          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                          title="View"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </Link>
                        <Link
                          href={`/dashboard/accounts/add?id=${rec.id}`}
                          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 transition-all shadow-sm"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </Link>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setSelectedCustomer(rec);
                              handleCustomerDelete();
                            }}
                            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all shadow-sm"
                            title="Delete"
                          >
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
              <button
                disabled={page === 0 || loading}
                onClick={() => setPage(0)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm"
              >
                «
              </button>
              <button
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm"
              >
                ‹
              </button>

              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i;
                } else if (page < 3) {
                  pageNum = i;
                } else if (page > totalPages - 4) {
                  pageNum = totalPages - 7 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all shadow-sm ${
                      page === pageNum
                        ? "bg-slate-900 text-white border border-slate-900"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}

              <button
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm"
              >
                ›
              </button>
              <button
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage(totalPages - 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DRAWER SIDEBAR */}
      {isDrawerOpen && selectedCustomer && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/20 z-[60] backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
            <div className="flex items-center justify-between p-8 border-b border-slate-50">
              <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">
                Customer Dossier
              </h2>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-10 flex-1 overflow-y-auto space-y-10 scrollbar-hide">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-full overflow-hidden shadow-sm">
                  {selectedCustomer.photo_url ? (
                    <img
                      src={selectedCustomer.photo_url}
                      className="w-full h-full object-cover grayscale transition-all hover:grayscale-0 duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 tracking-[0.2em] mt-1">
                    {selectedCustomer.account_num}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 tracking-widest">
                    Account status
                  </span>
                  <p className="text-[14px] font-bold text-slate-900">
                    {selectedCustomer.status}
                  </p>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 tracking-widest">
                    Growth plan
                  </span>
                  <p className="text-[14px] font-bold text-slate-900">
                    {selectedCustomer.account_type || "Susu core"}
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                  <span className="text-[10px] font-bold text-slate-500 tracking-widest">
                    Contact entry
                  </span>
                  <span className="text-[13px] font-bold text-slate-900">
                    {selectedCustomer.email || "No email logged"}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                  <span className="text-[10px] font-bold text-slate-500 tracking-widest">
                    Telephone
                  </span>
                  <span className="text-[13px] font-bold text-slate-900">
                    {selectedCustomer.phone || "No phone logged"}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                  <span className="text-[10px] font-bold text-slate-500 tracking-widest">
                    Account origin
                  </span>
                  <span className="text-[13px] font-bold text-slate-900">
                    {selectedCustomer.staff
                      ? `${selectedCustomer.staff.first_name}`
                      : "System Root"}
                  </span>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-50">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-bold text-slate-800 tracking-widest">
                    Recent activity
                  </h4>
                  <Link
                    href={`/dashboard/transactions?customer=${selectedCustomer.id}`}
                    className="text-[10px] font-bold text-accent hover:underline"
                  >
                    Full activities ›
                  </Link>
                </div>

                <div className="space-y-3 min-h-[100px]">
                  {fetchingTxs ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : customerTransactions.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 text-slate-300 font-bold text-[10px] tracking-widest px-10">
                      No transactions found.
                    </div>
                  ) : (
                    customerTransactions.map((tx, i) => (
                      <div
                        key={tx.id || i}
                        className="group p-4 bg-white border border-slate-100 rounded-2xl hover:border-accent/10 hover:shadow-md transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-sm ${
                              tx.type === "Deposit"
                                ? "bg-green-50 text-green-600"
                                : "bg-slate-50 text-slate-500"
                            }`}
                          >
                            {tx.type?.[0]}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-slate-900 leading-none mb-1">
                              {tx.type}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-tighter">
                              {new Date(tx.created_at).toLocaleDateString([], {
                                day: "2-digit",
                                month: "short",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[14px] font-bold tracking-tight text-slate-900">
                            ₵ {Number(tx.amount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-10 pb-20">
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-[13px] hover:bg-black transition-all shadow-xl shadow-slate-200"
                >
                  Close
                </button>
                {isAdmin && (
                  <button
                    onClick={handleCustomerDelete}
                    disabled={deleting}
                    className="w-full mt-4 py-4 bg-white border border-red-100 text-red-500 rounded-2xl font-bold text-[13px] hover:bg-red-50 transition-all disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Delete Customer Record"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

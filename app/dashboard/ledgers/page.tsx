"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthSync } from "@/lib/hooks/useAuthSync";
import { showToast, showConfirm, ToastContainer } from "@/components/Toast";

export default function LedgersPage() {
  const tabs = ["Income", "Expenses", "Banking", "Investments"];
  const [activeTab, setActiveTab] = useState("Income");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const limit = 10;

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Forms
  const [formData, setFormData] = useState({
    percentage: "",
    type: "Commission",
    sub_type: "Deposit",
  });

  const [editFormData, setEditFormData] = useState({
    amount: "",
    type: "",
    sub_type: "",
  });

  const { organizationId, isSyncing } = useAuthSync();

  async function fetchLedgers() {
    try {
      setLoading(true);

      if (activeTab === "Income") {
        // Query fee settings scoped to this organization
        let query = supabase
          .from("fee_settings")
          .select("*")
          .order("created_at", { ascending: false });

        if (organizationId) {
          query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
        }

        const { data, error } = await query;
        if (error) {
          // Fallback if organization_id column doesn't exist yet in Supabase
          if (error.message?.includes("organization_id")) {
            const { data: fallbackData } = await supabase
              .from("fee_settings")
              .select("*")
              .order("created_at", { ascending: false });
            setRecords(fallbackData || []);
          } else {
            throw error;
          }
        } else {
          setRecords(data || []);
        }
        setHasMore(false);
      } else {
        // Transactions tabs (Expenses, Banking, Investments)
        let query = supabase
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: false });

        if (organizationId) {
          query = query.eq("organization_id", organizationId);
        }

        if (activeTab === "Expenses") {
          query = query.eq("type", "Withdrawal");
        } else if (activeTab === "Banking") {
          query = query.in("type", ["Deposit", "Withdrawal"]);
        } else if (activeTab === "Investments") {
          query = query.in("type", ["Reserve", "Release"]);
        }

        const { data, error } = await query.range(page * limit, (page + 1) * limit - 1);
        if (error) throw error;
        setRecords(data || []);
        setHasMore((data || []).length === limit);
      }
    } catch (err) {
      console.error("Error fetching ledgers:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isSyncing) fetchLedgers();
  }, [page, activeTab, isSyncing, organizationId]);

  // Toggle active/inactive
  const handleToggle = async (rec: any) => {
    const nextActive = !rec.is_active;
    const actionLabel = nextActive ? "Activate" : "Deactivate";
    if (
      !(await showConfirm(
        actionLabel,
        `${actionLabel} ${rec.name}?`
      ))
    )
      return;

    try {
      let query = supabase
        .from("fee_settings")
        .update({ is_active: nextActive, updated_at: new Date().toISOString() })
        .eq("id", rec.id);

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { error } = await query;
      if (error) throw error;

      setRecords((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, is_active: nextActive } : r))
      );
      showToast(`${rec.name} ${nextActive ? "activated" : "deactivated"}`);
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    }
  };

  // Delete ledger entry
  const handleDelete = async (rec: any) => {
    if (!(await showConfirm("Delete Fee Setting", `Delete "${rec.name}"?`))) return;
    try {
      let query = supabase.from("fee_settings").delete().eq("id", rec.id);
      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { error } = await query;
      if (error) throw error;

      setRecords((prev) => prev.filter((r) => r.id !== rec.id));
      showToast("Fee setting deleted");
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    }
  };

  // Edit Drawer
  const openEditDrawer = (rec: any) => {
    setEditingEntry(rec);
    const parsedType = rec.name.split(" (")[0].replace(" Fee", "");
    setEditFormData({
      amount: String(rec.percentage),
      type: parsedType || "Commission",
      sub_type: rec.applies_to || "Deposit",
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.amount || Number(editFormData.amount) < 0) {
      showToast("Enter a valid percentage", "error");
      return;
    }
    setEditSubmitting(true);
    try {
      const newName = `${editFormData.type}${
        editFormData.sub_type ? ` (${editFormData.sub_type})` : ""
      } Fee`;

      let query = supabase
        .from("fee_settings")
        .update({
          name: newName,
          applies_to: editFormData.sub_type,
          percentage: Number(editFormData.amount),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingEntry.id);

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { error } = await query;
      if (error) throw error;

      setEditingEntry(null);
      fetchLedgers();
      showToast("Fee setting updated");
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Register New Ledger / Income
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.percentage || Number(formData.percentage) < 0) {
      showToast("Enter a valid percentage", "error");
      return;
    }
    setSubmitting(true);
    try {
      const feeName = `${formData.type}${
        formData.sub_type ? ` (${formData.sub_type})` : ""
      } Fee`;
      const appliesTo = formData.sub_type || "Deposit";

      const payload: any = {
        name: feeName,
        applies_to: appliesTo,
        percentage: Number(formData.percentage),
        is_active: true,
      };

      if (organizationId) {
        payload.organization_id = organizationId;
      }

      const { error } = await supabase.from("fee_settings").insert([payload]);
      if (error) {
        // If organization_id column doesn't exist yet, retry without it
        if (error.message?.includes("organization_id")) {
          delete payload.organization_id;
          const { error: retryErr } = await supabase
            .from("fee_settings")
            .insert([payload]);
          if (retryErr) throw retryErr;
        } else {
          throw error;
        }
      }

      setIsModalOpen(false);
      setFormData({ percentage: "", type: "Commission", sub_type: "Deposit" });
      fetchLedgers();
      showToast("Fee setting saved");
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 1-Click Initialize Default Fees for this Company
  const handleSeedDefaults = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const defaults = [
        { name: "Withdrawal Fee", applies_to: "Withdrawal", percentage: 1.0, is_active: true, organization_id: organizationId },
        { name: "Commission (Deposit) Fee", applies_to: "Deposit", percentage: 0.0, is_active: false, organization_id: organizationId },
        { name: "Loan Processing Fee", applies_to: "Loan", percentage: 0.0, is_active: false, organization_id: organizationId },
        { name: "Loan Payment Fee", applies_to: "Loan Payment", percentage: 0.0, is_active: false, organization_id: organizationId },
      ];

      const { error } = await supabase.from("fee_settings").insert(defaults);
      if (error) throw error;
      showToast("Default Susu fee rules initialized");
      fetchLedgers();
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
      setLoading(false);
    }
  };

  const getSubTypeOptions = (type: string) => {
    if (type === "Commission") return ["Deposit", "Withdrawal"];
    if (type === "Interest") return ["Loan"];
    if (type === "Service Fee") return ["Deposit", "Withdrawal", "Loan", "Loan Payment"];
    return [];
  };

  const renderTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      Commission: "bg-blue-50 text-blue-600",
      "Service Fee": "bg-purple-50 text-purple-600",
      Interest: "bg-amber-50 text-amber-600",
      "Other Income": "bg-slate-100 text-slate-600",
      Deposit: "bg-green-50 text-green-600",
      Withdrawal: "bg-red-50 text-red-500",
    };
    return colors[type] || "bg-slate-50 text-slate-600";
  };

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.applies_to?.toLowerCase().includes(q) ||
        String(r.percentage).includes(q)
    );
  }, [records, search]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      <ToastContainer />

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Tabs Row */}
        <div className="flex items-center px-6 pt-4 border-b border-slate-50 gap-8">
          {tabs.map((tab) => {
            const isComingSoon = tab !== "Income";
            return (
              <button
                key={tab}
                onClick={() =>
                  !isComingSoon &&
                  (() => {
                    setActiveTab(tab);
                    setPage(0);
                  })()
                }
                disabled={isComingSoon}
                className={`pb-3 text-[13px] font-bold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab
                    ? "border-emerald-600 text-slate-900"
                    : isComingSoon
                    ? "border-transparent text-slate-300 cursor-not-allowed"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab}
                {isComingSoon && (
                  <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Actions Row */}
        <div className="p-6 flex items-center justify-between border-b border-slate-50 bg-slate-50/50">
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ledgers..."
              className="w-72 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === "Income" && records.length === 0 && !loading && (
              <button
                onClick={handleSeedDefaults}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-full font-bold text-xs hover:bg-slate-50 transition-all shadow-xs"
              >
                Load Default Susu Fees
              </button>
            )}

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-2.5 bg-[#2EB67D] text-white rounded-full font-bold text-xs hover:bg-[#259465] transition-all shadow-md shadow-slate-200"
            >
              Register Income
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[150px]">
          <table className="w-full text-left bg-white">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 tracking-widest">Type</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 tracking-widest text-right">
                  Percentage
                </th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 tracking-widest">Status</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 tracking-widest">Date</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-10 py-20 text-center text-[11px] font-bold text-slate-400 tracking-widest"
                  >
                    {search ? "No matching ledger entries" : "No ledger entries registered"}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec, i) => {
                  if (activeTab === "Income") {
                    return (
                      <tr key={rec.id || i} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-8 py-4">
                          <span
                            className={`w-fit px-2.5 py-1 rounded-full text-[10px] font-bold ${renderTypeBadge(
                              rec.name.split(" (")[0].replace(" Fee", "")
                            )}`}
                          >
                            {rec.name}
                          </span>
                          <p className="text-[11px] text-slate-500 mt-1">Applies to: {rec.applies_to}</p>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <p className="text-[16px] font-bold text-slate-900">{rec.percentage}%</p>
                        </td>
                        <td className="px-8 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              rec.is_active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                            }`}
                          >
                            {rec.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          <p className="text-[13px] font-bold text-slate-800 leading-none mb-1">
                            {new Date(rec.created_at).toLocaleDateString([], {
                              day: "2-digit",
                              month: "short",
                            })}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400">
                            {new Date(rec.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditDrawer(rec)}
                              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-500 transition-all"
                              title="Edit"
                            >
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
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                <path d="m15 5 4 4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleToggle(rec)}
                              className={`w-10 h-5 rounded-full flex items-center p-0.5 transition-all ${
                                rec.is_active ? "bg-[#2EB67D] justify-end" : "bg-slate-200 justify-start"
                              }`}
                              title={rec.is_active ? "Deactivate" : "Activate"}
                            >
                              <div className="w-4 h-4 bg-white rounded-full shadow" />
                            </button>
                            <button
                              onClick={() => handleDelete(rec)}
                              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all"
                              title="Delete"
                            >
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
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const isActive = rec.status === "completed";
                  return (
                    <tr key={rec.id || i} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-8 py-4">
                        <span
                          className={`w-fit px-2.5 py-1 rounded-full text-[10px] font-bold ${renderTypeBadge(
                            rec.type
                          )}`}
                        >
                          {rec.type}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] truncate">
                          {rec.deposit_by}
                        </p>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <p className="text-[16px] font-bold text-slate-900">
                          ₵ {Number(rec.amount).toFixed(2)}
                        </p>
                      </td>
                      <td className="px-8 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-8 py-4">
                        <p className="text-[13px] font-bold text-slate-800 leading-none mb-1">
                          {new Date(rec.created_at).toLocaleDateString([], {
                            day: "2-digit",
                            month: "short",
                          })}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400">
                          {new Date(rec.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Page {page + 1}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all shadow-sm"
            >
              Previous
            </button>
            <button
              disabled={!hasMore || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all shadow-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Register Income Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg border border-slate-100 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 sm:p-10 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-50 pb-5">
                <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">Register Income Rule</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:border-slate-900 hover:text-slate-900 transition-all font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 tracking-widest ml-1">
                    Percentage %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.percentage}
                    onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                    placeholder="e.g. 1.00"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[18px] font-bold text-slate-900 focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 tracking-widest ml-1">Fee Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value,
                        sub_type: e.target.value === "Interest" ? "Loan" : "Deposit",
                      })
                    }
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-900 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option>Commission</option>
                    <option>Service Fee</option>
                    <option>Interest</option>
                  </select>
                </div>

                {getSubTypeOptions(formData.type).length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 tracking-widest ml-1">
                      Applies to Transaction
                    </label>
                    <select
                      value={formData.sub_type}
                      onChange={(e) => setFormData({ ...formData, sub_type: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-900 focus:outline-none appearance-none cursor-pointer"
                    >
                      {getSubTypeOptions(formData.type).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !formData.percentage}
                    className="w-full py-4 bg-[#2EB67D] text-white rounded-2xl font-bold text-[13px] hover:bg-[#259465] transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Save Income Rule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Drawer Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg border border-slate-100 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 sm:p-10 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-50 pb-5">
                <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">Edit Fee Setting</h2>
                <button
                  onClick={() => setEditingEntry(null)}
                  className="w-9 h-9 border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:border-slate-900 hover:text-slate-900 transition-all font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 tracking-widest ml-1">
                    Percentage %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[18px] font-bold text-slate-900 focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 tracking-widest ml-1">Fee Type</label>
                  <select
                    value={editFormData.type}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        type: e.target.value,
                        sub_type: e.target.value === "Interest" ? "Loan" : "Deposit",
                      })
                    }
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-900 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option>Commission</option>
                    <option>Service Fee</option>
                    <option>Interest</option>
                  </select>
                </div>

                {getSubTypeOptions(editFormData.type).length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 tracking-widest ml-1">
                      Applies to Transaction
                    </label>
                    <select
                      value={editFormData.sub_type}
                      onChange={(e) => setEditFormData({ ...editFormData, sub_type: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-900 focus:outline-none appearance-none cursor-pointer"
                    >
                      {getSubTypeOptions(editFormData.type).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={editSubmitting || !editFormData.amount}
                    className="w-full py-4 bg-[#2EB67D] text-white rounded-2xl font-bold text-[13px] hover:bg-[#259465] transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                  >
                    {editSubmitting ? "Updating..." : "Update Entry"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

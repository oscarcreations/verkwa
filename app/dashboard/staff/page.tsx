"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthSync } from "@/lib/hooks/useAuthSync";
import { isPrimarySuperadmin } from "@/lib/constants";
import { showToast, showConfirm, ToastContainer } from "@/components/Toast";

interface StaffRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role: string;
  branch_id: string | null;
  status: boolean;
  user_id?: string | null;
  photo_url?: string | null;
  ghana_card_number?: string | null;
  created_at: string;
  branches?: { name: string };
}

export default function StaffPage() {
  const router = useRouter();
  const { user, resolvedRole, organizationId, isSyncing } = useAuthSync();
  const currentUserEmail = user?.email;
  const isPrimaryAdmin = isPrimarySuperadmin(currentUserEmail);

  const roleLower = (resolvedRole || "").toLowerCase();
  const isAuthorized = ["superadmin", "administrator", "admin"].includes(roleLower);

  useEffect(() => {
    if (!isSyncing && resolvedRole && !isAuthorized) {
      router.replace("/dashboard");
    }
  }, [resolvedRole, isAuthorized, isSyncing, router]);

  const [records, setRecords] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function fetchStaff() {
    try {
      setLoading(true);
      let query = supabase
        .from("staff")
        .select("*, branches(name)")
        .order("created_at", { ascending: false });

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecords(data || []);
    } catch (err: any) {
      showToast("Error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStaff();
    let bQuery = supabase.from("branches").select("id, name").order("name");
    if (organizationId) {
      bQuery = bQuery.eq("organization_id", organizationId);
    }
    bQuery.then(({ data }) => {
      if (data) setBranches(data);
    });
  }, [organizationId]);

  const filtered = records.filter((r) => {
    const matchSearch =
      !searchQuery ||
      `${r.first_name} ${r.last_name} ${r.email} ${r.phone || ""}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchRole =
      filterRole === "all" || r.role?.toLowerCase() === filterRole.toLowerCase();
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && r.status) ||
      (filterStatus === "inactive" && !r.status);
    return matchSearch && matchRole && matchStatus;
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (editingStaff.role?.toLowerCase() === "superadmin" && !isPrimaryAdmin) {
      showToast("Only the primary super admin can assign Superadmin role", "error");
      return;
    }

    // SuperAdmins are permanently active
    const finalStatus = editingStaff.role?.toLowerCase() === "superadmin" ? true : editingStaff.status;

    setSaving(true);
    const { error } = await supabase
      .from("staff")
      .update({
        role: editingStaff.role,
        branch_id: editingStaff.branch_id || null,
        phone: editingStaff.phone || null,
        status: finalStatus,
      })
      .eq("id", editingStaff.id);

    if (error) {
      showToast("Error: " + error.message, "error");
    } else {
      setIsDrawerOpen(false);
      fetchStaff();
      showToast("Staff record updated");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!editingStaff) return;
    if (editingStaff.role?.toLowerCase() === "superadmin") {
      showToast("SuperAdmin accounts are protected and cannot be deleted.", "error");
      return;
    }

    if (
      !showConfirm(
        "Delete staff",
        `Delete ${editingStaff.first_name} ${editingStaff.last_name}? This cannot be undone.`
      )
    )
      return;

    setDeleting(true);
    const { error } = await supabase.from("staff").delete().eq("id", editingStaff.id);
    if (error) {
      if (error.code === "23503") {
        showToast(
          "Cannot delete — staff has linked customer transactions. Deactivate their access instead.",
          "error"
        );
      } else {
        showToast("Error: " + error.message, "error");
      }
    } else {
      setIsDrawerOpen(false);
      fetchStaff();
      showToast("Staff deleted");
    }
    setDeleting(false);
  };

  const roleCounts = {
    all: records.length,
    active: records.filter((r) => r.status).length,
    mobilizers: records.filter(
      (r) =>
        r.role?.toLowerCase() === "mobilizer" ||
        r.role?.toLowerCase().includes("field")
    ).length,
    tellers: records.filter(
      (r) =>
        r.role?.toLowerCase() === "teller" ||
        r.role?.toLowerCase().includes("cashier")
    ).length,
    managers: records.filter(
      (r) =>
        r.role?.toLowerCase() === "manager" ||
        r.role?.toLowerCase() === "administrator" ||
        r.role?.toLowerCase() === "superadmin"
    ).length,
  };

  const getRoleBadge = (role: string) => {
    const r = (role || "").toLowerCase();
    if (r.includes("superadmin")) {
      return "bg-slate-900 text-white";
    }
    if (r.includes("admin")) {
      return "bg-purple-50 text-purple-700 border border-purple-200/60";
    }
    if (r.includes("manager")) {
      return "bg-indigo-50 text-indigo-700 border border-indigo-200/60";
    }
    if (r.includes("teller") || r.includes("cashier")) {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
    }
    if (r.includes("mobilizer")) {
      return "bg-blue-50 text-blue-700 border border-blue-200/60";
    }
    if (r.includes("accountant")) {
      return "bg-amber-50 text-amber-700 border border-amber-200/60";
    }
    return "bg-slate-100 text-slate-700 border border-slate-200";
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      <ToastContainer />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 tracking-tight">
            Staff & Access Control
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Manage your organization's team, assign roles, and configure feature permissions.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchStaff}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all shadow-xs"
            title="Refresh"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={loading ? "animate-spin" : ""}
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
          </button>
          
          {/* Direct link to the dedicated Add Staff Page */}
          <Link
            href="/dashboard/staff/new"
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[13px] font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Add Staff Member
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total staff", value: roleCounts.all, color: "text-slate-900" },
          { label: "Active accounts", value: roleCounts.active, color: "text-emerald-600" },
          { label: "Field mobilizers", value: roleCounts.mobilizers, color: "text-blue-600" },
          { label: "Management & Admin", value: roleCounts.managers, color: "text-purple-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="p-4 bg-white rounded-2xl border border-slate-100 hover:shadow-xs transition-all"
          >
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
              {s.label}
            </span>
            <p className={`text-[22px] font-black ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters Row */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-4 flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="relative flex-1 w-full">
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
            placeholder="Search staff by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:border-emerald-500 transition-all font-medium placeholder:text-slate-400"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="w-full md:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-700 focus:outline-none cursor-pointer"
        >
          <option value="all">All roles</option>
          <option value="mobilizer">Field Mobilizers</option>
          <option value="teller">Cashiers / Tellers</option>
          <option value="manager">Branch Managers</option>
          <option value="accountant">Accountants</option>
          <option value="administrator">Administrators</option>
          <option value="superadmin">Superadmin</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full md:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-700 focus:outline-none cursor-pointer"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-wider uppercase">
                  Staff Member
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-wider uppercase">
                  Role / Designation
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-wider uppercase">
                  Branch Station
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-wider uppercase">
                  Access Status
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-wider uppercase text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-[13px] text-slate-400">
                    No staff records found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Member Details */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden flex items-center justify-center font-bold text-[13px] text-slate-600 shrink-0">
                          {rec.photo_url ? (
                            <img
                              src={rec.photo_url}
                              alt={rec.first_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            `${rec.first_name?.[0] || ""}${rec.last_name?.[0] || ""}`
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-slate-900 truncate">
                            {rec.first_name} {rec.last_name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate">
                            <span>{rec.email}</span>
                            {rec.phone && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="font-mono">{rec.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold ${getRoleBadge(rec.role)}`}>
                        {rec.role}
                      </span>
                    </td>

                    {/* Branch */}
                    <td className="px-6 py-4 text-[12px] font-bold text-slate-700">
                      {rec.branches?.name || (
                        <span className="text-slate-400 font-normal italic">HQ / General</span>
                      )}
                    </td>

                    {/* Access Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center ${
                          rec.status
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        <span
                          className={`mr-1.5 inline-block w-1.5 h-1.5 rounded-full ${
                            rec.status ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {rec.status ? "Active Access" : "Suspended"}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit Role & Branch */}
                        <button
                          onClick={() => {
                            setEditingStaff({ ...rec });
                            setIsDrawerOpen(true);
                          }}
                          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all shadow-xs"
                          title="Edit role & station"
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
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </button>

                        {/* Toggle Status or Protected Lock for SuperAdmin */}
                        {rec.role?.toLowerCase() === "superadmin" ? (
                          <div
                            className="p-2 border border-slate-200/70 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center cursor-not-allowed"
                            title="SuperAdmin account is protected and cannot be suspended"
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
                              className="text-slate-400"
                            >
                              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                          </div>
                        ) : (
                          <button
                            onClick={async () => {
                              const { error } = await supabase
                                .from("staff")
                                .update({ status: !rec.status })
                                .eq("id", rec.id);
                              if (error) {
                                showToast("Error: " + error.message, "error");
                              } else {
                                fetchStaff();
                                showToast(
                                  rec.status
                                    ? "Staff access suspended"
                                    : "Staff access activated"
                                );
                              }
                            }}
                            className={`p-2 border rounded-lg transition-all shadow-xs ${
                              rec.status
                                ? "bg-white border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200"
                                : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                            }`}
                            title={rec.status ? "Suspend staff access" : "Activate staff access"}
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
                              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                              <line x1="12" y1="2" x2="12" y2="12" />
                            </svg>
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
      </div>

      {/* EDIT DRAWER */}
      {isDrawerOpen && editingStaff && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 z-[60] backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100">
              <div>
                <h2 className="text-[18px] font-black text-slate-900 tracking-tight">
                  Update Staff Profile
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[12px] text-slate-500">
                    {editingStaff.first_name} {editingStaff.last_name}
                  </p>
                  {editingStaff.role?.toLowerCase() === "superadmin" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-900 text-white uppercase tracking-wider">
                      Primary Owner (Protected)
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleUpdate}
              className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto"
            >
              {/* Staff Summary Card */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                  {editingStaff.photo_url ? (
                    <img
                      src={editingStaff.photo_url}
                      alt={editingStaff.first_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    `${editingStaff.first_name?.[0] || ""}${editingStaff.last_name?.[0] || ""}`
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-bold text-slate-900 truncate">
                    {editingStaff.first_name} {editingStaff.last_name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono truncate">
                    {editingStaff.email}
                  </p>
                </div>
              </div>

              {/* Contact Phone */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 tracking-wider ml-1">
                  Contact phone
                </label>
                <input
                  type="tel"
                  value={editingStaff.phone || ""}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, phone: e.target.value })
                  }
                  placeholder="e.g. 0538948322"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Role & Branch */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-600 tracking-wider ml-1">
                    Role assignment
                  </label>
                  <select
                    disabled={editingStaff.role?.toLowerCase() === "superadmin"}
                    value={editingStaff.role}
                    onChange={(e) =>
                      setEditingStaff({ ...editingStaff, role: e.target.value })
                    }
                    className={`w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-semibold text-slate-900 focus:outline-none ${
                      editingStaff.role?.toLowerCase() === "superadmin"
                        ? "cursor-not-allowed opacity-75"
                        : "cursor-pointer"
                    }`}
                  >
                    <option value="Mobilizer">Field Mobilizer</option>
                    <option value="Teller">Cashier / Teller</option>
                    <option value="Manager">Branch Manager</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Administrator">Administrator</option>
                    <option value="SuperAdmin">Superadmin</option>
                  </select>
                  {editingStaff.role?.toLowerCase() === "superadmin" && (
                    <p className="text-[11px] text-slate-400 font-medium mt-1">
                      SuperAdmin role represents primary organization ownership and cannot be changed.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-600 tracking-wider ml-1">
                    Branch station
                  </label>
                  <select
                    value={editingStaff.branch_id || ""}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        branch_id: e.target.value || null,
                      })
                    }
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-semibold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">HQ / Global Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Switch */}
              {editingStaff.role?.toLowerCase() === "superadmin" ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">Account access</p>
                    <p className="text-[11px] text-slate-500">
                      SuperAdmin access is permanently active and cannot be suspended
                    </p>
                  </div>
                  <div className="w-12 h-6 rounded-full flex items-center p-1 bg-emerald-600 justify-end cursor-not-allowed">
                    <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">Account access</p>
                    <p className="text-[11px] text-slate-500">
                      Grant or suspend system sign-in
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingStaff({
                        ...editingStaff,
                        status: !editingStaff.status,
                      })
                    }
                    className={`w-12 h-6 rounded-full flex items-center p-1 transition-all ${
                      editingStaff.status
                        ? "bg-emerald-600 justify-end"
                        : "bg-slate-300 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 space-y-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-[13px] hover:bg-black transition-all shadow-md disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>

                {editingStaff.role?.toLowerCase() === "superadmin" ? (
                  <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-left">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-amber-600 shrink-0 mt-0.5"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
                      <path d="m9 12 2 2 4-4"/>
                    </svg>
                    <div>
                      <p className="text-[12px] font-bold text-amber-900">Protected SuperAdmin Account</p>
                      <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                        This account represents organization ownership and cannot be deleted or suspended.
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full py-4 bg-white border border-rose-200 text-rose-600 rounded-2xl font-bold text-[13px] hover:bg-rose-50 transition-all disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Delete staff member"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

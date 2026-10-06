"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { isPrimarySuperadmin } from "@/lib/constants";
import { showToast, showConfirm, ToastContainer } from "@/components/Toast";

interface StaffRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  branch_id: string | null;
  status: boolean;
  clerk_id: string | null;
  created_at: string;
  branches?: { name: string };
}

export default function StaffPage() {
  const { user } = useUser();
  const currentUserEmail = user?.primaryEmailAddress?.emailAddress;
  const isPrimaryAdmin = isPrimarySuperadmin(currentUserEmail);

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

  const [newStaff, setNewStaff] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "Employee",
    branch_id: "",
  });
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  async function fetchStaff() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("staff")
        .select("*, branches(name)")
        .order("created_at", { ascending: false });
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
    supabase.from("branches").select("id, name").order("name").then(({ data }) => {
      if (data) setBranches(data);
    });
  }, []);

  const filtered = records.filter((r) => {
    const matchSearch = !searchQuery ||
      `${r.first_name} ${r.last_name} ${r.email}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = filterRole === "all" || r.role?.toLowerCase() === filterRole;
    const matchStatus = filterStatus === "all" ||
      (filterStatus === "active" && r.status) ||
      (filterStatus === "inactive" && !r.status);
    return matchSearch && matchRole && matchStatus;
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (editingStaff.role === "Superadmin" && !isPrimaryAdmin) {
      showToast("Only the primary super admin can assign Superadmin role", "error");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("staff")
      .update({
        role: editingStaff.role,
        branch_id: editingStaff.branch_id || null,
        status: editingStaff.status,
        email: editingStaff.email,
      })
      .eq("id", editingStaff.id);
    if (error) {
      showToast("Error: " + error.message, "error");
    } else {
      setIsDrawerOpen(false);
      fetchStaff();
      showToast("Staff updated");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!editingStaff) return;
    if (!showConfirm("Delete staff", `Delete ${editingStaff.first_name} ${editingStaff.last_name}? This cannot be undone.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("staff").delete().eq("id", editingStaff.id);
    if (error) {
      if (error.code === "23503") {
        showToast("Cannot delete — staff has linked transactions. Deactivate instead.", "error");
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.first_name || !newStaff.last_name || !newStaff.email) {
      showToast("Fill all required fields", "error");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("staff").insert([{
      first_name: newStaff.first_name,
      last_name: newStaff.last_name,
      email: newStaff.email,
      role: newStaff.role,
      branch_id: newStaff.branch_id || null,
      status: true,
    }]);
    if (error) {
      if (error.code === "23505") {
        showToast("A staff member with this email already exists", "error");
      } else {
        showToast("Error: " + error.message, "error");
      }
    } else {
      setIsAddDrawerOpen(false);
      setNewStaff({ first_name: "", last_name: "", email: "", role: "Employee", branch_id: "" });
      fetchStaff();
      showToast("Staff added");
    }
    setAdding(false);
  };

  const roleCounts = {
    all: records.length,
    "superadmin": records.filter((r) => r.role?.toLowerCase() === "superadmin").length,
    employee: records.filter((r) => r.role?.toLowerCase() === "employee").length,
    active: records.filter((r) => r.status).length,
    inactive: records.filter((r) => !r.status).length,
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      <ToastContainer />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Staff Management</h1>
          <p className="text-[13px] text-slate-500 mt-1">{records.length} total staff members</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={fetchStaff} disabled={loading} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all shadow-sm" title="Refresh">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={loading ? "animate-spin" : ""}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
          </button>
          <button onClick={() => setIsAddDrawerOpen(true)} className="w-full sm:w-auto px-5 py-2.5 bg-[#2EB67D] text-white rounded-xl text-[13px] font-bold hover:bg-[#259465] transition-all shadow-md shadow-slate-200">
            + Add staff
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: roleCounts.all, color: "text-slate-900" },
          { label: "Superadmin", value: roleCounts["superadmin"], color: "text-purple-600" },
          { label: "Employee", value: roleCounts.employee, color: "text-blue-600" },
          { label: "Inactive", value: roleCounts.inactive, color: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="p-4 bg-white rounded-xl border border-slate-100 hover:shadow-sm transition-all">
            <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">{s.label}</span>
            <p className={`text-[22px] font-black ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:border-accent/30 transition-all" />
        </div>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
          className="w-full md:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-700 focus:outline-none cursor-pointer">
          <option value="all">All roles</option>
          <option value="superadmin">Superadmin</option>
          <option value="employee">Employee</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full md:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-700 focus:outline-none cursor-pointer">
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Staff</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Role</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Branch</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 tracking-widest uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-[13px] text-slate-400">No staff found.</td>
                </tr>
              ) : (
                filtered.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-bold text-[13px]">
                          {rec.first_name?.[0]}{rec.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-900">{rec.first_name} {rec.last_name}</p>
                          <p className="text-[11px] text-slate-500">{rec.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        rec.role?.toLowerCase() === "superadmin" ? "bg-purple-50 text-purple-600" :
                        rec.role?.toLowerCase() === "administrator" ? "bg-amber-50 text-amber-600" :
                        "bg-blue-50 text-blue-600"
                      }`}>{rec.role}</span>
                    </td>
                    <td className="px-6 py-4 text-[12px] font-bold text-slate-600">
                      {rec.branches?.name || <span className="text-slate-300 italic">Global</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${rec.status ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-500"}`}>
                        <span className={`mr-1.5 inline-block w-1.5 h-1.5 rounded-full ${rec.status ? "bg-green-500" : "bg-slate-300"}`} />
                        {rec.status ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => { setEditingStaff({ ...rec }); setIsDrawerOpen(true); }}
                          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 transition-all shadow-sm" title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </button>
                        <button onClick={async () => {
                            const action = rec.status ? "deactivate" : "activate";
                            const { error } = await supabase.from("staff").update({ status: !rec.status }).eq("id", rec.id);
                            if (error) showToast("Error: " + error.message, "error");
                            else { fetchStaff(); showToast(`Staff ${action}d`); }
                          }}
                          className={`p-2 bg-white border border-slate-200 rounded-lg transition-all shadow-sm ${rec.status ? "text-slate-500 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-500" : "text-green-500 hover:bg-green-50 hover:border-green-200"}`}
                          title={rec.status ? "Deactivate" : "Activate"}>
                          {rec.status ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" x2="19.07" y1="4.93" y2="19.07"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          )}
                        </button>
                        <button onClick={async () => {
                            if (!(await showConfirm("Delete staff", `Delete ${rec.first_name} ${rec.last_name}? This cannot be undone.`))) return;
                            const { error } = await supabase.from("staff").delete().eq("id", rec.id);
                            if (error) {
                              if (error.code === "23503") showToast("Cannot delete — staff has linked transactions. Deactivate instead.", "error");
                              else showToast("Error: " + error.message, "error");
                            } else { fetchStaff(); showToast("Staff deleted"); }
                          }}
                          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all shadow-sm" title="Delete">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
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
          <div className="fixed inset-0 bg-black/30 z-[60] backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-8 border-b border-slate-50">
              <div>
                <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">Edit Staff</h2>
                <p className="text-[12px] text-slate-500 mt-1">{editingStaff.first_name} {editingStaff.last_name}</p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-800 transition-all font-bold">✕</button>
            </div>

            <form onSubmit={handleUpdate} className="p-8 space-y-6 flex-1 overflow-y-auto scrollbar-hide">
              <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-14 h-14 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 font-bold text-[16px]">
                  {editingStaff.first_name?.[0]}{editingStaff.last_name?.[0]}
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900">{editingStaff.first_name} {editingStaff.last_name}</h3>
                  <p className="text-[11px] font-semibold text-slate-500 tracking-wide">{editingStaff.role}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">Email</label>
                <input type="email" value={editingStaff.email}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-semibold text-slate-900 focus:outline-none focus:border-accent/30 transition-all" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">Role</label>
                  <select value={editingStaff.role}
                    onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-semibold text-slate-900 focus:outline-none appearance-none cursor-pointer">
                    <option value="Employee">Employee</option>
                    <option value="Superadmin">Superadmin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">Branch</label>
                  <select value={editingStaff.branch_id || ""}
                    onChange={(e) => setEditingStaff({ ...editingStaff, branch_id: e.target.value || null })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-semibold text-slate-900 focus:outline-none appearance-none cursor-pointer">
                    <option value="">Global (No branch)</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-bold text-slate-800">Account access</p>
                  <p className="text-[11px] text-slate-500">Grant or revoke dashboard access</p>
                </div>
                <button type="button" onClick={() => setEditingStaff({ ...editingStaff, status: !editingStaff.status })}
                  className={`w-12 h-6 rounded-full flex items-center p-1 transition-all ${editingStaff.status ? "bg-[#2EB67D] justify-end" : "bg-slate-200 justify-start"}`}>
                  <div className="w-4 h-4 bg-white rounded-full shadow-lg" />
                </button>
              </div>

              <div className="pt-4 space-y-3">
                <button type="submit" disabled={saving}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-[13px] hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50">
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="w-full py-4 bg-white border border-red-100 text-red-500 rounded-2xl font-bold text-[13px] hover:bg-red-50 transition-all disabled:opacity-50">
                  {deleting ? "Deleting..." : "Delete staff"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ADD DRAWER */}
      {isAddDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60] backdrop-blur-sm" onClick={() => setIsAddDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-8 border-b border-slate-50">
              <div>
                <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">Add Staff</h2>
                <p className="text-[12px] text-slate-500 mt-1">Create a new staff account</p>
              </div>
              <button onClick={() => setIsAddDrawerOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-800 transition-all font-bold">✕</button>
            </div>

            <form onSubmit={handleAdd} className="p-8 space-y-6 flex-1 overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">First name *</label>
                  <input type="text" value={newStaff.first_name}
                    onChange={(e) => setNewStaff({ ...newStaff, first_name: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-semibold text-slate-900 focus:outline-none focus:border-accent/30 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">Last name *</label>
                  <input type="text" value={newStaff.last_name}
                    onChange={(e) => setNewStaff({ ...newStaff, last_name: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-semibold text-slate-900 focus:outline-none focus:border-accent/30 transition-all" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">Email *</label>
                <input type="email" value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-semibold text-slate-900 focus:outline-none focus:border-accent/30 transition-all" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">Role</label>
                  <select value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-semibold text-slate-900 focus:outline-none appearance-none cursor-pointer">
                    <option value="Employee">Employee</option>
                    <option value="Superadmin">Superadmin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">Branch</label>
                  <select value={newStaff.branch_id}
                    onChange={(e) => setNewStaff({ ...newStaff, branch_id: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-semibold text-slate-900 focus:outline-none appearance-none cursor-pointer">
                    <option value="">Global (No branch)</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={adding}
                  className="w-full py-4 bg-[#2EB67D] text-white rounded-2xl font-bold text-[13px] hover:bg-[#259465] transition-all shadow-xl shadow-slate-200 disabled:opacity-50">
                  {adding ? "Adding..." : "Add staff member"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

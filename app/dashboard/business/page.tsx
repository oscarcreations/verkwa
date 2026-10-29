"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthSync } from "@/lib/hooks/useAuthSync";
import { showConfirm, showToast, ToastContainer } from "@/components/Toast";

const REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Central",
  "Eastern",
  "Western",
  "Western North",
  "Volta",
  "Oti",
  "Northern",
  "North East",
  "Savannah",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
];

export default function BusinessDataPage() {
  const { organizationId, isSyncing } = useAuthSync();

  const [records, setRecords] = useState<any[]>([]);
  const [maxBranches, setMaxBranches] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals & Drawers
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    location: "",
    phone: "",
    region: "",
  });

  const fetchBranches = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);

      // 1. Fetch organization branch limit
      const { data: org } = await supabase
        .from("organizations")
        .select("max_branches")
        .eq("id", organizationId)
        .maybeSingle();

      if (org?.max_branches) {
        setMaxBranches(org.max_branches);
      }

      // 2. Fetch branches for this company
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error("Error fetching branches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSyncing && organizationId) {
      fetchBranches();
    }
  }, [isSyncing, organizationId]);

  const handleOpenAdd = () => {
    // Check branch limit for company's plan
    if (records.length >= maxBranches) {
      setLimitNotice(
        `You have reached the limit of ${maxBranches} branch for your current plan. Upgrade your plan to add more branches.`
      );
      return;
    }

    setLimitNotice(null);
    setEditingBranch(null);
    setFormData({ name: "", code: "", location: "", phone: "", region: "" });
    setIsDrawerOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      showToast("Branch name and code are required", "error");
      return;
    }

    if (!editingBranch && records.length >= maxBranches) {
      showToast("Branch limit reached for your current plan", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        location: formData.location.trim() || null,
        phone: formData.phone.trim() || null,
        region: formData.region || null,
        organization_id: organizationId,
      };

      if (editingBranch) {
        const { error } = await supabase
          .from("branches")
          .update(payload)
          .eq("id", editingBranch.id)
          .eq("organization_id", organizationId);

        if (error) throw error;
        showToast("Branch updated");
      } else {
        const { error } = await supabase.from("branches").insert([payload]);
        if (error) throw error;
        showToast("Branch added");
      }

      setIsDrawerOpen(false);
      setEditingBranch(null);
      setFormData({ name: "", code: "", location: "", phone: "", region: "" });
      fetchBranches();
    } catch (err: any) {
      showToast(err.message || "Error saving branch", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branch: any) => {
    const confirmed = await showConfirm(
      "Delete Branch",
      `Are you sure you want to delete "${branch.name}"? Any staff assigned will be unassigned.`
    );
    if (!confirmed) return;

    try {
      const tables = ["staff", "transactions", "customers"];
      for (const table of tables) {
        await supabase
          .from(table)
          .update({ branch_id: null })
          .eq("branch_id", branch.id)
          .eq("organization_id", organizationId);
      }

      const { error } = await supabase
        .from("branches")
        .delete()
        .eq("id", branch.id)
        .eq("organization_id", organizationId);

      if (error) throw error;

      showToast("Branch deleted");
      fetchBranches();
    } catch (err: any) {
      showToast(err.message || "Failed to delete branch", "error");
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.code?.toLowerCase().includes(q) ||
      r.location?.toLowerCase().includes(q) ||
      r.phone?.includes(q)
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      {/* Branch Limit Card Notification */}
      {limitNotice && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold text-sm">
              !
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">Branch Limit Reached</p>
              <p className="text-xs text-amber-700 mt-0.5">{limitNotice}</p>
            </div>
          </div>
          <button
            onClick={() => setLimitNotice(null)}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Tabs Row */}
        <div className="flex items-center px-6 pt-4 border-b border-slate-50 gap-8">
          <button className="pb-3 text-[13px] font-bold border-b-2 border-emerald-600 text-slate-900">
            BRANCHES
          </button>
        </div>

        {/* Actions Row */}
        <div className="p-6 flex items-center justify-between bg-slate-50/50">
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search branches..."
              className="w-64 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-6 py-2.5 bg-[#2EB67D] text-white rounded-full font-bold text-xs hover:bg-[#259465] transition-all shadow-md shadow-slate-200"
          >
            Add branch
          </button>
        </div>

        {/* Records Header */}
        <div className="px-6 py-4 flex items-center justify-between">
          <h3 className="text-[14px] font-black tracking-wide text-slate-900">
            {filteredRecords.length} {filteredRecords.length === 1 ? "record" : "records"}
          </h3>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-[11px] font-bold text-slate-500 tracking-widest">Branch name</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-500 tracking-widest">Code</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-500 tracking-widest">Location</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-500 tracking-widest">Phone</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-500 tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-slate-400">Loading branch records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                    {search ? "No branches match your search." : "No branches found. Click Add branch to begin."}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-8 py-4 font-bold text-[14px] text-slate-900">{rec.name}</td>
                    <td className="px-8 py-4 text-[13px] font-bold text-slate-500">{rec.code}</td>
                    <td className="px-8 py-4 text-[14px] font-medium text-slate-900">{rec.location || "N/A"}</td>
                    <td className="px-8 py-4 text-[13px] font-medium text-slate-500">{rec.phone || "-"}</td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingBranch(rec);
                            setFormData({
                              name: rec.name || "",
                              code: rec.code || "",
                              location: rec.location || "",
                              phone: rec.phone || "",
                              region: rec.region || "",
                            });
                            setIsDrawerOpen(true);
                          }}
                          className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-all shadow-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(rec)}
                          className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-red-500 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
                        >
                          Delete
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

      {/* DRAWER SIDEBAR */}
      {isDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-[60] backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="fixed right-0 top-0 h-full w-full md:w-[450px] bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-8 border-b border-slate-50">
              <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">
                {editingBranch ? "Edit branch" : "Add branch"}
              </h2>
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setEditingBranch(null);
                  setFormData({ name: "", code: "", location: "", phone: "", region: "" });
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-10 flex-1 overflow-y-auto space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 tracking-widest ml-1">Branch identity</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[15px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-300"
                  placeholder="Enter branch name..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 tracking-widest ml-1">Operational code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[15px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-300 uppercase"
                  placeholder="e.g. ACC-01"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 tracking-widest ml-1">Geographic location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[15px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-300"
                  placeholder="Enter address..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 tracking-widest ml-1">Direct contact</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[15px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-300"
                  placeholder="Enter phone number..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 tracking-widest ml-1">Administrative region</label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[15px] text-slate-800 font-bold focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select region</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-6 pb-12">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-4 bg-[#2EB67D] text-white rounded-2xl font-bold text-[13px] hover:bg-[#259465] transition-all disabled:opacity-50 shadow-xl shadow-slate-200"
                >
                  {saving ? "Processing..." : editingBranch ? "Save" : "Register branch"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <ToastContainer />
    </div>
  );
}

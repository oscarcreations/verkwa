"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { showConfirm, showToast, ToastContainer } from "@/components/Toast";

export default function BusinessDataPage() {
  const tabs = ["BRANCHES", "COMPLAINTS"];
  const regions = ["Greater Accra", "Ashanti", "Central", "Eastern", "Northern", "Western", "Volta", "Upper East", "Upper West", "Bono", "Bono East", "Ahafo", "Savannah", "North East", "Oti", "Western North"];
  
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    location: "",
    phone: "",
    region: ""
  });

  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const branchPayload = { 
        name: formData.name,
        code: formData.code,
        location: formData.location,
        phone: formData.phone,
        region: formData.region
      };

      let error;
      if (editingBranch) {
        const { error: updateError } = await supabase
          .from('branches')
          .update(branchPayload)
          .eq('id', editingBranch.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('branches')
          .insert([branchPayload]);
        error = insertError;
      }
  
      if (error) {
        console.error("Supabase Save Error:", error);
        alert("Error saving branch: " + (error.message || "Unknown database error"));
      } else {
        setIsDrawerOpen(false);
        setEditingBranch(null);
        setFormData({ name: "", code: "", location: "", phone: "", region: "" });
        fetchBranches();
      }
    } catch (err: any) {
      console.error("Unexpected Branch Save Error:", err);
      alert("Critical Error: " + (err.message || "Network request failed. Please check your connection or Supabase URL."));
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
      const tables = ["staff", "transactions", "customers", "complaints", "loan_payments", "savings"];
      for (const table of tables) {
        await supabase
          .from(table)
          .update({ branch_id: null })
          .eq("branch_id", branch.id);
      }

      const { error } = await supabase
        .from("branches")
        .delete()
        .eq("id", branch.id);

      if (error) {
        console.error("Delete error:", error);
        showToast("Failed to delete branch", "error");
      } else {
        showToast("Branch deleted", "success");
        fetchBranches();
      }
    } catch (err) {
      console.error("Delete error:", err);
      showToast("An error occurred", "error");
    }
  };


  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Tabs Row */}
        <div className="flex items-center px-6 pt-4 border-b border-slate-50 gap-8">
          {tabs.map((tab, idx) => (
            <button 
              key={tab}
              className={`pb-3 text-[13px] font-bold border-b-2 transition-colors ${
                idx === 0 
                ? "border-accent text-slate-900" 
                : "border-transparent text-slate-600 hover:text-slate-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Actions Row */}
        <div className="p-6 flex items-center justify-between bg-slate-50/50">
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-600">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <input 
              type="text" 
              placeholder="Search branches..." 
              className="w-64 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs focus:outline-none focus:border-accent/30 transition-all placeholder:text-slate-300"
            />
          </div>
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="px-6 py-2.5 bg-[#2EB67D] text-white rounded-full font-bold text-xs hover:bg-[#259465] transition-all shadow-md shadow-slate-200"
          >
            Add branch
          </button>
        </div>

        {/* Records Header */}
        <div className="px-6 py-4 flex items-center justify-between">
          <h3 className="text-[14px] font-black tracking-wide text-slate-900">{records.length} records</h3>
          <div className="flex items-center gap-4">
            <div className="bg-[#fce5c8] px-4 py-1.5 rounded text-[#925f27] text-xs font-bold">Show: 10</div>
            <div className="w-8 h-4 rounded-full bg-[#fde6ce]"></div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest">Branch name</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest">Code</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest">Location</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest">Phone</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-slate-600">Loading branch records...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-600 font-medium italic">
                    No branches found. Click Add branch to begin.
                  </td>
                </tr>
              ) : (
                records.map((rec, i) => (
                  <tr key={rec.id || i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-8 py-4 font-bold text-[14px] text-slate-900">{rec.name}</td>
                    <td className="px-8 py-4 text-[13px] font-bold text-slate-600">{rec.code}</td>
                    <td className="px-8 py-4 text-[14px] font-medium text-slate-900">{rec.location || "N/A"}</td>
                    <td className="px-8 py-4 text-[13px] font-medium text-slate-600">{rec.phone || "-"}</td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingBranch(rec);
                            setFormData({
                              name: rec.name,
                              code: rec.code,
                              location: rec.location || "",
                              phone: rec.phone || "",
                              region: rec.region || ""
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
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/30 z-[60] backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
          
          {/* Sidebar */}
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
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-10 flex-1 overflow-y-auto space-y-8 scrollbar-hide">
              
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 tracking-widest ml-1">Branch identity</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[15px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-accent/20 transition-all placeholder:text-slate-300"
                  placeholder="Enter branch name..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 tracking-widest ml-1">Operational code</label>
                <input 
                  type="text" 
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[15px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-accent/20 transition-all placeholder:text-slate-300"
                  placeholder="e.g. ACC-01"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 tracking-widest ml-1">Geographic location</label>
                <input 
                  type="text" 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[15px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-accent/20 transition-all placeholder:text-slate-300"
                  placeholder="Enter address..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 tracking-widest ml-1">Direct contact</label>
                <input 
                  type="text" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[15px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-accent/20 transition-all placeholder:text-slate-300"
                  placeholder="Enter phone number..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 tracking-widest ml-1">Administrative region</label>
                <select 
                  value={formData.region}
                  onChange={(e) => setFormData({...formData, region: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[15px] text-slate-800 font-bold focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="">Select region</option>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="pt-8 pb-12">
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

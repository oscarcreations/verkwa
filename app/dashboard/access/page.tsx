"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { isPrimarySuperadmin } from "@/lib/constants";

export default function AccessControlPage() {
  const { user } = useUser();
  const currentUserEmail = user?.primaryEmailAddress?.emailAddress;
  const isPrimaryAdmin = isPrimarySuperadmin(currentUserEmail);
  const tabs = ["Staff"];
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function fetchEmployees() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('staff')
        .select(`
          *,
          branches (
            name
          )
        `);
      
      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEmployees();
    
    async function fetchBranches() {
      const { data } = await supabase.from('branches').select('id, name');
      if (data) setBranches(data);
    }
    fetchBranches();
  }, []);

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setSaving(true);
    
    if (selectedStaff.role === "Superadmin" && !isPrimaryAdmin) {
      alert("Unauthorized: Only the primary superadmin can assign the Superadmin role.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('staff')
      .update({
        role: selectedStaff.role,
        branch_id: selectedStaff.branch_id || null,
        status: selectedStaff.status,
        email: selectedStaff.email
      })
      .eq('id', selectedStaff.id);

    if (error) {
      alert("Error updating staff: " + error.message);
    } else {
      setIsDrawerOpen(false);
      fetchEmployees();
    }
    setSaving(false);
  };
  
  const handleStaffDelete = async () => {
    if (!selectedStaff) return;
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${selectedStaff.first_name}? This cannot be undone.`)) return;
    
    setDeleting(true);
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', selectedStaff.id);
      
    if (error) {
      if (error.code === '23503') {
        alert("Cannot delete staff member because they are linked to existing transactions or records. Please deactivate their account instead.");
      } else {
        alert("Error deleting staff: " + error.message);
      }
    } else {
      setIsDrawerOpen(false);
      fetchEmployees();
    }
    setDeleting(false);
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
              placeholder="Search staff..." 
              className="w-64 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs focus:outline-none focus:border-accent/30 transition-all placeholder:text-slate-300"
            />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/access/add" className="px-5 py-2 bg-[#2EB67D] text-white rounded-full text-xs font-bold hover:bg-[#259465] transition-all shadow-md shadow-slate-200">
              Add staff
            </Link>
          </div>
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
                <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest">Image</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest">Name</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest">Role</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest">Branch</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest">Status</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-600 tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-plus-jakarta-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-slate-600">Loading staff database...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-600 font-medium italic">
                    No staff records found.
                  </td>
                </tr>
              ) : (
                records.map((rec, i) => (
                  <tr key={rec.id || i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-8 py-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-600 overflow-hidden">
                        {rec.image_url ? (
                          <img src={rec.image_url} alt="Staff" className="w-full h-full object-cover" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-4">
                       <p className="font-bold text-[14px] text-slate-900">{rec.first_name} {rec.last_name}</p>
                       <p className="text-[11px] font-medium text-slate-600">{rec.email}</p>
                    </td>
                    <td className="px-8 py-4 text-[13px] font-bold text-slate-600 capitalize">{rec.role}</td>
                    <td className="px-8 py-4 text-[13px] font-medium">
                      {rec.branches?.name ? (
                        <span className="bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 text-slate-600 font-bold text-[11px]">
                          {rec.branches.name}
                        </span>
                      ) : (
                        <span className="text-slate-300 italic text-[11px]">Global Admin</span>
                      )}
                    </td>
                    <td className="px-8 py-4">
                       <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${rec.status ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-600'}`}>
                          <span className={`mr-1.5 inline-block w-1.5 h-1.5 rounded-full ${rec.status ? 'bg-green-500' : 'bg-slate-300'}`} />
                          {rec.status ? 'Active' : 'Inactive'}
                       </span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center justify-end gap-2 text-right">
                        {(isPrimaryAdmin || rec.role?.toLowerCase() !== 'superadmin') && (
                          <button 
                            onClick={() => {
                              setSelectedStaff({ ...rec });
                              setIsDrawerOpen(true);
                            }}
                            className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-all"
                          >
                            Manage
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

      {/* DRAWER SIDEBAR FOR STAFF MANAGEMENT */}
      {isDrawerOpen && selectedStaff && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/30 z-[60] backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
          
          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-full w-full md:w-[450px] bg-white shadow-2xl z-[70] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-8 border-b border-slate-50">
              <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">Manage staff</h2>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="p-10 flex-1 overflow-y-auto space-y-8 scrollbar-hide">
              
              <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 overflow-hidden shadow-sm">
                  {selectedStaff.image_url ? <img src={selectedStaff.image_url} className="w-full h-full object-cover" /> : <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">{selectedStaff.first_name} {selectedStaff.last_name}</h3>
                  <p className="text-xs font-semibold text-slate-600 tracking-widest">{selectedStaff.role}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 tracking-widest ml-1">Email address</label>
                <input 
                  type="email" 
                  value={selectedStaff.email}
                  onChange={(e) => setSelectedStaff({...selectedStaff, email: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-[15px] text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-accent/20 transition-all"
                  placeholder="Enter contact email..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 tracking-widest ml-1">Assigned role</label>
                    <select 
                        value={selectedStaff.role}
                        onChange={(e) => setSelectedStaff({...selectedStaff, role: e.target.value})}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-[15px] text-slate-800 font-semibold focus:outline-none appearance-none cursor-pointer"
                    >
                        <option value="Operator">Operator</option>
                        <option value="Manager">Manager</option>
                        <option value="Mobilizer">Mobilizer</option>
                        <option value="Administrator">Administrator</option>
                        {isPrimaryAdmin && <option value="Superadmin">Superadmin</option>}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 tracking-widest ml-1">Linked branch</label>
                    <select 
                        value={selectedStaff.branch_id || ""}
                        onChange={(e) => setSelectedStaff({...selectedStaff, branch_id: e.target.value || null})}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-[15px] text-slate-800 font-semibold focus:outline-none appearance-none cursor-pointer"
                    >
                        <option value="">Global Head Office</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                   <p className="text-[14px] font-bold text-slate-800">Account access</p>
                   <p className="text-[11px] font-semibold text-slate-600 hover:text-slate-600 transition-colors">Grant or revoke dashboard access.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedStaff({...selectedStaff, status: !selectedStaff.status})}
                  className={`w-12 h-6 rounded-full flex items-center p-1 transition-all ${selectedStaff.status ? 'bg-[#2EB67D] justify-end' : 'bg-slate-200 justify-start'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-lg" />
                </button>
              </div>

              <div className="pt-8 pb-12">
                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full py-4 bg-[#2EB67D] text-white rounded-2xl font-bold text-[13px] hover:bg-[#259465] transition-all disabled:opacity-50 shadow-xl shadow-slate-200"
                >
                  {saving ? "Processing..." : "Save"}
                </button>
                
                <button 
                  type="button"
                  onClick={handleStaffDelete}
                  disabled={deleting}
                  className="w-full mt-4 py-4 bg-white border border-red-100 text-red-500 rounded-2xl font-bold text-[13px] hover:bg-red-50 transition-all disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete staff record"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

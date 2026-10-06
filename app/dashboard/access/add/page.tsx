"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { isPrimarySuperadmin } from "@/lib/constants";
import Link from "next/link";

export default function AddEmployeePage() {
  const { user } = useUser();
  const currentUserEmail = user?.primaryEmailAddress?.emailAddress;
  const isPrimaryAdmin = isPrimarySuperadmin(currentUserEmail);
  
  const router = useRouter();
  const tabs = ["Access"];
  const [activeTab, setActiveTab] = useState("ACCESS");
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    role: "",
    branch_id: "",
    first_name: "", // Hidden in BIO tab in screenshot but needed for functional parity
    last_name: "",
    email: ""
  });

  useEffect(() => {
    async function fetchBranches() {
      const { data } = await supabase.from('branches').select('id, name');
      if (data) setBranches(data);
    }
    fetchBranches();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (formData.role === "Superadmin" && !isPrimaryAdmin) {
      alert("Unauthorized: Only the primary superadmin can assign the Superadmin role.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('staff')
      .insert([
        {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          role: formData.role,
          branch_id: formData.branch_id || null,
          status: true
        }
      ]);

    if (error) {
      alert("Error adding employee: " + error.message);
    } else {
      router.push("/dashboard/access");
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[18px] font-black tracking-tight text-slate-900">
        <Link href="/dashboard/access" className="hover:underline">Staff</Link>
        <span className="text-slate-600 font-medium">›</span>
        <span className="text-slate-900">Add Employee</span>
      </div>

      <div className="bg-white border border-[#e5e7eb] shadow-sm rounded-xl overflow-hidden pb-12">
        
        {/* Actions Row */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="bg-[#2EB67D] hover:bg-[#259465] text-white px-8 py-2.5 rounded text-[13px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-black/10 transition-all active:scale-95 disabled:bg-slate-300"
            >
              {loading ? "..." : "Save"}
            </button>
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="Search customer by surname ..." 
              className="w-80 px-5 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium focus:outline-none focus:border-slate-300 transition-colors shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-8">
          {tabs.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-[14px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab.toUpperCase() === tab.toUpperCase() 
                ? "border-accent text-slate-800" 
                : "border-transparent text-slate-600 hover:text-slate-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="p-8 max-w-4xl space-y-8 mt-4 font-plus-jakarta-sans">
          
          <div className="relative group">
            <label className="absolute -top-2.5 left-3 bg-white px-1 text-[13px] text-slate-600 font-bold group-focus-within:text-slate-600">Role</label>
            <select 
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl text-[15px] text-slate-800 font-medium focus:outline-none focus:border-slate-300 transition-colors appearance-none"
            >
              <option value="">Select Role</option>
              <option value="Manager">Manager</option>
              <option value="Mobilizer">Mobilizer</option>
              <option value="Operator">Operator</option>
              <option value="Administrator">Administrator</option>
              {isPrimaryAdmin && <option value="Superadmin">Superadmin</option>}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          <div className="relative group">
            <label className="absolute -top-2.5 left-3 bg-white px-1 text-[13px] text-slate-600 font-bold group-focus-within:text-slate-600">Branch</label>
            <select 
              value={formData.branch_id}
              onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
              className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl text-[15px] text-slate-800 font-medium focus:outline-none focus:border-slate-300 transition-colors appearance-none"
            >
              <option value="">Select Branch</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             <div className="relative group">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-[13px] text-slate-600 font-bold group-focus-within:text-slate-600 transition-colors">First Name</label>
                <input 
                  type="text" 
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl text-[15px] font-medium focus:outline-none focus:border-slate-300 transition-colors"
                  placeholder="e.g. John"
                  required
                />
             </div>
             <div className="relative group">
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-[13px] text-slate-600 font-bold group-focus-within:text-slate-600 transition-colors">Last Name</label>
                <input 
                  type="text" 
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl text-[15px] font-medium focus:outline-none focus:border-slate-300 transition-colors"
                  placeholder="e.g. Doe"
                  required
                />
             </div>
          </div>

          <div className="relative group">
            <label className="absolute -top-2.5 left-3 bg-white px-1 text-[13px] text-slate-600 font-bold group-focus-within:text-slate-600 transition-colors">Email Address (for Gmail login)</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl text-[15px] font-medium focus:outline-none focus:border-slate-300 transition-colors"
              placeholder="employee@gmail.com"
              required
            />
            <p className="mt-2 text-[11px] text-slate-600 font-medium italic">Important: This must match the email the employee will use to sign in. Their role will be synchronized upon their next login.</p>
          </div>

        </div>
      </div>
    </div>
  );
}

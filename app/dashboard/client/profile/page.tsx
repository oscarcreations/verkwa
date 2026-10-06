"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import Link from "next/link";


export default function ClientProfilePage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    gender: "",
    account_num: ""
  });

  useEffect(() => {
    async function fetchProfile() {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return setLoading(false);

      try {
        const { data: cust } = await supabase
          .from('customers')
          .select('*')
          .eq('email', email)
          .single();

        if (cust) {
          setFormData({
            first_name: cust.first_name || "",
            last_name: cust.last_name || "",
            email: cust.email || "",
            phone: cust.phone || "",
            gender: cust.gender || "",
            account_num: cust.account_num || ""
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    }

    if (isLoaded) fetchProfile();
  }, [user, isLoaded]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          gender: formData.gender
        })
        .eq('email', formData.email);

      if (error) throw error;
      alert("Profile updated successfully!");
    } catch (err: any) {
      alert("Error updating profile: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 pb-20 font-sans animate-in fade-in duration-700">
      
      {/* Navigation Tabs */}


      <div className="flex flex-col md:flex-row md:items-center gap-10">
         <div className="relative group">
            <div className="w-28 h-28 bg-slate-50 flex items-center justify-center border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
               {user?.imageUrl ? (
                 <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <span className="text-3xl font-bold text-slate-300 uppercase tracking-tight">{formData.first_name?.[0]}{formData.last_name?.[0]}</span>
               )}
            </div>
            <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-all border-4 border-white rounded-full shadow-lg">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
         </div>
         <div className="space-y-1">
            <h1 className="text-[32px] font-bold text-slate-900 tracking-tight leading-none">{formData.first_name} {formData.last_name}</h1>
            <p className="text-slate-600 font-bold text-[11px] tracking-widest uppercase">{formData.account_num || "Verified profile"}</p>
         </div>
      </div>

      <div className="flex justify-center">
        
        {/* Profile Settings */}
        <div className="w-full max-w-4xl space-y-10 font-sans">
           <form onSubmit={handleUpdate} className="bg-white border border-slate-200 p-10 rounded-3xl shadow-sm space-y-10">
              <div className="flex items-center justify-between border-b border-slate-50 pb-8">
                 <h2 className="text-[15px] font-bold text-slate-800">Identity parameters</h2>
                 <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">Secure protocol</span>
              </div>

              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest ml-1">First name</label>
                    <input 
                      type="text" 
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 text-[14px] font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-all rounded-2xl"
                    />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest ml-1">Last name</label>
                    <input 
                      type="text" 
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 text-[14px] font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-all rounded-2xl"
                    />
                 </div>
              </div>

              <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest ml-1">Authenticated email</label>
                  <input 
                    type="email" 
                    readOnly
                    value={formData.email}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-50 text-[14px] font-bold text-slate-300 cursor-not-allowed rounded-2xl"
                  />
                  <p className="text-[11px] font-medium text-slate-600 italic tracking-tight">Root account managed via Verkwa Authentication Module.</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest ml-1">Mobile comms</label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 text-[14px] font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-all rounded-2xl"
                    />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest ml-1">Gender id</label>
                    <div className="relative">
                      <select 
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 text-[14px] font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-all appearance-none rounded-2xl"
                      >
                         <option value="Male">Male</option>
                         <option value="Female">Female</option>
                         <option value="Other">Other</option>
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                 </div>
              </div>

              <div className="pt-6 border-t border-slate-50">
                 <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-5 bg-accent text-white font-bold text-[11px] tracking-widest uppercase hover:bg-accent/90 transition-all active:scale-[0.98] disabled:bg-slate-100 rounded-2xl shadow-xl shadow-slate-100"
                 >
                   {submitting ? "Syncing profile data..." : "Save Changes"}
                 </button>
              </div>
           </form>
        </div>
      </div>
    </div>
  );
}

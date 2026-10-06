"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { usePaystackPayment } from "react-paystack";

export default function ClientRequestsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    type: "Withdrawal",
    amount: "",
    message: ""
  });

  // Paystack Config
  const paystackConfig = {
    reference: (new Date()).getTime().toString(),
    email: user?.primaryEmailAddress?.emailAddress || "",
    amount: Math.round((parseFloat(formData.amount) || 0) * 100),
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
    currency: "GHS",
  };

  const onSuccess = (reference: any) => {
    handleFinalSubmit(reference.reference);
  };

  const onClose = () => {
    setSubmitting(false);
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  useEffect(() => {
    async function fetchData() {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return setLoading(false);

      try {
        const { data: cust } = await supabase
          .from('customers')
          .select('*')
          .eq('email', email)
          .single();

        if (cust) {
          setCustomer(cust);
          const { data: reqs } = await supabase
            .from('client_requests')
            .select('*')
            .eq('customer_id', cust.id)
            .order('created_at', { ascending: false });

          setRequests(reqs || []);
        }
      } catch (err) {
        console.error("Error fetching requests:", err);
      } finally {
        setLoading(false);
      }
    }

    if (isLoaded) fetchData();
  }, [user, isLoaded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    if (formData.type === "Deposit" && parseFloat(formData.amount) > 0) {
      setSubmitting(true);
      initializePayment({ onSuccess, onClose });
    } else {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = async (paystackRef?: string) => {
    console.log("Final submission started:", { paystackRef, formData });
    setSubmitting(true);
    
    try {
      if (!customer?.id) {
        console.error("Missing customer ID");
        throw new Error("Account context lost. Please refresh the page.");
      }

      if ((formData.type === "Deposit" || formData.type === "Reserve") && paystackRef) {
        // Direct insertion to transactions for Paystack deposits to immediately update balance
        const txPayload = {
          customer_id: customer.id,
          amount: parseFloat(formData.amount) || 0,
          type: formData.type,
          status: 'approved',
          deposit_by: formData.type === "Reserve" ? `Internal: Reserved Capital Move` : `Paystack: ${paystackRef}`,
          branch_id: customer.branch_id || null
        };
        
        const { error: txError } = await supabase.from('transactions').insert([txPayload]);
        if (txError) throw txError;
        
      } else {
        const payload = {
          customer_id: customer.id,
          type: formData.type,
          amount: parseFloat(formData.amount) || 0,
          details: formData.message || "",
          status: 'Pending',
          reference: paystackRef || null
        };

        console.log("Inserting into Supabase:", payload);
        
        const { error } = await supabase
          .from('client_requests')
          .insert([payload]);

        if (error) {
          console.error("Supabase Insert Error:", error);
          throw error;
        }
      }

      // Refresh list and close modal
      const { data: newReqs } = await supabase
        .from('client_requests')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      
      setRequests(newReqs || []);
      setIsFormOpen(false);
      setFormData({ type: "Withdrawal", amount: "", message: "" });
      
      // If we just deposited, it's good practice to force a page reload or state update to reflect new balance.
      // Since balance is fetched in the parent layout/dashboard, we might need a hard refresh for the client.
      if (formData.type === "Deposit" && paystackRef) {
        window.location.reload();
      }
      
    } catch (err: any) {
      console.error("Final Submit Exception:", err);
      alert("System Error: " + (err.message || "Unknown error occurred"));
    } finally {
      setSubmitting(false);
    }
  };




  if (!isLoaded || loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-none animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 pb-20 font-sans animate-in fade-in duration-700">
      


      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <div className="space-y-1 text-left">
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight leading-none">Service center</h1>
          <p className="text-slate-600 font-bold text-[11px] tracking-widest uppercase">Account terminal</p>
        </div>

        <button 
          onClick={() => setIsFormOpen(true)}
          className="px-8 py-4 bg-accent text-white font-bold text-[11px] tracking-widest uppercase hover:bg-accent/90 transition-all flex items-center gap-3 shadow-xl rounded-xl active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          New Request
        </button>
      </div>

      <div className="flex justify-center">
        
        {/* REQUEST LIST */}
        <div className="w-full max-w-4xl space-y-10">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm relative">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
               <h2 className="text-[15px] font-bold text-slate-800">Pending Request(s)</h2>
               <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                  <div className="w-1.5 h-1.5 bg-slate-100 rounded-full" />
               </div>
            </div>

            <div className="divide-y divide-slate-50 min-h-[400px]">
              {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-32 text-center space-y-6">
                   <div className="w-16 h-16 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-200">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                   </div>
                   <p className="text-slate-300 font-bold tracking-widest text-[11px]">No data found</p>
                </div>
              ) : (
                requests.map((req, i) => (
                  <div key={req.id || i} className="p-8 group hover:bg-slate-50/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-10">
                    <div className="flex items-start gap-6">
                       <div className={`w-12 h-12 flex items-center justify-center border border-slate-100 rounded-2xl font-bold text-[14px] text-slate-900 bg-white group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm`}>
                          {req.type?.[0] || 'A'}
                       </div>
                       <div>
                          <p className="text-[16px] font-bold text-slate-900 tracking-tight leading-none mb-2">{req.type} authorization</p>
                          <p className="text-[10px] font-bold text-slate-600 tracking-widest uppercase mb-4 leading-none">Logref: {req.id?.slice(0,12)} • {new Date(req.created_at).toLocaleDateString()}</p>
                          <p className="text-[12px] font-medium text-slate-600 line-clamp-1 italic tracking-tight">"{req.details || 'No reason provided'}"</p>
                       </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 shrink-0">
                       <p className="text-[22px] font-bold text-slate-900 tracking-tight leading-none">₵ {Number(req.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                       <span className={`px-4 py-1.5 border border-slate-100 rounded-full text-[9px] font-bold tracking-widest uppercase bg-slate-50 group-hover:bg-slate-900 group-hover:text-white transition-all`}>
                         {req.status || 'Pending'}
                       </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* SIDEBAR TIPS & ACTION (Right Side - 1/3) */}
        <div className="space-y-10">

        </div>
      </div>

      {/* NEW REQUEST MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-500 font-sans">
          <div className="bg-white w-full max-w-xl border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-300 rounded-3xl relative overflow-hidden">
            <div className="p-10 space-y-10">
              <div className="flex items-center justify-between border-b border-slate-50 pb-8">
                <h2 className="text-[24px] font-bold text-slate-900 tracking-tight leading-none">New Request</h2>
                <button 
                  onClick={() => setIsFormOpen(false)} 
                  className="w-10 h-10 border border-slate-100 rounded-full flex items-center justify-center text-slate-300 hover:border-slate-900 hover:text-slate-900 transition-all font-bold text-lg"
                >
                   ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                   <label className="text-[11px] font-bold text-slate-600 tracking-widest uppercase ml-1">Protocol classification</label>
                   <div className="grid grid-cols-3 gap-0 border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                      {["Withdrawal", "Deposit", "Reserve"].map(t => (
                        <button 
                          key={t}
                          type="button"
                          onClick={() => setFormData({...formData, type: t})}
                          className={`py-4 text-[11px] font-bold tracking-widest uppercase transition-all ${
                            formData.type === t ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[11px] font-bold text-slate-600 tracking-widest uppercase ml-1">Amount (₵)</label>
                   <input 
                      type="number"
                      required
                      placeholder="00.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full px-8 py-5 bg-slate-50 border border-slate-100 text-[28px] font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-all placeholder:text-slate-200 tracking-tight rounded-2xl"
                   />
                </div>

                <div className="space-y-4">
                   <label className="text-[11px] font-bold text-slate-600 tracking-widest uppercase ml-1">Protocol context</label>
                   <textarea 
                      placeholder="Describe parameters here ..."
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      className="w-full px-8 py-6 bg-slate-50 border border-slate-100 text-[14px] font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-slate-900 transition-all h-32 resize-none placeholder:text-slate-200 tracking-tight rounded-2xl"
                   />
                </div>

                <div className="pt-6 border-t border-slate-50">
                   <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full py-5 bg-slate-900 text-white font-bold text-[12px] tracking-widest uppercase hover:bg-black transition-all active:scale-[0.98] disabled:bg-slate-100 rounded-2xl shadow-xl"
                   >
                      {submitting ? "Syncing..." : formData.type === 'Deposit' ? "Pay with Paystack" : "Request"}
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

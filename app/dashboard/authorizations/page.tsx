"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthSync } from "@/lib/hooks/useAuthSync";
import { format } from "date-fns";

export default function AuthorizationsPage() {
  const { resolvedRole, employeeId, isSyncing } = useAuthSync();
  const role = (resolvedRole || "").toLowerCase();
  const isAdmin = ["administrator", "admin", "superadmin"].includes(role);
  
  const [requests, setRequests] = useState<any[]>([]);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Initialize blacklist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('verkwa_cleared_queue');
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids)) setResolvedIds(new Set(ids));
      } catch (e) {
        console.error("Local blacklist corrupted");
      }
    }
  }, []);

  const fetchPendingRequests = async () => {
    try {
      console.log("Fetching pending authorizations...");
      setLoading(true);
      const { data: requestsData, error: requestsError } = await supabase
        .from('client_requests')
        .select('*')
        .eq('status', 'Pending')
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error("Fetch Authorizations Error:", requestsError);
        throw requestsError;
      }
      
      console.log("Fetched authorizations count:", requestsData?.length || 0);
      
      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        return setLoading(false);
      }

      // Fetch customers separately to avoid foreign key schema cache errors (PGRST200)
      const customerIds = [...new Set(requestsData.map(r => r.customer_id))].filter(Boolean);
      let customerMap: Record<string, any> = {};
      
      if (customerIds.length > 0) {
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, first_name, last_name, account_num, branch_id')
          .in('id', customerIds);
          
        if (!customersError && customersData) {
          customerMap = customersData.reduce((acc, curr) => {
            acc[curr.id] = curr;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      const enrichedRequests = requestsData.map(r => ({
        ...r,
        customers: customerMap[r.customer_id] || null
      }));
      
      const filtered = enrichedRequests.filter(r => !resolvedIds.has(r.id));
      setRequests(filtered);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (!isSyncing) fetchPendingRequests();
  }, [isSyncing, resolvedIds]);

  const handleAction = async (requestId: string, action: 'Approve' | 'Reject') => {
    if (!isAdmin) return alert("Unauthorized. Only administrators can process authorizations.");
    
    setProcessingId(requestId);
    const request = requests.find(r => r.id === requestId);
    if (!request) return setProcessingId(null);

    // 1. Add to local blacklist IMMEDIATELY (Ghost Protocol)
    const updatedBlacklist = new Set(resolvedIds).add(requestId);
    setResolvedIds(updatedBlacklist);
    localStorage.setItem('verkwa_cleared_queue', JSON.stringify(Array.from(updatedBlacklist)));
    
    // 2. Clear from UI state
    setRequests(prev => prev.filter(r => r.id !== requestId));
    
    try {
      if (action === 'Reject') {
        const { error: updError } = await supabase
          .from('client_requests')
          .update({ status: 'Rejected' })
          .match({ id: requestId });
        
        if (updError) throw updError;

        // Cleanup: Try hard delete if permissions allow, but status update is primary
        await supabase.from('client_requests').delete().match({ id: requestId });
      } else {
        // APPROVAL FLOW
        const { error: updError } = await supabase
          .from('client_requests')
          .update({ status: 'Approved' })
          .match({ id: requestId });
        
        if (updError) throw updError;

        // 2. Insert into transactions table
        const { error: txError } = await supabase
          .from('transactions')
          .insert([{
            customer_id: request.customer_id,
            amount: request.amount,
            type: request.type,
            staff_id: employeeId,
            branch_id: request.customers?.branch_id || null,
            status: 'approved',
            deposit_by: request.reference ? `Paystack: ${request.reference}` : (request.details || `Authorized ${request.type}`),
            created_at: new Date().toISOString()
          }]);

        if (txError) throw txError;

        // 3. Final cleanup: try hard delete
        await supabase.from('client_requests').delete().match({ id: requestId });
      }

      setNotification({
        message: `Request successfully ${action === 'Approve' ? 'approved' : 'permanently deleted'}.`,
        type: 'success'
      });

      // Clear notification after 4 seconds
      setTimeout(() => setNotification(null), 4000);

    } catch (err: any) {
      console.error("Action Error:", err);
      // On error, remove from blacklist so the user can retry
      setResolvedIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
      fetchPendingRequests();
      
      setNotification({
        message: "System error: " + err.message,
        type: 'error'
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setProcessingId(null);
    }
  };

  if (isSyncing || loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-none animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-slate-600 text-sm">Security clearance required for the authorization terminal.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 pb-20 font-sans animate-in fade-in duration-700">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <div className="space-y-1 text-left">
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight leading-none">Approval</h1>
          <p className="text-slate-600 font-bold text-[11px] tracking-widest">Request review and clearance</p>
        </div>
        
        {/* Success/Error Notification Area */}
        <div className="flex-1 max-w-md h-0 md:h-auto overflow-visible relative">
          {notification && (
            <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-full p-4 rounded-2xl border flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 shadow-lg ${
              notification.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                notification.type === 'success' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {notification.type === 'success' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                )}
              </div>
              <p className="text-[13px] font-bold tracking-tight">{notification.message}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm shadow-slate-200/50">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
           <h2 className="text-[15px] font-black text-slate-900 tracking-tight">{requests.length} pending requests</h2>
           <button onClick={fetchPendingRequests} className="text-[11px] font-bold text-accent hover:underline tracking-widest flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
              Refresh queue
           </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Timestamp</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Client account</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Request</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Amount</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                       <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center text-slate-200">
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
                       </div>
                       <p className="text-[12px] font-bold text-slate-300 tracking-widest">All requests cleared</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-8 py-6">
                       <p className="text-[13px] font-bold text-slate-900">{format(new Date(req.created_at), "MMM dd, HH:mm")}</p>
                       <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">ID: {req.id.slice(0,8)}</p>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-3">
                          <div className="w-9 h-9 border border-slate-100 rounded-xl flex items-center justify-center text-slate-600 font-bold bg-white text-[11px] group-hover:bg-slate-900 group-hover:text-white transition-all">
                             {req.customers?.first_name?.[0]}{req.customers?.last_name?.[0]}
                          </div>
                          <div>
                             <p className="text-[14px] font-bold text-slate-800">{req.customers?.first_name} {req.customers?.last_name}</p>
                             <p className="text-[10px] font-bold text-slate-600 tracking-widest uppercase">{req.customers?.account_num}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col gap-1.5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase w-fit ${
                            req.type === 'Withdrawal' ? 'bg-red-50 text-red-500' : 
                            req.type === 'Deposit' ? 'bg-green-50 text-green-500' : 'bg-amber-50 text-amber-500'
                          }`}>
                            {req.type}
                          </span>
                          {req.reference && (
                             <span className="px-2 py-0.5 bg-accent/10 text-accent rounded text-[8px] font-black tracking-widest uppercase">
                               Paid
                             </span>
                          )}
                          <p className="text-[11px] font-medium text-slate-600 italic max-w-[200px] line-clamp-1">"{req.details || 'No reason provided'}"</p>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-[18px] font-black text-slate-900 tracking-tight">₵ {Number(req.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </td>
                     <td className="px-8 py-6 text-right">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-end gap-2 md:gap-3 opacity-100 transition-all">
                           <button 
                             onClick={() => handleAction(req.id, 'Reject')}
                             disabled={!!processingId}
                             className="h-9 md:h-10 px-4 md:px-5 bg-white border border-slate-200 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black text-slate-600 hover:text-red-500 hover:border-red-200 tracking-widest uppercase transition-all disabled:opacity-50"
                           >
                              Deny
                           </button>
                           <button 
                             onClick={() => handleAction(req.id, 'Approve')}
                             disabled={!!processingId}
                             className="h-9 md:h-10 px-4 md:px-6 bg-[#2EB67D] text-white rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black tracking-widest uppercase shadow-lg shadow-green-100 hover:bg-[#259465] transition-all disabled:opacity-50"
                           >
                              {processingId === req.id ? 'Syncing...' : 'Approve'}
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

    </div>
  );
}

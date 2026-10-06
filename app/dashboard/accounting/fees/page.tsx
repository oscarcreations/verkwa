"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { showToast, ToastContainer } from "@/components/Toast";

interface FeeSetting {
  id: string;
  name: string;
  applies_to: string;
  percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function FeeSettingsPage() {
  const [fees, setFees] = useState<FeeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ percentage: 0, is_active: false });

  async function fetchFees() {
    setLoading(true);
    const { data, error } = await supabase
      .from("fee_settings")
      .select("*")
      .order("applies_to");
    if (error) showToast("Error: " + error.message, "error");
    else setFees(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchFees(); }, []);

  const startEdit = (fee: FeeSetting) => {
    setEditingId(fee.id);
    setEditForm({ percentage: fee.percentage, is_active: fee.is_active });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ percentage: 0, is_active: false });
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("fee_settings")
      .update({ percentage: editForm.percentage, is_active: editForm.is_active, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) showToast("Error: " + error.message, "error");
    else {
      setFees((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, percentage: editForm.percentage, is_active: editForm.is_active } : f
        )
      );
      setEditingId(null);
      showToast("Fee settings updated");
    }
    setSaving(false);
  };

  const handleToggle = async (fee: FeeSetting) => {
    const { error } = await supabase
      .from("fee_settings")
      .update({ is_active: !fee.is_active, updated_at: new Date().toISOString() })
      .eq("id", fee.id);
    if (error) showToast("Error: " + error.message, "error");
    else {
      setFees((prev) => prev.map((f) => (f.id === fee.id ? { ...f, is_active: !f.is_active } : f)));
      showToast(`${fee.name} ${fee.is_active ? "disabled" : "enabled"}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "Withdrawal":
        return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>;
      case "Deposit":
        return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>;
      case "Loan":
        return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;
      default:
        return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      <ToastContainer />

      <div className="flex items-center gap-2 text-[20px] font-black tracking-tight text-slate-900">
        <Link href="/dashboard/accounting" className="hover:underline">Accounting</Link>
        <span className="text-slate-600 font-medium">›</span>
        <span className="text-slate-600">Fee Settings</span>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[18px] font-black text-slate-900 tracking-tight">Transaction Fees</h2>
            <p className="text-[13px] text-slate-500 mt-1">Configure automatic commission fees for each transaction type. Active fees are charged as a percentage of the transaction amount.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {fees.map((fee) => (
              <div key={fee.id} className={`p-6 rounded-2xl border transition-all ${fee.is_active ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${fee.is_active ? "bg-slate-100 text-slate-700" : "bg-slate-100 text-slate-400"}`}>
                      {getIcon(fee.applies_to)}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900">{fee.name}</h3>
                      <p className="text-[12px] text-slate-500">Applied to every {fee.applies_to.toLowerCase()} transaction</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {editingId === fee.id ? (
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={editForm.percentage}
                            onChange={(e) => setEditForm({ ...editForm, percentage: Number(e.target.value) })}
                            className="w-24 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[15px] font-bold text-slate-900 text-center focus:outline-none focus:border-accent/30"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-slate-400">%</span>
                        </div>
                        <button onClick={() => handleSave(fee.id)} disabled={saving}
                          className="px-4 py-2 bg-[#2EB67D] text-white rounded-xl text-[12px] font-bold hover:bg-[#259465] transition-all disabled:opacity-50">
                          {saving ? "..." : "Save"}
                        </button>
                        <button onClick={cancelEdit}
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-[12px] font-bold hover:bg-slate-50 transition-all">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[22px] font-black text-slate-900">{fee.percentage}%</span>
                        </div>
                        <button onClick={() => startEdit(fee)}
                          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 transition-all shadow-sm" title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </button>
                        <button onClick={() => handleToggle(fee)}
                          className={`w-12 h-6 rounded-full flex items-center p-1 transition-all ${fee.is_active ? "bg-[#2EB67D] justify-end" : "bg-slate-200 justify-start"}`}>
                          <div className="w-4 h-4 bg-white rounded-full shadow-lg" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

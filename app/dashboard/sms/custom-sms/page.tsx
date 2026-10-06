"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { showToast, ToastContainer } from "@/components/Toast";

export default function CustomSMSPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sendType, setSendType] = useState<"all" | "selected">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const { data } = await supabase
          .from("customers")
          .select("id, first_name, last_name, phone, mobile_number, allow_sms")
          .order("first_name", { ascending: true });
        
        // Filter out customers that deactivated SMS or have no phone
        const valid = (data || []).filter(c => c.allow_sms !== false && (c.phone || c.mobile_number));
        setCustomers(valid);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    fetchCustomers();
  }, []);

  const handleSelectAll = () => setSelectedIds(customers.map(c => c.id));
  const handleClear = () => setSelectedIds([]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const recipientCount = sendType === "all" ? customers.length : selectedIds.length;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return showToast("Message cannot be empty", "error");
    if (recipientCount === 0) return showToast("Select at least one recipient", "error");

    setSending(true);
    try {
      const ids = sendType === "all" ? customers.map(c => c.id) : selectedIds;
      
      const res = await fetch("/api/sms/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, customerIds: ids })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send SMS");

      showToast(`SMS successfully sent to ${data.count} recipients!`);
      setTimeout(() => router.push("/dashboard/sms"), 1500);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      <ToastContainer />
      <div className="flex items-center gap-2 text-[20px] font-black tracking-tight text-slate-900">
        <Link href="/dashboard/sms" className="hover:underline text-slate-500">SMS List</Link>
        <span className="text-slate-500">›</span>
        <span>Custom SMS</span>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden p-8 mt-6">
        <form onSubmit={handleSend} className="max-w-4xl space-y-8">
          
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-slate-500 tracking-widest uppercase ml-1">Title (Optional)</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-accent/50 transition-all shadow-sm"
              placeholder="e.g. Easter Promo"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-[13px] font-bold text-slate-500 tracking-widest uppercase ml-1">Message</label>
              <span className="text-[12px] text-slate-400 font-bold">{message.length} Characters · ({Math.ceil((message.length || 1) / 160)} SMS)</span>
            </div>
            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-accent/50 transition-all shadow-sm resize-none"
              placeholder="Type your message here..."
            />
          </div>

          <div className="space-y-4">
            <label className="text-[13px] font-bold text-slate-500 tracking-widest uppercase ml-1 block">Send to</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="sendType" 
                  checked={sendType === "all"} 
                  onChange={() => setSendType("all")}
                  className="w-4 h-4 text-accent border-gray-300 focus:ring-accent"
                />
                <span className="text-[14px] font-bold text-slate-700">All customers</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="sendType" 
                  checked={sendType === "selected"} 
                  onChange={() => setSendType("selected")}
                  className="w-4 h-4 text-accent border-gray-300 focus:ring-accent"
                />
                <span className="text-[14px] font-bold text-slate-700">Selected customers</span>
              </label>
            </div>
          </div>

          <div className="p-4 bg-accent/10 rounded-xl border border-accent/20">
            <p className="text-[13px] font-bold text-accent">
              {recipientCount} recipient(s) will receive this message.
            </p>
          </div>

          {sendType === "selected" && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <span className="text-[13px] font-bold text-slate-600">Select Customers</span>
                <div className="space-x-4">
                  <button type="button" onClick={handleSelectAll} className="text-[12px] font-bold text-accent hover:underline">Select All</button>
                  <button type="button" onClick={handleClear} className="text-[12px] font-bold text-slate-500 hover:underline">Clear</button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto p-4 space-y-2">
                {loading ? (
                  <p className="text-center text-sm text-slate-500 py-4">Loading customers...</p>
                ) : customers.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-4">No eligible customers found.</p>
                ) : (
                  customers.map(c => (
                    <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="w-4 h-4 rounded text-accent border-gray-300 focus:ring-accent"
                      />
                      <span className="text-[14px] font-bold text-slate-700">{c.first_name} {c.last_name}</span>
                      <span className="text-[12px] text-slate-400 font-mono ml-auto">{c.phone || c.mobile_number}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={sending || recipientCount === 0}
              className="px-10 py-4 bg-slate-900 text-white rounded-full font-bold text-[14px] tracking-wide hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "Sending SMS..." : "Send SMS"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

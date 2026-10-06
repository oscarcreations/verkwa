"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { showToast, ToastContainer } from "@/components/Toast";
import { useAuthSync } from "@/lib/hooks/useAuthSync";

function generateTxRef(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${dd}${mm}${yy}${hh}${mi}${ss}${ms}`;
}

export default function LoanFormPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { resolvedRole, employeeId } = useAuthSync();
  const role = (resolvedRole || "").toLowerCase();
  const isEmployee = role === "employee";
  const [lookupQuery, setLookupQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    amount: "",
    purpose: "",
    loanType: "",
    initiatedBy: "",
    staffId: "",
    branchId: "",
  });

  useEffect(() => {
    async function fetchEmployees() {
      const { data } = await supabase.from("staff").select("id, first_name, last_name, branch_id").eq("status", true).order("last_name");
      setEmployees(data || []);

      if (isEmployee && employeeId) {
        const me = data?.find((e: any) => e.id === employeeId);
        if (me) {
          setFormData(prev => ({
            ...prev,
            initiatedBy: `${me.first_name} ${me.last_name}`,
            staffId: me.id,
            branchId: me.branch_id || "",
          }));
        }
      }
    }
    fetchEmployees();
  }, [isEmployee, employeeId]);

  useEffect(() => {
    if (lookupQuery.length > 1) {
      const searchItems = async () => {
        const { data } = await supabase
          .from("customers")
          .select("*")
          .or(`last_name.ilike.%${lookupQuery}%,first_name.ilike.%${lookupQuery}%,account_num.ilike.%${lookupQuery}%`)
          .limit(5);
        setSearchResults(data || []);
      };
      searchItems();
    } else {
      setSearchResults([]);
    }
  }, [lookupQuery]);

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setLookupQuery("");
    setSearchResults([]);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setLookupQuery("");
    setSearchResults([]);
  };

  const handleLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return showToast("Please select a customer first", "error");
    if (!formData.amount || Number(formData.amount) <= 0) return showToast("Please enter a valid loan amount", "error");
    if (!formData.loanType) return showToast("Please select a loan type", "error");
    if (!formData.initiatedBy) return showToast("Please select who initiated the loan", "error");
    if (!isLoaded || !user) return showToast("Authentication error", "error");

    setLoading(true);
    try {
      let staffId = formData.staffId || null;
      let branchId = formData.branchId || selectedCustomer.branch_id || null;

      if (!staffId) {
        const userEmail = user.primaryEmailAddress?.emailAddress;
        const { data: staff } = await supabase
          .from("staff")
          .select("id, branch_id")
          .or(`clerk_id.eq.${user.id},email.eq.${userEmail}`)
          .single();
        staffId = staff?.id || null;
        branchId = staff?.branch_id || branchId;
      }

      const { error } = await supabase.from("transactions").insert([{
        type: "Loan",
        amount: Number(formData.amount),
        customer_id: selectedCustomer.id,
        staff_id: staffId,
        branch_id: branchId,
        deposit_by: formData.initiatedBy,
        note: formData.purpose || null,
        status: "approved",
        tx_ref: generateTxRef(),
      }]);

      if (error) throw error;

      const { data: feeSetting, error: feeError } = await supabase
        .from("fee_settings")
        .select("name, percentage")
        .ilike("applies_to", "Loan")
        .eq("is_active", true)
        .gt("percentage", 0)
        .limit(1)
        .maybeSingle();

      if (feeSetting && feeSetting.percentage > 0) {
        const commissionAmount = Number(formData.amount) * (Number(feeSetting.percentage) / 100);
        const validTypes = ["Commission", "Interest", "Service Fee", "Other Income"];
        const feeType = validTypes.includes(feeSetting.name) ? feeSetting.name : "Commission";
        await supabase.from("transactions").insert([{
          type: feeType,
          amount: commissionAmount,
          customer_id: selectedCustomer.id,
          staff_id: staffId,
          branch_id: branchId,
          deposit_by: `${feeSetting.name} (${feeSetting.percentage}% Loan Fee)`,
          status: "completed",
          tx_ref: generateTxRef(),
        }]);
      }

      showToast(`Loan of ₵ ${Number(formData.amount).toFixed(2)} issued to ${selectedCustomer.first_name} ${selectedCustomer.last_name}`);
      setTimeout(() => router.push("/dashboard/transactions"), 1000);
    } catch (error: any) {
      console.error("Loan Processing Error:", error);
      showToast("Error processing loan: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      <ToastContainer />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-[18px] md:text-[20px] font-black tracking-tight text-slate-900">
          <Link href="/dashboard/transactions" className="hover:underline">Transactions</Link>
          <span className="text-slate-600 font-medium">›</span>
          <span className="text-slate-600">Loan Form</span>
        </div>
      </div>

      <div className="bg-white border border-[#e2e8f0] shadow-xl rounded-3xl overflow-hidden p-4 md:p-10 mt-6">
        <form onSubmit={handleLoan} className="max-w-4xl space-y-10 relative">

          <div className="bg-white border-2 border-slate-100 rounded-3xl p-4 md:p-8 space-y-8 shadow-inner-sm">

            {!selectedCustomer ? (
              <div className="relative group">
                <label className="absolute -top-2.5 left-4 md:left-6 bg-white px-2 text-[11px] md:text-[13px] text-slate-600 font-bold group-focus-within:text-slate-600 transition-colors tracking-tight">Search by surname or account</label>
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="e.g. Smith or ACC-123..."
                  className="w-full px-8 py-5 bg-white border border-slate-200 rounded-2xl text-[15px] font-medium text-slate-600 focus:outline-none focus:border-slate-300 transition-colors shadow-sm"
                />
                {searchResults.length > 0 && (
                  <div className="absolute w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-20 overflow-hidden">
                    {searchResults.map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => handleSelectCustomer(res)}
                        className="w-full px-8 py-4 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-black text-slate-700">{res.last_name}, {res.first_name}</p>
                          <p className="text-[11px] font-bold text-slate-600 tracking-widest">{res.account_num}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-300">Select</span>
                      </button>
                    ))}
                  </div>
                )}
                {lookupQuery.length > 1 && searchResults.length === 0 && (
                  <div className="absolute w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 p-4 text-center text-sm text-slate-600 italic">
                    No customers found matching &quot;{lookupQuery}&quot;
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl shadow-sm gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-600 tracking-widest">Customer active</p>
                    <p className="text-sm font-black text-slate-700">Ready to issue loan</p>
                  </div>
                </div>
                <button type="button" onClick={handleClearCustomer}
                  className="w-full md:w-auto px-4 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 hover:text-red-500 hover:border-red-200 transition-all tracking-wider text-center">
                  Change
                </button>
              </div>
            )}

            <div className="relative">
              <label className="absolute -top-2.5 left-4 md:left-6 bg-white px-2 text-[11px] md:text-[13px] text-slate-600 font-bold tracking-tight">Customer name</label>
              <div className={`w-full px-8 py-5 border rounded-2xl text-[16px] font-black transition-all ${selectedCustomer ? "bg-[#f8fafc] border-slate-200 text-slate-800 shadow-sm" : "bg-[#f1f5f9] border-slate-200 text-slate-300"}`}>
                {selectedCustomer ? `${selectedCustomer.last_name}, ${selectedCustomer.first_name}` : "Selection pending..."}
              </div>
            </div>

            <div className="relative">
              <label className="absolute -top-2.5 left-4 md:left-6 bg-white px-2 text-[11px] md:text-[13px] text-slate-600 font-bold tracking-tight">Account number</label>
              <div className={`w-full px-8 py-5 border rounded-2xl text-[16px] font-black transition-all ${selectedCustomer ? "bg-[#f8fafc] border-slate-200 text-slate-800 shadow-sm" : "bg-[#f1f5f9] border-slate-200 text-slate-300"}`}>
                {selectedCustomer ? selectedCustomer.account_num : "Selection pending..."}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="relative group">
              <label className="absolute -top-2.5 left-4 md:left-6 bg-white px-2 text-[11px] md:text-[13px] text-slate-600 font-bold tracking-tight group-focus-within:text-slate-600">Loan amount</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || (!val.startsWith("-") && Number(val) >= 0)) {
                    setFormData({ ...formData, amount: val });
                  }
                }}
                className="w-full px-8 py-5 bg-white border border-slate-200 rounded-2xl text-[24px] font-black text-slate-900 focus:outline-none focus:border-slate-300 transition-colors shadow-sm"
                placeholder="0.00"
                min="0"
                required
              />
            </div>

            <div className="relative group">
              <label className="absolute -top-2.5 left-4 md:left-6 bg-white px-2 text-[11px] md:text-[13px] text-slate-600 font-bold tracking-tight">Loan type</label>
              <select
                value={formData.loanType}
                onChange={(e) => setFormData({ ...formData, loanType: e.target.value })}
                className="w-full px-8 py-5 bg-white border border-slate-200 rounded-2xl text-[15px] font-medium text-slate-600 focus:outline-none focus:border-slate-300 transition-colors shadow-sm appearance-none cursor-pointer"
                required
              >
                <option value="">Select loan type</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Business Loan">Business Loan</option>
                <option value="Emergency Loan">Emergency Loan</option>
                <option value="Salary Advance">Salary Advance</option>
                <option value="Susu Loan">Susu Loan</option>
                <option value="Group Loan">Group Loan</option>
                <option value="Asset Financing">Asset Financing</option>
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>

            <div className="relative group">
              <label className="absolute -top-2.5 left-4 md:left-6 bg-white px-2 text-[11px] md:text-[13px] text-slate-600 font-bold tracking-tight">Purpose</label>
              <textarea
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="e.g. School fees, Business expansion, Medical bills..."
                rows={3}
                className="w-full px-8 py-5 bg-white border border-slate-200 rounded-2xl text-[15px] font-medium text-slate-600 focus:outline-none focus:border-slate-300 transition-colors shadow-sm resize-none"
              />
            </div>

            <div className="relative group">
              <label className="absolute -top-2.5 left-4 md:left-6 bg-white px-2 text-[11px] md:text-[13px] text-slate-600 font-bold tracking-tight">Initiated by</label>
              <select
                value={formData.initiatedBy}
                onChange={(e) => {
                  const emp = employees.find((em) => `${em.first_name} ${em.last_name}` === e.target.value);
                  setFormData({
                    ...formData,
                    initiatedBy: e.target.value,
                    staffId: emp?.id || "",
                    branchId: emp?.branch_id || "",
                  });
                }}
                disabled={isEmployee}
                className={`w-full px-8 py-5 bg-white border border-slate-200 rounded-2xl text-[15px] font-medium text-slate-600 focus:outline-none focus:border-slate-300 transition-colors shadow-sm appearance-none ${isEmployee ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                required
              >
                <option value="">Select staff member</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={`${emp.first_name} ${emp.last_name}`}>
                    {emp.last_name}, {emp.first_name}
                  </option>
                ))}
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !selectedCustomer}
              className="bg-[#dbeafe] hover:bg-[#bfdbfe] text-[#1e40af] px-10 py-4 rounded-lg text-[13px] font-black tracking-widest shadow-md transition-all active:scale-95 disabled:bg-slate-100 disabled:text-slate-300 border border-transparent disabled:border-slate-200"
            >
              {loading ? "Processing..." : "Issue loan"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

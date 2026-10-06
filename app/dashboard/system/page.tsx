"use client";

export default function SystemPage() {
  const tabs = ["SUBSCRIPTIONS", "GUIDES"];
  const records: any[] = [];

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
        <div className="p-6 flex items-center justify-between border-b border-slate-50 bg-slate-50/50">
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-600">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
            <input 
              type="text" 
              placeholder="Search subscriptions..." 
              className="w-72 pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs focus:outline-none focus:border-accent/30 transition-all placeholder:text-slate-300"
            />
          </div>
          <button className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-bold text-xs hover:bg-black transition-all shadow-md shadow-slate-200">
              Renew Plan
          </button>
        </div>

        {/* Records Header */}
        <div className="px-8 py-4 flex items-center justify-between border-b border-slate-50">
          <h3 className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{records.length} ACTIVE SUBSCRIPTIONS</h3>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[150px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-[11px] font-bold text-slate-600 uppercase tracking-widest">Plan Amount</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-600 uppercase tracking-widest">Method</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-600 uppercase tracking-widest">Start Date</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-600 uppercase tracking-widest">Expiry Date</th>
                <th className="px-8 py-4 text-[11px] font-bold text-slate-600 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 && (
                <tr className="bg-white">
                  <td colSpan={7} className="px-8 py-20 text-center text-xs font-bold text-slate-300 uppercase tracking-widest italic">
                    NO SUBSCRIPTION HISTORY FOUND IN THE ACTIVE LEDGER.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthSync } from "@/lib/hooks/useAuthSync";
import { useUser, UserButton } from "@clerk/nextjs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded: isClerkLoaded } = useUser();
  const { resolvedRole, isSyncing } = useAuthSync();
  const pathname = usePathname();
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Use resolvedRole from Supabase fallback if available, otherwise Clerk metadata
  const roleRaw = resolvedRole || (user?.publicMetadata?.role as string) || "client";
  const role = roleRaw.toLowerCase();
  const isClient = role === "client";
  
  // Specific role flags
  const isSuperadmin = role === "superadmin";
  const isAdmin = ["administrator", "admin", "superadmin"].includes(role);
  const isManager = role === "manager";
  const isOperator = role === "operator";
  const isMobilizer = role === "mobilizer";
  const isEmployee = role === "employee";

  // Permission groups
  const isStaff = ["administrator", "manager", "operator", "mobilizer", "admin", "superadmin", "employee"].includes(role);
  const canManageAccounts = ["administrator", "manager", "operator", "admin", "superadmin"].includes(role);
  const canViewTransactions = ["administrator", "manager", "operator", "admin", "superadmin"].includes(role);
  const canManageBusiness = ["administrator", "manager", "admin", "superadmin"].includes(role);
  const canManageAccess = ["administrator", "admin", "superadmin"].includes(role);
  const canViewAccounting = ["administrator", "admin", "superadmin"].includes(role);

  const clientLinks = [
    { name: "Account history", href: "/dashboard/client/activity", icon: "receipt", visible: true },
    { name: "Service request", href: "/dashboard/client/requests", icon: "clipboard-list", visible: true },
    { name: "My profile", href: "/dashboard/client/profile", icon: "user-cog", visible: true },
  ];

  const staffLinks = [
    { name: "Dashboard", href: "/dashboard", icon: "layout-dashboard", visible: true },
    { name: "Accounts", href: "/dashboard/accounts", icon: "users", visible: isStaff },
    { name: "Transactions", href: "/dashboard/transactions", icon: "receipt", visible: isStaff },
    { name: "Authorizations", href: "/dashboard/authorizations", icon: "shield-check", visible: isAdmin },
    { name: "Access", href: "/dashboard/staff", icon: "lock", visible: isAdmin },
    { name: "Business", href: "/dashboard/business", icon: "briefcase", visible: canManageBusiness },
    { name: "Accounting", href: "/dashboard/accounting", icon: "calculator", visible: canViewAccounting },
    { name: "Ledgers", href: "/dashboard/ledgers", icon: "folder", visible: isAdmin },
    { name: "Reports", href: "/dashboard/reports", icon: "bar-chart-2", visible: isAdmin },
    { name: "SMS", href: "/dashboard/sms", icon: "message-square", visible: isAdmin },
    { name: "Generate", href: "/dashboard/generate", icon: "file-plus", visible: isAdmin },
    { name: "Settings", href: "/dashboard/settings", icon: "settings", visible: isAdmin },
    { name: "System", href: "/dashboard/system", icon: "cpu", visible: isSuperadmin },
  ].filter(l => l.visible);

  const navLinks = isClient ? clientLinks : staffLinks;

  const quickActions = [
    { name: "Deposit req", icon: "deposit", href: "/dashboard/client/requests?type=deposit", color: "text-green-600", visible: isClient },
    { name: "Withdrawal req", icon: "withdrawal", href: "/dashboard/client/requests?type=withdrawal", color: "text-red-600", visible: isClient },
    { name: "Deposit", icon: "deposit", href: "/dashboard/transactions/deposit", color: "text-green-600", visible: isStaff },
    { name: "Withdrawal", icon: "withdrawal", href: "/dashboard/transactions/withdrawal", color: "text-green-600", visible: isStaff },
    { name: "Loan request", icon: "loan-req", href: "/dashboard/transactions/loan", color: "text-green-700", visible: isStaff },
    { name: "Loan payment", icon: "loan-pay", href: "/dashboard/transactions/loan-repayment", color: "text-green-600", visible: isStaff },
    { name: "Complaint", icon: "complaint", href: "/dashboard/business/complaints/new", color: "text-green-600", visible: isAdmin },
    { name: "Add client", icon: "user-plus", href: "/dashboard/accounts/add", color: "text-green-800", visible: isAdmin },
  ].filter(a => a.visible);

  // Map strict strings for the URL paths matching screenshots perfectly
  const getPageTitle = () => {
    if (isClient && pathname === '/dashboard') return 'My Portal';
    switch (pathname) {
      case '/dashboard': return 'Dashboard';
      case '/dashboard/access': return 'Access';
      case '/dashboard/staff': return 'Access';
      case '/dashboard/business': return 'Business data';
      case '/dashboard/ledgers': return 'Ledgers';
      case '/dashboard/sms': return 'SMS';
      case '/dashboard/settings': return 'Settings';
    }
    if (pathname.startsWith('/dashboard/accounts/')) return 'Customer Profile';
    const title = pathname.split('/').pop()?.replace(/-/g, ' ');
    return title ? title.charAt(0).toUpperCase() + title.slice(1) : "";
  };

  if (!isClerkLoaded || (isSyncing && !resolvedRole)) return (
    <div className="h-screen w-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f5f7f9] overflow-hidden font-sans">
      
      {/* MOBILE SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 w-[260px] bg-white border-r border-border-subtle flex flex-col flex-shrink-0 z-[70] transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo Area */}
        <div className="h-16 md:h-20 flex items-center px-6 md:px-8 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center overflow-visible -ml-3 md:-ml-5">
               <img src="/images/logo.png" alt="Verkwa Logo" className="w-full h-full object-contain scale-125 md:scale-150" />
            </div>
          </div>
        </div>

        {/* Links Area */}
        <div className="flex-1 overflow-y-auto pt-6 pb-8 space-y-1 scrollbar-hide">
          {navLinks.map((link) => {
            const isActive = link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link 
                key={link.name} 
                href={link.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 mx-3 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200 group ${
                  isActive 
                  ? "bg-slate-100 text-slate-900" 
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className={`transition-colors ${
                  isActive ? "text-accent" : "text-slate-500 group-hover:text-slate-900"
                }`}>
                  {link.icon === 'layout-dashboard' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="0"/><rect width="7" height="5" x="14" y="3" rx="0"/><rect width="7" height="9" x="14" y="12" rx="0"/><rect width="7" height="5" x="3" y="16" rx="0"/></svg>}
                  {link.icon === 'users' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                  {link.icon === 'receipt' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17V7"/></svg>}
                  {link.icon === 'clipboard-list' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="0" ry="0"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M9 10h6"/></svg>}
                  {link.icon === 'shield-check' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>}
                  {link.icon === 'user-cog' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z"/><path d="M12 8v4l3 3"/></svg>}
                  {link.icon === 'lock' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="0" ry="0"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                  {link.icon === 'briefcase' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="0" ry="0"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
                  {link.icon === 'calculator' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="0"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>}
                  {link.icon === 'percent' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>}
                  {link.icon === 'folder' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>}
                  {link.icon === 'bar-chart-2' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>}
                  {link.icon === 'message-square' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                  {link.icon === 'settings' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>}
                  {link.icon === 'cpu' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="16" x="4" y="4" rx="0"/><rect width="6" height="6" x="9" y="9" rx="0"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>}
                </div>
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Logout Area */}
        <div className="px-6 py-6 border-t border-slate-50">
          <button className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 font-bold text-xs transition-all">
            Log out
          </button>
        </div>
      </aside>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        

        {/* Top Navigation */}
        <header className="h-16 md:h-20 bg-white border-b border-border-subtle z-20 flex items-center justify-between px-4 md:px-10 w-full">
          <div className="flex items-center gap-3">
            {/* Hamburger Button */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-900 lg:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
            <h2 className="text-[16px] md:text-[18px] font-bold text-slate-900 tracking-tight">
              {getPageTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="w-72 lg:w-96 pl-11 pr-6 py-2.5 bg-slate-50 border border-transparent rounded-full text-sm font-medium focus:outline-none focus:bg-white focus:border-accent/30 transition-all placeholder:text-slate-400 text-slate-700"
              />
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-[0.98] ${
                  isQuickActionOpen ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isQuickActionOpen ? 'rotate-45' : ''}`}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              </button>

              {/* QUICK ACTIONS DROPDOWN */}
              {isQuickActionOpen && (
                <div className="fixed md:absolute right-4 md:right-0 mt-4 w-[calc(100vw-32px)] md:w-64 bg-white border border-border-subtle shadow-2xl rounded-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <div className="p-4 md:p-3 grid grid-cols-1 gap-1">
                    <div className="px-3 py-2 text-[10px] font-black text-slate-400 tracking-widest uppercase">Quick actions</div>
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-1">
                      {quickActions.map((action) => (
                        <Link 
                          key={action.name}
                          href={action.href}
                          onClick={() => setIsQuickActionOpen(false)}
                          className="flex items-center gap-3 px-3 py-3 hover:bg-slate-50 rounded-xl transition-all group border border-slate-50 md:border-transparent"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-slate-50 group-hover:bg-accent group-hover:text-white ${action.color}`}>
                            {action.icon === 'deposit' && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 12-4 4-4-4"/><path d="M12 8v8"/></svg>}
                            {action.icon === 'withdrawal' && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 4-4 4 4"/><path d="M12 16V8"/></svg>}
                            {action.icon === 'loan-req' && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 15h2a2 2 0 1 0 0-4h-3c-1.1 0-2-.9-2-2s.9-2 2-2h2"/><path d="M12 5v14"/><path d="M7 15l-3-3 3-3"/><path d="M17 9l3 3-3 3"/></svg>}
                            {action.icon === 'loan-pay' && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12h.01"/><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M22 13a10 10 0 1 1-20 0"/><path d="m15 13-3 3-3-3"/></svg>}
                            {action.icon === 'complaint' && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v5h5"/><path d="m7 11 2 2 4-4"/></svg>}
                            {action.icon === 'user-plus' && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>}
                          </div>
                          <span className="text-[11px] md:text-[12px] font-bold text-slate-700">{action.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <UserButton />
          </div>
        </header>

        {/* Inject Dashboard Pages here */}
        <main className="flex-1 overflow-y-auto w-full bg-background p-4 md:p-10">
          {children}
        </main>
      </div>

    </div>
  );
}

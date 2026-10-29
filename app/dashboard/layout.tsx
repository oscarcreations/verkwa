"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuthSync } from "@/lib/hooks/useAuthSync";
import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const {
    user,
    resolvedRole,
    employeeId,
    organizationId,
    organizationName,
    organizationSlug,
    organizationLogo,
    permissions,
    mustChangePassword,
    setMustChangePassword,
    isSyncing,
  } = useAuthSync();
  const pathname = usePathname();
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  // First-login password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match. Please verify.");
      return;
    }

    try {
      setUpdatingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          must_change_password: false,
        },
      });

      if (error) {
        setPasswordError(error.message);
        return;
      }

      setPasswordSuccess(true);
      setTimeout(() => {
        setMustChangePassword(false);
      }, 1000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Load saved sidebar state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("verkwa_sidebar_collapsed");
      if (saved !== null) {
        setIsDesktopCollapsed(saved === "true");
      }
    } catch (e) {}
  }, []);

  const toggleDesktopSidebar = () => {
    setIsDesktopCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("verkwa_sidebar_collapsed", String(next));
      } catch (e) {}
      return next;
    });
  };

  // Role determination
  const roleRaw = resolvedRole || "SuperAdmin";
  const role = roleRaw.toLowerCase();
  const isClient = role === "client";
  
  // Specific role flags
  const isSuperadmin = role === "superadmin";
  const isAdmin = ["administrator", "admin", "superadmin"].includes(role);

  // Granular feature permissions configured by SuperAdmin
  const canViewAccounts = isSuperadmin || isAdmin || (
    permissions ? Boolean(permissions.can_manage_accounts) : ["mobilizer", "teller", "cashier", "manager"].includes(role)
  );

  const canViewTransactions = isSuperadmin || isAdmin || (
    permissions
      ? Boolean(permissions.can_deposit || permissions.can_withdraw || permissions.can_manage_loans)
      : ["mobilizer", "teller", "cashier", "manager"].includes(role)
  );

  const canViewAuthorizations = isSuperadmin || isAdmin || (
    permissions ? Boolean(permissions.can_approve_transactions) : role === "manager"
  );

  // Staff & Access is strictly reserved for SuperAdmin (Workspace Owner) and top Administrator
  const canManageStaff = isSuperadmin || role === "administrator";

  // Business Management is strictly for SuperAdmin and Administrator
  const canManageBusiness = isSuperadmin || role === "administrator";

  const canViewAccounting = isSuperadmin || role === "administrator" || (
    permissions ? Boolean(permissions.can_manage_ledgers) : role === "accountant"
  );

  const canViewLedgers = isSuperadmin || role === "administrator" || (
    permissions ? Boolean(permissions.can_manage_ledgers) : role === "accountant"
  );

  const canViewReports = isSuperadmin || role === "administrator" || (
    permissions ? Boolean(permissions.can_view_reports) : ["manager", "accountant"].includes(role)
  );

  const canManageSms = isSuperadmin || role === "administrator" || (
    permissions ? Boolean(permissions.can_manage_sms) : role === "manager"
  );

  const canGenerate = isSuperadmin || role === "administrator" || (
    permissions ? Boolean(permissions.can_view_reports) : false
  );

  // Settings & System are strictly for SuperAdmin (Primary Business Owner)
  const canViewSettings = isSuperadmin;
  const canViewSystem = isSuperadmin;

  const clientLinks = [
    { name: "Account history", href: "/dashboard/client/activity", icon: "receipt", visible: true },
    { name: "Service request", href: "/dashboard/client/requests", icon: "clipboard-list", visible: true },
    { name: "My profile", href: "/dashboard/client/profile", icon: "user-cog", visible: true },
  ];

  const staffLinks = [
    { name: "Dashboard", href: "/dashboard", icon: "layout-dashboard", visible: true },
    { name: "Accounts", href: "/dashboard/accounts", icon: "users", visible: canViewAccounts },
    { name: "Transactions", href: "/dashboard/transactions", icon: "receipt", visible: canViewTransactions },
    { name: "Authorizations", href: "/dashboard/authorizations", icon: "shield-check", visible: canViewAuthorizations },
    { name: "Staff & Access", href: "/dashboard/staff", icon: "lock", visible: canManageStaff },
    { name: "Business", href: "/dashboard/business", icon: "briefcase", visible: canManageBusiness },
    { name: "Accounting", href: "/dashboard/accounting", icon: "calculator", visible: canViewAccounting },
    { name: "Ledgers", href: "/dashboard/ledgers", icon: "folder", visible: canViewLedgers },
    { name: "Reports", href: "/dashboard/reports", icon: "bar-chart-2", visible: canViewReports },
    { name: "SMS", href: "/dashboard/sms", icon: "message-square", visible: canManageSms },
    { name: "Generate", href: "/dashboard/generate", icon: "file-plus", visible: canGenerate },
    { name: "Settings", href: "/dashboard/settings", icon: "settings", visible: canViewSettings },
    { name: "System", href: "/dashboard/system", icon: "cpu", visible: canViewSystem },
  ].filter(l => l.visible);

  const navLinks = isClient ? clientLinks : staffLinks;

  const quickActions = [
    { name: "Deposit req", icon: "deposit", href: "/dashboard/client/requests?type=deposit", color: "text-green-600", visible: isClient },
    { name: "Withdrawal req", icon: "withdrawal", href: "/dashboard/client/requests?type=withdrawal", color: "text-red-600", visible: isClient },
    {
      name: "Deposit",
      icon: "deposit",
      href: "/dashboard/transactions/deposit",
      color: "text-green-600",
      visible: !isClient && (isSuperadmin || isAdmin || (permissions ? Boolean(permissions.can_deposit) : ["mobilizer", "teller", "cashier", "manager"].includes(role)))
    },
    {
      name: "Withdrawal",
      icon: "withdrawal",
      href: "/dashboard/transactions/withdrawal",
      color: "text-green-600",
      visible: !isClient && (isSuperadmin || isAdmin || (permissions ? Boolean(permissions.can_withdraw) : ["teller", "cashier", "manager"].includes(role)))
    },
    {
      name: "Loan request",
      icon: "loan-req",
      href: "/dashboard/transactions/loan",
      color: "text-green-700",
      visible: !isClient && (isSuperadmin || isAdmin || (permissions ? Boolean(permissions.can_manage_loans) : ["teller", "cashier", "manager"].includes(role)))
    },
    {
      name: "Loan payment",
      icon: "loan-pay",
      href: "/dashboard/transactions/loan-repayment",
      color: "text-green-600",
      visible: !isClient && (isSuperadmin || isAdmin || (permissions ? Boolean(permissions.can_manage_loans) : ["teller", "cashier", "manager"].includes(role)))
    },
    {
      name: "Complaint",
      icon: "complaint",
      href: "/dashboard/business/complaints/new",
      color: "text-green-600",
      visible: !isClient && (isSuperadmin || isAdmin || (permissions ? Boolean(permissions.can_approve_transactions) : role === "manager"))
    },
    {
      name: "Add client",
      icon: "user-plus",
      href: "/dashboard/accounts/add",
      color: "text-green-800",
      visible: !isClient && (isSuperadmin || isAdmin || (permissions ? Boolean(permissions.can_manage_accounts) : ["mobilizer", "manager"].includes(role)))
    },
  ].filter(a => a.visible);

  const getPageTitle = () => {
    if (isClient && pathname === "/dashboard") return "My Portal";
    switch (pathname) {
      case "/dashboard": return "Dashboard";
      case "/dashboard/access": return "Access";
      case "/dashboard/staff": return "Staff & Access";
      case "/dashboard/business": return "Business data";
      case "/dashboard/ledgers": return "Ledgers";
      case "/dashboard/sms": return "SMS";
      case "/dashboard/settings": return "Settings";
    }
    if (pathname.startsWith("/dashboard/accounts/")) return "Customer Profile";
    const title = pathname.split("/").pop()?.replace(/-/g, " ");
    return title ? title.charAt(0).toUpperCase() + title.slice(1) : "";
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (isSyncing && !resolvedRole) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f5f7f9] overflow-hidden font-sans">
      {/* MOBILE SIDEBAR OVERLAY BACKDROP */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-[70] transition-all duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? "translate-x-0 w-[280px]" : "-translate-x-full w-[280px]"}
        ${isDesktopCollapsed ? "lg:w-[76px]" : "lg:w-[260px]"}
      `}>
        {/* Logo & Company Branding Header */}
        <div className={`h-16 md:h-20 flex items-center border-b border-slate-100 transition-all ${
          isDesktopCollapsed ? "lg:px-3 justify-between lg:justify-center" : "px-5 justify-between"
        }`}>
          <Link 
            href="/dashboard" 
            className={`flex items-center gap-3 min-w-0 ${isDesktopCollapsed ? "lg:justify-center" : ""}`}
            title={organizationName || "Verkwa Susu"}
          >
            {/* Enterprise Logo */}
            <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-emerald-500/20 shadow-xs bg-slate-50 flex items-center justify-center shrink-0">
              {organizationLogo ? (
                <img src={organizationLogo} alt={organizationName || "Logo"} className="w-full h-full object-cover" />
              ) : (
                <Image src="/ghsusu-logo.jpg" alt="Logo" fill className="object-cover" />
              )}
            </div>

            {/* Branding Hierarchy: Company Name BIG, GHSUSU badge small */}
            <div className={`min-w-0 ${isDesktopCollapsed ? "lg:hidden" : "block"}`}>
              <span className="text-[16px] font-black tracking-tight text-slate-900 block leading-tight truncate">
                {organizationName || "Verkwa Susu"}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                  GH<span className="text-emerald-600">SUSU</span> CRM
                </span>
              </div>
            </div>
          </Link>

          {/* Mobile Cancel / Close (✕) Button */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 -mr-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
            aria-label="Close sidebar"
            title="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* Desktop Collapse Arrow Button (Only shown when expanded) */}
          {!isDesktopCollapsed && (
            <button 
              onClick={toggleDesktopSidebar}
              className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Collapse sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M9 3v18"/>
                <path d="m15 15-3-3 3-3"/>
              </svg>
            </button>
          )}
        </div>

        {/* Navigation Links Area */}
        <div className="flex-1 overflow-y-auto pt-5 pb-6 space-y-1">
          {navLinks.map((link) => {
            const isActive = link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link 
                key={link.name} 
                href={link.href}
                onClick={() => setIsSidebarOpen(false)}
                title={isDesktopCollapsed ? link.name : undefined}
                className={`flex items-center rounded-xl text-[13px] font-semibold transition-all duration-200 group ${
                  isDesktopCollapsed 
                    ? "lg:justify-center lg:mx-2 lg:px-0 lg:py-3 mx-3 px-4 py-3 gap-3" 
                    : "mx-3 px-4 py-3 gap-3"
                } ${
                  isActive 
                  ? "bg-slate-100 text-slate-900 font-bold" 
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className={`shrink-0 transition-colors ${
                  isActive ? "text-emerald-600" : "text-slate-500 group-hover:text-slate-900"
                }`}>
                  {link.icon === "layout-dashboard" && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="0"/><rect width="7" height="5" x="14" y="3" rx="0"/><rect width="7" height="9" x="14" y="12" rx="0"/><rect width="7" height="5" x="3" y="16" rx="0"/></svg>}
                  {link.icon === "users" && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                  {link.icon === "receipt" && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17V7"/></svg>}
                  {link.icon === "clipboard-list" && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="0" ry="0"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M9 10h6"/></svg>}
                  {link.icon === "shield-check" && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>}
                  {link.icon === "user-cog" && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z"/><path d="M12 8v4l3 3"/></svg>}
                  {link.icon === "lock" && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="0" ry="0"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                  {link.icon === "briefcase" && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="0" ry="0"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
                  {link.icon === "calculator" && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="0"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>}
                  {link.icon === "folder" && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>}
                  {link.icon === "bar-chart-2" && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>}
                  {link.icon === "message-square" && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                  {link.icon === "settings" && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>}
                  {link.icon === "cpu" && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="16" x="4" y="4" rx="0"/><rect width="6" height="6" x="9" y="9" rx="0"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>}
                </div>
                <span className={`truncate ${isDesktopCollapsed ? "lg:hidden" : "block"}`}>
                  {link.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Logout Area */}
        <div className={`py-4 border-t border-slate-100 transition-all ${
          isDesktopCollapsed ? "lg:px-2 px-6" : "px-6"
        }`}>
          <button 
            onClick={handleSignOut}
            title={isDesktopCollapsed ? "Log out" : undefined}
            className={`w-full flex justify-center items-center gap-2 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 font-bold text-xs transition-all ${
              isDesktopCollapsed ? "lg:px-0 px-4" : "px-4"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" x2="9" y1="12" y2="12"/>
            </svg>
            <span className={isDesktopCollapsed ? "lg:hidden" : "block"}>
              Log out
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA - Stretches fluidly when sidebar collapses */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        {/* Top Navigation */}
        <header className="h-16 md:h-20 bg-white border-b border-slate-200 z-20 flex items-center justify-between px-4 md:px-8 w-full transition-all">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger / Toggle Button */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors lg:hidden"
              aria-label="Toggle navigation menu"
            >
              {isSidebarOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" x2="20" y1="12" y2="12"/>
                  <line x1="4" x2="20" y1="6" y2="6"/>
                  <line x1="4" x2="20" y1="18" y2="18"/>
                </svg>
              )}
            </button>

            {/* Desktop Hamburger / Sidebar Expand Toggle (Only shown when collapsed) */}
            {isDesktopCollapsed && (
              <button 
                onClick={toggleDesktopSidebar}
                className="hidden lg:flex p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" x2="20" y1="12" y2="12"/>
                  <line x1="4" x2="20" y1="6" y2="6"/>
                  <line x1="4" x2="20" y1="18" y2="18"/>
                </svg>
              </button>
            )}

            <h2 className="text-[16px] md:text-[18px] font-bold text-slate-900 tracking-tight">
              {getPageTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Actions Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-[0.98] ${
                  isQuickActionOpen ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
                title="Quick actions"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isQuickActionOpen ? "rotate-45" : ""}`}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              </button>

              {isQuickActionOpen && (
                <div className="fixed md:absolute right-4 md:right-0 mt-4 w-[calc(100vw-32px)] md:w-64 bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
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
                          <span className="text-[11px] md:text-[12px] font-bold text-slate-700">{action.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar with Initials (No email shown) */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                {(user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || "U").toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {user?.user_metadata?.full_name || organizationName || "Staff Member"}
                </div>
                <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                  {roleRaw}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto w-full bg-background p-4 md:p-10">
          {children}
        </main>
      </div>

      {/* MANDATORY FIRST-LOGIN PASSWORD CHANGE MODAL */}
      {mustChangePassword && !isSyncing && (
        <div className="fixed inset-0 z-[999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Security Icon */}
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 mb-5 shadow-xs">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                <circle cx="12" cy="16" r="1.5"/>
              </svg>
            </div>

            {/* Header */}
            <h2 className="text-[20px] font-black text-slate-900 tracking-tight leading-snug">
              Set Your New Password
            </h2>
            <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
              Welcome to <span className="font-bold text-slate-800">{organizationName || "your workspace"}</span>! You were issued a temporary password. For your security, please create a new personal password before accessing your dashboard.
            </p>

            {/* Status alerts */}
            {passwordError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-bold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
                <span>Password updated successfully! Entering dashboard...</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 tracking-wider uppercase block">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 tracking-wider uppercase block">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Repeat your new password"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={updatingPassword || passwordSuccess}
                className="w-full mt-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updatingPassword ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving new password...</span>
                  </>
                ) : (
                  <span>Update Password & Continue</span>
                )}
              </button>

              {/* Logout Option */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold underline underline-offset-2 transition-colors"
                >
                  Sign out instead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

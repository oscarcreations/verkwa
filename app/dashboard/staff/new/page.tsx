"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuthSync } from "@/lib/hooks/useAuthSync";
import { showToast, ToastContainer } from "@/components/Toast";

interface RoleOption {
  id: string;
  name: string;
  description: string;
  badgeColor: string;
  defaultPermissions: {
    can_manage_accounts: boolean;
    can_deposit: boolean;
    can_withdraw: boolean;
    can_manage_loans: boolean;
    can_approve_transactions: boolean;
    can_view_reports: boolean;
    can_manage_ledgers: boolean;
    can_manage_sms: boolean;
  };
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: "Mobilizer",
    name: "Field Mobilizer",
    description: "Collects daily susu and deposits from clients in the field.",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    defaultPermissions: {
      can_manage_accounts: true,
      can_deposit: true,
      can_withdraw: false,
      can_manage_loans: false,
      can_approve_transactions: false,
      can_view_reports: false,
      can_manage_ledgers: false,
      can_manage_sms: false,
    },
  },
  {
    id: "Teller",
    name: "Cashier / Teller",
    description: "Handles in-branch daily counter deposits, withdrawals, and customer care.",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    defaultPermissions: {
      can_manage_accounts: true,
      can_deposit: true,
      can_withdraw: true,
      can_manage_loans: true,
      can_approve_transactions: false,
      can_view_reports: false,
      can_manage_ledgers: false,
      can_manage_sms: false,
    },
  },
  {
    id: "Manager",
    name: "Branch Manager",
    description: "Supervises branch staff, client activity, and transaction approvals.",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    defaultPermissions: {
      can_manage_accounts: true,
      can_deposit: true,
      can_withdraw: true,
      can_manage_loans: true,
      can_approve_transactions: true,
      can_view_reports: true,
      can_manage_ledgers: false,
      can_manage_sms: true,
    },
  },
  {
    id: "Accountant",
    name: "Accountant",
    description: "Audits fee ledgers, balances, withdrawals, and financial summaries.",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    defaultPermissions: {
      can_manage_accounts: false,
      can_deposit: false,
      can_withdraw: false,
      can_manage_loans: false,
      can_approve_transactions: true,
      can_view_reports: true,
      can_manage_ledgers: true,
      can_manage_sms: false,
    },
  },
  {
    id: "Administrator",
    name: "Administrator",
    description: "Full operational access across all modules for this organization.",
    badgeColor: "bg-slate-900 text-white border-slate-900",
    defaultPermissions: {
      can_manage_accounts: true,
      can_deposit: true,
      can_withdraw: true,
      can_manage_loans: true,
      can_approve_transactions: true,
      can_view_reports: true,
      can_manage_ledgers: true,
      can_manage_sms: true,
    },
  },
];

export default function NewStaffPage() {
  const router = useRouter();
  const { resolvedRole, organizationId, organizationName, organizationSlug, isSyncing } = useAuthSync();

  const roleLower = (resolvedRole || "").toLowerCase();
  const isAuthorized = ["superadmin", "administrator", "admin"].includes(roleLower);

  useEffect(() => {
    if (!isSyncing && resolvedRole && !isAuthorized) {
      router.replace("/dashboard");
    }
  }, [resolvedRole, isAuthorized, isSyncing, router]);

  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [saving, setSaving] = useState(false);

  // Photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    branch_id: "",
    role: "Mobilizer",
    ghana_card_number: "",
    date_of_birth: "",
    residential_address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    temporary_password: "",
  });

  const [permissions, setPermissions] = useState(ROLE_OPTIONS[0].defaultPermissions);
  const [showPassword, setShowPassword] = useState(false);

  // Live email duplicate checking state
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [emailMessage, setEmailMessage] = useState("");

  const checkEmailAvailability = async (emailToCheck: string) => {
    const clean = emailToCheck.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setEmailStatus("idle");
      setEmailMessage("");
      return;
    }

    try {
      setEmailStatus("checking");
      const res = await fetch(`/api/staff/check-email?email=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (data.available) {
        setEmailStatus("available");
        setEmailMessage("Email is available");
      } else {
        setEmailStatus("taken");
        setEmailMessage(data.message || "This email is already registered");
      }
    } catch {
      setEmailStatus("idle");
    }
  };

  // Success modal state
  const [successData, setSuccessData] = useState<{
    name: string;
    email: string;
    role: string;
    temporaryPassword: string;
    loginUrl: string;
  } | null>(null);

  // Auto-generate temporary password on mount
  useEffect(() => {
    generateRandomPassword();
  }, []);

  const generateRandomPassword = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const chars = ["#", "!", "@", "$", "%"];
    const randomChar = chars[Math.floor(Math.random() * chars.length)];
    const generated = `Verkwa${randomChar}${randomNum}`;
    setFormData((prev) => ({ ...prev, temporary_password: generated }));
  };

  // Fetch branches
  useEffect(() => {
    async function loadBranches() {
      if (!organizationId) return;
      try {
        setLoadingBranches(true);
        const { data, error } = await supabase
          .from("branches")
          .select("id, name, location")
          .eq("organization_id", organizationId)
          .order("name");

        if (error) throw error;
        setBranches(data || []);
        if (data && data.length > 0) {
          setFormData((prev) => ({ ...prev, branch_id: data[0].id }));
        }
      } catch (err: any) {
        console.error("Error loading branches:", err);
      } finally {
        setLoadingBranches(false);
      }
    }

    if (!isSyncing && organizationId) {
      loadBranches();
    }
  }, [isSyncing, organizationId]);

  // When role changes, automatically suggest role default permissions
  const handleRoleChange = (roleId: string) => {
    const selected = ROLE_OPTIONS.find((r) => r.id === roleId);
    setFormData((prev) => ({ ...prev, role: roleId }));
    if (selected) {
      setPermissions(selected.defaultPermissions);
    }
  };

  // Client-side photo compression
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please upload a valid image file", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL("image/jpeg", 0.85);
          setPhotoPreview(compressed);
        }
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      showToast("Please provide both first and last name", "error");
      return;
    }

    if (!formData.email.trim()) {
      showToast("Please provide a valid login email", "error");
      return;
    }

    if (emailStatus === "taken") {
      showToast(emailMessage || "This email is already registered", "error");
      return;
    }

    if (!formData.phone.trim()) {
      showToast("Please provide a contact phone number", "error");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...formData,
        photo_url: photoPreview,
        permissions,
        organization_id: organizationId,
      };

      const res = await fetch("/api/staff/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to create staff member");
      }

      // Compute login URL
      let loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";
      if (organizationSlug && typeof window !== "undefined" && !window.location.hostname.includes(organizationSlug)) {
        loginUrl = `${window.location.protocol}//${organizationSlug}.${window.location.host}/login`;
      }

      setSuccessData({
        name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        temporaryPassword: formData.temporary_password,
        loginUrl,
      });

      showToast("Staff member onboarded successfully!");
    } catch (err: any) {
      console.error("Error creating staff:", err);
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  };

  const copyAllCredentials = () => {
    if (!successData) return;
    const text = `🎉 Welcome to ${organizationName || "our organization"}!\n\nYou have been onboarded as a team member on GHSUSU.\n\n👤 Name: ${successData.name}\n🏷️ Role: ${successData.role}\n🌐 Login Portal: ${successData.loginUrl}\n✉️ Email: ${successData.email}\n🔑 Temporary Password: ${successData.temporaryPassword}\n\nPlease log in and update your password.`;
    navigator.clipboard.writeText(text);
    showToast("All credentials copied to clipboard!");
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-24 font-sans">
      <ToastContainer />

      {/* Top Bar / Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/staff"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Staff Directory
        </Link>
      </div>

      {/* Page Heading */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Add New Employee
            </h1>
            <p className="text-[13px] text-slate-500 mt-1">
              Onboard a staff member to <span className="font-bold text-slate-700">{organizationName || "your business"}</span>, assign their branch, and configure their exact feature permissions.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Auto-Login Setup Enabled
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Personal Information
              </h2>
              <p className="text-xs text-slate-500">
                Primary contact and identity details for this employee.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* First Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-600 tracking-wider ml-1">
                First name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="e.g. Kwabena"
                className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-400"
                required
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-600 tracking-wider ml-1">
                Last name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="e.g. Mensah"
                className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-400"
                required
              />
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[11px] font-bold text-slate-600 tracking-wider">
                  Login email address <span className="text-rose-500">*</span>
                </label>
                {emailStatus === "checking" && (
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <span className="w-2.5 h-2.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                    Checking...
                  </span>
                )}
                {emailStatus === "available" && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    ✓ Available
                  </span>
                )}
                {emailStatus === "taken" && (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    ✕ Already registered
                  </span>
                )}
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, email: val });
                  if (emailStatus !== "idle") setEmailStatus("idle");
                }}
                onBlur={(e) => checkEmailAvailability(e.target.value)}
                placeholder="staff.name@gmail.com"
                className={`w-full px-5 py-3.5 bg-slate-50 border rounded-2xl text-[14px] text-slate-800 font-semibold focus:outline-none focus:bg-white transition-all placeholder:text-slate-400 ${
                  emailStatus === "taken"
                    ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                    : emailStatus === "available"
                    ? "border-emerald-400 focus:border-emerald-500"
                    : "border-transparent focus:border-emerald-500"
                }`}
                required
              />
              {emailStatus === "taken" ? (
                <p className="text-[10.5px] font-semibold text-rose-600 ml-1">
                  {emailMessage}
                </p>
              ) : (
                <p className="text-[10.5px] text-slate-400 ml-1">
                  The staff member will use this email to log in to their dashboard.
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-600 tracking-wider ml-1">
                Contact phone number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 0538948322"
                className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-400"
                required
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-600 tracking-wider ml-1">
                Date of birth <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Residential Address */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-600 tracking-wider ml-1">
                Residential address <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.residential_address}
                onChange={(e) => setFormData({ ...formData, residential_address: e.target.value })}
                placeholder="e.g. House No. 12, Spintex Road, Accra"
                className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Verification, Ghana Card & Photo */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Identification & Selfie / Photo
              </h2>
              <p className="text-xs text-slate-500">
                Helpful for field verification, customer confidence, and fraud prevention.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Photo / Selfie Upload Card */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-600 tracking-wider ml-1">
                Staff profile picture / selfie
              </label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-3xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/20 group min-h-[180px]"
              >
                {photoPreview ? (
                  <div className="relative group/pic">
                    <img 
                      src={photoPreview} 
                      alt="Staff Preview" 
                      className="w-24 h-24 rounded-2xl object-cover shadow-sm border-2 border-white"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1.5 shadow-md hover:bg-rose-700 transition-all"
                      title="Remove photo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    <span className="text-[11px] font-bold text-emerald-700 mt-2 block">
                      Click to change
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 group-hover:text-emerald-600 flex items-center justify-center shadow-xs transition-colors mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">
                      Upload Selfie / Photo
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      PNG, JPG up to 5MB (auto-compressed)
                    </span>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>

            {/* Ghana Card & Emergency Contact */}
            <div className="md:col-span-2 space-y-5">
              {/* Ghana Card Number */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 tracking-wider ml-1">
                  Ghana Card / National ID number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400 uppercase">
                    ID:
                  </span>
                  <input
                    type="text"
                    value={formData.ghana_card_number}
                    onChange={(e) => setFormData({ ...formData, ghana_card_number: e.target.value.toUpperCase() })}
                    placeholder="GHA-7XXXXXXXX-X"
                    className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Emergency Contact Name */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-600 tracking-wider ml-1">
                    Emergency contact name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    placeholder="e.g. Mary Mensah (Spouse)"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Emergency Contact Phone */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-600 tracking-wider ml-1">
                    Emergency contact phone <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    placeholder="e.g. 0244123456"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-semibold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Role & Branch Assignment */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Role & Branch Assignment
              </h2>
              <p className="text-xs text-slate-500">
                Determine the primary responsibility and station for this staff member.
              </p>
            </div>
          </div>

          {/* Branch Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-600 tracking-wider ml-1">
              Assigned branch station
            </label>
            {loadingBranches ? (
              <div className="h-12 bg-slate-50 rounded-2xl animate-pulse"></div>
            ) : branches.length > 0 ? (
              <select
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.location ? `— (${b.location})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-600 font-medium">
                No custom branches found. This staff will be attached to the primary headquarters.
              </div>
            )}
          </div>

          {/* Role Cards */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-slate-600 tracking-wider ml-1">
              Select primary employee role
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ROLE_OPTIONS.map((r) => {
                const isSelected = formData.role === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => handleRoleChange(r.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/30 ring-2 ring-emerald-500/20"
                        : "border-slate-150 bg-white hover:bg-slate-50/60"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-[14px] text-slate-900">
                          {r.name}
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {r.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 4: Fine-grained Access Matrix */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Granular Feature Permissions
                </h2>
                <p className="text-xs text-slate-500">
                  Enable or disable specific system privileges for this staff member.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleRoleChange(formData.role)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/60 px-3 py-1.5 rounded-xl transition-all self-start sm:self-auto"
            >
              ↺ Reset to {formData.role} Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                key: "can_manage_accounts",
                title: "Client Accounts",
                desc: "Create and update customer profiles",
                icon: "users",
              },
              {
                key: "can_deposit",
                title: "Collect Deposits",
                desc: "Record daily susu & savings",
                icon: "deposit",
              },
              {
                key: "can_withdraw",
                title: "Process Withdrawals",
                desc: "Initiate and record client cash-outs",
                icon: "withdrawal",
              },
              {
                key: "can_manage_loans",
                title: "Loans & Repayments",
                desc: "Issue loans & record repayments",
                icon: "loan",
              },
              {
                key: "can_approve_transactions",
                title: "Authorizations",
                desc: "Approve high-value requests",
                icon: "shield",
              },
              {
                key: "can_view_reports",
                title: "Business Reports",
                desc: "View statistics & revenue summaries",
                icon: "chart",
              },
              {
                key: "can_manage_ledgers",
                title: "Ledgers & Fees",
                desc: "Configure accounting & fee rules",
                icon: "ledger",
              },
              {
                key: "can_manage_sms",
                title: "SMS Notifications",
                desc: "Dispatch instant client SMS alerts",
                icon: "sms",
              },
            ].map((perm) => {
              const active = (permissions as any)[perm.key];
              return (
                <div
                  key={perm.key}
                  onClick={() =>
                    setPermissions((prev) => ({
                      ...prev,
                      [perm.key]: !active,
                    }))
                  }
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    active
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-slate-50/60 hover:bg-slate-100 text-slate-800 border-transparent"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <h3 className={`text-xs font-bold ${active ? "text-white" : "text-slate-900"}`}>
                      {perm.title}
                    </h3>
                    <p className={`text-[11px] mt-0.5 ${active ? "text-slate-300" : "text-slate-500"}`}>
                      {perm.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 5: Automatic Login Account Setup */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              5
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Initial Account Password
              </h2>
              <p className="text-xs text-slate-500">
                A secure login account is generated automatically for this employee.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-600 tracking-wider ml-1">
                Temporary password for employee
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.temporary_password}
                  onChange={(e) => setFormData({ ...formData, temporary_password: e.target.value })}
                  className="w-full pl-5 pr-24 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-md"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="pt-2 sm:pt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={generateRandomPassword}
                className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all"
              >
                ⚡ Generate New Password
              </button>
              <span className="text-[11px] text-slate-400">
                Employee can update their password on first sign-in.
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/dashboard/staff"
            className="px-6 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Account...
              </>
            ) : (
              <>+ Complete Employee Onboarding</>
            )}
          </button>
        </div>
      </form>

      {/* Success Modal / Credentials Distribution */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center mx-auto shadow-xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Staff Onboarded Successfully!
              </h3>
              <p className="text-xs text-slate-500">
                An active workspace account was generated for <span className="font-bold text-slate-800">{successData.name}</span>.
              </p>
            </div>

            {/* Credentials Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
              {/* Role */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 text-xs">
                <span className="font-medium text-slate-500">Designation / Role:</span>
                <span className="font-black text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                  {successData.role}
                </span>
              </div>

              {/* Login Portal URL */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Login portal URL:</span>
                  <button
                    onClick={() => copyToClipboard(successData.loginUrl, "Login URL")}
                    className="text-emerald-700 hover:text-emerald-800 font-extrabold"
                  >
                    Copy URL
                  </button>
                </div>
                <div className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-800 truncate">
                  {successData.loginUrl}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Login Email:</span>
                  <button
                    onClick={() => copyToClipboard(successData.email, "Email")}
                    className="text-emerald-700 hover:text-emerald-800 font-extrabold"
                  >
                    Copy Email
                  </button>
                </div>
                <div className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-800 truncate">
                  {successData.email}
                </div>
              </div>

              {/* Temporary Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Temporary Password:</span>
                  <button
                    onClick={() => copyToClipboard(successData.temporaryPassword, "Password")}
                    className="text-emerald-700 hover:text-emerald-800 font-extrabold"
                  >
                    Copy Password
                  </button>
                </div>
                <div className="px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-mono font-bold text-emerald-800 flex items-center justify-between">
                  <span>{successData.temporaryPassword}</span>
                </div>
              </div>
            </div>

            {/* Next Steps Guide */}
            <div className="p-3.5 bg-blue-50/60 border border-blue-200/50 rounded-2xl text-[11.5px] text-blue-900 space-y-1">
              <span className="font-extrabold block">Next steps for employee:</span>
              <p className="text-blue-800 leading-relaxed">
                Send the login credentials to the employee via WhatsApp, SMS, or email. They can immediately log in and will be prompted to set their private password.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={copyAllCredentials}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                📋 Copy All Credentials (for WhatsApp / SMS)
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    setSuccessData(null);
                    setFormData({
                      first_name: "",
                      last_name: "",
                      email: "",
                      phone: "",
                      branch_id: branches[0]?.id || "",
                      role: "Mobilizer",
                      ghana_card_number: "",
                      date_of_birth: "",
                      residential_address: "",
                      emergency_contact_name: "",
                      emergency_contact_phone: "",
                      temporary_password: "",
                    });
                    generateRandomPassword();
                    setPhotoPreview(null);
                  }}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  + Add Another Staff
                </button>
                <button
                  onClick={() => router.push("/dashboard/staff")}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Staff Directory →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

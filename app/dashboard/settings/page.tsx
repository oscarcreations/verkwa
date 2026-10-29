"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthSync } from "@/lib/hooks/useAuthSync";
import { showToast, ToastContainer } from "@/components/Toast";
import Image from "next/image";

const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Central",
  "Eastern",
  "Western",
  "Western North",
  "Volta",
  "Oti",
  "Northern",
  "North East",
  "Savannah",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
];

export default function SettingsPage() {
  const { organizationId, isSyncing } = useAuthSync();
  const tabs = ["General", "Notifications"];
  const [activeTab, setActiveTab] = useState("General");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    business_name: "",
    country: "Ghana",
    address: "",
    city: "Accra",
    region: "Greater Accra",
    email: "",
    phone: "",
    membership_number: "",
    sms_name: "GHSUSU",
    logo_url: "",
  });

  const [notifications, setNotifications] = useState({
    allow_deposit_notification: true,
    allow_withdrawal_notification: true,
    allow_loan_notification: true,
    allow_new_customer_notification: true,
    allow_account_statement_notification: true,
    show_account_balance: true,
  });

  useEffect(() => {
    async function loadSettings() {
      if (!organizationId) return;
      try {
        setLoading(true);

        // 1. Fetch organization profile (source of truth for business identity & logo)
        const { data: orgData } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", organizationId)
          .maybeSingle();

        // 2. Fetch settings row for notification rules
        const { data: settingsData } = await supabase
          .from("settings")
          .select("*")
          .eq("organization_id", organizationId)
          .maybeSingle();

        if (settingsData) {
          setSettingsId(settingsData.id);
          setNotifications({
            allow_deposit_notification: settingsData.allow_deposit_notification ?? true,
            allow_withdrawal_notification: settingsData.allow_withdrawal_notification ?? true,
            allow_loan_notification: settingsData.allow_loan_notification ?? true,
            allow_new_customer_notification: settingsData.allow_new_customer_notification ?? true,
            allow_account_statement_notification: settingsData.allow_account_statement_notification ?? true,
            show_account_balance: settingsData.show_account_balance ?? true,
          });
        }

        // Populate business profile from organization record
        if (orgData) {
          setFormData({
            business_name: orgData.name || settingsData?.business_name || "",
            country: orgData.country || settingsData?.country || "Ghana",
            address: orgData.address || settingsData?.address || "",
            city: orgData.city || settingsData?.location || "Accra",
            region: orgData.region || "Greater Accra",
            email: orgData.email || settingsData?.email || "",
            phone: orgData.phone || settingsData?.phone || "",
            membership_number: settingsData?.membership_number || "",
            sms_name: orgData.sms_sender_id || settingsData?.sms_name || "GHSUSU",
            logo_url: orgData.logo_url || settingsData?.logo_url || "",
          });

          if (orgData.logo_url || settingsData?.logo_url) {
            setLogoPreview(orgData.logo_url || settingsData?.logo_url);
          }
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    }

    if (!isSyncing && organizationId) {
      loadSettings();
    }
  }, [isSyncing, organizationId]);

  // Client-side logo compression to keep image clean, crisp and fast
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new window.Image();
      img.onload = () => {
        // Scale to max 400x400 while preserving aspect ratio
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

          const compressedDataUrl = canvas.toDataURL("image/png", 0.9);
          setLogoPreview(compressedDataUrl);
          setFormData((prev) => ({ ...prev, logo_url: compressedDataUrl }));
          showToast("Logo loaded. Click 'Save configuration' to apply.");
        }
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLogoPreview(null);
    setFormData((prev) => ({ ...prev, logo_url: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    showToast("Logo removed. Click 'Save configuration' to apply.");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    setSaving(true);

    try {
      const formattedSmsName = (formData.sms_name || "GHSUSU")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 11);

      // 1. Update the organization record (multi-tenant identity)
      const { error: orgError } = await supabase
        .from("organizations")
        .update({
          name: formData.business_name.trim(),
          country: formData.country.trim(),
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          region: formData.region,
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          sms_sender_id: formattedSmsName,
          logo_url: formData.logo_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationId);

      if (orgError) throw orgError;

      // 2. Upsert the settings record (multi-tenant notifications & preferences)
      const settingsPayload = {
        organization_id: organizationId,
        business_name: formData.business_name.trim(),
        country: formData.country.trim(),
        address: formData.address.trim() || null,
        location: `${formData.city}, ${formData.region}`.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        membership_number: formData.membership_number.trim() || null,
        sms_name: formattedSmsName,
        logo_url: formData.logo_url || null,
        allow_deposit_notification: notifications.allow_deposit_notification,
        allow_withdrawal_notification: notifications.allow_withdrawal_notification,
        allow_loan_notification: notifications.allow_loan_notification,
        allow_new_customer_notification: notifications.allow_new_customer_notification,
        allow_account_statement_notification: notifications.allow_account_statement_notification,
        show_account_balance: notifications.show_account_balance,
        updated_at: new Date().toISOString(),
      };

      if (settingsId) {
        const { error: setErr } = await supabase
          .from("settings")
          .update(settingsPayload)
          .eq("id", settingsId)
          .eq("organization_id", organizationId);
        if (setErr) throw setErr;
      } else {
        const { data: newSetting, error: insertErr } = await supabase
          .from("settings")
          .insert([settingsPayload])
          .select()
          .single();
        if (insertErr) throw insertErr;
        if (newSetting) setSettingsId(newSetting.id);
      }

      // 3. Immediately dispatch custom event so sidebar and layout update instantly without page refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("organization-updated", {
            detail: {
              name: formData.business_name.trim(),
              logo_url: formData.logo_url || null,
            },
          })
        );
      }

      showToast("Configuration saved successfully!");
    } catch (err: any) {
      console.error("Error saving settings:", err);
      showToast("Failed to save: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      <ToastContainer />

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden pb-12">
        {/* Tabs Row */}
        <div className="flex items-center px-6 pt-4 border-b border-slate-50 gap-8">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-[13px] font-bold border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-emerald-600 text-slate-900"
                  : "border-transparent text-slate-600 hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* General Tab */}
        {activeTab === "General" && (
          <form onSubmit={handleSave} className="p-6 md:p-10 max-w-4xl space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* Business Name */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 tracking-widest ml-1">
                  Business name
                </label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) =>
                    setFormData({ ...formData, business_name: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-600"
                  required
                />
              </div>

              {/* Country */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 tracking-widest ml-1">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-600"
                  required
                />
              </div>

              {/* Business Address */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 tracking-widest ml-1">
                  Physical business address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="e.g. Spintex Road, Near Papaye"
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-600"
                />
              </div>

              {/* City */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 tracking-widest ml-1">
                  City / Town
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="e.g. Accra, Kumasi, Takoradi"
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-600"
                />
              </div>

              {/* Region */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 tracking-widest ml-1">
                  Administrative region
                </label>
                <select
                  value={formData.region}
                  onChange={(e) =>
                    setFormData({ ...formData, region: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                >
                  {GHANA_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r} Region
                    </option>
                  ))}
                </select>
              </div>

              {/* Business Phone */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 tracking-widest ml-1">
                  Business contact phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-600"
                  required
                />
              </div>

              {/* Business Email */}
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[11px] font-bold text-slate-600 tracking-widest">
                    Business email
                  </label>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                    Read-only
                  </span>
                </div>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  readOnly
                  className="w-full px-5 py-4 bg-slate-100/80 border border-slate-200/80 rounded-2xl text-[14px] text-slate-500 font-semibold cursor-not-allowed select-none"
                />
                <p className="text-[11px] text-slate-400 ml-1">
                  To update your registered business email, please contact support.
                </p>
              </div>
            </div>

            {/* Logo Upload Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[11px] font-bold text-slate-600 tracking-widest">
                  Company logo
                </label>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors"
                  >
                    Remove logo
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-emerald-500/50 hover:bg-slate-50/80 transition-all group cursor-pointer"
              >
                {logoPreview ? (
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-slate-200 bg-white p-1 shadow-sm">
                    <img
                      src={logoPreview}
                      alt="Business logo preview"
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                )}
                <span className="text-xs font-bold tracking-wide text-slate-600 group-hover:text-slate-900 transition-colors">
                  {logoPreview ? "Click to change logo" : "Upload company logo (PNG, JPG, SVG)"}
                </span>
                <span className="text-[10px] text-slate-600">
                  Displays in your portal header, client receipts, and monthly account statements.
                </span>
              </div>
            </div>

            {/* SMS Sender ID */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-600 tracking-widest ml-1">
                SMS Sender Name (11 characters max)
              </label>
              <input
                type="text"
                maxLength={11}
                placeholder="e.g. VERKWA"
                value={formData.sms_name}
                onChange={(e) =>
                  setFormData({ ...formData, sms_name: e.target.value.toUpperCase() })
                }
                className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-emerald-500 transition-all uppercase placeholder:text-slate-600"
              />
              <p className="text-[11px] text-slate-600 ml-1">
                This exact name will be delivered to member phones as the sender header for transactions and SMS alerts.
              </p>
            </div>

            {/* Submit */}
            <div className="pt-6 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="px-10 py-4 bg-emerald-600 text-white rounded-full font-bold text-[13px] hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {saving ? "Saving configuration..." : "Save configuration"}
              </button>
            </div>
          </form>
        )}

        {/* Notifications Tab */}
        {activeTab === "Notifications" && (
          <form onSubmit={handleSave} className="p-6 md:p-10 max-w-4xl space-y-6">
            <div className="space-y-1 mb-6">
              <h3 className="text-[15px] font-bold text-slate-800">Automated Notification Rules</h3>
              <p className="text-[12px] text-slate-600">
                Configure which transactional events trigger automatic SMS alerts to your Susu members.
              </p>
            </div>

            {[
              {
                key: "allow_deposit_notification" as const,
                label: "Deposit SMS Alert",
                desc: "Send instant SMS confirmation when a member deposits cash with a field mobilizer or branch",
              },
              {
                key: "allow_withdrawal_notification" as const,
                label: "Withdrawal SMS Alert",
                desc: "Send instant SMS confirmation when cash is withdrawn from member savings",
              },
              {
                key: "allow_loan_notification" as const,
                label: "Loan Activity SMS Alert",
                desc: "Send alerts for loan disbursement approvals and repayment confirmations",
              },
              {
                key: "allow_new_customer_notification" as const,
                label: "Welcome SMS for New Members",
                desc: "Send welcome SMS with member account number when customer is onboarded",
              },
              {
                key: "allow_account_statement_notification" as const,
                label: "Statement Request Notification",
                desc: "Notify customers when account statements are generated or requested",
              },
              {
                key: "show_account_balance" as const,
                label: "Include Balance in SMS",
                desc: "Display updated savings account balance at the bottom of SMS receipts",
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl hover:bg-slate-100/80 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      notifications[item.key]
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200/60 text-slate-600"
                    }`}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[14px] font-bold text-slate-800 block">
                      {item.label}
                    </span>
                    <span className="text-[12px] text-slate-600">{item.desc}</span>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={notifications[item.key]}
                    onChange={(e) =>
                      setNotifications({ ...notifications, [item.key]: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-emerald-600 transition-colors" />
                  <div className="absolute left-[2px] top-[2px] w-5 h-5 bg-white rounded-full shadow-xs transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
            ))}

            <div className="pt-8 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="px-10 py-4 bg-emerald-600 text-white rounded-full font-bold text-[13px] hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {saving ? "Saving preferences..." : "Save preferences"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

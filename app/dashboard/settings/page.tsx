"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { showToast, ToastContainer } from "@/components/Toast";

export default function SettingsPage() {
  const tabs = ["General", "Notifications"];
  const [activeTab, setActiveTab] = useState("General");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    business_name: "VERKWA SAVINGS AND SUSU",
    country: "Ghana",
    address: "Tema west Adjei Kojo",
    location: "Adjei Kojo",
    email: "verkwasusu@gmail.com",
    phone: "0592728838",
    membership_number: "",
    sms_name: "Verkwa",
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
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("settings")
          .select("*")
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const setting = data[0];
          setSettingsId(setting.id);
          setFormData({
            business_name: setting.business_name || "VERKWA SAVINGS AND SUSU",
            country: setting.country || "Ghana",
            address: setting.address || "Tema west Adjei Kojo",
            location: setting.location || "Adjei Kojo",
            email: setting.email || "verkwasusu@gmail.com",
            phone: setting.phone || "0592728838",
            membership_number: setting.membership_number || "",
            sms_name: setting.sms_name || "Verkwa",
            logo_url: setting.logo_url || "",
          });
          setNotifications({
            allow_deposit_notification: setting.allow_deposit_notification ?? true,
            allow_withdrawal_notification: setting.allow_withdrawal_notification ?? true,
            allow_loan_notification: setting.allow_loan_notification ?? true,
            allow_new_customer_notification: setting.allow_new_customer_notification ?? true,
            allow_account_statement_notification: setting.allow_account_statement_notification ?? true,
            show_account_balance: setting.show_account_balance ?? true,
          });
          if (setting.logo_url) {
            setLogoPreview(setting.logo_url);
          }
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Logo must be under 2MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
      setFormData((prev) => ({ ...prev, logo_url: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        business_name: formData.business_name,
        country: formData.country,
        address: formData.address,
        location: formData.location,
        email: formData.email,
        phone: formData.phone,
        membership_number: formData.membership_number,
        sms_name: formData.sms_name,
        logo_url: formData.logo_url,
        allow_deposit_notification: notifications.allow_deposit_notification,
        allow_withdrawal_notification: notifications.allow_withdrawal_notification,
        allow_loan_notification: notifications.allow_loan_notification,
        allow_new_customer_notification: notifications.allow_new_customer_notification,
        allow_account_statement_notification: notifications.allow_account_statement_notification,
        show_account_balance: notifications.show_account_balance,
        updated_at: new Date().toISOString(),
      };

      if (settingsId) {
        const { error } = await supabase
          .from("settings")
          .update(payload)
          .eq("id", settingsId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("settings")
          .insert([payload])
          .select();
        if (error) throw error;
        if (data && data.length > 0) {
          setSettingsId(data[0].id);
        }
      }
      showToast("Settings saved successfully!");
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
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
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
                  ? "border-accent text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* General Tab */}
        {activeTab === "General" && (
          <form onSubmit={handleSave} className="p-10 max-w-4xl space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">
                  Business name
                </label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) =>
                    setFormData({ ...formData, business_name: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-accent/20 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-accent/20 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">
                  Business address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-accent/20 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">
                  Business location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-accent/20 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">
                  Business email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-accent/20 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">
                  Business phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-accent/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">
                Logo
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-10 bg-slate-50 border border-slate-100 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-accent/20 transition-all group cursor-pointer border-dashed"
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Business logo"
                    className="w-24 h-24 object-contain rounded-2xl"
                  />
                ) : (
                  <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="28"
                      height="28"
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
                <span className="text-[11px] font-bold tracking-widest text-slate-500 group-hover:text-slate-900 transition-colors">
                  {logoPreview ? "Change logo" : "Select logo"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* GCSCA */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">
                  GCSCA membership number
                </label>
                <input
                  type="text"
                  placeholder="VER-XXXXXXXXX"
                  value={formData.membership_number}
                  onChange={(e) =>
                    setFormData({ ...formData, membership_number: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-accent/20 transition-all"
                />
              </div>

              {/* SMS Name */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 tracking-widest ml-1">
                  SMS Sending Name (11 characters max)
                </label>
                <input
                  type="text"
                  maxLength={11}
                  placeholder="Verkwa"
                  value={formData.sms_name}
                  onChange={(e) =>
                    setFormData({ ...formData, sms_name: e.target.value })
                  }
                  className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-[14px] text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-accent/20 transition-all"
                />
              </div>
            </div>

            <div className="pt-10 border-t border-slate-50">
              <button
                type="submit"
                disabled={saving}
                className="px-10 py-4 bg-slate-900 text-white rounded-full font-bold text-[13px] hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save configuration"}
              </button>
            </div>
          </form>
        )}

        {/* Notifications Tab */}
        {activeTab === "Notifications" && (
          <form onSubmit={handleSave} className="p-10 max-w-4xl space-y-6">
            <div className="space-y-1 mb-8">
              <h3 className="text-[15px] font-bold text-slate-800">Notification Preferences</h3>
              <p className="text-[12px] text-slate-500">Choose which notifications you want to receive.</p>
            </div>

            {[
              {
                key: "allow_deposit_notification" as const,
                label: "Allow Deposit Notification",
                desc: "Receive alerts when a deposit is made",
              },
              {
                key: "allow_withdrawal_notification" as const,
                label: "Allow Withdrawal Notification",
                desc: "Receive alerts when a withdrawal is made",
              },
              {
                key: "allow_loan_notification" as const,
                label: "Allow Loan Notification",
                desc: "Receive alerts for loan activities",
              },
              {
                key: "allow_new_customer_notification" as const,
                label: "Allow New Customer Notification",
                desc: "Receive alerts when a new customer joins",
              },
              {
                key: "allow_account_statement_notification" as const,
                label: "Allow Account Statement Notification",
                desc: "Receive alerts for account statement requests",
              },
              {
                key: "show_account_balance" as const,
                label: "Show Account Balance",
                desc: "Display account balance in notifications",
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl hover:bg-slate-100/80 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    notifications[item.key]
                      ? "bg-accent/10 text-accent"
                      : "bg-slate-200/60 text-slate-500"
                  }`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[14px] font-bold text-slate-800 block">{item.label}</span>
                    <span className="text-[12px] text-slate-500">{item.desc}</span>
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
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-accent transition-colors" />
                  <div className="absolute left-[2px] top-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
            ))}

            <div className="pt-10 border-t border-slate-50">
              <button
                type="submit"
                disabled={saving}
                className="px-10 py-4 bg-slate-900 text-white rounded-full font-bold text-[13px] hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save configuration"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

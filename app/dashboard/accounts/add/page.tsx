"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useAuthSync } from "@/lib/hooks/useAuthSync";
import { showToast, ToastContainer } from "@/components/Toast";

export default function AddCustomerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const tabs = ["Important", "More", "Upload"];
  const [activeTab, setActiveTab] = useState("Important");
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { resolvedRole, employeeId, isSyncing } = useAuthSync();
  const isAdmin = ["Administrator", "admin", "superadmin"].includes(resolvedRole || "");

  const photoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    branch_id: "",
    account_type: "susu account",
    gender: "",
    first_name: "",
    last_name: "",
    email: "",
    mobile_number: "",
    added_by: "",
    registration_date: "",
    date_of_birth: "",
    id_type: "",
    id_number: "",
    region: "",
    town: "",
    landmark: "",
    digital_address: "",
    photo_url: "",
    signature_url: "",
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchBranches() {
      const { data } = await supabase.from("branches").select("id, name");
      if (data) setBranches(data);
    }
    async function fetchEmployees() {
      if (isAdmin) {
        const { data } = await supabase
          .from("staff")
          .select("id, first_name, last_name")
          .eq("status", true);
        if (data) setEmployees(data);
      }
    }
    fetchBranches();
    fetchEmployees();

    if (editId) {
      async function fetchCustomer() {
        const { data } = await supabase
          .from("customers")
          .select("*")
          .eq("id", editId)
          .single();

        if (data) {
          setFormData({
            branch_id: data.branch_id || "",
            account_type: data.account_type || "susu account",
            gender: data.gender || "",
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            email: data.email || "",
            mobile_number: data.phone || "",
            added_by: data.added_by || "",
            registration_date: data.registration_date || "",
            date_of_birth: data.date_of_birth || "",
            id_type: data.id_type || "",
            id_number: data.id_number || "",
            region: data.region || "",
            town: data.town || "",
            landmark: data.landmark || "",
            digital_address: data.digital_address || "",
            photo_url: data.photo_url || "",
            signature_url: data.signature_url || "",
          });
          if (data.photo_url) setPhotoPreview(data.photo_url);
          if (data.signature_url) setSignaturePreview(data.signature_url);
        }
      }
      fetchCustomer();
    }
  }, [editId, isAdmin]);

  const { user, isLoaded: userLoaded } = useUser();

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "photo_url" | "signature_url"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("File must be under 2MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({ ...prev, [field]: base64 }));
      if (field === "photo_url") setPhotoPreview(base64);
      else setSignaturePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userLoaded || !user) {
      showToast("Authentication error", "error");
      return;
    }
    setLoading(true);

    try {
      const newErrors: Record<string, boolean> = {};
      if (!formData.first_name.trim()) newErrors.first_name = true;
      if (!formData.last_name.trim()) newErrors.last_name = true;
      if (!formData.gender) newErrors.gender = true;
      if (!formData.mobile_number.trim()) newErrors.mobile_number = true;

      setErrors(newErrors);

      if (Object.keys(newErrors).length > 0) {
        showToast("Please fill in all required fields", "error");
        setLoading(false);
        return;
      }

      let targetStaffId = formData.added_by;

      if (!isAdmin) {
        const userEmail = user.primaryEmailAddress?.emailAddress;
        const { data: staff } = await supabase
          .from("staff")
          .select("id")
          .or(`clerk_id.eq.${user.id},email.eq.${userEmail}`)
          .single();
        targetStaffId = staff?.id || null;
      }

      const customerPayload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.mobile_number,
        gender: formData.gender,
        branch_id: formData.branch_id || null,
        account_type: formData.account_type,
        status: "Active",
        added_by: targetStaffId || null,
        registration_date: formData.registration_date || null,
        date_of_birth: formData.date_of_birth || null,
        id_type: formData.id_type || null,
        id_number: formData.id_number || null,
        region: formData.region || null,
        town: formData.town || null,
        landmark: formData.landmark || null,
        digital_address: formData.digital_address || null,
        photo_url: formData.photo_url || null,
        signature_url: formData.signature_url || null,
      };

      let error;
      if (editId) {
        const { error: updateError } = await supabase
          .from("customers")
          .update(customerPayload)
          .eq("id", editId);
        error = updateError;
      } else {
        const accountNum = "ACC-" + Math.floor(100000 + Math.random() * 900000);
        const { error: insertError } = await supabase
          .from("customers")
          .insert([{ ...customerPayload, account_num: accountNum }]);
        error = insertError;
      }

      if (error) {
        if (error.code === "23505") {
          if (error.message.includes("customers_email_key")) {
            showToast("A customer with this email already exists", "error");
          } else if (error.message.includes("customers_account_num_key")) {
            showToast("Account number conflict, please try again", "error");
          } else {
            showToast("A record with this information already exists", "error");
          }
        } else {
          showToast("Error saving customer: " + error.message, "error");
        }
      } else {
        showToast(editId ? "Customer updated!" : "Customer added!");
        setTimeout(() => router.push("/dashboard/accounts"), 1000);
      }
    } catch (err: any) {
      showToast("Unexpected error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl text-[15px] text-slate-800 font-medium focus:outline-none focus:border-slate-400 transition-colors";
  const labelClass =
    "text-[12px] font-bold text-slate-600 tracking-wide";

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
      <ToastContainer />

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[18px] font-black tracking-tight text-slate-900">
        <Link href="/dashboard/accounts" className="hover:underline">
          Customers
        </Link>
        <span className="text-slate-400 font-medium">›</span>
        <span className="text-slate-900">
          {editId ? "Edit Customer" : "Add Customer"}
        </span>
      </div>

      <div className="bg-white border border-[#e5e7eb] shadow-sm rounded-xl overflow-hidden pb-12">
        {/* Actions Row */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-[#32b846] hover:bg-[#2d7337] text-white px-6 py-2.5 rounded text-[13px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-green-900/10 transition-all active:scale-95 disabled:bg-slate-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {loading ? "..." : "Save"}
            </button>
            <button className="bg-[#9333ea] hover:bg-[#7e22ce] text-white px-6 py-2.5 rounded text-[13px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-purple-900/10 transition-all active:scale-95">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              Import list
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search customer by surname ..."
              className="w-80 px-5 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium focus:outline-none focus:border-slate-300 transition-colors"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-8">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-[14px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === tab
                  ? "border-slate-600 text-slate-800"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Info Box */}
        <div className="mx-6 mt-6 bg-[#f0fff4] border border-[#c6f6d5] p-3.5 rounded text-center">
          <p className="text-[#2f855a] text-[15px] font-medium leading-none">
            You can fill the other sections later.
          </p>
        </div>

        {/* ===================== IMPORTANT TAB ===================== */}
        {activeTab === "Important" && (
          <div className="p-8 max-w-4xl space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Branch */}
              <div className="space-y-1.5">
                <label className={labelClass}>Branch</label>
                <select
                  value={formData.branch_id}
                  onChange={(e) =>
                    setFormData({ ...formData, branch_id: e.target.value })
                  }
                  className={`${inputClass} appearance-none`}
                >
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Type */}
              <div className="space-y-1.5">
                <label className={labelClass}>Account type</label>
                <select
                  value={formData.account_type}
                  onChange={(e) =>
                    setFormData({ ...formData, account_type: e.target.value })
                  }
                  className={`${inputClass} appearance-none`}
                >
                  <option value="susu account">Susu account</option>
                  <option value="savings">Savings</option>
                  <option value="current">Current</option>
                </select>
              </div>

              {/* Registration Date */}
              <div className="space-y-1.5">
                <label className={labelClass}>Registration Date</label>
                <input
                  type="date"
                  value={formData.registration_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registration_date: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>

              {/* DOB */}
              <div className="space-y-1.5">
                <label className={labelClass}>Date of Birth</label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    setFormData({ ...formData, date_of_birth: e.target.value })
                  }
                  className={inputClass}
                />
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => {
                    setFormData({ ...formData, gender: e.target.value });
                    if (errors.gender) setErrors({ ...errors, gender: false });
                  }}
                  className={`${inputClass} appearance-none ${
                    errors.gender
                      ? "border-red-400 bg-red-50/50 focus:border-red-500"
                      : ""
                  }`}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && (
                  <p className="text-[11px] text-red-500 font-medium mt-1">Required</p>
                )}
              </div>

              {/* First Name */}
              <div className="space-y-1.5">
                <label className={labelClass}>
                  First name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => {
                    setFormData({ ...formData, first_name: e.target.value });
                    if (errors.first_name) setErrors({ ...errors, first_name: false });
                  }}
                  className={`${inputClass} ${
                    errors.first_name
                      ? "border-red-400 bg-red-50/50 focus:border-red-500"
                      : ""
                  }`}
                  required
                />
                {errors.first_name && (
                  <p className="text-[11px] text-red-500 font-medium mt-1">Required</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Last name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => {
                    setFormData({ ...formData, last_name: e.target.value });
                    if (errors.last_name) setErrors({ ...errors, last_name: false });
                  }}
                  className={`${inputClass} ${
                    errors.last_name
                      ? "border-red-400 bg-red-50/50 focus:border-red-500"
                      : ""
                  }`}
                  required
                />
                {errors.last_name && (
                  <p className="text-[11px] text-red-500 font-medium mt-1">Required</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={inputClass}
                  placeholder="client@example.com"
                />
              </div>

              {/* Mobile */}
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Mobile number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.mobile_number}
                  onChange={(e) => {
                    setFormData({ ...formData, mobile_number: e.target.value });
                    if (errors.mobile_number) setErrors({ ...errors, mobile_number: false });
                  }}
                  className={`${inputClass} ${
                    errors.mobile_number
                      ? "border-red-400 bg-red-50/50 focus:border-red-500"
                      : ""
                  }`}
                  placeholder="+233"
                />
                {errors.mobile_number && (
                  <p className="text-[11px] text-red-500 font-medium mt-1">Required</p>
                )}
              </div>

              {/* ID Type */}
              <div className="space-y-1.5">
                <label className={labelClass}>ID Type</label>
                <select
                  value={formData.id_type}
                  onChange={(e) =>
                    setFormData({ ...formData, id_type: e.target.value })
                  }
                  className={`${inputClass} appearance-none`}
                >
                  <option value="">Select ID type</option>
                  <option value="National ID">National ID</option>
                  <option value="Passport">Passport</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Driver License">Driver License</option>
                  <option value="SSNIT">SSNIT</option>
                </select>
              </div>

              {/* ID Number */}
              <div className="space-y-1.5">
                <label className={labelClass}>ID Number</label>
                <input
                  type="text"
                  value={formData.id_number}
                  onChange={(e) =>
                    setFormData({ ...formData, id_number: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Enter ID number"
                />
              </div>

              {/* Staff (admin only) */}
              {isAdmin && (
                <div className="space-y-1.5">
                  <label className={labelClass}>Staff member</label>
                  <select
                    value={formData.added_by}
                    onChange={(e) =>
                      setFormData({ ...formData, added_by: e.target.value })
                    }
                    className={`${inputClass} appearance-none`}
                  >
                    <option value="">Select staff</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== MORE TAB ===================== */}
        {activeTab === "More" && (
          <div className="p-8 max-w-4xl space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Region */}
              <div className="space-y-1.5">
                <label className={labelClass}>Region</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) =>
                    setFormData({ ...formData, region: e.target.value })
                  }
                  className={inputClass}
                  placeholder="e.g. Greater Accra"
                />
              </div>

              {/* Town */}
              <div className="space-y-1.5">
                <label className={labelClass}>Town</label>
                <input
                  type="text"
                  value={formData.town}
                  onChange={(e) =>
                    setFormData({ ...formData, town: e.target.value })
                  }
                  className={inputClass}
                  placeholder="e.g. Tema"
                />
              </div>

              {/* Landmark */}
              <div className="space-y-1.5">
                <label className={labelClass}>Landmark</label>
                <input
                  type="text"
                  value={formData.landmark}
                  onChange={(e) =>
                    setFormData({ ...formData, landmark: e.target.value })
                  }
                  className={inputClass}
                  placeholder="e.g. Near Market"
                />
              </div>

              {/* Digital Address */}
              <div className="space-y-1.5">
                <label className={labelClass}>Digital Address</label>
                <input
                  type="text"
                  value={formData.digital_address}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      digital_address: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="e.g. GA-123-4567"
                />
              </div>
            </div>
          </div>
        )}

        {/* ===================== UPLOAD TAB ===================== */}
        {activeTab === "Upload" && (
          <div className="p-8 max-w-4xl space-y-8 mt-4">
            {/* Photo */}
            <div className="space-y-3">
              <label className={labelClass}>Photo</label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, "photo_url")}
                className="hidden"
              />
              <div
                onClick={() => photoInputRef.current?.click()}
                className="p-8 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-accent/40 transition-all cursor-pointer group"
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Customer photo"
                    className="w-28 h-28 object-cover rounded-2xl border border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
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
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  </div>
                )}
                <span className="text-[12px] font-bold tracking-widest text-slate-400 group-hover:text-slate-700 transition-colors">
                  {photoPreview ? "Change photo" : "image"}
                </span>
              </div>
            </div>

            {/* Signature */}
            <div className="space-y-3">
              <label className={labelClass}>Signature</label>
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, "signature_url")}
                className="hidden"
              />
              <div
                onClick={() => signatureInputRef.current?.click()}
                className="p-8 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-accent/40 transition-all cursor-pointer group"
              >
                {signaturePreview ? (
                  <img
                    src={signaturePreview}
                    alt="Customer signature"
                    className="w-48 h-20 object-contain rounded-xl border border-slate-200 bg-white"
                  />
                ) : (
                  <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
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
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                  </div>
                )}
                <span className="text-[12px] font-bold tracking-widest text-slate-400 group-hover:text-slate-700 transition-colors">
                  {signaturePreview ? "Change signature" : "signature"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

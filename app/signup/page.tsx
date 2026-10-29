"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  evaluatePasswordCriteria,
  calculatePasswordStrength,
  checkPasswordBreach,
  type PasswordCriteria,
} from "@/lib/security/passwordChecker";
import { slugifyTenant } from "@/lib/tenant";

const STEPS = [
  { label: "Owner", icon: "👤" },
  { label: "Business", icon: "🏢" },
  { label: "Finish", icon: "✅" },
];

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);

  // Step 0 — Owner
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Step 1 — Business
  const [enterpriseName, setEnterpriseName] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [customSlugEdited, setCustomSlugEdited] = useState(false);
  const [senderId, setSenderId] = useState("");
  const [region, setRegion] = useState("");

  // Step 2 — Finish (Password)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password Security & Breach Detection States
  const [breachStatus, setBreachStatus] = useState<{
    checking: boolean;
    breached: boolean;
    count: number;
  }>({ checking: false, breached: false, count: 0 });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live evaluation of password criteria
  const criteria = evaluatePasswordCriteria(password);
  const strength = calculatePasswordStrength(criteria);

  // Debounced check for breached passwords
  useEffect(() => {
    if (!password || password.length < 6) {
      setBreachStatus({ checking: false, breached: false, count: 0 });
      return;
    }

    setBreachStatus((prev) => ({ ...prev, checking: true }));
    const timer = setTimeout(async () => {
      const res = await checkPasswordBreach(password);
      setBreachStatus({
        checking: false,
        breached: res.isBreached,
        count: res.count,
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [password]);

  // Slide-in animation
  const [slideDir, setSlideDir] = useState<"right" | "left">("right");
  const [animKey, setAnimKey] = useState(0);

  const goNext = () => {
    setErrorMsg(null);

    // Validate current step
    if (step === 0) {
      if (!fullName.trim()) return setErrorMsg("Please enter your full name.");
      if (!email.trim() || !email.includes("@")) return setErrorMsg("Please enter a valid email address.");
      if (!phone.trim() || phone.trim().length < 10) return setErrorMsg("Please enter a valid phone number.");
    }

    if (step === 1) {
      if (!enterpriseName.trim()) return setErrorMsg("Please enter your susu business name.");
    }

    setSlideDir("right");
    setAnimKey((k) => k + 1);
    setStep((s) => Math.min(s + 1, 2));
  };

  const goBack = () => {
    setErrorMsg(null);
    setSlideDir("left");
    setAnimKey((k) => k + 1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // Password validation requirements
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (!criteria.hasUpper || !criteria.hasLower || !criteria.hasNumber) {
      setErrorMsg("Password must include uppercase, lowercase, and at least one number.");
      setLoading(false);
      return;
    }

    if (breachStatus.breached) {
      setErrorMsg(
        `Security Alert: This password has been found in ${breachStatus.count.toLocaleString()} known data leaks. Please choose a safer password.`
      );
      setLoading(false);
      return;
    }

    // Active double check for breaches before submission
    const finalBreachCheck = await checkPasswordBreach(password);
    if (finalBreachCheck.isBreached) {
      setErrorMsg(
        `Security Alert: This password has been breached ${finalBreachCheck.count.toLocaleString()} times globally. For your Susu account security, please choose an uncompromised password.`
      );
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (!agreedTerms) {
      setErrorMsg("Please accept the terms to continue.");
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            enterprise_name: enterpriseName.trim(),
          },
        },
      });

      if (authError) {
        setErrorMsg(authError.message);
        setLoading(false);
        return;
      }

      const user = authData.user;
      if (!user) {
        setErrorMsg("Unable to register. Please try again.");
        setLoading(false);
        return;
      }

      // Create Organization with clean memorizable slug (no random numbers)
      let chosenSlug = slugifyTenant(customSlug || enterpriseName);
      if (!chosenSlug) chosenSlug = "enterprise";

      // Check if chosen slug already exists; if taken, append minimal increment
      const { data: existingSlugs } = await supabase
        .from("organizations")
        .select("slug")
        .ilike("slug", `${chosenSlug}%`);

      let finalSlug = chosenSlug;
      if (existingSlugs && existingSlugs.length > 0) {
        const slugList = existingSlugs.map((s: any) => s.slug);
        if (slugList.includes(chosenSlug)) {
          let counter = 2;
          while (slugList.includes(`${chosenSlug}-${counter}`)) {
            counter++;
          }
          finalSlug = `${chosenSlug}-${counter}`;
        }
      }

      const formattedSenderId = (senderId.trim() || enterpriseName.substring(0, 11))
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: enterpriseName.trim(),
          slug: finalSlug,
          phone: phone.trim(),
          email: email.trim(),
          sms_sender_id: formattedSenderId.substring(0, 11),
          plan: "free",
          sms_balance: 50,
          max_members: 50,
        })
        .select()
        .single();

      if (orgError) {
        throw new Error(orgError.message || "Failed to create organization profile.");
      }

      const orgId = orgData?.id;
      const slug = finalSlug;

      // Create default Branch
      let branchId: string | null = null;
      if (orgId) {
        const { data: branchData } = await supabase
          .from("branches")
          .insert({
            name: `${enterpriseName.trim()} — Main`,
            code: `BR-${Math.floor(100 + Math.random() * 900)}`,
            organization_id: orgId,
            phone: phone.trim(),
            region: region || null,
          })
          .select()
          .single();
        branchId = branchData?.id || null;
      }

      // Create Staff (SuperAdmin)
      const names = fullName.trim().split(" ");
      const firstName = names[0] || "Owner";
      const lastName = names.slice(1).join(" ") || "Admin";

      await supabase.from("staff").insert({
        first_name: firstName,
        last_name: lastName,
        email: email.trim(),
        role: "SuperAdmin",
        status: true,
        user_id: user.id,
        organization_id: orgId || null,
        branch_id: branchId,
        phone: phone.trim(),
      });

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex flex-col">
      {/* ─── Top Navigation Bar ─── */}
      <header className="w-full border-b border-slate-100 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-emerald-500/20 shadow-sm">
              <Image src="/ghsusu-logo.jpg" alt="GHSUSU CRM" fill className="object-cover" priority />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">
              GH<span className="text-emerald-600">SUSU</span>
              <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase align-middle">
                CRM
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-xs text-slate-500">Already have an account?</span>
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-xl">
          {/* Page Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Setup your portal in 3 easy steps.
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Create your free GHSUSU CRM account and start managing your susu business digitally.
            </p>
          </div>

          {/* ─── Step Indicator ─── */}
          <div className="flex items-center justify-center gap-0 mb-10">
            {STEPS.map((s, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300 border-2 ${
                      i < step
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : i === step
                        ? "bg-white border-emerald-600 text-emerald-700 shadow-md shadow-emerald-100"
                        : "bg-slate-100 border-slate-200 text-slate-400"
                    }`}
                  >
                    {i < step ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      s.icon
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-bold transition-colors ${
                      i <= step ? "text-emerald-700" : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 max-w-[80px] mx-2 mb-5">
                    <div className="h-[3px] rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          i < step ? "bg-emerald-500 w-full" : "bg-transparent w-0"
                        }`}
                        style={{ width: i < step ? "100%" : "0%" }}
                      />
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ─── Form Card ─── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
            {/* Error Banner */}
            {errorMsg && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2 animate-shake">
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ── STEP 0: Owner Details ── */}
            {step === 0 && (
              <div key={`step-0-${animKey}`} className="animate-fadeSlideIn space-y-5">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Owner Information</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tell us about the owner or manager of this susu enterprise.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Owner Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kwame Mensah"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Owner Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kwame@yourcompany.com"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0592728838"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                  />
                </div>

                <button
                  onClick={goNext}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <span>Continue</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            )}

            {/* ── STEP 1: Business Details ── */}
            {step === 1 && (
              <div key={`step-1-${animKey}`} className="animate-fadeSlideIn space-y-5">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Business Information</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tell us about your susu business or cooperative.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Susu Enterprise Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={enterpriseName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setEnterpriseName(name);
                      if (!customSlugEdited) {
                        setCustomSlug(slugifyTenant(name));
                      }
                    }}
                    placeholder="e.g. Verkwa Susu"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Official legal or trading name of your business.</p>
                </div>

                {/* Clean Custom Subdomain URL input & live preview */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Your Portal Address (Subdomain) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
                    <input
                      type="text"
                      required
                      value={customSlug}
                      onChange={(e) => {
                        setCustomSlugEdited(true);
                        setCustomSlug(slugifyTenant(e.target.value));
                      }}
                      placeholder="verkwa-susu"
                      className="flex-1 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent font-mono"
                    />
                    <span className="px-3 py-3 bg-slate-100 text-slate-500 text-xs font-semibold border-l border-slate-200">
                      .ghsusu.com
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <span>🌐</span>
                    <span>Your direct link:</span>
                    <strong className="font-mono underline">
                      {customSlug || slugifyTenant(enterpriseName) || "your-business"}.ghsusu.com
                    </strong>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    SMS Sender Name <span className="text-slate-400 font-normal">(optional, max 11 characters)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                    placeholder="e.g. ADUMSUSU"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Shows as the sender on SMS receipts. Leave blank to use your enterprise name.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Region <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white appearance-none"
                  >
                    <option value="">Select your region</option>
                    <option value="Greater Accra">Greater Accra</option>
                    <option value="Ashanti">Ashanti</option>
                    <option value="Western">Western</option>
                    <option value="Central">Central</option>
                    <option value="Eastern">Eastern</option>
                    <option value="Volta">Volta</option>
                    <option value="Northern">Northern</option>
                    <option value="Upper East">Upper East</option>
                    <option value="Upper West">Upper West</option>
                    <option value="Bono">Bono</option>
                    <option value="Bono East">Bono East</option>
                    <option value="Ahafo">Ahafo</option>
                    <option value="Western North">Western North</option>
                    <option value="Oti">Oti</option>
                    <option value="North East">North East</option>
                    <option value="Savannah">Savannah</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="px-5 py-3.5 border border-slate-300 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50 transition-all"
                  >
                    &larr; Back
                  </button>
                  <button
                    onClick={goNext}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <span>Continue</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Finish (Password) ── */}
            {step === 2 && (
              <form
                key={`step-2-${animKey}`}
                onSubmit={handleSignup}
                className="animate-fadeSlideIn space-y-5"
              >
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Create Your Login</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Set a password to secure your portal. You&apos;re almost done!
                  </p>
                </div>

                {/* Summary Card */}
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-slate-600 space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                    Portal Summary
                  </div>
                  <div className="flex justify-between">
                    <span>Owner:</span>
                    <span className="font-bold text-slate-800">{fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="font-bold text-slate-800">{email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Business:</span>
                    <span className="font-bold text-slate-800">{enterpriseName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Plan:</span>
                    <span className="font-bold text-emerald-700">🎉 Free Forever</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a strong password"
                      className={`w-full pl-4 pr-11 py-3 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all bg-white ${
                        breachStatus.breached
                          ? "border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50/20"
                          : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* 🚨 Breached Password Alert Banner */}
                  {breachStatus.checking && (
                    <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5 animate-pulse">
                      <svg className="w-3.5 h-3.5 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Checking known leak databases...</span>
                    </div>
                  )}

                  {breachStatus.breached && !breachStatus.checking && (
                    <div className="mt-2.5 p-3 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs flex items-start gap-2 shadow-sm animate-shake">
                      <span className="text-base leading-none">⚠️</span>
                      <div className="flex-1">
                        <p className="font-bold">Breached Password Warning</p>
                        <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">
                          This password was found in <strong>{breachStatus.count.toLocaleString()}</strong> public data leaks. It cannot be used to protect your Susu portal. Please choose a unique password.
                        </p>
                      </div>
                    </div>
                  )}

                  {!breachStatus.breached && !breachStatus.checking && password.length >= 8 && (
                    <div className="mt-2 text-[11px] text-emerald-700 flex items-center gap-1 font-semibold">
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>No known data breaches found. Safe to use!</span>
                    </div>
                  )}

                  {/* Password Strength Indicator */}
                  {password.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px]">Password Strength:</span>
                        <span className={`font-bold text-[11px] ${strength.score <= 1 ? "text-red-500" : strength.score === 2 ? "text-amber-500" : strength.score === 3 ? "text-blue-600" : "text-emerald-600"}`}>
                          {strength.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 h-1.5">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-full rounded-full transition-all duration-300 ${
                              strength.score >= level
                                ? level === 1
                                  ? "bg-red-500"
                                  : level === 2
                                  ? "bg-amber-500"
                                  : level === 3
                                  ? "bg-blue-500"
                                  : "bg-emerald-500"
                                : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Password Requirements Checklist */}
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${criteria.minLength ? "text-emerald-700 font-bold" : "text-slate-500"}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${criteria.minLength ? "bg-emerald-100 text-emerald-700 font-black" : "bg-slate-200 text-slate-400"}`}>
                        {criteria.minLength ? "✓" : "•"}
                      </span>
                      <span>At least 8 characters</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${criteria.hasNumber ? "text-emerald-700 font-bold" : "text-slate-500"}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${criteria.hasNumber ? "bg-emerald-100 text-emerald-700 font-black" : "bg-slate-200 text-slate-400"}`}>
                        {criteria.hasNumber ? "✓" : "•"}
                      </span>
                      <span>At least 1 number (0-9)</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${criteria.hasUpper && criteria.hasLower ? "text-emerald-700 font-bold" : "text-slate-500"}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${criteria.hasUpper && criteria.hasLower ? "bg-emerald-100 text-emerald-700 font-black" : "bg-slate-200 text-slate-400"}`}>
                        {criteria.hasUpper && criteria.hasLower ? "✓" : "•"}
                      </span>
                      <span>Uppercase & lowercase</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${criteria.hasSpecial ? "text-emerald-700 font-bold" : "text-slate-500"}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${criteria.hasSpecial ? "bg-emerald-100 text-emerald-700 font-black" : "bg-slate-200 text-slate-400"}`}>
                        {criteria.hasSpecial ? "✓" : "•"}
                      </span>
                      <span>Special symbol (!@#$)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className={`w-full pl-4 pr-11 py-3 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all bg-white ${
                        confirmPassword && confirmPassword !== password
                          ? "border-red-400 focus:ring-red-500 focus:border-red-500"
                          : "border-slate-300 focus:ring-emerald-500 focus:border-emerald-500"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="mt-1 text-[11px] text-red-500">Passwords do not match yet.</p>
                  )}
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-500 leading-relaxed">
                    I agree to the{" "}
                    <a href="#" className="text-emerald-600 underline">Terms of Service</a>{" "}
                    and{" "}
                    <a href="#" className="text-emerald-600 underline">Privacy Policy</a>
                  </span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="px-5 py-3.5 border border-slate-300 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50 transition-all"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Creating Your Portal...</span>
                      </>
                    ) : (
                      <span>Launch My Portal 🚀</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* ─── WhatsApp Help ─── */}
          <div className="mt-6 text-center">
            <a
              href="https://wa.me/233592728838?text=Hello%20GHSUSU,%20I%20need%20help%20setting%20up%20my%20account"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.613.613l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.35 0-4.514-.81-6.228-2.163l-.435-.347-2.633.883.883-2.633-.347-.435A9.965 9.965 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
              </svg>
              <span>Get Help Via WhatsApp</span>
            </a>
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-100 bg-white py-6 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="relative w-5 h-5 rounded overflow-hidden">
              <Image src="/ghsusu-logo.jpg" alt="GHSUSU" fill className="object-cover" />
            </div>
            <span className="font-bold text-slate-600">
              GH<span className="text-emerald-600">SUSU</span> CRM
            </span>
            <span>·</span>
            <span>Digital Susu Management for Ghana &amp; Africa</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Terms</a>
            <span>© {new Date().getFullYear()} GHSUSU</span>
          </div>
        </div>
      </footer>

      {/* ─── Animations ─── */}
      <style jsx global>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fadeSlideIn {
          animation: fadeSlideIn 0.35s ease-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// --- Icons & Badges ---
function GhanaFlag({ className = "w-5 h-3.5" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center overflow-hidden rounded-[2px] shadow-sm border border-black/10 shrink-0 ${className}`}>
      <svg viewBox="0 0 900 600" className="w-full h-full object-cover">
        <rect width="900" height="200" fill="#CE1126" />
        <rect y="200" width="900" height="200" fill="#FCD116" />
        <rect y="400" width="900" height="200" fill="#006B3F" />
        {/* Black Star */}
        <polygon
          points="450,225 479,315 574,315 497,371 526,461 450,405 374,461 403,371 326,315 421,315"
          fill="#000000"
        />
      </svg>
    </span>
  );
}

function CheckIcon({ className = "w-4 h-4 text-emerald-600" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ShieldCheckIcon({ className = "w-6 h-6 text-emerald-500" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function WhatsAppIcon({ className = "w-5 h-5 fill-current" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm0 17.75c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.13 8.13 0 01-1.25-4.39c0-4.5 3.66-8.16 8.16-8.16 2.18 0 4.23.85 5.77 2.39a8.1 8.1 0 012.39 5.77c0 4.5-3.66 8.16-8.16 8.16zm4.47-6.1c-.25-.12-1.46-.72-1.68-.8-.23-.08-.39-.12-.56.12-.17.25-.64.8-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.55c.12.17 1.74 2.65 4.21 3.72.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.11-.22-.18-.47-.3z" />
    </svg>
  );
}

function BellSmsIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

export default function HomePage() {
  const [session, setSession] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Loss Calculator state
  const [membersCount, setMembersCount] = useState(120);
  const [dailyContribution, setDailyContribution] = useState(30);

  // Estimations
  const monthlyVolume = membersCount * dailyContribution * 25; // 25 collection days
  const estimatedPaperLoss = Math.round(monthlyVolume * 0.015); // ~1.5% fraud/dispute/paper calculation leak
  const annualLoss = estimatedPaperLoss * 12;

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 90;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      // Optionally update URL hash cleanly
      window.history.pushState(null, "", `#${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* 🇬🇭 Top Announcement Banner with Official Flag */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white text-xs sm:text-sm font-medium py-2.5 px-4 text-center border-b border-emerald-600/30 flex items-center justify-center gap-2.5 shadow-sm">
        <GhanaFlag className="w-5 h-3.5" />
        <span className="font-semibold text-slate-100">
          Ghana Susu CRM & Automation Platform
        </span>
        <span className="hidden md:inline text-emerald-300">•</span>
        <span className="hidden md:inline text-slate-200">
          Instant SMS receipt dispatch for deposits, loans & passbooks
        </span>
        <a
          href="https://wa.me/233592728838?text=Hello%20GHSUSU%20CRM,%20I%20want%20to%20digitize%20my%20susu%20business"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-bold text-amber-300 hover:text-white transition-colors ml-1"
        >
          WhatsApp Support &rarr;
        </a>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo with New Generated Icon */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-md shadow-emerald-500/15 border border-emerald-100 group-hover:scale-105 transition-transform">
              <Image
                src="/ghsusu-logo.jpg"
                alt="GHSUSU CRM Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-slate-900 flex items-center">
                GH<span className="text-emerald-600">SUSU</span>
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                  CRM
                </span>
              </span>
              <span className="text-[10px] tracking-wider text-slate-500 font-semibold block -mt-1 uppercase">
                Ghana Susu & Loan CRM
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, "features")}
              className="hover:text-emerald-600 transition-colors cursor-pointer"
            >
              CRM Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, "how-it-works")}
              className="hover:text-emerald-600 transition-colors cursor-pointer"
            >
              How It Works
            </a>
            <a
              href="#calculator"
              onClick={(e) => scrollToSection(e, "calculator")}
              className="hover:text-emerald-600 transition-colors cursor-pointer"
            >
              Loss Calculator
            </a>
            <a
              href="#pricing"
              onClick={(e) => scrollToSection(e, "pricing")}
              className="hover:text-emerald-600 transition-colors cursor-pointer"
            >
              Pricing Plans
            </a>
            <a
              href="#faqs"
              onClick={(e) => scrollToSection(e, "faqs")}
              className="hover:text-emerald-600 transition-colors cursor-pointer"
            >
              FAQs
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://wa.me/233592728838?text=Hello%20GHSUSU,%20I%20need%20a%20guided%20demo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all"
            >
              <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
              <span>0592728838</span>
            </a>

            {session ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm hover:shadow-emerald-600/30 transition-all"
              >
                Go to Portal &rarr;
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all"
                >
                  Get Started Free
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Toggle Menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, "features")}
              className="block py-2 text-slate-700 font-semibold cursor-pointer"
            >
              CRM Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, "how-it-works")}
              className="block py-2 text-slate-700 font-semibold cursor-pointer"
            >
              How It Works
            </a>
            <a
              href="#calculator"
              onClick={(e) => scrollToSection(e, "calculator")}
              className="block py-2 text-slate-700 font-semibold cursor-pointer"
            >
              Loss Calculator
            </a>
            <a
              href="#pricing"
              onClick={(e) => scrollToSection(e, "pricing")}
              className="block py-2 text-slate-700 font-semibold cursor-pointer"
            >
              Pricing Plans
            </a>
            <a
              href="#faqs"
              onClick={(e) => scrollToSection(e, "faqs")}
              className="block py-2 text-slate-700 font-semibold cursor-pointer"
            >
              FAQs
            </a>
            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
              <a
                href="https://wa.me/233592728838"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-2.5 text-sm font-bold text-emerald-800 bg-emerald-50 rounded-lg flex items-center justify-center gap-2"
              >
                <WhatsAppIcon className="w-4 h-4 text-emerald-600" /> WhatsApp (0592728838)
              </a>
              {session ? (
                <Link
                  href="/dashboard"
                  className="w-full text-center py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-lg"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    className="w-full text-center py-2.5 text-sm font-bold border border-slate-300 rounded-lg"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="w-full text-center py-2.5 text-sm font-bold text-white bg-emerald-600 rounded-lg"
                  >
                    Get Started Free
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-white via-slate-50 to-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Value Prop */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-950 border border-emerald-300/80 text-xs font-bold tracking-wide shadow-xs">
                <GhanaFlag className="w-4 h-3" />
                <span>Ghana&apos;s Dedicated Susu & Savings CRM</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.12]">
                Stop Losing Susu Money, Records &{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                  Customer Trust.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                With GHSUSU CRM, manage members, daily contributions, mobilizers, and loan repayments in one simple digital system — built specifically for Ghanaian susu vendors, savings groups & cooperatives.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base shadow-xl shadow-emerald-600/25 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span>Get Started Free</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>

                <a
                  href="https://wa.me/233592728838?text=Hello%20GHSUSU%20CRM,%20I%20want%20to%20see%20a%20live%20demo%20of%20the%20platform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-4 bg-white border border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-800 rounded-xl font-bold text-base flex items-center justify-center gap-2.5 transition-all shadow-sm"
                >
                  <WhatsAppIcon className="w-5 h-5 text-emerald-600" />
                  <span>Help Via WhatsApp</span>
                </a>
              </div>

              {/* Micro Trust Proof */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 font-semibold">
                <div className="flex items-center gap-1.5">
                  <CheckIcon className="w-4 h-4 text-emerald-600" />
                  <span>No credit card needed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckIcon className="w-4 h-4 text-emerald-600" />
                  <span>Works on any smartphone</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckIcon className="w-4 h-4 text-emerald-600" />
                  <span>Free paper record migration</span>
                </div>
              </div>
            </div>

            {/* Right Column: Slanted 3D Perspective Dashboard Preview */}
            <div className="lg:col-span-6 relative">
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                {/* Emerald Ambient Glow */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/30 via-teal-400/20 to-transparent rounded-3xl blur-3xl opacity-70 pointer-events-none" />

                {/* Angled / Slanted Showcase Frame */}
                <div className="relative transition-all duration-500 hover:rotate-0 hover:scale-[1.02] transform -rotate-1 lg:-rotate-2 hover:shadow-2xl">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] bg-slate-950">
                    {/* Window Title Bar */}
                    <div className="bg-slate-900/90 px-4 py-3 flex items-center justify-between border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                        <span className="text-xs font-mono text-slate-400 ml-2">app.ghsusu.com • CRM Dashboard</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono">LIVE CLOUD</span>
                      </div>
                    </div>

                    {/* High-Res Slanted Dashboard Render */}
                    <div className="relative aspect-[16/10] w-full bg-slate-950">
                      <Image
                        src="/ghsusu-dashboard-slant.jpg"
                        alt="GHSUSU CRM Dashboard Preview"
                        fill
                        className="object-cover object-center"
                        priority
                      />
                    </div>
                  </div>

                  {/* Floating Overlay Badge: Instant SMS */}
                  <div className="absolute -bottom-6 -left-6 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 shadow-2xl rounded-2xl p-4 hidden sm:flex items-center gap-3.5 max-w-xs animate-bounce-subtle">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                      <BellSmsIcon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100">Automated SMS Receipts</div>
                      <div className="text-[11px] text-slate-400">Instant delivery to all Ghana networks</div>
                    </div>
                  </div>

                  {/* Floating Overlay Badge: Dispute Free */}
                  <div className="absolute -top-5 -right-5 bg-white text-slate-900 border border-slate-200 shadow-xl rounded-2xl p-3.5 hidden sm:flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                      <ShieldCheckIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">98.5% Dispute Reduction</div>
                      <div className="text-[10px] text-slate-500">Every pesewa audited</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="bg-white border-y border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600">80+</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
                Susu Vendors & Co-ops
              </div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900">GH₵ 6.5M+</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
                Recorded Transactions
              </div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600">98.5%</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
                Dispute Reduction
              </div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900">450k+</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-600 mt-1">
                SMS Receipts Delivered
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Danger of Manual Records (Pain Points) */}
      <section className="py-20 bg-slate-900 text-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-bold tracking-widest text-red-400 uppercase">
              The High Cost of Pen & Paper
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Manual Books & WhatsApp Chats Cost Ghanaian Susu Businesses Money Every Month
            </h2>
            <p className="text-slate-400 text-base sm:text-lg">
              When money is involved, paper notes and memory fail. Even honest collectors lose members and cash because of bad records.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mt-14">
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center font-bold text-2xl">
                ✕
              </div>
              <h3 className="text-lg font-bold text-white">Lost & Wet Books</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Paper gets rained on at market stalls, chewed by insects, or misplaced. One lost booklet can wipe out months of proof.
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-2xl">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-white">Calculation Errors</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Adding up hundreds of GH₵ 20, 50, and 100 entries at 9pm results in fatigue and math mistakes that come out of your own pocket.
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-2xl">
                🗣️
              </div>
              <h3 className="text-lg font-bold text-white">&quot;I Paid Already&quot; Lies</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Clients swear they handed cash to your collector last Tuesday. Without timestamped SMS receipts, you risk shouting matches or losing customers.
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-2xl">
                🛡️
              </div>
              <h3 className="text-lg font-bold text-white">Mobilizer Temptation</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Field collectors collecting cash without real-time supervisory audit face temptation. GHSUSU CRM tracks every collector in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Paper Loss Calculator */}
      <section id="calculator" className="py-20 bg-emerald-950 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center space-y-3 mb-12">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              Interactive ROI Calculator
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              How Much Money Is Your Susu Operation Leaking?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base">
              Slide your numbers below to see the hidden cost of paper, math disputes, and missing slips.
            </p>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Sliders */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm font-bold mb-2">
                    <span className="text-slate-300">Number of Members / Clients:</span>
                    <span className="text-emerald-400 font-extrabold text-base">{membersCount} members</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="1000"
                    step="10"
                    value={membersCount}
                    onChange={(e) => setMembersCount(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>20 members</span>
                    <span>1,000 members</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-bold mb-2">
                    <span className="text-slate-300">Average Daily Contribution (GH₵):</span>
                    <span className="text-emerald-400 font-extrabold text-base">GH₵ {dailyContribution} / day</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={dailyContribution}
                    onChange={(e) => setDailyContribution(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>GH₵ 10</span>
                    <span>GH₵ 200</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span>Estimated Monthly Cash Flow:</span>
                    <span className="font-bold text-white">GH₵ {monthlyVolume.toLocaleString()}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Based on 25 collection days per month
                  </div>
                </div>
              </div>

              {/* Calculated Results */}
              <div className="bg-gradient-to-br from-emerald-900/60 to-slate-900 border border-emerald-500/40 rounded-2xl p-6 sm:p-8 text-center space-y-4">
                <span className="text-xs uppercase font-extrabold tracking-wider text-amber-300 block">
                  Estimated Leaks From Manual Errors
                </span>
                <div className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight">
                  GH₵ {estimatedPaperLoss.toLocaleString()}
                  <span className="text-sm font-normal text-slate-400 block mt-1">lost per month</span>
                </div>
                <div className="text-lg font-bold text-white">
                  = GH₵ {annualLoss.toLocaleString()} Every Year!
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  That is money you could use to expand your branch, hire reliable mobilizers, or buy office equipment.
                </p>

                <Link
                  href="/signup"
                  className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 text-center block"
                >
                  Eliminate Losses With GHSUSU CRM &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core CRM Modules Breakdown */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
              Built For African Financial Realities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Five Power CRM Modules In One Unified System
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              Everything your susu enterprise or savings association needs to scale with zero headaches.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-2xl mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                💰
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Daily Susu & Savings CRM</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Record daily market contributions in seconds on any phone. Automatic calculation of commission fees and end-of-month payouts.
              </p>
              <ul className="text-xs text-slate-600 space-y-2 font-medium">
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Instant deposit & withdrawal slips
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Automatic monthly fee deductions
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Real-time member balances
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-2xl mb-6 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                📱
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Automated SMS Receipts</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Pre-configured with direct telecom delivery pipelines. Every transaction automatically notifies the customer on MTN, Telecel, or AT within 2 seconds.
              </p>
              <ul className="text-xs text-slate-600 space-y-2 font-medium">
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Custom Sender ID (e.g. &apos;VERKWA&apos;)
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Instant deposit & withdrawal proof
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Automatic loan due date reminders
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                👥
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Mobilizer & Staff CRM</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Empower your agents to collect payments in market stalls while keeping full administrative control. Assign zones and monitor collections.
              </p>
              <ul className="text-xs text-slate-600 space-y-2 font-medium">
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Collector-tagged transaction logs
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Real-time daily cash tally by agent
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Granular role permissions
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-2xl mb-6 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                📑
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Loan Origination & Repayments</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Disburse business and micro-loans with confidence. Automated amortization schedules, interest calculators, and default tracking.
              </p>
              <ul className="text-xs text-slate-600 space-y-2 font-medium">
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Customizable interest rates & terms
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Track overdue and default risks
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> SMS payment prompts to borrowers
                </li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-2xl mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                🏦
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Vault & Cash Reconciliation</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Answer the question every manager asks: &quot;Where is the physical cash?&quot; Match physical handovers with system tallies at the close of every day.
              </p>
              <ul className="text-xs text-slate-600 space-y-2 font-medium">
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Daily teller till reconciliations
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Bank deposit tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Complete financial audit trails
                </li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-2xl mb-6 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                📄
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Instant PDF & Passbook Reports</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Generate professional financial statements, client passbooks, and monthly profit summaries in one click to share with executives or auditors.
              </p>
              <ul className="text-xs text-slate-600 space-y-2 font-medium">
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Branded PDF passbook statements
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Excel export for custom analysis
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" /> Executive summary dashboards
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-100 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
              Simple 3-Step Setup
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Get Started In Less Than 5 Minutes
            </h2>
            <p className="text-slate-600 text-base">
              No technical expertise needed. If you know how to use WhatsApp, you will find GHSUSU CRM effortlessly easy.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-lg mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Sign Up Your Enterprise</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Click &quot;Get Started Free&quot;, enter your Susu enterprise name, and receive instant access to your private CRM dashboard.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-lg mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Add Members & Mobilizers</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Add your clients or import your existing paper list. Give your field agents logins so they can record payments on the go.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm relative">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-lg mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Record & Auto-SMS Alerts</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Type in daily deposits. The system instantly dispatches an official SMS receipt to the member and updates your central vault balance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audiences */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
              Who Is GHSUSU CRM Built For?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Tailored For Groups & Financial Vendors
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="text-3xl">🏪</div>
              <h3 className="font-bold text-slate-900 text-lg">Susu Vendors & Mobilizers</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Individual collectors and registered enterprises collecting daily market savings.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="text-3xl">🤝</div>
              <h3 className="font-bold text-slate-900 text-lg">Market Associations & Traders</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Fishmongers, cloth sellers, and transport unions pooling rotational or welfare funds.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="text-3xl">⛪</div>
              <h3 className="font-bold text-slate-900 text-lg">Church & Mosque Welfare Groups</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Religious associations managing monthly member dues, welfare funds, and emergency relief.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="text-3xl">📈</div>
              <h3 className="font-bold text-slate-900 text-lg">Micro-Credit & Cooperatives</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Registered credit unions and informal money lenders needing automated loan schedules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-900 text-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              Transparent Ghanaian Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Start Free. Upgrade Only As Your Business Grows.
            </h2>
            <p className="text-slate-400 text-base">
              No hidden fees. Mobile Money (MTN, Telecel, AT) accepted. Cancel or change plan anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 items-stretch">
            {/* Free Tier */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                  Forever Free
                </span>
                <div className="text-3xl font-black text-white">GH₵ 0</div>
                <div className="text-xs text-slate-400 mt-1">Free forever — No credit card needed</div>

                <div className="my-6 border-t border-slate-700/80" />

                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Up to <strong>50 members</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Up to <strong>3 staff/mobilizers</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>1 branch enabled</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Core Susu savings module</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Pay-as-you-go SMS (GH₵ 0.04/unit)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>WhatsApp support</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/signup"
                className="w-full mt-8 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs text-center transition-colors block"
              >
                Get Started Free
              </Link>
            </div>

            {/* Small / Starter */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 block mb-2">
                  Starter Plan
                </span>
                <div className="text-3xl font-black text-white">
                  GH₵ 75 <span className="text-xs font-normal text-slate-400">/month</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">Perfect for solo collectors</div>

                <div className="my-6 border-t border-slate-700/80" />

                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Up to <strong>200 members</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span><strong>100 free SMS</strong> included/mo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Unlimited staff & collectors</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Loans & Vault modules</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>1 branch</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>PDF statements & exports</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/login"
                className="w-full mt-8 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs text-center transition-colors shadow-lg shadow-emerald-600/20 block"
              >
                Log In to Upgrade
              </Link>
              <p className="text-[10px] text-slate-500 text-center mt-2">Sign up free first, then upgrade from your dashboard</p>
            </div>

            {/* Growth Tier (Featured) */}
            <div className="bg-gradient-to-b from-emerald-950 to-slate-900 border-2 border-emerald-500 rounded-3xl p-6 flex flex-col justify-between relative shadow-2xl shadow-emerald-500/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] uppercase font-black px-3 py-1 rounded-full tracking-wider shadow">
                MOST POPULAR
              </div>

              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300 block mb-2">
                  Growth Plan
                </span>
                <div className="text-3xl font-black text-white">
                  GH₵ 180 <span className="text-xs font-normal text-slate-400">/month</span>
                </div>
                <div className="text-xs text-emerald-300 mt-1">For growing Susu enterprises</div>

                <div className="my-6 border-t border-emerald-800/80" />

                <ul className="space-y-3 text-xs text-slate-200">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Up to <strong>600 members</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span><strong>350 free SMS</strong> included/mo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Up to <strong>3 branches</strong> enabled</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Collector performance analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Custom SMS Sender ID</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Priority WhatsApp hotline</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/login"
                className="w-full mt-8 py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs text-center transition-all shadow-lg shadow-emerald-500/25 block"
              >
                Log In to Upgrade
              </Link>
              <p className="text-[10px] text-emerald-400/60 text-center mt-2">Sign up free first, then upgrade from your dashboard</p>
            </div>

            {/* Enterprise Tier */}
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-teal-400 block mb-2">
                  Enterprise
                </span>
                <div className="text-3xl font-black text-white">
                  GH₵ 450 <span className="text-xs font-normal text-slate-400">/month</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">For established microfinances & unions</div>

                <div className="my-6 border-t border-slate-700/80" />

                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span><strong>Unlimited members</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span><strong>1,000 free SMS</strong> included/mo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span><strong>Unlimited branches</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Dedicated account onboarding manager</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Free on-site staff training</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>Automated daily ledger backup</span>
                  </li>
                </ul>
              </div>

              <a
                href="https://wa.me/233592728838?text=Hello%20GHSUSU%20CRM,%20I%20am%20interested%20in%20the%20Enterprise%20Plan"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-8 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-xs text-center transition-colors block"
              >
                Contact Enterprise Sales
              </a>
            </div>
          </div>

          <div className="mt-12 text-center text-xs text-slate-400">
            * Extra SMS cost only GH₵ 0.035 per unit. Instant Mobile Money top-up inside your CRM portal.
          </div>
        </div>
      </section>

      {/* Free Migration & Onboarding Promise */}
      <section className="py-16 bg-emerald-50 border-y border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-emerald-200/80 shadow-lg grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
                Hands-on Assistance
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Worried About Moving Your Paper Records? We Do It For You Free.
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Take photos of your current Susu book or send us your Excel file. Our team in Accra will format and import all your client balances into your secure GHSUSU CRM portal at zero cost.
              </p>
              <div className="pt-2">
                <a
                  href="https://wa.me/233592728838?text=Hello%20GHSUSU,%20please%20help%20me%20migrate%20my%20susu%20paper%20records"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md"
                >
                  <WhatsAppIcon className="w-5 h-5 text-white" />
                  <span>Request Free Paper Record Transfer</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                <div className="text-emerald-700 font-extrabold text-lg mb-1">100% Free</div>
                <div className="text-xs text-slate-600">No migration fee, regardless of member count.</div>
              </div>
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                <div className="text-emerald-700 font-extrabold text-lg mb-1">24-Hour Turnaround</div>
                <div className="text-xs text-slate-600">Your portal is ready for collections the next day.</div>
              </div>
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                <div className="text-emerald-700 font-extrabold text-lg mb-1">Agent Phone Setup</div>
                <div className="text-xs text-slate-600">We train your mobilizers via WhatsApp or phone call.</div>
              </div>
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                <div className="text-emerald-700 font-extrabold text-lg mb-1">Confidential & Safe</div>
                <div className="text-xs text-slate-600">Your member phone numbers are encrypted & private.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faqs" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-16">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Everything you need to know about GHSUSU and our multi-tenant CRM platform.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 text-base mb-2">
                Will my competitors or other Susu companies see my members or balances?
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                <strong>Never.</strong> Every Susu company gets an isolated enterprise portal with Row-Level Security encryption. Your records, client phone numbers, and cash ledger are completely isolated and confidential.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 text-base mb-2">
                Can my mobilizers record payments on basic Android phones with poor internet?
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Yes! GHSUSU CRM is built mobile-first and optimized for lightweight data consumption on Ghanaian 3G/4G networks. Field collectors can bookmark it directly to their home screen as a Web App.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 text-base mb-2">
                How does SMS work? Do I need any external account or technical setup?
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                You do <strong>not</strong> need any external setup or technical knowledge! GHSUSU CRM comes with direct built-in telecom SMS delivery. You can easily register your custom business name (Sender ID) so every SMS arrives directly under your company brand.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 text-base mb-2">
                How do I pay for subscriptions and SMS top-ups?
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                We accept all Ghanaian Mobile Money networks (MTN MoMo, Telecel Cash, AT Money) and debit cards seamlessly. Top-ups reflect immediately in your balance.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 text-base mb-2">
                Is the Free Plan truly free forever?
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Yes. If you have 50 members or fewer, you can run your Susu business on the Free Plan for as long as you want with zero time limits or surprise charges.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 bg-gradient-to-tr from-emerald-900 via-emerald-800 to-teal-900 text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs uppercase font-extrabold px-3 py-1 rounded-full tracking-wider">
            Transform Your Susu Operations Today
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Ready To Manage Susu Without Stress & Disputes?
          </h2>
          <p className="text-slate-200 text-base sm:text-lg max-w-2xl mx-auto">
            Join forward-thinking Susu vendors across Ghana who are automating their collections and doubling their client trust with GHSUSU CRM.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 bg-white text-emerald-950 hover:bg-slate-100 rounded-xl font-black text-base shadow-xl transition-all"
            >
              Get Started Free &rarr;
            </Link>
            <a
              href="https://wa.me/233592728838?text=Hello%20GHSUSU%20CRM,%20let's%20get%20started"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-4 bg-emerald-950/60 border border-emerald-500/40 text-white rounded-xl font-bold text-base hover:bg-emerald-900/80 flex items-center justify-center gap-2 transition-all"
            >
              <WhatsAppIcon className="w-5 h-5 text-emerald-400" />
              <span>Chat With Us on WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 text-xs py-14 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-emerald-500/30">
                <Image
                  src="/ghsusu-logo.jpg"
                  alt="GHSUSU CRM Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-xl font-black text-white">
                GH<span className="text-emerald-500">SUSU</span>
                <span className="text-xs font-mono text-emerald-400 ml-1">CRM</span>
              </span>
            </div>
            <p className="text-slate-400 max-w-sm leading-relaxed">
              Ghana&apos;s leading digital Susu management & CRM software. Powering informal financial vendors, market associations, cooperatives, and welfare groups with automated SMS and dispute-free ledgers.
            </p>
            <div className="text-slate-400 pt-2 space-y-1.5 font-medium">
              <div className="flex items-center gap-2">
                <GhanaFlag className="w-4 h-2.5" />
                <span>Accra, Ghana</span>
              </div>
              <div>📞 0592728838 / 0538948322</div>
              <div>✉️ support@ghsusu.com</div>
            </div>
          </div>

          <div>
            <div className="font-bold text-white uppercase tracking-wider mb-3">Product</div>
            <ul className="space-y-2">
              <li><a href="#features" onClick={(e) => scrollToSection(e, "features")} className="hover:text-emerald-400 cursor-pointer">CRM Features</a></li>
              <li><a href="#how-it-works" onClick={(e) => scrollToSection(e, "how-it-works")} className="hover:text-emerald-400 cursor-pointer">How It Works</a></li>
              <li><a href="#calculator" onClick={(e) => scrollToSection(e, "calculator")} className="hover:text-emerald-400 cursor-pointer">Loss Calculator</a></li>
              <li><a href="#pricing" onClick={(e) => scrollToSection(e, "pricing")} className="hover:text-emerald-400 cursor-pointer">Pricing & Plans</a></li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white uppercase tracking-wider mb-3">Solutions</div>
            <ul className="space-y-2">
              <li><span className="hover:text-emerald-400">Susu Vendors</span></li>
              <li><span className="hover:text-emerald-400">Market Groups</span></li>
              <li><span className="hover:text-emerald-400">Church Welfare</span></li>
              <li><span className="hover:text-emerald-400">Microfinance CRM</span></li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white uppercase tracking-wider mb-3">Support & Contact</div>
            <ul className="space-y-2">
              <li><a href="https://wa.me/233592728838" className="hover:text-emerald-400">WhatsApp: 0592728838</a></li>
              <li><a href="tel:0538948322" className="hover:text-emerald-400">Call: 0538948322</a></li>
              <li><a href="#faqs" onClick={(e) => scrollToSection(e, "faqs")} className="hover:text-emerald-400 cursor-pointer">FAQs</a></li>
              <li><span className="hover:text-emerald-400">Privacy Policy</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            &copy; {new Date().getFullYear()} GHSUSU CRM (ghsusu.com). All rights reserved.
          </div>
          <div className="flex items-center gap-2">
            <GhanaFlag className="w-4 h-2.5" />
            <span>Built with pride in Ghana for Africa</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

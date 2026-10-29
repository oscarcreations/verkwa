"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function BridgeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    async function transferSession() {
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");
      const nextUrl = searchParams.get("next") || "/dashboard";

      if (accessToken && refreshToken) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.error("Failed to set transferred session:", error);
          }
        } catch (err) {
          console.error("Failed to set transferred session:", err);
        }
      }

      // Clean browser history so tokens never linger in the browser's back/forward history
      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title, nextUrl);
        window.location.replace(nextUrl);
      }
    }

    transferSession();
  }, [searchParams, router, supabase.auth]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
      <div className="w-9 h-9 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
        Opening your enterprise portal...
      </p>
    </div>
  );
}

export default function AuthTransferPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
          <div className="w-9 h-9 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Opening your enterprise portal...
          </p>
        </div>
      }
    >
      <BridgeContent />
    </Suspense>
  );
}


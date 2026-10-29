import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { extractTenantSubdomain } from "@/lib/tenant";

export function getCookieDomainFromHost(host: string | null | undefined): string | undefined {
  if (!host) return undefined;
  const hostname = host.split(":")[0].toLowerCase();

  if (hostname.endsWith(".ghsusu.com") || hostname === "ghsusu.com") {
    return ".ghsusu.com";
  }

  if (hostname.endsWith(".lvh.me") || hostname === "lvh.me") {
    return ".lvh.me";
  }

  return undefined;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const host = request.headers.get("host");
  const cookieDomain = getCookieDomainFromHost(host);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: cookieDomain
        ? {
            domain: cookieDomain,
            path: "/",
            sameSite: "lax",
          }
        : undefined,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              ...(cookieDomain ? { domain: cookieDomain } : {}),
            })
          );
        },
      },
    }
  );

  // Refresh auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tenantSubdomain = extractTenantSubdomain(host);
  const pathname = request.nextUrl.pathname;

  // Exempt auth bridge from redirects
  if (pathname.startsWith("/auth/bridge") || pathname.startsWith("/api/auth")) {
    return supabaseResponse;
  }

  // 1. SUBDOMAIN ROOT HANDLING:
  // If user visits http://verkwa-susu.localhost:3000/ (root of their subdomain)
  if (tenantSubdomain && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/dashboard" : "/login";
    return NextResponse.rewrite(url);
  }

  // 2. Protect /dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // 3. If already logged in, redirect away from /login and /signup
  if ((pathname === "/login" || pathname === "/signup") && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Pass tenant subdomain down in headers so server components and layouts can read it
  if (tenantSubdomain) {
    supabaseResponse.headers.set("x-tenant-subdomain", tenantSubdomain);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

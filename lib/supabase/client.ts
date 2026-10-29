import { createBrowserClient } from "@supabase/ssr";

/**
 * Returns the cookie domain so cookies can be shared across subdomains.
 * In production (*.ghsusu.com): ".ghsusu.com"
 * In local development with lvh.me (*.lvh.me): ".lvh.me"
 * For standard localhost (which doesn't allow shared subdomain cookies per RFC 6265): undefined
 */
export function getCookieDomain(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const hostname = window.location.hostname;
  
  if (hostname.endsWith(".ghsusu.com") || hostname === "ghsusu.com") {
    return ".ghsusu.com";
  }
  
  if (hostname.endsWith(".lvh.me") || hostname === "lvh.me") {
    return ".lvh.me";
  }

  return undefined;
}

export function createClient() {
  const cookieDomain = getCookieDomain();

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    cookieDomain
      ? {
          cookieOptions: {
            domain: cookieDomain,
            path: "/",
            sameSite: "lax",
          },
        }
      : undefined
  );
}

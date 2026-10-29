/**
 * Slug sanitizer and helper utilities for GHSUSU multi-tenant subdomains.
 * Handles cases like:
 * - "Verkwa Susu"    -> "verkwa-susu"
 * - "Verkwa-Susu"    -> "verkwa-susu"
 * - "VERKWA   SUSU"  -> "verkwa-susu"
 * - "Verkwa & Sons"  -> "verkwa-sons"
 * - "  -verkwa- "    -> "verkwa"
 */
export function slugifyTenant(input: string): string {
  if (!input) return "";

  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "") // remove special characters like @, #, $, %, &, etc.
    .replace(/[\s_]+/g, "-") // replace spaces and underscores with a single hyphen
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // trim leading and trailing hyphens
}

/**
 * Extracts the tenant subdomain from a hostname.
 * Examples:
 * - "verkwa-susu.localhost:3000" -> "verkwa-susu"
 * - "verkwa-susu.ghsusu.com"     -> "verkwa-susu"
 * - "localhost:3000"             -> null
 * - "ghsusu.com"                 -> null
 * - "www.ghsusu.com"             -> null
 * - "app.ghsusu.com"             -> null
 */
export function extractTenantSubdomain(host: string | null | undefined): string | null {
  if (!host) return null;

  // Remove port if present (e.g. "verkwa-susu.localhost:3000" -> "verkwa-susu.localhost")
  const hostname = host.split(":")[0].toLowerCase();

  // Root or standard top-level domains without subdomains
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "ghsusu.com" ||
    hostname === "www.ghsusu.com" ||
    hostname === "app.ghsusu.com"
  ) {
    return null;
  }

  // Handle *.localhost (e.g., verkwa-susu.localhost)
  if (hostname.endsWith(".localhost")) {
    const parts = hostname.replace(".localhost", "").split(".");
    const sub = parts[parts.length - 1];
    return sub && sub !== "www" && sub !== "app" ? sub : null;
  }

  // Handle *.lvh.me (wildcard localhost loopback service)
  if (hostname.endsWith(".lvh.me")) {
    const parts = hostname.replace(".lvh.me", "").split(".");
    const sub = parts[parts.length - 1];
    return sub && sub !== "www" && sub !== "app" ? sub : null;
  }

  // Handle production: *.ghsusu.com
  if (hostname.endsWith(".ghsusu.com")) {
    const parts = hostname.replace(".ghsusu.com", "").split(".");
    const sub = parts[parts.length - 1];
    return sub && sub !== "www" && sub !== "app" ? sub : null;
  }

  return null;
}

/**
 * Constructs the redirect URL to the enterprise subdomain.
 * In development: http://[subdomain].localhost:3000[path]
 * In production:  https://[subdomain].ghsusu.com[path]
 */
export function getTenantSubdomainUrl(
  subdomain: string,
  pathname: string = "/dashboard",
  reqHost?: string
): string {
  const isLocal =
    !reqHost ||
    reqHost.includes("localhost") ||
    reqHost.includes("127.0.0.1") ||
    process.env.NODE_ENV !== "production";

  const cleanSub = slugifyTenant(subdomain);
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (isLocal) {
    return `http://${cleanSub}.localhost:3000${path}`;
  }

  return `https://${cleanSub}.ghsusu.com${path}`;
}

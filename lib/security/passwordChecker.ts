/**
 * Password Security & Breach Detection Utility
 * Uses the industry standard HaveIBeenPwned k-Anonymity API (v3)
 * No full passwords are ever sent over the network:
 * Only the first 5 characters of the SHA-1 hash are queried.
 */

export interface PasswordCriteria {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function evaluatePasswordCriteria(pwd: string): PasswordCriteria {
  return {
    minLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[^A-Za-z0-9]/.test(pwd),
  };
}

export function calculatePasswordStrength(criteria: PasswordCriteria): {
  score: number; // 0 to 4
  label: "Weak" | "Fair" | "Good" | "Strong";
  color: string;
} {
  let count = 0;
  if (criteria.minLength) count++;
  if (criteria.hasUpper && criteria.hasLower) count++;
  if (criteria.hasNumber) count++;
  if (criteria.hasSpecial) count++;

  if (count <= 1) return { score: 1, label: "Weak", color: "text-red-500 bg-red-500" };
  if (count === 2) return { score: 2, label: "Fair", color: "text-amber-500 bg-amber-500" };
  if (count === 3) return { score: 3, label: "Good", color: "text-blue-500 bg-blue-500" };
  return { score: 4, label: "Strong", color: "text-emerald-500 bg-emerald-500" };
}

/**
 * Computes SHA-1 hash of a string using Web Crypto API
 */
async function sha1(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-1", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

/**
 * Checks if a password has appeared in known public data breaches
 * using the official HaveIBeenPwned Passwords API with k-Anonymity.
 * Returns breach count (0 if clean, >0 if breached).
 */
export async function checkPasswordBreach(password: string): Promise<{
  isBreached: boolean;
  count: number;
}> {
  if (!password || password.length < 4) {
    return { isBreached: false, count: 0 };
  }

  try {
    const hash = await sha1(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    // Call HIBP k-Anonymity endpoint with 5-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: "GET",
      headers: {
        "Add-Padding": "true", // Privacy padding
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Fallback silently if HIBP service has temporary downtime
      return { isBreached: false, count: 0 };
    }

    const text = await response.text();
    const lines = text.split("\r\n");

    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(":");
      if (hashSuffix && hashSuffix.trim().toUpperCase() === suffix) {
        const count = parseInt(countStr || "0", 10);
        return { isBreached: count > 0, count };
      }
    }

    return { isBreached: false, count: 0 };
  } catch (err) {
    // If offline or blocked by browser adblockers, don't break signup
    console.warn("HIBP breach check skipped:", err);
    return { isBreached: false, count: 0 };
  }
}

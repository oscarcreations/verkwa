/**
 * SMS utility helpers for formatting transaction alert messages.
 * The actual Arkesel API call happens server-side via /api/sms/send.
 */

/**
 * Mask an account number for security.
 * e.g. "S-O1234567925" → "S-Oxxxxxx925"
 */
export function maskAccountNumber(accountNum: string): string {
  if (!accountNum || accountNum.length <= 6) return accountNum;
  const prefix = accountNum.slice(0, 3);
  const suffix = accountNum.slice(-3);
  const masked = "x".repeat(accountNum.length - 6);
  return `${prefix}${masked}${suffix}`;
}

/**
 * Format a date for SMS display.
 * e.g. "29 Sep 2026, 11:30"
 */
export function formatSmsDate(date: Date): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

/**
 * Build a deposit SMS alert message.
 */
export function buildDepositSms(params: {
  amount: number;
  accountNum: string;
  balance: number;
  businessName?: string;
  date?: Date;
}): string {
  const { amount, accountNum, balance, businessName, date } = params;
  const d = date || new Date();
  return [
    `Deposit Alert.`,
    `Amount: GHS ${amount.toFixed(2)}`,
    `Date: ${formatSmsDate(d)}`,
    `A/C: ${maskAccountNumber(accountNum)}`,
    `Balance: GHS ${balance.toFixed(2)}`,
    `Thank you for saving with us.`,
    businessName ? `- ${businessName}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Build a withdrawal SMS alert message.
 */
export function buildWithdrawalSms(params: {
  amount: number;
  accountNum: string;
  balance: number;
  businessName?: string;
  date?: Date;
}): string {
  const { amount, accountNum, balance, businessName, date } = params;
  const d = date || new Date();
  return [
    `Withdrawal Alert.`,
    `Amount: GHS ${amount.toFixed(2)}`,
    `Date: ${formatSmsDate(d)}`,
    `A/C: ${maskAccountNumber(accountNum)}`,
    `Balance: GHS ${balance.toFixed(2)}`,
    `Thank you for saving with us.`,
    businessName ? `- ${businessName}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Send an SMS via the server-side API route.
 * This calls /api/sms/send which proxies the request to Arkesel,
 * keeping the API key secure on the server.
 */
export async function sendTransactionSms(params: {
  phone: string;
  message: string;
  sender?: string;
  customerId?: string;
  type?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: params.phone,
        message: params.message,
        sender: params.sender,
        customerId: params.customerId,
        type: params.type || "Account",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || "SMS send failed" };
    }

    return { success: true };
  } catch (err: any) {
    console.error("SMS send error:", err);
    return { success: false, error: err.message };
  }
}

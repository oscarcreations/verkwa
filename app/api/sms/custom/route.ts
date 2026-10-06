import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const ARKESEL_API_URL = "https://sms.arkesel.com/api/v2/sms/send";

function normalisePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("233") && cleaned.length >= 12) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+233${cleaned.slice(1)}`;
  return `+233${cleaned}`;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ARKESEL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "SMS service is not configured" }, { status: 500 });
    }

    const { message, customerIds, sender } = await req.json();

    if (!message || !customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json({ error: "Message and customerIds are required" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch customers
    const { data: customers } = await supabase
      .from("customers")
      .select("id, phone, mobile_number, allow_sms")
      .in("id", customerIds);

    if (!customers || customers.length === 0) {
      return NextResponse.json({ error: "No valid customers found" }, { status: 404 });
    }

    const validCustomers = customers.filter(c => 
      c.allow_sms !== false && (c.phone || c.mobile_number)
    );

    if (validCustomers.length === 0) {
      return NextResponse.json({ success: true, message: "No customers with valid phone numbers or SMS allowed." });
    }

    let senderName = sender;
    if (!senderName) {
      try {
        const { data: settings } = await supabase.from("settings").select("sms_name").limit(1).maybeSingle();
        senderName = settings?.sms_name || "Verkwa";
      } catch {
        senderName = "Verkwa";
      }
    }

    const recipients = validCustomers.map(c => normalisePhone(c.phone || c.mobile_number));
    const uniqueRecipients = Array.from(new Set(recipients));

    // Send via Arkesel
    const arkeselRes = await fetch(ARKESEL_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: senderName,
        message,
        recipients: uniqueRecipients,
      }),
    });

    const arkeselData = await arkeselRes.json();
    const isSuccess = arkeselRes.ok;

    // Log to DB
    try {
      const logsToInsert = validCustomers.map(c => ({
        customer_id: c.id,
        phone: normalisePhone(c.phone || c.mobile_number),
        message: message,
        type: "Custom",
        status: isSuccess ? "sent" : "rejected"
      }));
      await supabase.from("sms_logs").insert(logsToInsert);
    } catch (dbErr) {
      console.error("Failed to log custom SMS:", dbErr);
    }

    if (!isSuccess) {
      return NextResponse.json({ error: "Failed to send SMS", details: arkeselData }, { status: arkeselRes.status });
    }

    return NextResponse.json({ success: true, count: uniqueRecipients.length });
  } catch (error: any) {
    console.error("Custom SMS route error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

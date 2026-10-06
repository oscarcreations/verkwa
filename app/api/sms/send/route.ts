import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const ARKESEL_API_URL = "https://sms.arkesel.com/api/v2/sms/send";

/**
 * Normalise a Ghanaian phone number to international format (+233...).
 * Handles inputs like "0591200344", "233591200344", "+233591200344".
 */
function normalisePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");

  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  if (cleaned.startsWith("233") && cleaned.length >= 12) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith("0")) {
    return `+233${cleaned.slice(1)}`;
  }
  return `+233${cleaned}`;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ARKESEL_API_KEY;

    if (!apiKey) {
      console.error("ARKESEL_API_KEY is not configured");
      return NextResponse.json(
        { error: "SMS service is not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { phone, message, sender, customerId, type } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { error: "Phone and message are required" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // If a customerId is provided, check if they are allowed to receive SMS
    if (customerId) {
      const { data: customer } = await supabase
        .from("customers")
        .select("allow_sms")
        .eq("id", customerId)
        .single();
      
      if (customer && customer.allow_sms === false) {
        return NextResponse.json({ success: true, skipped: true, reason: "Customer deactivated SMS" });
      }
    }

    // If no sender override is provided, look up the SMS name from settings
    let senderName = sender;
    if (!senderName) {
      try {
        const { data: settings } = await supabase
          .from("settings")
          .select("sms_name")
          .limit(1)
          .maybeSingle();
        senderName = settings?.sms_name || "Verkwa";
      } catch {
        senderName = "Verkwa";
      }
    }

    // Normalise the phone number to international format
    const recipient = normalisePhone(phone);

    // Call the Arkesel API
    const arkeselRes = await fetch(ARKESEL_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: senderName,
        message,
        recipients: [recipient],
      }),
    });

    const arkeselData = await arkeselRes.json();

    const isSuccess = arkeselRes.ok;
    
    // Log the SMS in our database
    try {
      await supabase.from("sms_logs").insert([{
        customer_id: customerId || null,
        phone: recipient,
        message: message,
        type: type || "Account",
        status: isSuccess ? "sent" : "rejected"
      }]);
    } catch (dbErr) {
      console.error("Failed to log SMS to DB:", dbErr);
    }

    if (!isSuccess) {
      console.error("Arkesel API error:", arkeselData);
      return NextResponse.json(
        { error: "Failed to send SMS", details: arkeselData },
        { status: arkeselRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: arkeselData,
    });
  } catch (error: any) {
    console.error("SMS route error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

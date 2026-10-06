import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.ARKESEL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Arkesel API key not configured" }, { status: 500 });
    }

    const res = await fetch(`https://sms.arkesel.com/sms/api?action=check-balance&api_key=${apiKey}&response=json`, {
      method: "GET",
      cache: 'no-store'
    });

    const data = await res.json();
    
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch balance", details: data }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

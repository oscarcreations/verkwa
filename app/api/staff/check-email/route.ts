import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ available: false, error: "Please enter a valid email format" });
    }

    const supabase = await createServerSupabaseClient();

    // Check if email already belongs to a staff member in the system
    const { data: staffMatch } = await supabase
      .from("staff")
      .select("id, organization_id")
      .ilike("email", email)
      .maybeSingle();

    if (staffMatch) {
      return NextResponse.json({
        available: false,
        message: "This email address is already registered to an existing staff member in the system",
      });
    }

    return NextResponse.json({ available: true, message: "Email is available" });
  } catch (err: any) {
    return NextResponse.json({ available: false, error: err.message }, { status: 500 });
  }
}

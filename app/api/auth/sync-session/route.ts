import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  try {
    const { access_token, refresh_token, redirect_url } = await req.json();

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: "Missing tokens" }, { status: 400 });
    }

    const host = req.headers.get("host");
    const response = NextResponse.json({ success: true, redirect_url });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.headers.get("cookie")
              ? req.headers
                  .get("cookie")!
                  .split("; ")
                  .map((c) => {
                    const [name, ...val] = c.split("=");
                    return { name, value: val.join("=") };
                  })
              : [];
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, {
                ...options,
                path: "/",
                sameSite: "lax",
              });
            });
          },
        },
      }
    );

    await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

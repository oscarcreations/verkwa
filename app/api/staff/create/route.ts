import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    // 1. Authenticate caller using server supabase client
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authUser = session.user;

    // 2. Resolve caller's organization and authority
    const { data: callerStaff } = await supabase
      .from("staff")
      .select("id, role, organization_id")
      .or(`user_id.eq.${authUser.id},email.eq.${authUser.email}`)
      .maybeSingle();

    const roleLower = (callerStaff?.role || "").toLowerCase();
    const isAuthorized = ["superadmin", "administrator", "admin", "manager"].includes(roleLower);

    if (!callerStaff || !isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to add staff members" },
        { status: 403 }
      );
    }

    const orgId = callerStaff.organization_id;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization context missing" },
        { status: 400 }
      );
    }

    // 3. Parse and validate request body
    const body = await req.json();
    const {
      first_name,
      last_name,
      email,
      phone,
      role = "Employee",
      branch_id,
      ghana_card_number,
      photo_url,
      residential_address,
      date_of_birth,
      emergency_contact_name,
      emergency_contact_phone,
      permissions = {},
      temporary_password,
    } = body;

    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "First name, last name, and valid email are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if email is already registered to ANY staff member in the system
    const { data: existingStaff } = await supabase
      .from("staff")
      .select("id, organization_id")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (existingStaff) {
      if (existingStaff.organization_id === orgId) {
        return NextResponse.json(
          { error: "A staff member with this email address already exists in your organization" },
          { status: 409 }
        );
      } else {
        return NextResponse.json(
          { error: "This email address is already registered to an existing staff member in the system" },
          { status: 409 }
        );
      }
    }

    // 4. Create staff auth user account
    const tempPassword = temporary_password || `Verkwa@${Math.floor(1000 + Math.random() * 9000)}`;
    let createdUserId: string | null = null;

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (serviceKey) {
      // ── Option A: Use Supabase Service Role Admin API (Preferred & Instant) ──
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

      const { data: authResult, error: authError } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: tempPassword,
        email_confirm: true, // Automatically marks email as confirmed so employee can log in immediately
        user_metadata: {
          full_name: `${first_name.trim()} ${last_name.trim()}`,
          phone: phone?.trim() || "",
          role: role,
          organization_id: orgId,
          must_change_password: true,
        },
      });

      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already in use") || msg.includes("duplicate")) {
          // User already exists in auth.users - find and link their ID, update password to temporary password
          const { data: listData } = await adminClient.auth.admin.listUsers();
          const existingUser = listData?.users?.find(
            (u) => u.email?.toLowerCase() === cleanEmail
          );

          if (existingUser) {
            await adminClient.auth.admin.updateUserById(existingUser.id, {
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                full_name: `${first_name.trim()} ${last_name.trim()}`,
                phone: phone?.trim() || "",
                role: role,
                organization_id: orgId,
                must_change_password: true,
              },
            });
            createdUserId = existingUser.id;
          } else {
            return NextResponse.json(
              { error: "This email address is already registered in authentication." },
              { status: 409 }
            );
          }
        } else {
          return NextResponse.json(
            { error: `Failed to create authentication user: ${authError.message}` },
            { status: 400 }
          );
        }
      } else if (authResult?.user) {
        createdUserId = authResult.user.id;
      }
    } else {
      // ── Option B: Fallback to standard signUp client ──
      const isolatedAuthClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

      const { data: authResult, error: authError } = await isolatedAuthClient.auth.signUp({
        email: cleanEmail,
        password: tempPassword,
        options: {
          data: {
            full_name: `${first_name.trim()} ${last_name.trim()}`,
            phone: phone?.trim() || "",
            role: role,
            organization_id: orgId,
            must_change_password: true,
          },
        },
      });

      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already in use") || msg.includes("duplicate")) {
          return NextResponse.json(
            { error: "This email address is already registered with an existing account. Please use a different email." },
            { status: 409 }
          );
        }
        if (msg.includes("rate limit")) {
          return NextResponse.json(
            {
              error: "Supabase email rate limit reached. To create staff accounts instantly without email rate limits, please add SUPABASE_SERVICE_ROLE_KEY to your .env file."
            },
            { status: 429 }
          );
        }
        return NextResponse.json(
          { error: `Account registration error: ${authError.message}` },
          { status: 400 }
        );
      }

      if (authResult?.user && Array.isArray(authResult.user.identities) && authResult.user.identities.length === 0) {
        return NextResponse.json(
          { error: "An account with this email address already exists. Please choose a different email for this employee." },
          { status: 409 }
        );
      }

      if (authResult?.user) {
        createdUserId = authResult.user.id;
      }
    }

    if (!createdUserId) {
      return NextResponse.json(
        {
          error: "Could not create authentication user. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in your .env file."
        },
        { status: 500 }
      );
    }

    // 5. Insert new record into public.staff
    const fullPayload: any = {
      organization_id: orgId,
      user_id: createdUserId,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: cleanEmail,
      phone: phone?.trim() || null,
      role: role,
      branch_id: branch_id || null,
      status: true,
      ghana_card_number: ghana_card_number?.trim() || null,
      photo_url: photo_url || null,
      residential_address: residential_address?.trim() || null,
      date_of_birth: date_of_birth || null,
      emergency_contact_name: emergency_contact_name?.trim() || null,
      emergency_contact_phone: emergency_contact_phone?.trim() || null,
      permissions: permissions || {},
    };

    let { data: newStaffRecord, error: insertError } = await supabase
      .from("staff")
      .insert([fullPayload])
      .select("*, branches(name)")
      .single();

    // Fallback if detailed columns (ghana_card_number, permissions, etc.) are not yet migrated
    if (insertError && insertError.code === "42703") {
      const basicPayload = {
        organization_id: orgId,
        user_id: createdUserId,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: cleanEmail,
        phone: phone?.trim() || null,
        role: role,
        branch_id: branch_id || null,
        status: true,
      };

      const fallback = await supabase
        .from("staff")
        .insert([basicPayload])
        .select("*, branches(name)")
        .single();

      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      }
      newStaffRecord = fallback.data;
    } else if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      staff: newStaffRecord,
      credentials: {
        name: `${first_name.trim()} ${last_name.trim()}`,
        email: cleanEmail,
        temporaryPassword: tempPassword,
        role: role,
      },
    });
  } catch (err: any) {
    console.error("Error creating staff:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create staff member" },
      { status: 500 }
    );
  }
}

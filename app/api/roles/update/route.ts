import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdmin, isSuperadmin } from "@/lib/roles";
import { Roles } from "@/types/roles";

export async function POST(req: Request) {
  try {
    // 1. Check if the requester is an admin or superadmin
    if (!(await isAdmin())) {
      return new Response("Forbidden: Requires Admin privileges", { status: 403 });
    }

    const { userId, role } = await req.json();

    if (!userId || !role) {
      return new Response("Missing userId or role", { status: 400 });
    }

    const validRoles: Roles[] = ["superadmin", "admin", "employee", "client"];
    if (!validRoles.includes(role as Roles)) {
      return new Response("Invalid role", { status: 400 });
    }

    // 2. Only Superadmins can promote/demote other Admins or Superadmins
    const targetRole = role as Roles;
    if (targetRole === "admin" || targetRole === "superadmin") {
      if (!(await isSuperadmin())) {
        return new Response("Only superadmins can assign Admin or Superadmin roles", { status: 403 });
      }
    }

    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: targetRole,
      },
    });

    return NextResponse.json({ success: true, message: `User role updated to ${targetRole}` });
  } catch (error) {
    console.error("Error updating role:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useAuthSync() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [resolvedRole, setResolvedRole] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [organizationSlug, setOrganizationSlug] = useState<string | null>(null);
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [permissions, setPermissions] = useState<any>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    async function syncUser() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setUser(null);
          setResolvedRole(null);
          setOrganization(null);
          setOrganizationLogo(null);
          setPermissions(null);
          setMustChangePassword(false);
          setIsSyncing(false);
          return;
        }

        const authUser = session.user;
        setUser(authUser);
        setMustChangePassword(!!authUser?.user_metadata?.must_change_password);

        // Fetch staff profile with organization and granular permissions
        const { data: staffData } = await supabase
          .from("staff")
          .select("id, role, organization_id, permissions, organizations(id, name, slug, plan, sms_balance, max_branches, max_members, created_at, logo_url, sms_sender_id)")
          .or(`user_id.eq.${authUser.id},email.eq.${authUser.email}`)
          .maybeSingle();

        if (staffData) {
          setResolvedRole(staffData.role);
          setEmployeeId(staffData.id);
          setOrganizationId(staffData.organization_id);
          setPermissions((staffData as any)?.permissions || null);
          setOrganizationName((staffData as any)?.organizations?.name || null);
          setOrganizationSlug((staffData as any)?.organizations?.slug || null);
          setOrganizationLogo((staffData as any)?.organizations?.logo_url || null);
          setOrganization((staffData as any)?.organizations || null);
        } else {
          // Check if customer/client
          const { data: customerData } = await supabase
            .from("customers")
            .select("id, organization_id")
            .or(`user_id.eq.${authUser.id},email.eq.${authUser.email}`)
            .maybeSingle();

          if (customerData) {
            setResolvedRole("client");
            setOrganizationId(customerData.organization_id);
          } else {
            setResolvedRole("SuperAdmin");
          }
        }
      } catch (err) {
        console.error("Error in useAuthSync:", err);
      } finally {
        setIsSyncing(false);
      }
    }

    syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setResolvedRole(null);
        setOrganization(null);
        setOrganizationLogo(null);
      }
    });

    const handleOrgUpdate = (e: any) => {
      if (e.detail?.name) {
        setOrganizationName(e.detail.name);
      }
      if (e.detail?.logo_url !== undefined) {
        setOrganizationLogo(e.detail.logo_url);
      }
      if (e.detail?.slug) {
        setOrganizationSlug(e.detail.slug);
      }
      setOrganization((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...(e.detail?.name ? { name: e.detail.name } : {}),
          ...(e.detail?.logo_url !== undefined ? { logo_url: e.detail.logo_url } : {}),
          ...(e.detail?.slug ? { slug: e.detail.slug } : {}),
        };
      });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("organization-updated", handleOrgUpdate);
    }

    return () => {
      subscription?.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("organization-updated", handleOrgUpdate);
      }
    };
  }, []);

  return {
    user,
    resolvedRole,
    employeeId,
    organizationId,
    organizationName,
    organizationSlug,
    organizationLogo,
    organization,
    permissions,
    mustChangePassword,
    setMustChangePassword,
    isSyncing,
  };
}

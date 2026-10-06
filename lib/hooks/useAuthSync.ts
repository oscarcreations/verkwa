"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { Roles } from '@/types/roles';

export function useAuthSync() {
  const { user, isLoaded } = useUser();
  const [resolvedRole, setResolvedRole] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    async function syncRole() {
      if (!isLoaded || !user) {
        setIsSyncing(false);
        return;
      }

      // 1. Check Clerk Metadata first
      const clerkRole = user.publicMetadata.role as string;
      const cachedEmpId = user.publicMetadata.employeeId as string;
      
      if (clerkRole && clerkRole !== 'client') {
        setResolvedRole(clerkRole);
        if (cachedEmpId) setEmployeeId(cachedEmpId);
        // Even if we have a role, we verify the ID to ensure it's loaded
        if (!cachedEmpId) {
           const email = user.primaryEmailAddress?.emailAddress;
           const { data } = await supabase.from('staff').select('id').eq('email', email).single();
           if (data) setEmployeeId(data.id);
        }
        setIsSyncing(false);
        return;
      }

      // 2. Fallback: Check Supabase Employees
      const email = user.primaryEmailAddress?.emailAddress;
      if (email) {
        try {
          const { data: employee, error } = await supabase
            .from('staff')
            .select('id, role')
            .eq('email', email)
            .single();

          if (employee && !error) {
            setResolvedRole(employee.role);
            setEmployeeId(employee.id);
          } else {
            setResolvedRole('client');
          }
        } catch (err) {
          console.error("Auth sync error:", err);
          setResolvedRole('client');
        }
      }

      setIsSyncing(false);
    }

    syncRole();
  }, [user, isLoaded]);

  return { resolvedRole, isSyncing, employeeId };
}

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);
const isSuperadminRoute = createRouteMatcher(['/dashboard/system(.*)']);

// Routes employees are NOT allowed to access
const isEmployeeBlockedRoute = createRouteMatcher([
  '/dashboard/settings(.*)',
  '/dashboard/accounting(.*)',
  '/dashboard/access(.*)',
  '/dashboard/staff(.*)',
  '/dashboard/authorizations(.*)',
  '/dashboard/reports(.*)',
  '/dashboard/business(.*)',
  '/dashboard/ledgers(.*)',
  '/dashboard/generate(.*)',
  '/dashboard/system(.*)',
]);

// Routes only staff (not clients) can access
const isStaffOnlyRoute = createRouteMatcher([
  '/dashboard/settings(.*)',
  '/dashboard/accounting(.*)',
  '/dashboard/access(.*)',
  '/dashboard/staff(.*)',
  '/dashboard/accounts(.*)',
  '/dashboard/transactions(.*)',
  '/dashboard/reports(.*)',
  '/dashboard/business(.*)',
  '/dashboard/ledgers(.*)',
  '/dashboard/authorizations(.*)',
  '/dashboard/generate(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // 1. If user is logged in and tries to access the home page, redirect to dashboard
  if (userId && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // 2. Enforce route-based role protection
  if (isProtectedRoute(req)) {
    await auth.protect();

    const roleRaw = (sessionClaims as any)?.metadata?.role || "";
    const role = roleRaw.toLowerCase();

    // Superadmin-only routes
    if (isSuperadminRoute(req) && role !== 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Employee-blocked routes: employees can only access Dashboard, Accounts, Transactions
    if (isEmployeeBlockedRoute(req) && role === 'employee') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Client redirects: clients can only access their own portal
    if (isStaffOnlyRoute(req) && role === 'client') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};


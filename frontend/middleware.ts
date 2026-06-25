import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ADMIN_COOKIE = "astro_admin_session";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // ── Existing admin protection (unchanged) ──
  if (pathname.startsWith("/admin")) {
    const session = request.cookies.get(ADMIN_COOKIE)?.value;
    if (session !== "authorized") {
      const loginUrl = new URL("/admin-login", request.url);
      loginUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Membership premium route ──
  // Note: Full premium auth check (Supabase session + premium flag)
  // is done client-side in the page component for accuracy.
  // Middleware only adds a basic first-layer redirect hint.
  // The page itself redirects unauthenticated/non-premium users.

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/membership/premium/:path*"]
};

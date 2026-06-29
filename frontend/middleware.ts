import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ADMIN_COOKIE = "astro_admin_session";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const session = request.cookies.get(ADMIN_COOKIE)?.value;
    if (session !== "authorized") {
      const loginUrl = new URL("/admin-login", request.url);
      loginUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"]
};

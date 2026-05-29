import { NextRequest, NextResponse } from "next/server";

/**
 * Route guard: any matched path requires the access-token cookie.
 * If absent, redirect to /login?next=<requested-path>.
 *
 * The cookie is httpOnly so we can only check presence here, not validity.
 * The backend will reject an expired JWT on the API call, and the dashboard
 * component will then bounce to /login.
 */

const COOKIE = "lp_at";

export function middleware(req: NextRequest) {
  const has = req.cookies.has(COOKIE);
  if (has) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/upload/:path*",
    "/assistant/:path*",
    "/resolution/:path*",
    "/settings/:path*",
    "/export/:path*",
    "/admin/:path*",
  ],
};

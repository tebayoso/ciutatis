import { NextResponse, type NextRequest } from "next/server";

// Middleware auth gate for the admin surface. The unified Next app delegates
// session validation to the Ciutatis API (better-auth) by forwarding cookies.
// Unauthenticated requests to /admin/* are redirected to the sign-in page.

const apiBase =
  process.env.API_INTERNAL_BASE ??
  process.env.NEXT_PUBLIC_API_BASE ??
  "http://localhost:3100";

export async function middleware(req: NextRequest) {
  // The sign-in page itself must stay reachable without a session.
  if (req.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const cookie = req.headers.get("cookie") ?? "";
  let authenticated = false;
  try {
    const res = await fetch(`${apiBase}/api/auth/get-session`, {
      headers: { cookie, accept: "application/json" },
    });
    authenticated = res.ok && res.status !== 401;
  } catch {
    authenticated = false;
  }

  if (!authenticated) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

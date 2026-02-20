import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware that protects all (main) routes.
 * Since the JWT token is stored in localStorage (not cookies),
 * true auth validation happens client-side. This middleware
 * serves as a lightweight guard — the real enforcement is in
 * the AuthGuard component rendered in (main)/layout.tsx.
 */
export function middleware(request: NextRequest) {
  // Allow auth routes, static files, and API routes through
  const { pathname } = request.nextUrl;

  const publicPaths = ["/login", "/register", "/_next", "/favicon.ico", "/api"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

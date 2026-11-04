import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export function middleware(request: NextRequest) {
  try {
    const ctx = getCloudflareContext();
    if (ctx?.env) {
      (globalThis as any).__CLOUDFLARE_ENV__ = ctx.env;
    }
  } catch {}
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { withAuth } from "next-auth/middleware";
import { NextRequest } from "next/server";

export const middleware = withAuth(
  function middleware(request: NextRequest) {
    return undefined;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/((?!login|api/auth|api/system/seed|api/telegram/webhook|_next/static|_next/image|favicon\\.ico|logo\\.png|logo-.*\\.png|logo-.*\\.svg|favicon-.*\\.png|.*\\.svg|.*\\.ico).*)",
  ],
};

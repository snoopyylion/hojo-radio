import { clerkMiddleware, getUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (auth, req) => {
  const { userId } = auth;

  if (!userId) {
    return; // Not signed in, Clerk will handle redirection
  }

  const user = await getUser(userId);
  const role = user?.publicMetadata?.role;

  if (req.nextUrl.pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/user') && role !== 'user') {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }
});

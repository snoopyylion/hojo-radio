import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware(async (auth, req) => {
  const user = auth.user;

  if (!user) {
    return; // Not signed in, Clerk will handle redirection
  }

  const role = user.publicMetadata?.role;

  if (req.nextUrl.pathname.startsWith('/admin') && role !== 'admin') {
    return Response.redirect(new URL('/unauthorized', req.url));
  }

  if (req.nextUrl.pathname.startsWith('/user') && role !== 'user') {
    return Response.redirect(new URL('/unauthorized', req.url));
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',  // Always run for API routes
  ],
};

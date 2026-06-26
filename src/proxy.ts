import { type NextRequest } from 'next/server'
import { getProxyClient } from './lib/supabase/proxy-utils'

export async function proxy(request: NextRequest) {
  const supabase = getProxyClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const protectedPaths = ['/biblioteca', '/favorites', '/profile']
  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  )

  if (isProtected && !user) {
    return Response.redirect(new URL('/login', request.url))
  }

  if (request.nextUrl.pathname.startsWith('/login') && user) {
    return Response.redirect(new URL('/', request.url))
  }

  return
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}

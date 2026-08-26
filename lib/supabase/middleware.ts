import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { resolveOwnerId } from '@/lib/delegates'

// '/auth/callback' échange le code d'un lien reçu par e-mail : il est
// forcément atteint sans session, sinon le middleware le renverrait vers
// /login avant qu'il ait pu en créer une.
const PUBLIC_PATHS = ['/', '/fonctions', '/login', '/signup', '/reset-password', '/reset-password/confirm', '/auth/callback']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/api/') || pathname.startsWith('/invite/')

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    return NextResponse.redirect(url)
  }

  const EXEMPT_FROM_PLAN_GATE = ['/app/choisir-offre', '/app/settings']
  const needsActivePlan = user && pathname.startsWith('/app') && !EXEMPT_FROM_PLAN_GATE.includes(pathname)

  if (needsActivePlan) {
    // Un compte secondaire n'a pas son propre abonnement : sans cette
    // résolution, son profil auto-créé (sans date d'expiration) le
    // laisserait toujours passer, même si l'abonnement du principal a expiré.
    const ownerId = await resolveOwnerId(supabase, user.id)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_expires_at')
      .eq('id', ownerId)
      .single()

    const expiresAt = profile?.subscription_expires_at
    const expired = expiresAt && new Date(expiresAt).getTime() < Date.now()

    if (expired) {
      const url = request.nextUrl.clone()
      url.pathname = '/app/choisir-offre'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

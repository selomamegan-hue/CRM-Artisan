import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { siteOrigin } from '@/lib/site-origin'

/* Point d'échange unique des liens reçus par e-mail : confirmation
   d'inscription, réinitialisation de mot de passe, invitation.

   Pourquoi un Route Handler et pas la page d'arrivée : Next.js n'autorise
   l'écriture de cookies que dans une action serveur ou un Route Handler.
   Appelé depuis le rendu d'une page, exchangeCodeForSession crée bien une
   session, mais le `setAll` du client Supabase lève une erreur avalée en
   silence — le navigateur ne reçoit jamais les cookies, et l'écran suivant
   repart sans session (« Auth session missing! »). */

function safeNext(value: string | null) {
  // Un lien forgé ne doit pas pouvoir rediriger ailleurs que sur le site.
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/app'
}

export async function GET(request: NextRequest) {
  const origin = await siteOrigin()
  const code = request.nextUrl.searchParams.get('code')
  const next = safeNext(request.nextUrl.searchParams.get('next'))

  if (!code) return NextResponse.redirect(`${origin}/login?error=lien_invalide`)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${origin}/login?error=lien_expire`)

  return NextResponse.redirect(`${origin}${next}`)
}

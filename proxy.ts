import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Les images de métadonnées générées par Next.js (opengraph-image,
  // twitter-image) n'ont pas d'extension de fichier : sans les nommer ici,
  // elles passent par updateSession, qui redirige les visiteurs anonymes
  // vers /login — et les robots de WhatsApp ou Facebook reçoivent une page
  // de connexion au lieu de l'aperçu.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|opengraph-image|twitter-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|mp3|wav|m4a|ogg|json|txt|xml)$).*)',
  ],
}

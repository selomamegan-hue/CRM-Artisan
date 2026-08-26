import { headers } from 'next/headers'

/* L'origine publique du site, telle que le visiteur la voit. Derrière le
   proxy de Vercel, `host` seul renvoie l'hôte interne du déploiement — d'où
   la lecture des en-têtes `x-forwarded-*` en premier. Sert à construire les
   liens envoyés par e-mail, qui doivent pointer vers bonfil.app. */
export async function siteOrigin() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

/* Cible du lien envoyé par e-mail. Le code doit toujours être échangé par
   /auth/callback, jamais par la page d'arrivée : voir le commentaire de
   app/auth/callback/route.ts. */
export async function authCallbackUrl(next: string) {
  return `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`
}

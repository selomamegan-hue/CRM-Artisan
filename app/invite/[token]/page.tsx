import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fraunces } from '@/lib/fonts'
import { AcceptInviteForm } from './form'
import { acceptInviteLoggedIn } from './actions'
import { signOut } from '@/app/app/actions'

const ERROR_MESSAGE: Record<string, string> = {
  already_active: 'Ce compte est déjà secondaire sur un autre atelier Bonfil. Demande à en être retiré avant d’accepter cette invitation, ou déconnecte-toi pour en créer un nouveau.',
  invalid: "Cette invitation n'est plus valide.",
}

export default async function InvitePage({ params, searchParams }: PageProps<'/invite/[token]'>) {
  const { token } = await params
  const { error } = await searchParams

  const supabase = await createClient()
  const [{ data }, { data: userData }] = await Promise.all([
    supabase.rpc('validate_invite_token', { token }),
    supabase.auth.getUser(),
  ])
  const primaryName = data?.[0]?.primary_name as string | undefined
  const currentUser = userData.user

  if (!primaryName) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F1ECE2] px-6 text-center">
        <h1 className={`${fraunces.className} text-2xl text-[#22303A]`}>Invitation introuvable</h1>
        <p className="max-w-xs text-sm text-[#5B6B72]">
          Ce lien d&apos;invitation n&apos;est plus valide — il a peut-être déjà été utilisé ou a expiré. Demande un nouveau lien à la personne qui t&apos;a invité·e.
        </p>
        <Link href="/login" className="text-sm text-[#1A5F7A] underline">
          Aller à la connexion
        </Link>
      </div>
    )
  }

  const errorMessage = typeof error === 'string' ? ERROR_MESSAGE[error] : undefined

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F1ECE2] px-6">
      <div className="text-center">
        <h1 className={`${fraunces.className} text-3xl text-[#22303A]`}>Rejoindre Bonfil</h1>
        <p className="mt-2 max-w-xs text-sm text-[#5B6B72]">
          <strong>{primaryName}</strong> t&apos;invite comme compte secondaire sur Bonfil.{' '}
          {currentUser ? 'Confirme pour continuer.' : 'Choisis ton mot de passe pour continuer.'}
        </p>
      </div>

      {errorMessage && <p className="max-w-xs text-center text-sm text-[#C96A3D]">{errorMessage}</p>}

      {currentUser ? (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <p className="text-center text-[13px] text-[#5B6B72]">
            Connecté·e comme <strong>{currentUser.email}</strong>
          </p>
          <form action={acceptInviteLoggedIn.bind(null, token)}>
            <button
              type="submit"
              className="w-full rounded bg-[#1A5F7A] px-3 py-2 text-sm font-semibold text-white"
            >
              Rejoindre avec ce compte
            </button>
          </form>
          <form action={signOut}>
            <button type="submit" className="w-full text-center text-sm text-[#5B6B72] underline underline-offset-2">
              Utiliser un autre compte
            </button>
          </form>
        </div>
      ) : (
        <AcceptInviteForm token={token} />
      )}
    </div>
  )
}

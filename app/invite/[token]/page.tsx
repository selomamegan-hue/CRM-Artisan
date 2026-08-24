import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fraunces } from '@/lib/fonts'
import { AcceptInviteForm } from './form'

export default async function InvitePage({ params }: PageProps<'/invite/[token]'>) {
  const { token } = await params

  const supabase = await createClient()
  const { data } = await supabase.rpc('validate_invite_token', { token })
  const primaryName = data?.[0]?.primary_name as string | undefined

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F1ECE2] px-6">
      <div className="text-center">
        <h1 className={`${fraunces.className} text-3xl text-[#22303A]`}>Rejoindre Bonfil</h1>
        <p className="mt-2 max-w-xs text-sm text-[#5B6B72]">
          <strong>{primaryName}</strong> t&apos;invite comme compte secondaire sur Bonfil. Choisis ton mot de passe pour continuer.
        </p>
      </div>
      <AcceptInviteForm token={token} />
    </div>
  )
}

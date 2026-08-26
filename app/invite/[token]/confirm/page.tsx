import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function InviteConfirmPage(props: PageProps<'/invite/[token]/confirm'>) {
  const { token } = await props.params

  // Le code du lien a déjà été échangé par /auth/callback : sans session
  // ici, accept_invite s'exécuterait sans utilisateur authentifié.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/invite/${token}`)

  const { data: status } = await supabase.rpc('accept_invite', { token })
  if (status !== 'ok') redirect(`/invite/${token}?error=${status ?? 'invalid'}`)

  redirect('/app')
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function InviteConfirmPage(props: PageProps<'/invite/[token]/confirm'>) {
  const { token } = await props.params
  const { code } = await props.searchParams

  if (typeof code !== 'string') redirect(`/invite/${token}`)

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) redirect(`/invite/${token}`)

  const { data: linked } = await supabase.rpc('accept_invite', { token })
  if (!linked) redirect('/login')

  redirect('/app')
}

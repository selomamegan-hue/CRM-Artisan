import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewPasswordForm } from './form'

export default async function ResetPasswordConfirmPage(props: PageProps<'/reset-password/confirm'>) {
  const { code } = await props.searchParams

  if (typeof code !== 'string') redirect('/reset-password')

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) redirect('/reset-password')

  return <NewPasswordForm />
}

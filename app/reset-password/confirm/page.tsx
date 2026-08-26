import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewPasswordForm } from './form'

export default async function ResetPasswordConfirmPage() {
  // Le code du lien a déjà été échangé par /auth/callback, qui seul peut
  // écrire les cookies de session. Ici on ne fait que vérifier qu'elle
  // existe : sans elle, updateUser échouerait au moment d'enregistrer.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/reset-password')

  return <NewPasswordForm />
}

import { createClient } from '@/lib/supabase/server'
import { fraunces } from '@/lib/fonts'
import { signOut } from './actions'

export default async function AppHome() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F1ECE2] px-6 text-center">
      <h1 className={`${fraunces.className} text-3xl text-[#22303A]`}>Bonfil</h1>
      <p className="text-sm text-[#5B6B72]">Connecté en tant que {user?.email}</p>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded border border-[#22303A] px-4 py-2 text-sm font-semibold text-[#22303A]"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  )
}

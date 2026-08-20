import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { fraunces } from '@/lib/fonts'
import { createClient } from '@/lib/supabase/server'

export default async function Home(props: PageProps<'/'>) {
  const { code } = await props.searchParams

  if (typeof code === 'string') {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) redirect('/app')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#F1ECE2] px-6 text-center">
      <Image src="/bonfil-logo.png" alt="Bonfil" width={96} height={111} priority />
      <h1 className={`${fraunces.className} text-5xl tracking-tight text-[#22303A]`}>Bonfil</h1>
      <p className="max-w-xs text-sm text-[#5B6B72]">
        Parlez après chaque intervention. Bonfil s&apos;occupe du reste.
      </p>
      <Link
        href="/signup"
        className="rounded bg-[#1A5F7A] px-6 py-3 text-sm font-semibold text-white"
      >
        Commencer
      </Link>
      <Link href="/login" className="text-sm text-[#1A5F7A] underline">
        Déjà un compte ? Se connecter
      </Link>
    </div>
  )
}

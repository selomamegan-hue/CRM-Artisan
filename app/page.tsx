import Image from 'next/image'
import Link from 'next/link'
import { fraunces } from '@/lib/fonts'

export default function Home() {
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

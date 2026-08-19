'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login } from './actions'
import { fraunces } from '@/lib/fonts'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F1ECE2] px-6">
      <h1 className={`${fraunces.className} text-3xl text-[#22303A]`}>Se connecter</h1>

      <form action={formAction} className="flex w-full max-w-xs flex-col gap-3">
        <input
          name="email"
          type="email"
          placeholder="E-mail"
          required
          className="rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
        />
        <input
          name="password"
          type="password"
          placeholder="Mot de passe"
          required
          className="rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
        />

        {state?.error && <p className="text-sm text-[#C96A3D]">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-[#1A5F7A] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <Link href="/signup" className="text-sm text-[#1A5F7A] underline">
        Pas encore de compte ? Créer un compte
      </Link>
    </div>
  )
}

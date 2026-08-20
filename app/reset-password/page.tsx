'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from './actions'
import { fraunces } from '@/lib/fonts'

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, undefined)

  if (state?.success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F1ECE2] px-6 text-center">
        <h1 className={`${fraunces.className} text-3xl text-[#22303A]`}>Vérifie ta boîte mail</h1>
        <p className="max-w-xs text-sm text-[#5B6B72]">
          Si un compte existe avec cette adresse, un lien pour choisir un nouveau mot de passe vient d&apos;être envoyé.
        </p>
        <Link href="/login" className="text-sm text-[#1A5F7A] underline">
          Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F1ECE2] px-6">
      <h1 className={`${fraunces.className} text-3xl text-[#22303A]`}>Mot de passe oublié</h1>

      <form action={formAction} className="flex w-full max-w-xs flex-col gap-3">
        <input
          name="email"
          type="email"
          placeholder="E-mail"
          required
          className="rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
        />

        {state?.error && <p className="text-sm text-[#C96A3D]">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-[#1A5F7A] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Envoi…' : 'Envoyer le lien'}
        </button>
      </form>

      <Link href="/login" className="text-sm text-[#1A5F7A] underline">
        Retour à la connexion
      </Link>
    </div>
  )
}

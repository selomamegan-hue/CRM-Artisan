'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { fraunces } from '@/lib/fonts'
import { acceptInvite } from './actions'

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(acceptInvite.bind(null, token), undefined)

  if (state?.success && state.email) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className={`${fraunces.className} text-2xl text-[#22303A]`}>Vérifie ta boîte mail</h2>
        <p className="max-w-xs text-sm text-[#5B6B72]">
          On t&apos;a envoyé un lien de confirmation à <strong>{state.email}</strong>. Clique dessus pour activer ton accès.
        </p>
      </div>
    )
  }

  return (
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
        placeholder="Mot de passe (6 caractères min.)"
        required
        minLength={6}
        className="rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
      />

      {state?.error && (
        <div className="flex flex-col gap-1 text-sm text-[#C96A3D]">
          <p>{state.error}</p>
          {state.error.includes('existe déjà') && (
            <Link href="/login" className="underline">
              Aller à la connexion
            </Link>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-[#1A5F7A] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Création…' : 'Rejoindre'}
      </button>
    </form>
  )
}

'use client'

import { useActionState } from 'react'
import { updatePassword } from './actions'
import { fraunces } from '@/lib/fonts'

export function NewPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, undefined)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F1ECE2] px-6">
      <h1 className={`${fraunces.className} text-3xl text-[#22303A]`}>Choisis un nouveau mot de passe</h1>

      <form action={formAction} className="flex w-full max-w-xs flex-col gap-3">
        <input
          name="password"
          type="password"
          placeholder="Nouveau mot de passe (6 caractères min.)"
          required
          minLength={6}
          className="rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
        />

        {state?.error && <p className="text-sm text-[#C96A3D]">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-[#1A5F7A] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
        </button>
      </form>
    </div>
  )
}

'use client'

import { useActionState, useState, useTransition } from 'react'
import Link from 'next/link'
import { signup, resendConfirmation } from './actions'
import { fraunces } from '@/lib/fonts'

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, undefined)
  const [resendState, setResendState] = useState<'idle' | 'sent' | 'error'>('idle')
  const [isResending, startResend] = useTransition()

  if (state?.success && state.email) {
    const email = state.email
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F1ECE2] px-6 text-center">
        <h1 className={`${fraunces.className} text-3xl text-[#22303A]`}>Vérifie ta boîte mail</h1>
        <p className="max-w-xs text-sm text-[#5B6B72]">
          On t&apos;a envoyé un lien de confirmation à <strong>{email}</strong>. Clique dessus pour activer ton compte Bonfil.
        </p>

        <button
          type="button"
          disabled={isResending || resendState === 'sent'}
          onClick={() =>
            startResend(async () => {
              const res = await resendConfirmation(email)
              setResendState(res.error ? 'error' : 'sent')
            })
          }
          className="mt-2 text-sm text-[#1A5F7A] underline disabled:opacity-60"
        >
          {isResending ? 'Envoi…' : resendState === 'sent' ? 'E-mail renvoyé' : "Renvoyer l'e-mail"}
        </button>
        {resendState === 'error' && <p className="text-sm text-[#C96A3D]">Échec de l&apos;envoi, réessaie dans un instant.</p>}

        <Link href="/login" className="text-sm text-[#5B6B72] underline underline-offset-2">
          Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F1ECE2] px-6">
      <h1 className={`${fraunces.className} text-3xl text-[#22303A]`}>Créer un compte</h1>

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
          {pending ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>

      <Link href="/login" className="text-sm text-[#1A5F7A] underline">
        Déjà un compte ? Se connecter
      </Link>
    </div>
  )
}

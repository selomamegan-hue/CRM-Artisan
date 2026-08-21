'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { createNewClient } from './actions'

export default function NewClientPage() {
  const [state, formAction, pending] = useActionState(createNewClient, undefined)
  const [contactPickerSupported, setContactPickerSupported] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    setContactPickerSupported('contacts' in navigator && 'select' in (navigator as unknown as { contacts?: { select?: unknown } }).contacts!)
  }, [])

  async function pickContact() {
    try {
      const nav = navigator as unknown as {
        contacts: { select: (props: string[], opts: { multiple: boolean }) => Promise<{ name?: string[]; tel?: string[] }[]> }
      }
      const [contact] = await nav.contacts.select(['name', 'tel'], { multiple: false })
      if (contact?.name?.[0]) setName(contact.name[0])
      if (contact?.tel?.[0]) setPhone(contact.tel[0])
    } catch {
      // user cancelled the picker — nothing to do
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 pb-10 pt-6 md:max-w-lg md:px-10 md:pt-10">
      <Link href="/app/clients" className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[#22303A]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Clients
      </Link>

      <h1 className="mb-4 text-2xl font-semibold text-[#22303A]">Nouveau client</h1>

      {contactPickerSupported && (
        <button
          type="button"
          onClick={pickContact}
          className="mb-4 flex items-center justify-center gap-2 rounded-lg border-[1.5px] border-[#1A5F7A] py-2.5 text-[14px] font-semibold text-[#1A5F7A]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="8" r="3" />
            <path d="M3 19c1-3.2 3.2-5 6-5s5 1.8 6 5" />
          </svg>
          Choisir depuis mes contacts
        </button>
      )}

      <form action={formAction} className="flex flex-col gap-3">
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom"
          required
          className="rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
        />
        <input
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Téléphone"
          className="rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
        />

        {state?.error && <p className="text-sm text-[#C96A3D]">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-[#1A5F7A] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Création…' : 'Ajouter le client'}
        </button>
      </form>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fraunces } from '@/lib/fonts'
import { createClient } from '@/lib/supabase/client'
import { confirmNote } from './actions'

type PendingNote = {
  transcript: string
  type: 'devis' | 'rappel' | 'facture' | 'autre'
  due_date: string | null
  amount: number | null
  excerpt: string
  client_name_heard: string | null
  matched_client: { id: string; name: string; phone: string | null } | null
}

type ClientOption = { id: string; name: string }

const TYPE_OPTIONS: { value: PendingNote['type']; label: string }[] = [
  { value: 'devis', label: 'Devis' },
  { value: 'rappel', label: 'Rappel' },
  { value: 'facture', label: 'Facture' },
  { value: 'autre', label: 'Autre' },
]

export default function ReviewPage() {
  const router = useRouter()
  const [pending, setPending] = useState<PendingNote | null | undefined>(undefined)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [isNewClient, setIsNewClient] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('bonfil:pending-note')
    if (!raw) {
      setPending(null)
      return
    }
    const data: PendingNote = JSON.parse(raw)
    setPending(data)

    if (data.matched_client) {
      setSelectedClientId(data.matched_client.id)
      setIsNewClient(false)
    } else {
      setIsNewClient(true)
      setNewClientName(data.client_name_heard ?? '')
    }

    const supabase = createClient()
    supabase
      .from('clients')
      .select('id, name')
      .is('archived_at', null)
      .order('name')
      .then(({ data: rows }) => setClients(rows ?? []))
  }, [])

  if (pending === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1ECE2]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#22303A]/20 border-t-[#1A5F7A]" />
      </div>
    )
  }

  if (pending === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F1ECE2] px-8 text-center">
        <p className="text-sm text-[#5B6B72]">Aucune note en attente de relecture.</p>
        <button
          onClick={() => router.push('/app/record')}
          className="rounded-full bg-[#1A5F7A] px-6 py-2.5 text-sm font-bold text-white"
        >
          Enregistrer une note
        </button>
      </div>
    )
  }

  function handleSubmit() {
    sessionStorage.removeItem('bonfil:pending-note')
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-10 pt-6 md:max-w-lg md:px-10 md:pt-10">
      <h1 className={`${fraunces.className} mb-1 text-2xl text-[#22303A]`}>Relecture</h1>
      <p className="mb-5 text-[13px] text-[#5B6B72]">Vérifie et corrige avant d&apos;enregistrer.</p>

      <div className="mb-5 rounded-[10px] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Transcription</p>
        <p className="text-[13.5px] leading-relaxed text-[#22303A]">{pending.transcript}</p>
      </div>

      <form action={confirmNote} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input type="hidden" name="transcript" value={pending.transcript} />

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Client</p>
          {!isNewClient ? (
            <>
              <select
                name="client_id"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
              >
                {!selectedClientId && <option value="">Choisir un client</option>}
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setIsNewClient(true)
                  setSelectedClientId('')
                }}
                className="mt-1.5 text-[12.5px] font-medium text-[#1A5F7A] underline underline-offset-2"
              >
                + Nouveau client
              </button>
            </>
          ) : (
            <>
              <input
                name="new_client_name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Nom du client"
                required
                className="w-full rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
              />
              {clients.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsNewClient(false)}
                  className="mt-1.5 text-[12.5px] font-medium text-[#1A5F7A] underline underline-offset-2"
                >
                  Choisir un client existant
                </button>
              )}
            </>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Type d&apos;action</p>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <label key={opt.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value={opt.value}
                  defaultChecked={opt.value === pending.type}
                  className="peer sr-only"
                />
                <span className="block rounded-full border border-[#22303A]/20 px-3.5 py-1.5 text-[13px] font-medium text-[#5B6B72] peer-checked:border-[#1A5F7A] peer-checked:bg-[#1A5F7A]/10 peer-checked:text-[#1A5F7A]">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Échéance</p>
            <input
              type="date"
              name="due_date"
              defaultValue={pending.due_date ?? ''}
              className="w-full rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
            />
          </div>
          <div className="flex-1">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Montant (€)</p>
            <input
              type="number"
              step="0.01"
              name="amount"
              defaultValue={pending.amount ?? ''}
              className="w-full rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
            />
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Résumé (affiché dans Le Fil)</p>
          <textarea
            name="excerpt"
            defaultValue={pending.excerpt}
            required
            rows={2}
            className="w-full resize-none rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
          />
        </div>

        <button type="submit" className="mt-2 rounded-full bg-[#1A5F7A] py-3 text-sm font-bold text-white">
          Confirmer et enregistrer
        </button>
      </form>
    </div>
  )
}

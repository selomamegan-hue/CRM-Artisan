import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fraunces } from '@/lib/fonts'
import { updateClient, archiveClient } from './actions'

export default async function ClientProfilePage({ params, searchParams }: PageProps<'/app/clients/[id]'>) {
  const { id } = await params
  const { updated, archive_blocked } = await searchParams
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, phone, is_minimal')
    .eq('id', id)
    .single()

  if (!client) notFound()

  const [{ count: notesCount }, { count: activeCount }] = await Promise.all([
    supabase.from('notes').select('id', { count: 'exact', head: true }).eq('client_id', id),
    supabase.from('actions').select('id', { count: 'exact', head: true }).eq('client_id', id).eq('status', 'a_faire'),
  ])

  const initial = client.name.trim()[0]?.toUpperCase() ?? '?'

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 pb-10 pt-6 md:max-w-lg md:px-10 md:pt-10">
      <Link href="/app/clients" className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[#22303A]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Clients
      </Link>

      <div className="flex flex-col items-center gap-2 py-5">
        <div className={`${fraunces.className} flex h-16 w-16 items-center justify-center rounded-full bg-[#1A5F7A]/10 text-2xl text-[#1A5F7A]`}>
          {initial}
        </div>
        <p className="text-lg font-bold text-[#22303A]">{client.name}</p>
      </div>

      {client.is_minimal && (
        <div className="mb-4 flex items-start gap-2.5 rounded-[10px] bg-[#3A9188]/[0.13] px-3.5 py-3">
          <span className="mt-0.5 shrink-0 text-[#3A9188]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15.5 4.5l4 4L8 20H4v-4z" />
            </svg>
          </span>
          <p className="text-[12.5px] leading-relaxed text-[#22303A]">
            Fiche créée automatiquement. Complète-la quand tu as une minute.
          </p>
        </div>
      )}

      <div className="mb-4 flex gap-2.5">
        <div className="flex-1 rounded-[10px] bg-white py-3.5 text-center shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
          <span className="block text-xl font-bold text-[#22303A]">{notesCount ?? 0}</span>
          <span className="text-[10.5px] uppercase tracking-[0.03em] text-[#5B6B72]">Notes</span>
        </div>
        <div className="flex-1 rounded-[10px] bg-white py-3.5 text-center shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
          <span className="block text-xl font-bold text-[#22303A]">{activeCount ?? 0}</span>
          <span className="text-[10.5px] uppercase tracking-[0.03em] text-[#5B6B72]">En cours</span>
        </div>
      </div>

      <Link
        href={`/app/clients/${id}/history`}
        className="mb-6 flex items-center justify-between rounded-[10px] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-[#22303A]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </svg>
          Voir l&apos;historique
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[#8B9298]">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </Link>

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Modifier la fiche</p>
      <form action={updateClient.bind(null, id)} className="flex flex-col gap-3">
        <input
          name="name"
          defaultValue={client.name}
          placeholder="Nom"
          required
          className="rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
        />
        <input
          name="phone"
          defaultValue={client.phone ?? ''}
          placeholder="Téléphone"
          className="rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
        />
        <button type="submit" className="rounded bg-[#1A5F7A] px-3 py-2 text-sm font-semibold text-white">
          Enregistrer
        </button>
        {updated === '1' && <p className="text-[12.5px] text-[#3A9188]">Modifications enregistrées.</p>}
      </form>

      <form action={archiveClient.bind(null, id)} className="mt-6 text-center">
        <button type="submit" className="text-[13px] font-medium text-[#C96A3D] underline underline-offset-2">
          Archiver ce client
        </button>
        <p className="mt-1.5 text-[11.5px] text-[#8B9298]">Il sort de la liste, mais son historique reste intact.</p>
        {archive_blocked === '1' && (
          <p className="mt-2 text-[12.5px] text-[#C96A3D]">
            Impossible d&apos;archiver : ce client a un chantier en cours ou un solde impayé. Marque les actions comme
            faites et encaisse le solde restant d&apos;abord.
          </p>
        )}
      </form>
    </div>
  )
}

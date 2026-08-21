import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ActionStatus, ActionType } from '@/lib/types'

const TYPE_LABEL: Record<ActionType, string> = {
  devis: 'Devis',
  rappel: 'Rappel',
  facture: 'Facture',
  autre: 'Autre',
}

const STATUS_STYLE: Record<ActionStatus, string> = {
  fait: 'bg-[#3A9188]/[0.13] text-[#3A9188]',
  a_faire: 'bg-[#1A5F7A]/10 text-[#1A5F7A]',
  reporte: 'bg-[#1A5F7A]/10 text-[#1A5F7A]',
  annule: 'bg-[#22303A]/[0.08] text-[#8B9298] line-through',
}

const STATUS_LABEL: Record<ActionStatus, string> = {
  fait: 'fait',
  a_faire: 'à faire',
  reporte: 'reporté',
  annule: 'annulé',
}

type NoteRow = {
  id: string
  transcript: string
  created_at: string
  actions: { id: string; type: ActionType; status: ActionStatus; excerpt: string }[]
}

export default async function ClientHistoryPage({ params }: PageProps<'/app/clients/[id]/history'>) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase.from('clients').select('name').eq('id', id).single()
  if (!client) notFound()

  const { data: notes } = await supabase
    .from('notes')
    .select('id, transcript, created_at, actions(id, type, status, excerpt)')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .returns<NoteRow[]>()

  const rows = notes ?? []

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 pb-10 pt-6 md:max-w-lg md:px-10 md:pt-10">
      <Link href={`/app/clients/${id}`} className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[#22303A]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {client.name}
      </Link>

      {rows.length === 0 ? (
        <p className="pt-10 text-center text-sm text-[#5B6B72]">Aucune note pour l&apos;instant.</p>
      ) : (
        <div className="relative mt-4 flex flex-col gap-5 pl-4">
          <div className="absolute bottom-1 left-[3px] top-1 w-[1.5px] bg-[#22303A]/20" />
          {rows.map((note) => (
            <div key={note.id} className="relative">
              <span className="absolute -left-[19px] top-1 h-[7px] w-[7px] rounded-full bg-[#3A9188]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.03em] text-[#8B9298]">
                {new Date(note.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-[#22303A]">{note.transcript}</p>
              {note.actions.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {note.actions.map((a) => (
                    <span key={a.id} className={`rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-semibold ${STATUS_STYLE[a.status]}`}>
                      {TYPE_LABEL[a.type]} · {STATUS_LABEL[a.status]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

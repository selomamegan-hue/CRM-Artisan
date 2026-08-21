import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fraunces } from '@/lib/fonts'
import { dueLabel } from '@/lib/urgency'
import { markDone, cancelAction, postpone } from './actions'

export default async function ActionDetailPage({ params }: PageProps<'/app/actions/[id]'>) {
  const { id } = await params
  const supabase = await createClient()

  const { data: action } = await supabase
    .from('actions')
    .select('id, due_date, excerpt, amount, status, clients(name, phone), notes(transcript)')
    .eq('id', id)
    .single()

  if (!action) notFound()

  const today = new Date()
  const client = action.clients as unknown as { name: string; phone: string | null } | null
  const note = action.notes as unknown as { transcript: string } | null

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 pb-10 pt-6 md:max-w-lg md:px-10 md:pt-10">
      <Link href="/app" className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[#22303A]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {action.excerpt}
      </Link>

      <div className="mt-3 rounded-xl bg-white px-4 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
        <div className="flex items-center justify-between border-b border-[#22303A]/[0.14] py-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Client</span>
          <span className="text-[15px] font-semibold text-[#22303A]">{client?.name ?? 'Client'}</span>
        </div>
        <div className="flex items-center justify-between py-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Échéance</span>
          <span className="text-[15px] font-semibold text-[#22303A]">
            {action.due_date ? dueLabel(action.due_date, today) : 'Sans échéance'}
          </span>
        </div>
        {action.amount != null && (
          <div className="flex items-center justify-between border-t border-[#22303A]/[0.14] py-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Montant</span>
            <span className="text-[15px] font-semibold text-[#22303A]">{action.amount} €</span>
          </div>
        )}
      </div>

      {note?.transcript && (
        <p className={`${fraunces.className} mt-5 border-l-2 border-[#3A9188] pl-3.5 text-[15px] italic leading-relaxed text-[#22303A]`}>
          {note.transcript}
        </p>
      )}

      <div className="mt-6 flex gap-2.5">
        <form action={postpone.bind(null, action.id)} className="flex flex-1 items-center gap-2">
          <input
            type="date"
            name="due_date"
            defaultValue={action.due_date ?? undefined}
            className="w-full min-w-0 rounded-lg border-[1.5px] border-[#22303A]/25 px-2 py-2.5 text-[13px] text-[#22303A]"
          />
          <button type="submit" className="shrink-0 rounded-lg border-[1.5px] border-[#22303A] px-3 py-2.5 text-[14px] font-semibold text-[#22303A]">
            Reporter
          </button>
        </form>
        <form action={markDone.bind(null, action.id)} className="flex-1">
          <button type="submit" className="w-full rounded-lg bg-[#1A5F7A] py-2.5 text-[14.5px] font-semibold text-white">
            Marquer fait
          </button>
        </form>
      </div>

      <form action={cancelAction.bind(null, action.id)} className="mt-4 text-center">
        <button type="submit" className="text-[13px] font-medium text-[#C96A3D] underline underline-offset-2">
          Annuler cette action
        </button>
      </form>
    </div>
  )
}

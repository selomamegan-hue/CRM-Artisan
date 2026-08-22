import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatAmount } from '@/lib/currency'
import { dueLabel } from '@/lib/urgency'
import { planHasFeature } from '@/lib/plans'
import { getUserPlan } from '@/lib/plans-server'
import { UpsellBanner } from '@/components/UpsellBanner'

type ActionRow = {
  id: string
  excerpt: string
  amount: number
  amount_paid: number
  due_date: string | null
  clients: { name: string; phone: string | null } | null
}

export default async function ImpayesPage() {
  const supabase = await createClient()
  const plan = await getUserPlan()

  if (!planHasFeature(plan, 'payments')) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-6 md:max-w-lg md:px-10 md:pt-10">
        <Link href="/app/clients" className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[#22303A]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Clients
        </Link>
        <h1 className="mb-4 text-2xl font-semibold text-[#22303A]">Impayés</h1>
        <UpsellBanner text="Vue Impayés sur tous les clients" plan="Premium" />
      </div>
    )
  }

  const { data: actions } = await supabase
    .from('actions')
    .select('id, excerpt, amount, amount_paid, due_date, clients(name, phone)')
    .not('amount', 'is', null)
    .neq('status', 'annule')
    .returns<ActionRow[]>()

  const today = new Date()

  const rows = (actions ?? [])
    .filter((a) => a.amount > a.amount_paid)
    .sort((a, b) => {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    })

  const totalDue = rows.reduce((sum, a) => sum + (a.amount - a.amount_paid), 0)

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-6 md:max-w-lg md:px-10 md:pt-10">
      <Link href="/app/clients" className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[#22303A]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Clients
      </Link>

      <h1 className="mb-1 text-2xl font-semibold text-[#22303A]">Impayés</h1>
      <p className="mb-4 text-[13px] text-[#5B6B72]">
        {rows.length === 0 ? 'Rien en attente — tout est à jour.' : `${formatAmount(totalDue)} à récupérer sur ${rows.length} chantier${rows.length > 1 ? 's' : ''}.`}
      </p>

      {rows.length > 0 && (
        <div className="flex flex-col gap-2.5 pb-10">
          {rows.map((a) => (
            <Link
              key={a.id}
              href={`/app/actions/${a.id}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]"
            >
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-semibold text-[#22303A]">{a.clients?.name ?? 'Client'}</p>
                <p className="truncate text-[12.5px] text-[#5B6B72]">{a.excerpt}</p>
                {a.due_date && <p className="mt-0.5 text-[11px] text-[#8B9298]">{dueLabel(a.due_date, today)}</p>}
              </div>
              <span className="shrink-0 text-[14.5px] font-bold text-[#D97B4F]">{formatAmount(a.amount - a.amount_paid)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

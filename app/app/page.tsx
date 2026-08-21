import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fraunces } from '@/lib/fonts'
import { bucketRank, dueBucket, dueLabel, isUrgent } from '@/lib/urgency'

type ActionRow = {
  id: string
  due_date: string | null
  excerpt: string
  clients: { name: string } | null
}

export default async function LeFilPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profile }, { data: actions }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user!.id).single(),
    supabase
      .from('actions')
      .select('id, due_date, excerpt, clients(name)')
      .eq('status', 'a_faire')
      .order('due_date', { ascending: true, nullsFirst: false })
      .returns<ActionRow[]>(),
  ])

  const today = new Date()
  const rows = actions ?? []

  const buckets = new Map<string, ActionRow[]>()
  for (const row of rows) {
    const bucket = dueBucket(row.due_date, today)
    const list = buckets.get(bucket) ?? []
    list.push(row)
    buckets.set(bucket, list)
  }
  const orderedBuckets = [...buckets.entries()].sort((a, b) => bucketRank(a[0]) - bucketRank(b[0]))

  const initial = (profile?.full_name?.trim()?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()

  return (
    <div className="flex h-full min-h-screen flex-col md:h-screen">
      <div className="flex shrink-0 items-center justify-between px-6 pb-1.5 pt-6 md:px-8 md:pt-8">
        <div>
          <h1 className={`${fraunces.className} text-2xl text-[#22303A] md:text-[26px]`}>Le Fil</h1>
          <p className="mt-0.5 text-xs text-[#5B6B72] md:text-[13px]">
            {rows.length === 0
              ? 'Rien en attente'
              : `${rows.length} chose${rows.length > 1 ? 's' : ''} en attente`}
          </p>
        </div>
        <div className={`${fraunces.className} flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#1A5F7A]/10 text-[15px] text-[#1A5F7A]`}>
          {initial}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1A5F7A]/10 text-[#1A5F7A]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 6h12M8 12h12M8 18h12" />
              <circle cx="4" cy="6" r="1" />
              <circle cx="4" cy="12" r="1" />
              <circle cx="4" cy="18" r="1" />
            </svg>
          </div>
          <p className={`${fraunces.className} text-lg text-[#22303A]`}>Rien à faire pour l&apos;instant</p>
          <p className="max-w-xs text-sm leading-relaxed text-[#5B6B72]">
            Enregistrez une note après votre prochaine intervention — Le Fil se remplit tout seul.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-6 pb-2 md:px-8">
          {orderedBuckets.map(([bucket, items]) => (
            <div key={bucket}>
              <div className="pb-1 pt-4 text-[11px] font-bold uppercase tracking-[0.07em] text-[#8B9298]">{bucket}</div>
              <div className="md:mb-1 md:rounded-[10px] md:bg-white md:px-3.5 md:shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
                {items.map((row) => (
                  <Link
                    key={row.id}
                    href={`/app/actions/${row.id}`}
                    className="flex items-start gap-3 border-b border-[#22303A]/[0.14] py-3.5 last:border-b-0"
                  >
                    <span
                      className={`mt-1 inline-block h-[9px] w-[9px] shrink-0 rounded-full ${
                        isUrgent(row.due_date, today) ? 'bg-[#D97B4F]' : 'bg-[#1A5F7A]'
                      }`}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[14.5px] font-bold text-[#22303A]">{row.clients?.name ?? 'Client'}</span>
                      <span className="text-[13px] text-[#5B6B72]">{row.excerpt}</span>
                    </div>
                    <span
                      className={`whitespace-nowrap pt-0.5 text-[10.5px] font-bold uppercase tracking-[0.03em] ${
                        isUrgent(row.due_date, today) ? 'text-[#D97B4F]' : 'text-[#8B9298]'
                      }`}
                    >
                      {dueLabel(row.due_date, today)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

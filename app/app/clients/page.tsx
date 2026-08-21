import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fraunces } from '@/lib/fonts'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, phone, is_minimal')
    .is('archived_at', null)
    .order('name', { ascending: true })

  const rows = clients ?? []

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-6 md:max-w-lg md:px-10 md:pt-10">
      <div className="mb-3.5 flex items-center justify-between">
        <h1 className={`${fraunces.className} text-2xl text-[#22303A]`}>Clients</h1>
        <Link
          href="/app/clients/new"
          aria-label="Nouveau client"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A5F7A] text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="pt-10 text-center text-sm text-[#5B6B72]">
          Aucun client pour l&apos;instant — la première note vocale en créera un.
        </p>
      ) : (
        <div>
          {rows.map((client) => {
            const initial = client.name.trim()[0]?.toUpperCase() ?? '?'
            return (
              <Link
                key={client.id}
                href={`/app/clients/${client.id}`}
                className="flex items-center gap-3 border-b border-[#22303A]/[0.14] py-3 last:border-b-0"
              >
                <div className={`${fraunces.className} flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1A5F7A]/10 text-[15px] text-[#1A5F7A]`}>
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-bold text-[#22303A]">{client.name}</p>
                  <p className="text-[12.5px] text-[#5B6B72]">{client.phone || 'Pas de numéro'}</p>
                </div>
                {client.is_minimal && (
                  <span className="rounded-[5px] bg-[#3A9188]/[0.13] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.03em] text-[#3A9188]">
                    À compléter
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

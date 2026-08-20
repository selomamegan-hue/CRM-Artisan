import { createClient } from '@/lib/supabase/server'
import { fraunces } from '@/lib/fonts'
import { signOut } from '../actions'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, whatsapp')
    .eq('id', user!.id)
    .single()

  const name = profile?.full_name?.trim() || 'Sans nom'
  const initial = (profile?.full_name?.trim()?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()

  const rows = [
    { label: 'Nom', value: profile?.full_name || '—' },
    { label: 'Téléphone', value: profile?.phone || '—' },
    { label: 'WhatsApp', value: profile?.whatsapp || '—' },
  ]

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-10 pt-6 md:max-w-lg md:px-10 md:pt-10">
      <h1 className={`${fraunces.className} text-2xl text-[#22303A]`}>Profil</h1>

      <div className="flex flex-col items-center gap-2.5 py-6">
        <div className={`${fraunces.className} flex h-16 w-16 items-center justify-center rounded-full bg-[#1A5F7A]/10 text-2xl text-[#1A5F7A]`}>
          {initial}
        </div>
        <p className="text-base font-bold text-[#22303A]">{name}</p>
      </div>

      <div className="rounded-xl bg-white px-4 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-[#22303A]/[0.14] py-3.5 last:border-b-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">{row.label}</span>
            <span className="text-[15px] font-semibold text-[#22303A]">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="flex-1" />

      <form action={signOut} className="mt-5">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-[#22303A]/25 py-3 text-[14.5px] font-semibold text-[#5B6B72]"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  )
}

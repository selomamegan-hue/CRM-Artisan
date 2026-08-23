import { createClient } from '@/lib/supabase/server'
import { fraunces } from '@/lib/fonts'
import { formatAmount } from '@/lib/currency'
import { signOut, submitFeedback, updateProfileName, uploadLogo, updateVatRegistered } from '../actions'
import { subscriptionStatus, subscriptionLabel, SUBSCRIPTION_STYLE, SUBSCRIPTION_DOT } from '@/lib/subscription'
import { planHasFeature, PLAN_LABEL } from '@/lib/plans'
import { getUserPlan } from '@/lib/plans-server'
import { UpsellBanner } from '@/components/UpsellBanner'

export default async function SettingsPage({ searchParams }: PageProps<'/app/settings'>) {
  const { feedback, name_updated, logo_updated, logo_error, vat_updated } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const plan = await getUserPlan()
  const canSeeDashboard = planHasFeature(plan, 'dashboard')
  const canUseLogo = planHasFeature(plan, 'devis_logo')
  const canUseDevisPdf = planHasFeature(plan, 'devis_pdf')

  const [{ data: profile }, factureActionsResult] = await Promise.all([
    supabase.from('profiles').select('full_name, phone, whatsapp, subscription_expires_at, logo_url, vat_registered').eq('id', user!.id).single(),
    canSeeDashboard
      ? supabase.from('actions').select('amount, amount_paid').eq('type', 'facture').neq('status', 'annule').not('amount', 'is', null)
      : Promise.resolve({ data: null }),
  ])

  const totalFacture = (factureActionsResult.data ?? []).reduce((sum, a) => sum + (a.amount ?? 0), 0)
  const totalCollecte = (factureActionsResult.data ?? []).reduce((sum, a) => sum + (a.amount_paid ?? 0), 0)

  const name = profile?.full_name?.trim() || 'Sans nom'
  const initial = (profile?.full_name?.trim()?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()

  const today = new Date()
  const status = subscriptionStatus(profile?.subscription_expires_at ?? null, today)
  const statusLabel =
    status === 'inconnu'
      ? subscriptionLabel(profile?.subscription_expires_at ?? null, today)
      : `${PLAN_LABEL[plan]} — ${subscriptionLabel(profile?.subscription_expires_at ?? null, today)}`

  const rows = [
    { label: 'Téléphone', value: profile?.phone || '—' },
    { label: 'WhatsApp', value: profile?.whatsapp || '—' },
  ]

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 pb-10 pt-6 md:max-w-lg md:px-10 md:pt-10">
      <h1 className={`${fraunces.className} text-2xl text-[#22303A]`}>Profil</h1>

      <div className="flex flex-col items-center gap-2.5 py-6">
        <div className={`${fraunces.className} flex h-16 w-16 items-center justify-center rounded-full bg-[#1A5F7A]/10 text-2xl text-[#1A5F7A]`}>
          {initial}
        </div>
        <p className="text-base font-bold text-[#22303A]">{name}</p>
        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold ${SUBSCRIPTION_STYLE[status]}`}>
          <span className={`h-[7px] w-[7px] rounded-full ${SUBSCRIPTION_DOT[status]}`} />
          {statusLabel}
        </span>
      </div>

      <div className="mb-6">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">
          Nom (apparaît en signature de tes messages)
        </p>
        <form action={updateProfileName} className="flex items-center gap-2">
          <input
            name="full_name"
            defaultValue={profile?.full_name ?? ''}
            placeholder="Ex : Marc Prestations SARL"
            className="w-full rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
          />
          <button type="submit" className="shrink-0 rounded bg-[#1A5F7A] px-3 py-2 text-sm font-semibold text-white">
            Enregistrer
          </button>
        </form>
        {name_updated === '1' && <p className="mt-1.5 text-[12.5px] text-[#3A9188]">Nom mis à jour.</p>}
      </div>

      <div className="mb-6">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">
          Logo (apparaît sur tes devis PDF)
        </p>
        {canUseLogo ? (
          <>
            <div className="flex items-center gap-3">
              {profile?.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.logo_url}
                  alt="Logo actuel"
                  className="h-12 w-12 rounded-lg border border-[#22303A]/15 object-contain bg-white"
                />
              )}
              <form action={uploadLogo} className="flex flex-1 items-center gap-2">
                <input
                  type="file"
                  name="logo"
                  accept="image/jpeg"
                  required
                  className="w-full min-w-0 text-[12.5px] text-[#5B6B72] file:mr-2 file:rounded file:border-0 file:bg-[#1A5F7A] file:px-3 file:py-1.5 file:text-[12.5px] file:font-semibold file:text-white"
                />
                <button type="submit" className="shrink-0 rounded bg-[#1A5F7A] px-3 py-2 text-sm font-semibold text-white">
                  Envoyer
                </button>
              </form>
            </div>
            {logo_updated === '1' && <p className="mt-1.5 text-[12.5px] text-[#3A9188]">Logo mis à jour.</p>}
            {logo_error === 'format' && <p className="mt-1.5 text-[12.5px] text-[#C96A3D]">Format non supporté — utilise un JPEG.</p>}
            {logo_error === 'size' && <p className="mt-1.5 text-[12.5px] text-[#C96A3D]">Fichier trop lourd (2 Mo maximum).</p>}
            {logo_error === 'upload' && <p className="mt-1.5 text-[12.5px] text-[#C96A3D]">L&apos;envoi a échoué, réessaie.</p>}
          </>
        ) : (
          <UpsellBanner text="Logo personnalisé sur tes devis" plan="Premium" />
        )}
      </div>

      {canUseDevisPdf && (
        <div className="mb-6">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Taxes</p>
          <form action={updateVatRegistered} className="flex items-center justify-between rounded-[10px] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
            <label htmlFor="vat_registered" className="flex items-center gap-2.5 text-[13px] text-[#22303A]">
              <input
                id="vat_registered"
                type="checkbox"
                name="vat_registered"
                defaultChecked={profile?.vat_registered ?? false}
                className="h-5 w-5 accent-[#1A5F7A]"
              />
              Assujetti à la TVA (18 %)
            </label>
            <button type="submit" className="shrink-0 rounded border border-[#22303A]/25 px-3 py-1.5 text-[12.5px] font-semibold text-[#22303A]">
              Enregistrer
            </button>
          </form>
          <p className="mt-1.5 text-[11px] text-[#8B9298]">
            Applique la TVA par défaut sur tes prochains devis — modifiable sur chaque devis.
          </p>
          {vat_updated === '1' && <p className="mt-1.5 text-[12.5px] text-[#3A9188]">Réglage TVA mis à jour.</p>}
        </div>
      )}

      <div className="rounded-xl bg-white px-4 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-[#22303A]/[0.14] py-3.5 last:border-b-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">{row.label}</span>
            <span className="text-[15px] font-semibold text-[#22303A]">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Activité (factures)</p>
        {canSeeDashboard ? (
          <div className="flex gap-2.5">
            <div className="flex-1 rounded-[10px] bg-white py-3.5 text-center shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
              <span className="block text-[15px] font-bold text-[#22303A]">{formatAmount(totalFacture)}</span>
              <span className="text-[10.5px] uppercase tracking-[0.03em] text-[#5B6B72]">Facturé</span>
            </div>
            <div className="flex-1 rounded-[10px] bg-white py-3.5 text-center shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
              <span className="block text-[15px] font-bold text-[#3A9188]">{formatAmount(totalCollecte)}</span>
              <span className="text-[10.5px] uppercase tracking-[0.03em] text-[#5B6B72]">Collecté</span>
            </div>
            <div className="flex-1 rounded-[10px] bg-white py-3.5 text-center shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
              <span className="block text-[15px] font-bold text-[#D97B4F]">{formatAmount(totalFacture - totalCollecte)}</span>
              <span className="text-[10.5px] uppercase tracking-[0.03em] text-[#5B6B72]">Restant dû</span>
            </div>
          </div>
        ) : (
          <UpsellBanner text="Tableau de bord facturé vs collecté" plan="Gold" />
        )}
      </div>

      <div className="mt-6">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Un avis, une idée ?</p>
        <form action={submitFeedback} className="flex flex-col gap-2">
          <textarea
            name="message"
            placeholder="Dis-nous ce qui te plaît, ce qui manque, ou ce que tu attends de Bonfil."
            required
            rows={3}
            className="w-full resize-none rounded-[10px] border border-[#22303A]/20 bg-white px-3.5 py-3 text-[13.5px] text-[#22303A] outline-none focus:border-[#1A5F7A]"
          />
          <button type="submit" className="self-start rounded-full bg-[#1A5F7A] px-5 py-2 text-[13px] font-semibold text-white">
            Envoyer
          </button>
          {feedback === 'sent' && <p className="text-[12.5px] text-[#3A9188]">Merci, ton message est bien parti.</p>}
        </form>
      </div>

      <form action={signOut} className="mt-8">
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

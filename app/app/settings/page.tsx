import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fraunces } from '@/lib/fonts'
import { formatAmount } from '@/lib/currency'
import { signOut, submitFeedback, updateProfileName, updateProfileContact, uploadLogo, updateVatRegistered } from '../actions'
import { inviteSecondaryAccount, revokeSecondaryAccount, inviteLink } from './delegates-actions'
import { subscriptionStatus, subscriptionLabel, SUBSCRIPTION_STYLE, SUBSCRIPTION_DOT } from '@/lib/subscription'
import { planHasFeature, secondaryAccountLimit, PLAN_LABEL } from '@/lib/plans'
import { getUserPlan } from '@/lib/plans-server'
import { resolveOwnerId, isActiveDelegate } from '@/lib/delegates'
import { UpsellBanner } from '@/components/UpsellBanner'
import { fetchEncours, totalEncours, devisAccepte, type DevisVersionResume } from '@/lib/encours'

/* Facturé et Collecté sont des flux : ils n'ont de sens que sur une période.
   Reste à encaisser est un stock — une photo prise aujourd'hui — d'où sa
   place à part, hors du sélecteur. « Reste à encaisser en juillet » ne
   voudrait rien dire. */
const PERIODES = [
  { cle: 'mois', label: 'Ce mois' },
  { cle: 'trimestre', label: '3 mois' },
  { cle: 'annee', label: 'Cette année' },
  { cle: 'tout', label: 'Tout' },
] as const

type PeriodeCle = (typeof PERIODES)[number]['cle']

function debutPeriode(cle: PeriodeCle, aujourdhui: Date): Date | null {
  const a = aujourdhui.getFullYear()
  const m = aujourdhui.getMonth()
  if (cle === 'mois') return new Date(a, m, 1)
  if (cle === 'trimestre') return new Date(a, m - 2, 1)
  if (cle === 'annee') return new Date(a, 0, 1)
  return null
}

export default async function SettingsPage({ searchParams }: PageProps<'/app/settings'>) {
  const { feedback, name_updated, contact_updated, logo_updated, logo_error, vat_updated, invite_token, delegate_error, delegate_revoked, periode } =
    await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const plan = await getUserPlan()
  const canSeeDashboard = planHasFeature(plan, 'dashboard')
  const canUseLogo = planHasFeature(plan, 'devis_logo')
  const canUseDevisPdf = planHasFeature(plan, 'devis_pdf')
  const canUseSecondaryAccounts = planHasFeature(plan, 'secondary_accounts')

  const ownerId = await resolveOwnerId(supabase, user!.id)
  const isDelegate = await isActiveDelegate(supabase, user!.id)

  const periodeActive: PeriodeCle = PERIODES.some((p) => p.cle === periode) ? (periode as PeriodeCle) : 'mois'
  const debut = debutPeriode(periodeActive, new Date())

  // Le document porte la date qui compte pour « Facturé » — celle imprimée
  // sur le devis. L'encaissement, lui, se lit dans la table des paiements :
  // amount_paid est un cumul sans date, il rangerait un acompte de mars dans
  // le mois où on le regarde.
  const emisQuery = supabase
    .from('actions')
    .select('type, amount, devis_versions(validated_at, created_at)')
    .in('type', ['facture', 'devis'])
    .neq('status', 'annule')
    .not('amount', 'is', null)
  const encaissesQuery = supabase.from('payments').select('amount')

  const [{ data: profile }, emisResult, encaissesResult, encours, delegatesResult] = await Promise.all([
    supabase.from('profiles').select('full_name, address, whatsapp, subscription_expires_at, logo_url, vat_registered, is_admin').eq('id', ownerId).single(),
    canSeeDashboard
      ? debut
        ? emisQuery.gte('created_at', debut.toISOString())
        : emisQuery
      : Promise.resolve({ data: null }),
    canSeeDashboard
      ? debut
        ? encaissesQuery.gte('created_at', debut.toISOString())
        : encaissesQuery
      : Promise.resolve({ data: null }),
    canSeeDashboard ? fetchEncours(supabase) : Promise.resolve([]),
    !isDelegate && canUseSecondaryAccounts
      ? supabase
          .from('delegates')
          .select('id, status, invite_token, invite_expires_at, secondary_user_id')
          .eq('primary_user_id', ownerId)
          .in('status', ['pending', 'active'])
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: null }),
  ])

  const delegates = delegatesResult.data ?? []
  const secondaryLimit = secondaryAccountLimit(plan)
  const justInvitedLink = invite_token ? await inviteLink(String(invite_token)) : null

  // Un devis accepté vaut facturé : le client a dit oui, l'argent est engagé.
  // Bonfil ne produit pas de facture — le devis EST le document — donc ne
  // compter que les actions nées « facture » laisserait un artisan qui
  // travaille au devis devant un tableau de bord vide.
  type EmisRow = { type: string; amount: number | null; devis_versions: DevisVersionResume[] | null }
  const emis = ((emisResult.data ?? []) as EmisRow[]).filter(
    (a) => a.type !== 'devis' || devisAccepte(a.devis_versions),
  )

  const totalFacture = emis.reduce((sum, a) => sum + (a.amount ?? 0), 0)
  const totalCollecte = ((encaissesResult.data ?? []) as { amount: number | null }[]).reduce(
    (sum, p) => sum + (p.amount ?? 0),
    0,
  )
  // Le même calcul que la vue Impayés, à la ligne près — c'est tout l'objet
  // de lib/encours.ts : les deux écrans ne peuvent plus annoncer deux chiffres.
  const resteAEncaisser = totalEncours(encours)

  const name = profile?.full_name?.trim() || 'Sans nom'
  const initial = (profile?.full_name?.trim()?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()

  const today = new Date()
  const status = subscriptionStatus(profile?.subscription_expires_at ?? null, today)
  const statusLabel =
    status === 'inconnu'
      ? subscriptionLabel(profile?.subscription_expires_at ?? null, today)
      : `${PLAN_LABEL[plan]} — ${subscriptionLabel(profile?.subscription_expires_at ?? null, today)}`

  const rows = [
    { label: 'Adresse', value: profile?.address || '—' },
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

      {isDelegate && (
        <div className="mb-6 rounded-[10px] bg-[#1A5F7A]/10 px-4 py-3.5 text-[13px] leading-relaxed text-[#22303A]">
          Tu es connecté·e comme <strong>compte secondaire</strong> de {name}. Tu vois et modifies les mêmes clients, notes et devis — l&apos;abonnement, le logo, la TVA et les autres comptes secondaires restent réservés au compte principal.
        </div>
      )}

      {!isDelegate && (
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
      )}

      {!isDelegate && (
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
      )}

      {!isDelegate && canUseDevisPdf && (
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

      {!isDelegate && (
        <div className="mb-6">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Comptes secondaires</p>
          {canUseSecondaryAccounts ? (
            <>
              {delegates.length > 0 && (
                <div className="mb-2.5 rounded-xl bg-white px-4 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
                  {delegates.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 border-b border-[#22303A]/[0.14] py-3 last:border-b-0">
                      <span className="text-[13px] text-[#22303A]">
                        {d.status === 'active' ? 'Compte actif' : 'Invitation en attente'}
                      </span>
                      <form action={revokeSecondaryAccount.bind(null, d.id)}>
                        <button type="submit" className="text-[12.5px] font-semibold text-[#C96A3D] underline underline-offset-2">
                          {d.status === 'active' ? 'Révoquer' : 'Annuler'}
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}

              {justInvitedLink && (
                <div className="mb-2.5 rounded-[10px] bg-[#3A9188]/10 px-3.5 py-3 text-[13px] text-[#22303A]">
                  <p className="mb-1.5 font-semibold">Invitation créée — partage ce lien :</p>
                  <p className="mb-2 break-all rounded border border-[#22303A]/15 bg-white px-2.5 py-2 text-[12px] text-[#5B6B72]">{justInvitedLink}</p>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Rejoins-moi sur Bonfil : ${justInvitedLink}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12.5px] font-semibold text-[#1A5F7A] underline underline-offset-2"
                  >
                    Partager sur WhatsApp
                  </a>
                </div>
              )}

              {delegate_error === 'quota' && (
                <p className="mb-2 text-[12.5px] text-[#C96A3D]">Limite de comptes secondaires atteinte pour ton offre.</p>
              )}
              {delegate_revoked === '1' && <p className="mb-2 text-[12.5px] text-[#3A9188]">Accès révoqué.</p>}

              {secondaryLimit == null || delegates.length < secondaryLimit ? (
                <form action={inviteSecondaryAccount}>
                  <button type="submit" className="w-full rounded-[10px] border border-[#1A5F7A] py-2.5 text-[13px] font-semibold text-[#1A5F7A]">
                    + Inviter un compte secondaire
                  </button>
                </form>
              ) : (
                <p className="text-[11px] text-[#8B9298]">
                  {delegates.length}/{secondaryLimit} comptes secondaires utilisés — révoque un accès pour en inviter un autre.
                </p>
              )}
            </>
          ) : (
            <UpsellBanner text="Comptes secondaires pour ton équipe" plan="Premium" />
          )}
        </div>
      )}

      {isDelegate ? (
        <div className="rounded-xl bg-white px-4 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between border-b border-[#22303A]/[0.14] py-3.5 last:border-b-0">
              <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">{row.label}</span>
              <span className="text-[15px] font-semibold text-[#22303A]">{row.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">
            Adresse et WhatsApp (apparaissent sur tes devis PDF)
          </p>
          <form action={updateProfileContact} className="flex flex-col gap-2">
            <textarea
              name="address"
              rows={2}
              defaultValue={profile?.address ?? ''}
              placeholder="Adresse — ex : 01 BP 1442, Lomé"
              className="w-full resize-none rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
            />
            <input
              name="whatsapp"
              type="tel"
              defaultValue={profile?.whatsapp ?? ''}
              placeholder="WhatsApp — ex : +228 90 12 34 56"
              className="w-full rounded border border-[#22303A]/20 bg-white px-3 py-2 text-sm text-[#22303A] outline-none focus:border-[#1A5F7A]"
            />
            <button type="submit" className="self-start rounded bg-[#1A5F7A] px-3 py-2 text-sm font-semibold text-white">
              Enregistrer
            </button>
          </form>
          {contact_updated === '1' && <p className="mt-1.5 text-[12.5px] text-[#3A9188]">Coordonnées mises à jour.</p>}
        </div>
      )}

      <div className="mt-6">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Activité (factures et devis validés)</p>
        {canSeeDashboard ? (
          <>
            <div className="mb-2 flex gap-1.5">
              {PERIODES.map((p) => (
                <Link
                  key={p.cle}
                  href={`/app/settings?periode=${p.cle}`}
                  scroll={false}
                  className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                    p.cle === periodeActive ? 'bg-[#1A5F7A] text-white' : 'bg-white text-[#5B6B72]'
                  }`}
                >
                  {p.label}
                </Link>
              ))}
            </div>

            <div className="flex gap-2.5">
              <div className="flex-1 rounded-[10px] bg-white py-3.5 text-center shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
                <span className="block text-[15px] font-bold text-[#22303A]">{formatAmount(totalFacture)}</span>
                <span className="text-[10.5px] uppercase tracking-[0.03em] text-[#5B6B72]">Facturé</span>
              </div>
              <div className="flex-1 rounded-[10px] bg-white py-3.5 text-center shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
                <span className="block text-[15px] font-bold text-[#3A9188]">{formatAmount(totalCollecte)}</span>
                <span className="text-[10.5px] uppercase tracking-[0.03em] text-[#5B6B72]">Collecté</span>
              </div>
            </div>

            {/* Hors période, volontairement : c'est l'état d'aujourd'hui, et
                c'est exactement ce que la vue Impayés détaille. */}
            <Link
              href="/app/impayes"
              className="mt-2.5 flex items-center justify-between rounded-[10px] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">
                Reste à encaisser <span className="normal-case tracking-normal text-[#8B9298]">· à ce jour</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold text-[#D97B4F]">{formatAmount(resteAEncaisser)}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#8B9298]">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </span>
            </Link>
          </>
        ) : (
          <UpsellBanner text="Tableau de bord facturé vs collecté" plan="Gold" />
        )}
      </div>

      {/* Réservé au compte principal : c'est de l'argent qui sort. */}
      {profile?.is_admin && (
        <Link
          href="/app/parrainage"
          className="mt-6 flex items-center justify-between rounded-[10px] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]"
        >
          <span className="text-[14px] font-semibold text-[#22303A]">Parrainage</span>
          <span className="flex items-center gap-1.5 text-[12.5px] text-[#5B6B72]">
            Codes et commissions
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#8B9298]">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        </Link>
      )}

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

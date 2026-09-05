import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fraunces } from '@/lib/fonts'
import { formatAmount } from '@/lib/currency'
import { whatsappLink } from '@/lib/whatsapp'
import type { Plan } from '@/lib/plans'
import { PLAN_LABEL, PLAN_ORDER, PLAN_PRICE } from '@/lib/plans'
import {
  TAUX_COMMISSION,
  DUREE_COMMISSION_MOIS,
  commissionMensuelle,
  etatDuCode,
  finDeCommission,
} from '@/lib/parrainage'
import { creerCode, revoquerCode, reactiverCode, encaisserUnMois } from './actions'

/* L'écran d'administration du programme partenaires. Réservé au compte
   principal : c'est de l'argent qui sort, pas une page de plus. */

type Ligne = {
  code_id: string
  code: string
  partner_name: string
  partner_whatsapp: string | null
  note: string | null
  expires_at: string
  revoked_at: string | null
  artisan_id: string | null
  artisan_nom: string | null
  artisan_plan: string | null
  inscrit_le: string | null
  first_paid_at: string | null
  abonnement_jusqu_au: string | null
}

type Artisan = {
  id: string
  nom: string
  plan: Plan
  inscritLe: string
  premierPaiement: string | null
  abonnementJusquAu: string | null
}

type CodeGroupe = {
  id: string
  code: string
  partenaire: string
  whatsapp: string | null
  note: string | null
  expiration: string
  revoqueLe: string | null
  artisans: Artisan[]
}

const jour = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

export default async function ParrainagePage({ searchParams }: PageProps<'/app/parrainage'>) {
  const { cree, revoque, encaisse, erreur } = await searchParams
  const aujourdhui = new Date().toISOString().slice(0, 10)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profil } = await supabase.from('profiles').select('is_admin').eq('id', user!.id).single()
  if (!profil?.is_admin) notFound()

  const { data } = await supabase.rpc('parrainage_tableau')
  const lignes = (data ?? []) as Ligne[]

  const parCode = new Map<string, CodeGroupe>()
  for (const l of lignes) {
    if (!parCode.has(l.code_id)) {
      parCode.set(l.code_id, {
        id: l.code_id,
        code: l.code,
        partenaire: l.partner_name,
        whatsapp: l.partner_whatsapp,
        note: l.note,
        expiration: l.expires_at,
        revoqueLe: l.revoked_at,
        artisans: [],
      })
    }
    if (l.artisan_id) {
      parCode.get(l.code_id)!.artisans.push({
        id: l.artisan_id,
        nom: l.artisan_nom?.trim() || 'Sans nom',
        plan: (l.artisan_plan ?? 'essai') as Plan,
        inscritLe: l.inscrit_le!,
        premierPaiement: l.first_paid_at,
        abonnementJusquAu: l.abonnement_jusqu_au,
      })
    }
  }
  const codes = [...parCode.values()]

  // Ce qui est réellement dû ce mois-ci : un artisan ne compte que si son
  // premier paiement est enregistré et que ses douze mois courent encore.
  const maintenant = new Date()
  const enCours = (a: Artisan) =>
    a.premierPaiement != null && finDeCommission(new Date(a.premierPaiement)) > maintenant

  const duCeMois = codes.reduce(
    (total, c) => total + c.artisans.filter(enCours).reduce((s, a) => s + commissionMensuelle(a.plan), 0),
    0
  )
  const artisansAmenes = codes.reduce((n, c) => n + c.artisans.length, 0)

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 pb-10 pt-6 md:max-w-2xl md:px-10 md:pt-10">
      <Link href="/app/settings" className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[#22303A]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Profil
      </Link>

      <h1 className={`${fraunces.className} text-2xl text-[#22303A]`}>Parrainage</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-[#5B6B72]">
        {TAUX_COMMISSION} % de l&apos;abonnement, pendant {DUREE_COMMISSION_MOIS} mois à partir du premier
        mois payé de chaque artisan.
      </p>

      <div className="mt-4 flex gap-2.5">
        <div className="flex-1 rounded-[10px] bg-white py-3.5 text-center shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
          <span className="block text-[15px] font-bold text-[#D97B4F]">{formatAmount(duCeMois)}</span>
          <span className="text-[10.5px] uppercase tracking-[0.03em] text-[#5B6B72]">Dû ce mois</span>
        </div>
        <div className="flex-1 rounded-[10px] bg-white py-3.5 text-center shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
          <span className="block text-[15px] font-bold text-[#22303A]">{artisansAmenes}</span>
          <span className="text-[10.5px] uppercase tracking-[0.03em] text-[#5B6B72]">Artisans amenés</span>
        </div>
        <div className="flex-1 rounded-[10px] bg-white py-3.5 text-center shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
          <span className="block text-[15px] font-bold text-[#22303A]">{codes.length}</span>
          <span className="text-[10.5px] uppercase tracking-[0.03em] text-[#5B6B72]">Codes</span>
        </div>
      </div>

      {/* ---------- Créer un code ---------- */}
      <div className="mt-6 rounded-xl bg-white px-4 py-4 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">
          Nouveau code
        </p>
        <form action={creerCode} className="flex flex-col gap-2">
          <input
            name="partner_name"
            placeholder="Nom du partenaire"
            required
            className="rounded-[8px] border border-[#22303A]/20 px-3 py-2 text-[14px] text-[#22303A] outline-none focus:border-[#1A5F7A]"
          />
          <input
            name="partner_whatsapp"
            placeholder="WhatsApp (facultatif)"
            className="rounded-[8px] border border-[#22303A]/20 px-3 py-2 text-[14px] text-[#22303A] outline-none focus:border-[#1A5F7A]"
          />
          <input
            name="note"
            placeholder="Note — d’où il vient, ce qu’il a promis (facultatif)"
            className="rounded-[8px] border border-[#22303A]/20 px-3 py-2 text-[14px] text-[#22303A] outline-none focus:border-[#1A5F7A]"
          />
          <button
            type="submit"
            className="mt-1 rounded-full bg-[#1A5F7A] px-3.5 py-2.5 text-[13px] font-semibold text-white"
          >
            Générer le code
          </button>
        </form>
        {cree === '1' && <p className="mt-2 text-[12.5px] text-[#3A9188]">Code créé — il est en tête de liste.</p>}
        {revoque === '1' && <p className="mt-2 text-[12.5px] text-[#D97B4F]">Code révoqué. Les commissions en cours continuent.</p>}
        {erreur === 'nom' && <p className="mt-2 text-[12.5px] text-[#D97B4F]">Il faut au moins un nom de partenaire.</p>}
        {erreur === 'creation' && <p className="mt-2 text-[12.5px] text-[#D97B4F]">La création a échoué, réessaie.</p>}
        {encaisse === '1' && <p className="mt-2 text-[12.5px] text-[#3A9188]">Mois encaissé — offre et échéance à jour.</p>}
        {erreur === 'encaissement' && (
          <p className="mt-2 text-[12.5px] text-[#D97B4F]">Il faut une offre et une date. Rien n&apos;a été enregistré.</p>
        )}
      </div>

      {/* ---------- Les codes ---------- */}
      {codes.length === 0 ? (
        <p className="pt-10 text-center text-sm text-[#5B6B72]">Aucun code pour l&apos;instant.</p>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {codes.map((c) => {
            const etat = etatDuCode({ expires_at: c.expiration, revoked_at: c.revoqueLe }, maintenant)
            const duParCode = c.artisans.filter(enCours).reduce((s, a) => s + commissionMensuelle(a.plan), 0)

            return (
              <div
                key={c.id}
                className="rounded-xl bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`${fraunces.className} text-[19px] tracking-[0.1em] text-[#22303A]`}>{c.code}</p>
                    <p className="mt-0.5 truncate text-[13.5px] font-semibold text-[#22303A]">{c.partenaire}</p>
                    {c.note && <p className="mt-0.5 text-[12px] leading-snug text-[#8B9298]">{c.note}</p>}
                  </div>
                  <span
                    className={`shrink-0 rounded-[5px] px-2 py-1 text-[11px] font-semibold ${
                      etat.ton === 'ouvert' ? 'bg-[#3A9188]/[0.13] text-[#3A9188]' : 'bg-[#22303A]/[0.08] text-[#8B9298]'
                    }`}
                  >
                    {etat.libelle}
                  </span>
                </div>

                <p className="mt-2 text-[12px] text-[#8B9298]">
                  {c.revoqueLe ? `Révoqué le ${jour(c.revoqueLe)}` : `Valable jusqu’au ${jour(c.expiration)}`}
                  {duParCode > 0 && <> · {formatAmount(duParCode)} dus ce mois</>}
                </p>

                {c.artisans.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-[#22303A]/[0.12] pt-3">
                    {c.artisans.map((a) => {
                      const ouvert = enCours(a)
                      const fin = a.premierPaiement ? finDeCommission(new Date(a.premierPaiement)) : null
                      return (
                        <div key={a.id} className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <div className="min-w-0">
                              <p className="truncate text-[13.5px] text-[#22303A]">{a.nom}</p>
                              <p className="text-[11.5px] leading-snug text-[#8B9298]">
                                {PLAN_LABEL[a.plan]} · inscrit le {jour(a.inscritLe)}
                                {a.abonnementJusquAu && <> · payé jusqu’au {jour(a.abonnementJusquAu)}</>}
                                {fin && <> · commission jusqu’au {jour(fin.toISOString())}</>}
                              </p>
                            </div>
                            {a.premierPaiement && (
                              <span className={`shrink-0 text-[12.5px] font-semibold ${ouvert ? 'text-[#3A9188]' : 'text-[#8B9298]'}`}>
                                {ouvert ? `${formatAmount(commissionMensuelle(a.plan))} / mois` : 'Terminé'}
                              </span>
                            )}
                          </div>

                          {/* Offre, date et échéance bougent ensemble : c'est le
                              même geste, le jour où l'argent arrive. */}
                          <form action={encaisserUnMois.bind(null, a.id)} className="flex flex-wrap items-center gap-1.5">
                            <select
                              name="offre"
                              required
                              defaultValue={PLAN_ORDER.includes(a.plan) ? a.plan : ''}
                              className="rounded-[6px] border border-[#22303A]/20 bg-white px-2 py-1 text-[12px] text-[#22303A] outline-none focus:border-[#1A5F7A]"
                            >
                              <option value="" disabled>
                                Offre…
                              </option>
                              {PLAN_ORDER.map((p) => (
                                <option key={p} value={p}>
                                  {PLAN_LABEL[p]} — {formatAmount(PLAN_PRICE[p])}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              name="date"
                              required
                              defaultValue={aujourdhui}
                              className="rounded-[6px] border border-[#22303A]/20 px-2 py-1 text-[12px] text-[#22303A] outline-none focus:border-[#1A5F7A]"
                            />
                            <button type="submit" className="text-[12.5px] font-semibold text-[#1A5F7A] underline underline-offset-2">
                              {a.premierPaiement ? 'Encaisser un mois' : 'Encaisser le 1er mois'}
                            </button>
                          </form>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#22303A]/[0.12] pt-3">
                  {c.whatsapp && (
                    <a
                      href={whatsappLink(
                        c.whatsapp,
                        `Bonjour ${c.partenaire}, voici votre code de parrainage Bonfil : ${c.code}\n\nL'artisan le saisit à l'inscription sur bonfil.app. Vous touchez ${TAUX_COMMISSION} % de son abonnement pendant ${DUREE_COMMISSION_MOIS} mois.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12.5px] font-semibold text-[#3A9188] underline underline-offset-2"
                    >
                      Envoyer le code sur WhatsApp
                    </a>
                  )}
                  {c.revoqueLe ? (
                    <form action={reactiverCode.bind(null, c.id)}>
                      <button type="submit" className="text-[12.5px] font-semibold text-[#1A5F7A] underline underline-offset-2">
                        Réactiver
                      </button>
                    </form>
                  ) : (
                    <form action={revoquerCode.bind(null, c.id)}>
                      <button type="submit" className="text-[12.5px] font-semibold text-[#D97B4F] underline underline-offset-2">
                        Révoquer
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

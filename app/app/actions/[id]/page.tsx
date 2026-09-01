import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fraunces } from '@/lib/fonts'
import { dueLabel } from '@/lib/urgency'
import { formatAmount } from '@/lib/currency'
import { whatsappLink } from '@/lib/whatsapp'
import { planHasFeature, devisMonthlyLimit } from '@/lib/plans'
import { getUserPlan } from '@/lib/plans-server'
import { countDevisSentThisMonth } from '@/lib/devis-versions'
import { siteOrigin } from '@/lib/site-origin'
import { resolveOwnerId } from '@/lib/delegates'
import { markDone, cancelAction, postpone, recordPayment, addDevisItem, removeDevisItem, markDevisValidated, updateDevisTotals, shareDevis, revokeDevisLink } from './actions'
import { PaymentReceipt } from './receipt'
import { DevisShare } from './devis-share'
import { UpsellBanner } from '@/components/UpsellBanner'

export default async function ActionDetailPage({ params, searchParams }: PageProps<'/app/actions/[id]'>) {
  const { id } = await params
  const { paid, partage } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const ownerId = await resolveOwnerId(supabase, user!.id)

  const [{ data: action }, { data: payments }, { data: profile }, plan] = await Promise.all([
    supabase
      .from('actions')
      .select('id, type, due_date, excerpt, amount, amount_paid, status, clients(name, phone), notes(transcript, site)')
      .eq('id', id)
      .single(),
    supabase.from('payments').select('id, amount, created_at').eq('action_id', id).order('created_at', { ascending: false }),
    // La signature sur les messages clients reste celle du compte principal,
    // pas celle d'un compte secondaire qui aurait rédigé la note.
    supabase.from('profiles').select('full_name').eq('id', ownerId).single(),
    getUserPlan(),
  ])

  if (!action) notFound()

  let devisVersion: {
    number: string
    status: string
    validated_at: string | null
    discount_amount: number
    vat_rate: number | null
    public_token: string | null
  } | null = null
  let devisItems: { id: string; description: string; quantity: number; unit_price: number }[] = []

  if (action.type === 'devis') {
    const { data: version } = await supabase
      .from('devis_versions')
      .select('id, number, status, validated_at, discount_amount, vat_rate, public_token')
      .eq('action_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (version) {
      devisVersion = {
        number: version.number,
        status: version.status,
        validated_at: version.validated_at,
        discount_amount: Number(version.discount_amount),
        vat_rate: version.vat_rate != null ? Number(version.vat_rate) : null,
        public_token: version.public_token,
      }
      const { data: items } = await supabase
        .from('devis_items')
        .select('id, description, quantity, unit_price')
        .eq('version_id', version.id)
        .order('position')
      devisItems = items ?? []
    }
  }

  const today = new Date()
  const client = action.clients as unknown as { name: string; phone: string | null } | null
  const note = action.notes as unknown as { transcript: string; site: string | null } | null
  const balance = action.amount != null ? action.amount - action.amount_paid : null
  const lastPayment = payments?.[0]
  const canUseSignature = planHasFeature(plan, 'custom_signature')
  const signature = canUseSignature ? profile?.full_name?.trim() || null : null
  const canTrackPayments = planHasFeature(plan, 'payments')
  const canUseDevisPdf = planHasFeature(plan, 'devis_pdf')

  const isNewDevisSend = !devisVersion || devisVersion.status === 'brouillon'
  const monthlyLimit = devisMonthlyLimit(plan)
  let devisRemaining: number | null = null
  if (canUseDevisPdf && action.type === 'devis' && isNewDevisSend && monthlyLimit != null) {
    const used = await countDevisSentThisMonth(supabase, ownerId)
    devisRemaining = monthlyLimit - used
  }
  const devisQuotaExhausted = devisRemaining != null && devisRemaining <= 0

  const devisRef = devisVersion ? `Devis N°${devisVersion.number}` : null
  const closing = signature ? `, ${signature}` : ''

  // Le lien public n'existe qu'une fois le devis figé : un brouillon n'a
  // encore rien à montrer au client.
  const lienDevis = devisVersion?.public_token ? `${await siteOrigin()}/devis/${devisVersion.public_token}` : null
  const messageDevis =
    lienDevis && client && devisVersion
      ? `Bonjour ${client.name}, voici votre devis N°${devisVersion.number}` +
        (action.amount != null ? ` d'un montant de ${formatAmount(action.amount)}` : '') +
        ` : ${lienDevis}` +
        (signature ? `\n\n${signature}` : '')
      : null

  let receiptMessage: string | null = null
  if (paid === '1' && lastPayment && client) {
    if (balance === 0) {
      receiptMessage = devisRef
        ? `Bonjour ${client.name}, votre ${devisRef} est maintenant soldé ! Merci${closing}.`
        : `Bonjour ${client.name}, nous avons bien reçu votre paiement de ${formatAmount(lastPayment.amount)} pour ${action.excerpt}. Le compte est maintenant soldé. Merci${closing}.`
    } else {
      const forLabel = devisRef ? `${action.excerpt} (${devisRef})` : action.excerpt
      receiptMessage = `Bonjour ${client.name}, nous avons bien reçu votre paiement de ${formatAmount(lastPayment.amount)} pour ${forLabel}. Solde restant : ${formatAmount(balance ?? 0)}. Merci${closing}.`
    }
  }

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
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] font-semibold text-[#22303A]">{client?.name ?? 'Client'}</span>
            {client?.phone && (
              <a
                href={`tel:${client.phone.replace(/\s+/g, '')}`}
                aria-label={`Appeler ${client.name}`}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3A9188]/[0.13] text-[#3A9188]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.5 4h3l1.5 4.5-2 1.5a11 11 0 005 5l1.5-2 4.5 1.5v3a2 2 0 01-2.2 2A17 17 0 014.5 6.2 2 2 0 016.5 4z" />
                </svg>
              </a>
            )}
            {client?.phone && (
              <a
                href={whatsappLink(client.phone)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Écrire à ${client.name} sur WhatsApp`}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3A9188]/[0.13] text-[#3A9188]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5.1-1.3A10 10 0 1012 2zm5.6 14.3c-.2.6-1.3 1.2-1.9 1.3-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.6-.6-2.9-1.2-4.7-4.2-4.9-4.4-.1-.2-1.2-1.6-1.2-3s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6c-.1.2-.2.3-.1.5.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.2.1.4.1.5-.1l.7-.8c.2-.3.4-.2.6-.1l1.9.9c.2.1.4.2.4.4.1.2.1.9-.2 1.5z" />
                </svg>
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between py-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Échéance</span>
          <span className="text-[15px] font-semibold text-[#22303A]">
            {action.due_date ? dueLabel(action.due_date, today) : 'Sans échéance'}
          </span>
        </div>
        {action.amount != null && (
          <>
            <div className="flex items-center justify-between border-t border-[#22303A]/[0.14] py-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Montant</span>
              <span className="text-[15px] font-semibold text-[#22303A]">{formatAmount(action.amount)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-[#22303A]/[0.14] py-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Acompte reçu</span>
              <span className="text-[15px] font-semibold text-[#22303A]">{formatAmount(action.amount_paid)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-[#22303A]/[0.14] py-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Solde restant</span>
              <span className="text-[15px] font-semibold text-[#D97B4F]">{formatAmount(balance ?? 0)}</span>
            </div>
          </>
        )}
      </div>

      {action.type === 'devis' && canUseDevisPdf && (
        <div className="mt-3 rounded-xl bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Lignes du devis</span>
            {devisQuotaExhausted ? (
              <span className="text-[12.5px] font-semibold text-[#8B9298]">PDF indisponible</span>
            ) : (
              <a
                href={`/api/actions/${action.id}/devis-pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12.5px] font-semibold text-[#1A5F7A] underline underline-offset-2"
              >
                Télécharger le PDF
              </a>
            )}
          </div>

          {devisVersion && (
            <p className="mb-2 text-[12px] text-[#8B9298]">
              {devisVersion.status === 'envoye' ? (
                <>
                  Devis <span className="font-semibold text-[#22303A]">{devisVersion.number}</span> envoyé — le modifier
                  créera une nouvelle version.
                  {devisVersion.validated_at && (
                    <span className="ml-1.5 font-semibold text-[#3A9188]">✓ Validé par le client</span>
                  )}
                </>
              ) : (
                <>
                  Brouillon <span className="font-semibold text-[#22303A]">{devisVersion.number}</span> — pas encore envoyé.
                </>
              )}
            </p>
          )}

          {partage === 'quota' && (
            <p className="mb-2 text-[12px] font-semibold text-[#D97B4F]">
              Quota de devis atteint ce mois-ci : le lien n&apos;a pas pu être créé.
            </p>
          )}

          {partage === 'revoque' && (
            <p className="mb-2 text-[12px] font-semibold text-[#D97B4F]">
              Lien désactivé. L&apos;adresse déjà envoyée ne s&apos;ouvre plus.
            </p>
          )}

          {lienDevis && messageDevis ? (
            <DevisShare
              url={lienDevis}
              message={messageDevis}
              phone={client?.phone ?? null}
              revoke={revokeDevisLink.bind(null, action.id)}
            />
          ) : (
            !devisQuotaExhausted && (
              <form action={shareDevis.bind(null, action.id)} className="mb-3">
                <button
                  type="submit"
                  className="w-full rounded-full bg-[#1A5F7A] px-3.5 py-2.5 text-[13px] font-semibold text-white"
                >
                  Créer le lien à envoyer au client
                </button>
              </form>
            )
          )}

          {/* Ouvert à toutes les offres qui ont le devis : c'est ce marquage qui
              décide de ce qui compte comme dû. Le tampon imprimé, lui, reste Gold. */}
          {devisVersion?.status === 'envoye' && !devisVersion.validated_at && (
            <form action={markDevisValidated.bind(null, action.id)} className="mb-3">
              <button
                type="submit"
                className="rounded-full border-[1.5px] border-[#3A9188] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#3A9188]"
              >
                Marquer ce devis comme validé par le client
              </button>
            </form>
          )}

          {devisRemaining != null && !devisQuotaExhausted && (
            <p className="mb-2 text-[12px] text-[#8B9298]">
              {devisRemaining} devis à envoyer ce mois-ci (offre Premium).
            </p>
          )}

          {devisQuotaExhausted && (
            <div className="mb-3">
              <UpsellBanner text="Quota de devis envoyés atteint ce mois-ci" plan="Gold (illimité)" />
            </div>
          )}

          {devisItems && devisItems.length > 0 && (
            <div className="mb-3 flex flex-col gap-2">
              {devisItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="min-w-0 flex-1 truncate text-[#22303A]">
                    {item.description} <span className="text-[#8B9298]">× {item.quantity}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-[#22303A]">{formatAmount(item.quantity * item.unit_price)}</span>
                  <form action={removeDevisItem.bind(null, action.id, item.id)}>
                    <button type="submit" aria-label="Retirer cette ligne" className="shrink-0 text-[#C96A3D]">
                      ✕
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          <form action={addDevisItem.bind(null, action.id)} className="flex flex-col gap-2">
            <input
              name="description"
              placeholder="Description (ex : Tableau électrique)"
              required
              className="rounded border border-[#22303A]/20 bg-white px-3 py-2 text-[13px] text-[#22303A] outline-none focus:border-[#1A5F7A]"
            />
            <div className="flex gap-2">
              <input
                type="number"
                step="1"
                min="1"
                name="quantity"
                defaultValue="1"
                placeholder="Qté"
                className="w-20 min-w-0 rounded border border-[#22303A]/20 bg-white px-3 py-2 text-[13px] text-[#22303A] outline-none focus:border-[#1A5F7A]"
              />
              <input
                type="number"
                step="1"
                min="0"
                name="unit_price"
                placeholder="Prix unitaire (0 = offert)"
                required
                className="w-full min-w-0 rounded border border-[#22303A]/20 bg-white px-3 py-2 text-[13px] text-[#22303A] outline-none focus:border-[#1A5F7A]"
              />
              <button type="submit" className="shrink-0 rounded border border-[#22303A]/25 px-3 py-2 text-[13px] font-semibold text-[#22303A]">
                Ajouter
              </button>
            </div>
          </form>

          {devisItems.length > 0 && (
            <div className="mt-3 border-t border-[#22303A]/[0.14] pt-3">
              {(() => {
                const subtotal = devisItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
                const discount = devisVersion?.discount_amount ?? 0
                const vatRate = devisVersion?.vat_rate ?? null
                const afterDiscount = Math.max(0, subtotal - discount)
                const vatAmount = vatRate ? afterDiscount * (vatRate / 100) : 0
                return (
                  <div className="mb-3 flex flex-col gap-1 text-[13px]">
                    <div className="flex items-center justify-between text-[#5B6B72]">
                      <span>Sous-total</span>
                      <span>{formatAmount(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex items-center justify-between text-[#5B6B72]">
                        <span>Remise</span>
                        <span>− {formatAmount(discount)}</span>
                      </div>
                    )}
                    {vatRate != null && (
                      <div className="flex items-center justify-between text-[#5B6B72]">
                        <span>TVA ({vatRate} %)</span>
                        <span>+ {formatAmount(vatAmount)}</span>
                      </div>
                    )}
                  </div>
                )
              })()}

              <form action={updateDevisTotals.bind(null, action.id)} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-[12.5px] text-[#5B6B72]">Remise (FCFA)</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    name="discount_amount"
                    defaultValue={devisVersion?.discount_amount || ''}
                    placeholder="0"
                    className="w-full min-w-0 rounded border border-[#22303A]/20 bg-white px-3 py-1.5 text-[13px] text-[#22303A] outline-none focus:border-[#1A5F7A]"
                  />
                </div>
                <label className="flex items-center gap-2 text-[12.5px] text-[#5B6B72]">
                  <input
                    type="checkbox"
                    name="vat_applied"
                    defaultChecked={devisVersion?.vat_rate != null}
                    className="h-4 w-4 accent-[#1A5F7A]"
                  />
                  Appliquer la TVA (18 %)
                </label>
                <button type="submit" className="self-start rounded border border-[#22303A]/25 px-3 py-1.5 text-[12.5px] font-semibold text-[#22303A]">
                  Mettre à jour
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {action.type === 'devis' && !canUseDevisPdf && (
        <div className="mt-3">
          <UpsellBanner text="Devis PDF détaillé avec lignes et en-tête" plan="Gold" />
        </div>
      )}

      {action.amount != null && canTrackPayments && (
        <>
          <form action={recordPayment.bind(null, action.id)} className="mt-3 flex items-center gap-2">
            <input
              type="number"
              step="1"
              name="amount"
              placeholder="Nouveau paiement reçu"
              className="w-full min-w-0 rounded-lg border-[1.5px] border-[#22303A]/25 px-3 py-2.5 text-[13px] text-[#22303A]"
            />
            <button type="submit" className="shrink-0 rounded-lg border-[1.5px] border-[#22303A] px-3 py-2.5 text-[14px] font-semibold text-[#22303A]">
              Enregistrer
            </button>
          </form>

          {receiptMessage && <PaymentReceipt message={receiptMessage} phone={client?.phone ?? null} />}

          {payments && payments.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Paiements reçus</p>
              <div className="flex flex-col gap-1">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-[12.5px] text-[#5B6B72]">
                    <span>{new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    <span className="font-semibold text-[#22303A]">{formatAmount(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {action.amount != null && !canTrackPayments && (
        <div className="mt-3">
          <UpsellBanner text="Suivi des acomptes et des paiements" plan="Premium" />
        </div>
      )}

      {note?.transcript && (
        <div className="mt-5 border-l-2 border-[#3A9188] pl-3.5">
          {note.site && (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#1A5F7A]">{note.site}</p>
          )}
          <p className={`${fraunces.className} text-[15px] italic leading-relaxed text-[#22303A]`}>{note.transcript}</p>
        </div>
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

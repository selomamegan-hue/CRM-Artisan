import { fraunces } from '@/lib/fonts'
import { formatAmount } from '@/lib/currency'
import { PLAN_LABEL, type Plan } from '@/lib/plans'

const PLAN_PITCH: Record<Exclude<Plan, 'essai'>, { tagline: string; monthly: number; annual: number; features: string[] }> = {
  pro: {
    tagline: "L'essentiel pour ne plus rien oublier",
    monthly: 3000,
    annual: 30000,
    features: [
      'Le Fil, Clients, historique complet',
      'Saisie manuelle de note',
      'Appel et WhatsApp en un tap',
      'Notes vocales avec transcription IA (100/mois)',
    ],
  },
  premium: {
    tagline: 'Pour suivre son argent, pas juste ses tâches',
    monthly: 3500,
    annual: 35000,
    features: [
      'Tout Pro',
      'Notes vocales illimitées',
      'Acomptes, soldes et historique des paiements',
      'Message de confirmation prêt à envoyer',
      'Vue Impayés sur tous les clients',
      'Chantiers multiples par client',
      'Devis PDF détaillé (5 envoyés par mois)',
      '1 compte secondaire',
    ],
  },
  gold: {
    tagline: 'La vue d’ensemble et l’image professionnelle',
    monthly: 5000,
    annual: 50000,
    features: [
      'Tout Premium',
      'Devis PDF détaillé illimité',
      'Tableau de bord facturé vs collecté',
      'Signature personnalisée (ton nom ou celui de ton entreprise) sur les messages clients',
      "Jusqu'à 3 comptes secondaires",
      'Accès prioritaire aux nouvelles fonctionnalités',
    ],
  },
}

const BANK_ACCOUNTS = [
  {
    bank: 'ECOBANK',
    accountName: 'CAPTUR ECO SERVICES SARL',
    fields: [
      { label: 'Code Banque', value: 'TG055' },
      { label: 'Code Agence', value: '01701' },
      { label: 'Code Swift', value: 'ECOCTGTG' },
      { label: 'Numéro de compte', value: '140976294001' },
      { label: 'Code Pays', value: 'TG53' },
      { label: 'Clé Rib', value: '36' },
    ],
  },
  {
    bank: 'BANK OF AFRICA TOGO',
    accountName: 'CAPTUR ECO SERVICES',
    fields: [
      { label: 'Code Banque', value: 'TG167' },
      { label: 'Code Agence', value: '01012' },
      { label: 'Code Swift', value: 'AFRITGTGXXX' },
      { label: 'Numéro de compte', value: '003018490009' },
      { label: 'Code Pays', value: 'TG53' },
      { label: 'Clé Rib', value: '14' },
    ],
  },
]

const MOBILE_MONEY = [
  { label: 'Mixx by Yas (T-Money)', number: '+228 93 65 40 97' },
  { label: 'Flooz', number: '+228 96 81 32 32' },
]

export default function ChoisirOffrePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-10 pt-8 md:max-w-lg md:px-10">
      <h1 className={`${fraunces.className} mb-1 text-2xl text-[#22303A]`}>Choisis ton offre</h1>
      <p className="mb-6 text-[13px] text-[#5B6B72]">
        Ton essai gratuit est terminé. Choisis une offre pour continuer à utiliser Bonfil.
      </p>

      <div className="flex flex-col gap-3">
        {(['pro', 'premium', 'gold'] as const).map((plan) => (
          <div key={plan} className="rounded-xl bg-white px-4 py-4 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
            <div className="mb-1 flex items-baseline justify-between">
              <p className={`${fraunces.className} text-lg text-[#22303A]`}>{PLAN_LABEL[plan]}</p>
              <p className="text-[13px] font-semibold text-[#1A5F7A]">
                {formatAmount(PLAN_PITCH[plan].monthly)}<span className="text-[#5B6B72]">/mois</span>
              </p>
            </div>
            <p className="mb-1 text-[11.5px] text-[#5B6B72]">
              ou {formatAmount(PLAN_PITCH[plan].annual)}/an
            </p>
            <p className="mb-3 text-[12.5px] text-[#5B6B72]">{PLAN_PITCH[plan].tagline}</p>
            <ul className="flex flex-col gap-1.5">
              {PLAN_PITCH[plan].features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px] text-[#22303A]">
                  <span className="mt-0.5 text-[#3A9188]">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[10px] bg-[#1A5F7A]/10 px-4 py-3.5 text-[13px] leading-relaxed text-[#22303A]">
        <p className="mb-1 font-semibold">Comment souscrire ?</p>
        <p>
          Choisis ton offre, paie par Mobile Money ou virement avec les coordonnées ci-dessous, puis envoie-nous la
          preuve de paiement par WhatsApp. Ton compte est activé dès la confirmation du paiement.
        </p>
      </div>

      <div className="mt-6">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Mobile Money</p>
        <div className="rounded-xl bg-white px-4 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]">
          {MOBILE_MONEY.map((m) => (
            <div key={m.label} className="flex items-center justify-between border-b border-[#22303A]/[0.14] py-3 last:border-b-0">
              <span className="text-[13px] text-[#22303A]">{m.label}</span>
              <span className="text-[13.5px] font-semibold text-[#1A5F7A]">{m.number}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#5B6B72]">Virement bancaire</p>
        <div className="flex flex-col gap-3">
          {BANK_ACCOUNTS.map((account) => (
            <div
              key={account.bank}
              className="rounded-xl bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(34,48,58,0.05),0_1px_6px_rgba(34,48,58,0.06)]"
            >
              <p className="mb-0.5 text-[13.5px] font-semibold text-[#22303A]">{account.bank}</p>
              <p className="mb-2 text-[12px] text-[#5B6B72]">{account.accountName}</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {account.fields.map((f) => (
                  <div key={f.label}>
                    <p className="text-[10px] uppercase tracking-[0.03em] text-[#8B9298]">{f.label}</p>
                    <p className="text-[12.5px] font-semibold text-[#22303A]">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

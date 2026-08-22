import { fraunces } from '@/lib/fonts'
import { PLAN_LABEL, type Plan } from '@/lib/plans'

const PLAN_PITCH: Record<Exclude<Plan, 'essai'>, { tagline: string; features: string[] }> = {
  pro: {
    tagline: "L'essentiel pour ne plus rien oublier",
    features: [
      'Le Fil, Clients, historique complet',
      'Saisie manuelle de note',
      'Appel et WhatsApp en un tap',
      'Notes vocales avec transcription IA (30/mois)',
    ],
  },
  premium: {
    tagline: 'Pour suivre son argent, pas juste ses tâches',
    features: [
      'Tout Pro',
      'Notes vocales illimitées',
      'Acomptes, soldes et historique des paiements',
      'Message de confirmation prêt à envoyer',
      'Vue Impayés sur tous les clients',
      'Chantiers multiples par client',
      'Devis PDF détaillé (5 envoyés par mois)',
    ],
  },
  gold: {
    tagline: 'La vue d’ensemble et l’image professionnelle',
    features: [
      'Tout Premium',
      'Devis PDF détaillé illimité',
      'Tableau de bord facturé vs collecté',
      'Signature personnalisée (ton nom ou celui de ton entreprise) sur les messages clients',
      'Accès prioritaire aux nouvelles fonctionnalités',
    ],
  },
}

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
            <p className={`${fraunces.className} text-lg text-[#22303A]`}>{PLAN_LABEL[plan]}</p>
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
          Contacte-nous par WhatsApp ou téléphone pour choisir ton offre et payer par Mobile Money ou virement.
          Ton compte est activé dès la confirmation du paiement.
        </p>
      </div>
    </div>
  )
}

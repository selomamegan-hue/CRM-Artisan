import type { Metadata } from 'next'
import { SITE_STYLE } from '../site-style'
import { PartenaireBehaviour } from './partenaire-behaviour'

/* Le programme partenaires. Une page à part plutôt qu'une section de plus sur
   l'accueil : l'adresse bonfil.app/partenaire se colle telle quelle sous une
   vidéo ou dans un message WhatsApp, ce qu'une ancre #partenariat ne fait pas.
   L'accueil n'en garde qu'une bande d'appel qui pointe ici. */

export const metadata: Metadata = {
  title: 'Devenir partenaire',
  description:
    'Vous connaissez des artisans ? Présentez-leur Bonfil et touchez 10 % de leur ' +
    'abonnement chaque mois, pendant 12 mois. Paiement par Mobile Money.',
}

/* ------------------------------------------------------------------ */
/* LE BARÈME — tout ce qui touche à l'argent est regroupé ici pour que
   modifier le programme n'oblige pas à relire la page entière.       */

const TAUX = 10 // % de l'abonnement encaissé, reversé chaque mois
const DUREE_MOIS = 12 // durée de la commission, à partir du 1er mois payé
const SEUIL_VERSEMENT = '5 000 FCFA' // en dessous, le solde est reporté
const MOIS_DECLENCHEUR = 2 // le 1er versement tombe au 2e mois payé

/* Ce que rapporte un artisan, par mois, selon son offre. C'est TAUX % de
   3 000 / 3 500 / 5 000 FCFA — recalculer ces trois lignes si les tarifs
   de la page d'accueil bougent. */
const PAR_OFFRE = [
  { offre: 'Pro', prix: '3 000', gain: '300' },
  { offre: 'Premium', prix: '3 500', gain: '350' },
  { offre: 'Gold', prix: '5 000', gain: '500' },
]

/* Primes de volume, en plus de la commission. Comptées sur les artisans
   encore abonnés, pas sur les inscriptions. */
const PALIERS = [
  { seuil: '10 artisans actifs', prime: '10 000 FCFA' },
  { seuil: '30 artisans actifs', prime: '30 000 FCFA' },
  { seuil: '100 artisans actifs', prime: '100 000 FCFA' },
]

/* ------------------------------------------------------------------ */

type Profil = { titre: string; qui: string; texte: string; gain: string; icone: React.ReactNode }

const ico = (d: string) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--accent-blue)"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
)

const PROFILS: Profil[] = [
  {
    titre: 'Influenceur',
    qui: 'Vous avez une audience au Togo',
    texte:
      'Vous parlez à des gens qui travaillent de leurs mains, ou à ceux qui les emploient. Vous montrez Bonfil une fois, avec vos mots, et vous laissez votre lien.',
    gain: 'La commission, plus les primes de volume dès le 10ᵉ artisan.',
    icone: ico('M3 11v2a1 1 0 0 0 1 1h3l4 4V6L7 10H4a1 1 0 0 0-1 1Zm14-3a5 5 0 0 1 0 8m3-11a9 9 0 0 1 0 14'),
  },
  {
    titre: 'Personne ressource',
    qui: 'Association, centre de formation, fournisseur',
    texte:
      'Des artisans vous écoutent déjà : vous les formez, vous les fournissez, vous les représentez. Bonfil devient un service de plus que vous leur rendez.',
    gain: 'La commission, versée à vous ou à votre structure, au choix.',
    icone: ico('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'),
  },
  {
    titre: 'Artisan leader',
    qui: 'Vous utilisez Bonfil, vos collègues vous copient',
    texte:
      'Le meilleur argument, c’est vous en train de vous en servir. Sortez votre téléphone à la fin du chantier, montrez, et donnez votre code.',
    gain: 'La commission, plus un mois d’abonnement offert par artisan amené.',
    icone: ico('m12 2 2.9 6.3 6.6.8-4.9 4.6 1.3 6.7L12 17.2 6.1 20.4l1.3-6.7-4.9-4.6 6.6-.8L12 2Z'),
  },
]

const ETAPES = [
  {
    n: 'Étape 1',
    titre: 'Vous demandez un code',
    texte:
      'Vous nous écrivez, on vous répond avec un code de parrainage à votre nom. Tout artisan qui le donne à l’inscription vous est rattaché, définitivement.',
  },
  {
    n: 'Étape 2',
    titre: 'Vous en parlez',
    texte:
      'À votre manière : une vidéo, un message dans un groupe WhatsApp, une démonstration sur un chantier. On vous fournit les films et les visuels.',
  },
  {
    n: 'Étape 3',
    titre: 'Vous êtes payé',
    texte:
      `Chaque mois, par Mobile Money — Mixx by Yas ou Flooz. Tant que l’artisan reste abonné, vous continuez de toucher, jusqu’à son ${DUREE_MOIS}ᵉ mois payé.`,
  },
]

const REGLES = [
  `Votre code de parrainage vous est remis à la main, et vaut ${DUREE_MOIS} mois. Il peut être révoqué à tout moment — la révocation vous empêche d’amener de nouveaux artisans, elle ne touche pas un seul franc de ce que les vôtres vous rapportent encore.`,
  'La commission porte sur l’abonnement réellement encaissé, jamais sur une simple inscription : les faux comptes ne rapportent rien.',
  'La fraude fait exception à tout le reste : faux comptes, inscriptions achetées, abonnements payés pour toucher la commission. Le code est coupé et la totalité des sommes en cours est perdue.',
  `L’essai gratuit de 15 jours ne compte pas. Un artisan devient « actif » au premier mois payé, et le premier versement tombe au ${MOIS_DECLENCHEUR}ᵉ mois payé.`,
  `La commission court sur les ${DUREE_MOIS} premiers mois payés par l’artisan. Passé ce terme il reste le vôtre — vous ne serez jamais dépossédé du lien — mais il ne génère plus de commission.`,
  'Un artisan est rattaché au premier partenaire qui l’a amené, définitivement. Pas de compétition sur le même nom.',
  'Si l’artisan arrête son abonnement, la commission s’arrête — mais rien de ce qui vous a déjà été versé n’est repris.',
  'Vous voyez vos artisans et votre solde depuis votre propre espace. Aucun chiffre n’est caché.',
  'Vous ne voyez jamais les clients ni les chantiers d’un artisan. Ses données lui appartiennent, partenaire ou pas.',
]

export default function Partenaire() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: SITE_STYLE }} />

      <nav className="nav">
        <div className="wrap nav-inner">
          <a href="/" className="brand">
            <img className="brand-mark" src="/landing-1.png" alt="Bonfil" />
            Bonfil
          </a>
          <div className="nav-links nav-mobile-hide">
            <a href="/#solution">La solution</a>
            <a href="/fonctions">En images</a>
            <a href="/#tarifs">Tarifs</a>
            <a href="/#contact">Contact</a>
          </div>
          <div className="nav-actions">
            <a href="/login" className="nav-login">
              Se connecter
            </a>
            <a href="#candidature" className="nav-cta">
              Devenir partenaire
            </a>
          </div>
        </div>
      </nav>

      <main>
        {/* ---------- OUVERTURE ---------- */}
        <section className="lib-head">
          <div className="wrap section-head">
            <p className="eyebrow">Programme partenaires</p>
            <h1>
              Vous connaissez des artisans.
              <br />
              Présentez-leur Bonfil.
            </h1>
            <p className="lede">
              Un artisan fait confiance à un autre artisan, à son formateur, à quelqu’un qu’il
              écoute déjà — rarement à une publicité. C’est pour ça que Bonfil se transmet de la
              main à la main, et que ceux qui le transmettent sont payés pour ça.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#candidature">
                Devenir partenaire
              </a>
              <a className="btn-ghost-link" href="#remuneration">
                Voir la rémunération ↓
              </a>
            </div>
          </div>
        </section>

        {/* ---------- LES TROIS PROFILS ---------- */}
        <section>
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">À qui ça s’adresse</p>
              <h2>Trois façons d’amener des artisans.</h2>
              <p className="lede">
                Le programme est le même pour tout le monde. Ce qui change, c’est la manière dont
                vous atteignez les artisans — et ce qu’on peut ajouter à votre commission.
              </p>
            </div>

            <div className="feat-grid">
              {PROFILS.map((p) => (
                <article className="feat" key={p.titre}>
                  <div
                    className="feat-icon"
                    style={{ background: 'color-mix(in srgb, var(--accent-blue) 14%, transparent)' }}
                  >
                    {p.icone}
                  </div>
                  <h3>{p.titre}</h3>
                  <p style={{ color: 'var(--accent-deep)', fontWeight: 600, marginBottom: 9 }}>
                    {p.qui}
                  </p>
                  <p>{p.texte}</p>
                  <p className="feat-gain">{p.gain}</p>
                </article>
              ))}
            </div>

            <p className="fn-note">
              Vous ne vous reconnaissez dans aucun des trois ? Écrivez quand même — la liste n’est
              pas fermée.
            </p>
          </div>
        </section>

        {/* ---------- LA RÉMUNÉRATION ---------- */}
        <section className="security" id="remuneration">
          <div className="wrap security-grid">
            <div>
              <p className="eyebrow">La rémunération</p>
              <h2
                style={{
                  fontSize: 'clamp(1.6rem,2vw + 0.6rem,2.1rem)',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                }}
              >
                {TAUX} % de l’abonnement, chaque mois, pendant {DUREE_MOIS} mois.
              </h2>
              <p
                style={{
                  marginTop: 14,
                  fontSize: '14.5px',
                  color: 'var(--text-soft)',
                  lineHeight: 1.65,
                  maxWidth: '38ch',
                }}
              >
                Pas une prime versée une fois puis oubliée. Chaque mois où l’artisan que vous avez
                amené paye son abonnement, vous touchez votre part — pendant {DUREE_MOIS} mois à
                compter de son premier paiement.
              </p>
              <p
                style={{
                  marginTop: 18,
                  fontSize: '13.5px',
                  color: 'var(--text-faint)',
                  lineHeight: 1.6,
                  maxWidth: '38ch',
                }}
              >
                Versement par Mobile Money à partir de {SEUIL_VERSEMENT} accumulés. En dessous, le
                solde est reporté au mois suivant — jamais perdu.
              </p>
            </div>

            <div>
              <div className="part-tiers" style={{ marginTop: 0 }}>
                {PAR_OFFRE.map((o) => (
                  <div className="part-tier" key={o.offre}>
                    <p className="t-seuil">Artisan en {o.offre}</p>
                    <p className="t-prime">{o.gain} F</p>
                    <p className="t-note">
                      par mois, sur {o.prix} FCFA
                    </p>
                  </div>
                ))}
              </div>

              <div className="part-exemple">
                <p className="pe-titre">Ce que ça donne</p>
                <p className="pe-corps">
                  20 artisans en Premium qui restent abonnés, c’est{' '}
                  <strong>7 000 FCFA par mois</strong> — soit <strong>84 000 FCFA</strong> sur les
                  douze mois, sans rien refaire. À 50, c’est <strong>17 500 FCFA par mois</strong>,
                  plus les primes de volume.
                </p>
              </div>

              <p className="eyebrow" style={{ marginTop: 34 }}>
                Les primes de volume, en plus
              </p>
              <div className="part-tiers">
                {PALIERS.map((p) => (
                  <div className="part-tier" key={p.seuil}>
                    <p className="t-seuil">{p.seuil}</p>
                    <p className="t-prime">{p.prime}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- COMMENT ÇA MARCHE ---------- */}
        <section>
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Comment ça marche</p>
              <h2>Trois étapes, et rien à avancer.</h2>
            </div>

            <div className="part-steps">
              {ETAPES.map((e) => (
                <div className="part-step" key={e.n}>
                  <span className="part-step-n">{e.n}</span>
                  <h3>{e.titre}</h3>
                  <p>{e.texte}</p>
                </div>
              ))}
            </div>

            <p className="eyebrow" style={{ marginTop: 56 }}>
              Les règles, écrites d’avance
            </p>
            <div className="part-rules">
              {REGLES.map((r) => (
                <div className="part-rule" key={r}>
                  <span className="r-mark" aria-hidden="true">
                    ✓
                  </span>
                  <p>{r}</p>
                </div>
              ))}
            </div>
            <p className="fn-note">
              Les conditions définitives sont fixées avec vous dans une convention écrite, signée
              avant le premier versement.
            </p>
          </div>
        </section>

        {/* ---------- CANDIDATURE ---------- */}
        <section id="candidature" className="sunken">
          <div className="wrap contact-grid">
            <div className="contact-side">
              <p className="eyebrow on-sunken">On vous répond sous 48 h</p>
              <h2>Dites-nous qui vous êtes.</h2>
              <p className="lede" style={{ color: 'var(--text-on-sunken-soft)' }}>
                Quelques lignes suffisent. On vous rappelle sur WhatsApp pour préparer votre lien,
                votre code et votre convention.
              </p>
              <div className="contact-alt">
                <a href="https://wa.me/22896813232" target="_blank" rel="noopener" style={{ color: 'var(--text-on-sunken)' }}>
                  <span className="ico" style={{ background: 'rgba(245,239,227,0.1)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EDA97D" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  </span>
                  Écrire directement sur WhatsApp
                </a>
                <a href="tel:+22896813232" style={{ color: 'var(--text-on-sunken)' }}>
                  <span className="ico" style={{ background: 'rgba(245,239,227,0.1)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EDA97D" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  +228 96 81 32 32
                </a>
              </div>
            </div>

            <form className="card" id="partenaire-form">
              <div className="field-row">
                <div className="field">
                  <label htmlFor="p-nom">Nom</label>
                  <input id="p-nom" name="nom" type="text" placeholder="Kossi Adjavon" required />
                </div>
                <div className="field">
                  <label htmlFor="p-tel">Téléphone (WhatsApp)</label>
                  <input id="p-tel" name="tel" type="tel" placeholder="+228 90 00 00 00" required />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="p-profil">Vous êtes</label>
                  <select id="p-profil" name="profil" defaultValue="Artisan leader">
                    <option>Artisan leader</option>
                    <option>Influenceur</option>
                    <option>Personne ressource (association, formation, fournisseur)</option>
                    <option>Autre</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="p-zone">Ville ou zone</label>
                  <input id="p-zone" name="zone" type="text" placeholder="Lomé, Kara, Sokodé…" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="p-portee">Combien d’artisans autour de vous ?</label>
                <input
                  id="p-portee"
                  name="portee"
                  type="text"
                  placeholder="Une trentaine dans mon groupe WhatsApp, 4 000 abonnés…"
                />
              </div>
              <div className="field">
                <label htmlFor="p-message">Message (facultatif)</label>
                <textarea
                  id="p-message"
                  name="message"
                  placeholder="Comment comptez-vous en parler ?"
                />
              </div>
              <button type="submit" className="btn btn-primary form-submit">
                Envoyer ma candidature
              </button>
              <p className="form-note">
                En cliquant, WhatsApp s’ouvre avec votre message prérempli — libre à vous de
                l’envoyer ou de le modifier.
              </p>
              <p className="form-status" id="partenaire-status" role="status" />
            </form>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap footer-inner">
          <a href="/" className="brand">
            <img className="brand-mark" src="/landing-1.png" alt="Bonfil" />
            Bonfil
          </a>
          <span>01 BP 1442 Lomé · Contact / WhatsApp : +228 96 81 32 32</span>
        </div>
        <p className="footer-tagline">Garder le fil de chaque client.</p>
      </footer>

      <PartenaireBehaviour />
    </>
  )
}

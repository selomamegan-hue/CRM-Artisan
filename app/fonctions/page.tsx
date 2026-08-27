import type { Metadata } from 'next'
import { SITE_STYLE } from '../site-style'
import { FILMS } from '../films'
import { LandingBehaviour } from '../landing-behaviour'

/* La bibliothèque : tout ce que Bonfil sait faire, dans l'ordre de la
   spécification. Les fonctions qui ont un film sont jouables ; les autres
   attendent le leur. Le catalogue grandit ici, pas sur la page d'accueil. */

export const metadata: Metadata = {
  title: 'Les 17 fonctions',
  description:
    "Tout ce que Bonfil sait faire, fonction par fonction — enregistrer d'une voix, " +
    'retrouver le client, sortir le devis, suivre ce qui reste dû. Films courts à l’appui.',
}

/* La page se refabrique une fois par jour : c'est ce qui fait expirer le
   badge « nouveau » tout seul, sans qu'on ait à redéployer pour l'éteindre. */
export const revalidate = 86400

/* Un film reste « nouveau » dix jours après sa date de publication — le
   temps qu'un artisan qui passe une fois par semaine le voie au moins une
   fois. Renseigner `publie` le jour où le film sort sur les réseaux ;
   laisser vide tant qu'il n'est pas annoncé. */
const JOURS_NOUVEAU = 10

type Fonction = { n: number; nom: string; ligne: string; film?: string; publie?: string }

function estNouveau(publie?: string) {
  if (!publie) return false
  const jours = (Date.now() - new Date(publie).getTime()) / 86_400_000
  return jours >= 0 && jours <= JOURS_NOUVEAU
}

const COEUR: Fonction[] = [
  { n: 1, nom: 'Enregistrer', ligne: 'Un bouton. Tu parles. C’est gardé.', film: 'f1' },
  { n: 2, nom: 'Rattachement au client', ligne: 'Tu ne choisis personne. Bonfil le trouve.', film: 'f2' },
  { n: 3, nom: 'Action détectée', ligne: 'Tu racontes. Bonfil sort le travail à faire.', film: 'f3' },
  { n: 4, nom: 'Relecture en un regard', ligne: 'Trois lignes. Un coup d’œil. C’est bon.', film: 'f4' },
  { n: 5, nom: 'Historique par client', ligne: 'Chaque client a son fil. Dans l’ordre.', film: 'f5' },
  { n: 6, nom: 'Le Fil', ligne: 'Une seule liste. L’urgent en haut.' },
]

const AJOUTEES: Fonction[] = [
  { n: 7, nom: 'Saisie manuelle', ligne: 'Micro muet, réseau coupé : tu écris deux mots.' },
  { n: 8, nom: 'Chantier', ligne: 'Deux chantiers chez le même client, sans les mélanger.' },
  { n: 9, nom: 'Suivi des paiements', ligne: 'Ce qui est payé, ce qui reste. Sans calculette.' },
  { n: 10, nom: 'Message de confirmation', ligne: 'Le message est écrit. C’est toi qui l’envoies.' },
  { n: 11, nom: 'Impayés', ligne: 'Tout ce qu’on te doit, sur un seul écran.' },
  { n: 12, nom: 'Tableau de bord', ligne: 'Facturé d’un côté, encaissé de l’autre.' },
  { n: 13, nom: 'Feedback', ligne: 'Une idée, une gêne : tu écris, on lit.' },
  { n: 14, nom: 'Devis PDF', ligne: 'Un devis propre, à ton nom. Verrouillé une fois envoyé.' },
  { n: 15, nom: 'Remise et TVA', ligne: 'Remise, TVA à 18 % : le total se calcule seul.' },
  { n: 16, nom: 'Logo et tampons', ligne: 'Ton logo en haut. « Validé », « Soldé » quand il faut.' },
  { n: 17, nom: 'Comptes secondaires', ligne: 'Ton associé travaille avec toi, sans toucher à l’abonnement.' },
]

const BADGE = '<span class="fn-neuf">NOUVEAU</span>'

function Carte({ f }: { f: Fonction }) {
  const film = f.film ? FILMS.find((x) => x.cle === f.film) : undefined
  if (film) {
    // Le badge se glisse dans l'affiche, à côté de la durée : c'est le seul
    // endroit de la carte qui soit déjà en position absolue.
    const html = estNouveau(f.publie)
      ? film.html.replace('</button>', BADGE + '</button>')
      : film.html
    return <article dangerouslySetInnerHTML={{ __html: html }} />
  }

  return (
    <article className="fn-card fn-soon">
      <div className="fn-poster" aria-hidden="true">
        <span className="fn-thumb">
          <span>{f.n}</span>
        </span>
        <span className="fn-soon-tag">FILM À VENIR</span>
      </div>
      <h3>
        <span className="fn-num">{f.n}.</span> {f.nom}
      </h3>
      <p>{f.ligne}</p>
    </article>
  )
}

export default function Fonctions() {
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
            <a href="/#tarifs">Tarifs</a>
            <a href="/#faq">FAQ</a>
            <a href="/#contact">Contact</a>
          </div>
          <div className="nav-actions">
            <a href="/login" className="nav-login">
              Se connecter
            </a>
            <a href="/signup" className="nav-cta">
              Essai gratuit
            </a>
          </div>
        </div>
      </nav>

      <main>
        <section className="lib-head">
          <div className="wrap section-head">
            <p className="eyebrow">Bonfil en images</p>
            <h1>Les 17 fonctions, une par une.</h1>
            <p className="lede">
              Ce que Bonfil sait faire, du premier mot dit sur le chantier jusqu’au dernier franc
              encaissé. Cinq films sont prêts ; les autres arrivent, un par semaine.
            </p>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="lib-group">
              <p className="eyebrow">Le cœur — ce qui se passe après chaque intervention</p>
              <div className="fn-grid">
                {COEUR.map((f) => (
                  <Carte key={f.n} f={f} />
                ))}
              </div>
            </div>

            <div className="lib-group">
              <p className="eyebrow">Ajoutées depuis — l’argent, les devis, l’atelier</p>
              <div className="fn-grid">
                {AJOUTEES.map((f) => (
                  <Carte key={f.n} f={f} />
                ))}
              </div>
            </div>

            <div className="fn-more">
              <a href="/signup">Essayer gratuitement — 15 jours</a>
            </div>
          </div>
        </section>
      </main>

      <div className="om-modal" id="om-modal" role="dialog" aria-modal="true" aria-labelledby="om-title">
        <div className="om-dialog">
          <div className="om-bar">
            <strong id="om-title">Bonfil</strong>
            <button className="om-close" type="button" data-om-close aria-label="Fermer">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="om-frame" id="om-frame" />
        </div>
      </div>

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

      <LandingBehaviour />
    </>
  )
}

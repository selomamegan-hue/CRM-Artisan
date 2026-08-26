import { ImageResponse } from 'next/og'

/* Aperçu affiché quand un lien bonfil.app est partagé — WhatsApp, Facebook,
   TikTok, Google. Dessiné ici plutôt que servi comme fichier statique pour
   rester aux couleurs de la marque sans dépendre d'une image à maintenir. */

export const alt = "Bonfil — parlez après chaque intervention, Bonfil s'occupe du reste"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PAPER = '#F1ECE2'
const INK = '#22303A'
const INK_SOFT = '#5B6B72'
const BLUE = '#1A5F7A'
const TERRA = '#D97B4F'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: PAPER,
          padding: '0 96px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: 128,
            height: 128,
            borderRadius: 64,
            background: TERRA,
            justifyContent: 'center',
          }}
        >
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z"
              stroke={PAPER}
              strokeWidth="2"
            />
            <path
              d="M19 11a7 7 0 0 1-14 0M12 18v3"
              stroke={PAPER}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 116,
            fontWeight: 700,
            color: INK,
            letterSpacing: '-0.03em',
            marginTop: 44,
          }}
        >
          Bonfil
        </div>

        <div
          style={{
            display: 'flex',
            width: 96,
            height: 7,
            background: BLUE,
            marginTop: 32,
            marginBottom: 32,
          }}
        />

        <div
          style={{
            display: 'flex',
            fontSize: 44,
            color: INK_SOFT,
            lineHeight: 1.35,
            maxWidth: 900,
          }}
        >
          Parlez après chaque intervention. Bonfil s&apos;occupe du reste.
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 28,
            color: TERRA,
            fontWeight: 600,
            marginTop: 56,
            letterSpacing: '0.04em',
          }}
        >
          bonfil.app
        </div>
      </div>
    ),
    size,
  )
}

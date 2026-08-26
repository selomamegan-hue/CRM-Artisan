import { LANDING_MARKUP } from './landing-markup'
import { LandingBehaviour } from './landing-behaviour'

/* La page d'accueil publique. L'application, elle, vit sous /app. */

export default function Home() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: LANDING_MARKUP }} />
      <LandingBehaviour />
    </>
  )
}

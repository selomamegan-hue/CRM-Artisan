'use client'

import { useEffect } from 'react'

/* Les deux seuls comportements de la page d'accueil : le formulaire de
   contact, qui compose un message WhatsApp, et le lecteur d'animations.

   Le document du lecteur (React + les cinq films, ~350 Ko) n'est ni dans le
   HTML ni chargé au démarrage : il est récupéré au premier clic, puis gardé
   en mémoire. Une page qui personne ne regarde ne coûte rien. */

const WHATSAPP = '22896813232'

export function LandingBehaviour() {
  useEffect(() => {
    const cleanups: Array<() => void> = []

    /* ---------- formulaire de contact ---------- */

    const form = document.getElementById('contact-form') as HTMLFormElement | null
    const status = document.getElementById('form-status')

    if (form && status) {
      const onSubmit = (e: Event) => {
        e.preventDefault()
        const value = (name: string) =>
          (form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null)?.value.trim() ?? ''

        const nom = value('nom')
        const tel = value('tel')
        const metier = value('metier')
        const message = value('message')
        if (!nom || !tel) return

        const lines = [
          'Bonjour Bonfil,',
          '',
          `Je m'appelle ${nom}${metier ? `, ${metier.toLowerCase()}.` : '.'}`,
          `Mon téléphone : ${tel}`,
        ]
        if (message) lines.push('', message)
        lines.push('', "Je souhaite démarrer l'essai gratuit de 15 jours.")

        const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`
        window.open(url, '_blank', 'noopener')

        status.className = 'form-status show'
        status.innerHTML =
          "Message prêt — WhatsApp s'ouvre dans un nouvel onglet. " +
          `<a href="${url}" target="_blank" rel="noopener">Pas ouvert automatiquement ? Cliquez ici</a>.`
      }

      form.addEventListener('submit', onSubmit)
      cleanups.push(() => form.removeEventListener('submit', onSubmit))
    }

    /* ---------- lecteur d'animations ---------- */

    const modal = document.getElementById('om-modal')
    const frame = document.getElementById('om-frame')
    const title = document.getElementById('om-title')

    if (modal && frame && title) {
      let docSrc: Promise<string> | null = null
      let lastFocus: HTMLElement | null = null

      const playerDoc = () => {
        if (docSrc === null) {
          docSrc = fetch('/om-player.json')
            .then((r) => r.json())
            .catch((err) => {
              docSrc = null // un échec réseau ne doit pas condamner les clics suivants
              throw err
            })
        }
        return docSrc
      }

      const open = (key: string, nom: string, btn: HTMLElement) => {
        lastFocus = btn
        title.textContent = nom
        frame.innerHTML = '<p class="om-loading">Chargement de l\'animation…</p>'
        modal.classList.add('open')
        document.body.style.overflow = 'hidden'
        ;(modal.querySelector('[data-om-close]') as HTMLElement | null)?.focus()

        playerDoc().then(
          (src) => {
            // Fermé pendant le chargement : ne pas démarrer une lecture invisible.
            if (!modal.classList.contains('open')) return
            const f = document.createElement('iframe')
            f.setAttribute('title', `Animation Bonfil : ${nom}`)
            f.setAttribute('allow', 'autoplay')
            f.srcdoc = src.replace('/*__PICK__*/', `window.__OM_PICK=${JSON.stringify(key)};`)
            frame.innerHTML = ''
            frame.appendChild(f)
          },
          () => {
            frame.innerHTML = '<p class="om-loading">L\'animation n\'a pas pu être chargée. Réessayez.</p>'
          },
        )
      }

      const close = () => {
        modal.classList.remove('open')
        frame.innerHTML = '' // coupe la lecture et libère la mémoire
        document.body.style.overflow = ''
        lastFocus?.focus()
      }

      const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-anim]'))
      buttons.forEach((btn) => {
        const onClick = () =>
          open(btn.getAttribute('data-anim') ?? '', btn.getAttribute('data-titre') ?? 'Bonfil', btn)
        btn.addEventListener('click', onClick)
        cleanups.push(() => btn.removeEventListener('click', onClick))
      })

      const onModalClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (target === modal || target.closest?.('[data-om-close]')) close()
      }
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) close()
      }

      modal.addEventListener('click', onModalClick)
      document.addEventListener('keydown', onKeyDown)
      cleanups.push(() => {
        modal.removeEventListener('click', onModalClick)
        document.removeEventListener('keydown', onKeyDown)
        document.body.style.overflow = ''
      })
    }

    return () => cleanups.forEach((fn) => fn())
  }, [])

  return null
}

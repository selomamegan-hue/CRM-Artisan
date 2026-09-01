'use client'

import { useEffect } from 'react'

/* Le formulaire de candidature partenaire. Même principe que le formulaire de
   contact de l'accueil : rien n'est envoyé à un serveur, on compose un message
   WhatsApp que la personne relit avant d'appuyer sur « envoyer ».

   Quand le programme aura sa table Supabase et ses codes de parrainage, c'est
   ici qu'on branchera l'enregistrement de la candidature. */

const WHATSAPP = '22896813232'

export function PartenaireBehaviour() {
  useEffect(() => {
    const form = document.getElementById('partenaire-form') as HTMLFormElement | null
    const status = document.getElementById('partenaire-status')
    if (!form || !status) return

    const onSubmit = (e: Event) => {
      e.preventDefault()
      const value = (name: string) =>
        (
          form.elements.namedItem(name) as
            | HTMLInputElement
            | HTMLSelectElement
            | HTMLTextAreaElement
            | null
        )?.value.trim() ?? ''

      const nom = value('nom')
      const tel = value('tel')
      const profil = value('profil')
      const zone = value('zone')
      const portee = value('portee')
      const message = value('message')
      if (!nom || !tel) return

      const lignes = [
        'Bonjour Bonfil,',
        '',
        `Je m'appelle ${nom} et je veux devenir partenaire.`,
        `Profil : ${profil}`,
      ]
      if (zone) lignes.push(`Zone : ${zone}`)
      if (portee) lignes.push(`Autour de moi : ${portee}`)
      lignes.push(`Mon téléphone : ${tel}`)
      if (message) lignes.push('', message)
      lignes.push('', 'Envoyez-moi les conditions du programme partenaires.')

      const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lignes.join('\n'))}`
      window.open(url, '_blank', 'noopener')

      status.className = 'form-status show'
      status.innerHTML =
        "Candidature prête — WhatsApp s'ouvre dans un nouvel onglet. " +
        `<a href="${url}" target="_blank" rel="noopener">Pas ouvert automatiquement ? Cliquez ici</a>.`
    }

    form.addEventListener('submit', onSubmit)
    return () => form.removeEventListener('submit', onSubmit)
  }, [])

  return null
}

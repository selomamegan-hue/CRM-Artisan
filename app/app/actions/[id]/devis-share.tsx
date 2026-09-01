'use client'

import { useState } from 'react'
import { whatsappLink } from '@/lib/whatsapp'

/* Le lien public d'un devis envoyé. WhatsApp d'abord — c'est le geste
   naturel — mais la copie reste là pour les clients qu'on joint autrement
   (SMS, e-mail, ou un numéro qui n'est pas dans la fiche). */
export function DevisShare({ url, message, phone }: { url: string; message: string; phone: string | null }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="mt-3 rounded-[10px] bg-[#1A5F7A]/[0.10] px-3.5 py-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#1A5F7A]">
        Lien à envoyer au client
      </p>
      <p className="mb-2.5 break-all text-[12.5px] leading-relaxed text-[#5B6B72]">{url}</p>
      <div className="flex flex-wrap gap-2">
        {phone && (
          <a
            href={whatsappLink(phone, message)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#3A9188] px-3.5 py-1.5 text-[12.5px] font-semibold text-white"
          >
            Envoyer sur WhatsApp
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="rounded-full border-[1.5px] border-[#1A5F7A] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#1A5F7A]"
        >
          {copied ? 'Copié !' : 'Copier le lien'}
        </button>
      </div>
      <p className="mt-2 text-[11.5px] leading-snug text-[#8B9298]">
        Le client ouvre le devis sans compte Bonfil. Personne d&apos;autre ne peut deviner cette adresse.
      </p>
    </div>
  )
}

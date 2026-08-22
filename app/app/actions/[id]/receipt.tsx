'use client'

import { useState } from 'react'
import { whatsappLink } from '@/lib/whatsapp'

export function PaymentReceipt({ message, phone }: { message: string; phone: string | null }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="mt-3 rounded-[10px] bg-[#3A9188]/[0.13] px-3.5 py-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.03em] text-[#3A9188]">
        Message à envoyer au client
      </p>
      <p className="mb-2.5 text-[13px] leading-relaxed text-[#22303A]">{message}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(message)
            setCopied(true)
          }}
          className="rounded-full border-[1.5px] border-[#3A9188] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#3A9188]"
        >
          {copied ? 'Copié !' : 'Copier'}
        </button>
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
      </div>
    </div>
  )
}

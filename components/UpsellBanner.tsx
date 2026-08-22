import Link from 'next/link'

export function UpsellBanner({ text, plan }: { text: string; plan: string }) {
  return (
    <Link
      href="/app/choisir-offre"
      className="flex items-center justify-between gap-2 rounded-[10px] bg-[#22303A]/[0.06] px-3.5 py-3 text-[13px] text-[#5B6B72]"
    >
      <span>
        🔒 {text} — disponible en <span className="font-semibold text-[#1A5F7A]">{plan}</span>
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  )
}

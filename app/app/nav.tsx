'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { fraunces } from '@/lib/fonts'

const LINKS = [
  {
    href: '/app',
    label: 'Le Fil',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6h12M8 12h12M8 18h12" />
        <circle cx="4" cy="6" r="1" />
        <circle cx="4" cy="12" r="1" />
        <circle cx="4" cy="18" r="1" />
      </svg>
    ),
  },
  {
    href: '/app/clients',
    label: 'Clients',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19c1-3.2 3.2-5 6-5s5 1.8 6 5" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M15.5 14.2c2 .2 3.6 1.8 4.4 4.3" />
      </svg>
    ),
  },
  {
    href: '/app/settings',
    label: 'Profil',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 13.5a1.7 1.7 0 000-3l1-1.7-1.7-1.7-1.7 1a1.7 1.7 0 00-3-1.3L13.5 4.6h-3L10 6.8a1.7 1.7 0 00-3 1.3l-1.7-1-1.7 1.7 1 1.7a1.7 1.7 0 000 3l-1 1.7 1.7 1.7 1.7-1a1.7 1.7 0 003 1.3l.5 2.4h3l.5-2.4a1.7 1.7 0 003-1.3l1.7 1 1.7-1.7z" />
      </svg>
    ),
  },
]

const MicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z" />
    <path d="M19 11a7 7 0 01-14 0M12 18v3" />
  </svg>
)

function isActive(pathname: string, href: string) {
  return href === '/app' ? pathname === '/app' : pathname.startsWith(href)
}

export function AppNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile: bottom tab bar with floating record button */}
      <div className="fixed inset-x-0 bottom-0 z-20 md:hidden">
        <Link
          href="/app/record"
          aria-label="Enregistrer une note"
          className="absolute left-1/2 top-[-46px] flex h-[54px] w-[54px] -translate-x-1/2 items-center justify-center rounded-full border-4 border-[#F1ECE2] bg-[#D97B4F] text-white shadow-[0_8px_20px_rgba(217,123,79,0.38)]"
        >
          <MicIcon />
        </Link>
        <div className="flex border-t border-[#22303A]/[0.14] bg-white px-3 pt-4 pb-[max(10px,env(safe-area-inset-bottom))]">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-1 flex-col items-center gap-[3px] py-2 text-[10.5px] font-medium ${
                  active ? 'text-[#1A5F7A] font-semibold' : 'text-[#8B9298]'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Desktop: left sidebar */}
      <div className="hidden w-[240px] shrink-0 flex-col border-r border-[#22303A]/[0.14] bg-white p-4 md:flex">
        <div className="flex items-center gap-2 px-2 pb-7">
          <Image src="/bonfil-logo.png" alt="Bonfil" width={26} height={30} />
          <span className={`${fraunces.className} text-xl tracking-tight text-[#22303A]`}>Bonfil</span>
        </div>
        <nav className="flex flex-col gap-1">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-[11px] text-sm font-medium ${
                  active ? 'bg-[#1A5F7A]/10 font-semibold text-[#1A5F7A]' : 'text-[#5B6B72] hover:bg-[#22303A]/[0.04]'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            )
          })}
        </nav>
        <div className="flex-1" />
        <Link
          href="/app/record"
          className="flex items-center gap-[10px] rounded-[9px] bg-[#D97B4F] px-4 py-[13px] text-sm font-semibold text-white shadow-[0_8px_20px_rgba(217,123,79,0.38)]"
        >
          <MicIcon /> Enregistrer une note
        </Link>
      </div>
    </>
  )
}

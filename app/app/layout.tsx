import { AppNav } from './nav'

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F1ECE2]">
      <AppNav />
      <main className="min-w-0 flex-1 pb-[90px] md:pb-0">{children}</main>
    </div>
  )
}

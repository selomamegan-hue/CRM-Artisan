import { AppNav } from './nav'

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F1ECE2]">
      <AppNav />
      {/* La barre du bas mesure environ 70 px, et le micro flottant déborde
          de 46 px au-dessus d'elle : sans cette réserve, le dernier bouton
          d'un écran passe sous le micro — sur Relecture, « Confirmer et
          enregistrer » se faisait couper en deux. */}
      <main className="min-w-0 flex-1 pb-[calc(128px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
    </div>
  )
}

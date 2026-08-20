import Link from 'next/link'
import { fraunces } from '@/lib/fonts'

export default function RecordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#22303A] px-8 text-center">
      <p className={`${fraunces.className} text-xl italic text-[#F7F3EC]`}>Bientôt disponible</p>
      <p className="max-w-xs text-sm text-[#F7F3EC]/60">
        La capture vocale et la transcription automatique arrivent dans une prochaine étape.
      </p>
      <Link href="/app" className="mt-2 text-sm text-[#F7F3EC] underline underline-offset-2">
        Retour au Fil
      </Link>
    </div>
  )
}

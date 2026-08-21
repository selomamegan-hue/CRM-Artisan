'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fraunces } from '@/lib/fonts'

type Stage = 'idle' | 'recording' | 'processing' | 'error'

export default function RecordPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => stopStream, [stopStream])

  const startRecording = useCallback(async () => {
    setErrorMessage('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stopStream()
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        await submitRecording(blob)
      }

      recorder.start()
      setStage('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } catch {
      setStage('error')
      setErrorMessage("Impossible d'accéder au micro. Vérifie les autorisations de ton navigateur.")
    }
  }, [stopStream])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setStage('processing')
      mediaRecorderRef.current.stop()
    }
  }, [])

  const submitRecording = useCallback(
    async (blob: Blob) => {
      try {
        const formData = new FormData()
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
        formData.append('audio', blob, `note.${ext}`)

        const res = await fetch('/api/notes/capture', { method: 'POST', body: formData })
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'unknown')
        }

        sessionStorage.setItem('bonfil:pending-note', JSON.stringify(data))
        router.push('/app/review')
      } catch {
        setStage('error')
        setErrorMessage("La note n'a pas pu être traitée. Vérifie ta connexion et réessaie.")
      }
    },
    [router]
  )

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const seconds = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#22303A] px-8 text-center">
      {stage === 'idle' && (
        <>
          <p className={`${fraunces.className} text-xl italic text-[#F7F3EC]`}>Nouvelle note</p>
          <p className="max-w-xs text-sm text-[#F7F3EC]/60">
            Raconte ce qui s&apos;est passé avec le client — Bonfil s&apos;occupe du reste.
          </p>
          <button
            onClick={startRecording}
            aria-label="Démarrer l'enregistrement"
            className="mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#D97B4F] text-white shadow-[0_4px_20px_rgba(217,123,79,0.4)]"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </>
      )}

      {stage === 'recording' && (
        <>
          <div className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute h-full w-full animate-ping rounded-full bg-[#D97B4F]/40" />
            <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#D97B4F] text-white">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </div>
          <p className={`${fraunces.className} text-2xl tabular-nums text-[#F7F3EC]`}>
            {minutes}:{seconds}
          </p>
          <p className="text-sm text-[#F7F3EC]/60">Enregistrement en cours…</p>
          <button
            onClick={stopRecording}
            className="mt-4 rounded-full bg-[#F7F3EC] px-8 py-3 text-sm font-bold text-[#22303A]"
          >
            Terminer
          </button>
        </>
      )}

      {stage === 'processing' && (
        <>
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#F7F3EC]/30 border-t-[#F7F3EC]" />
          <p className="text-sm text-[#F7F3EC]/70">Transcription et analyse en cours…</p>
        </>
      )}

      {stage === 'error' && (
        <>
          <p className={`${fraunces.className} text-xl text-[#F7F3EC]`}>Oups</p>
          <p className="max-w-xs text-sm text-[#F7F3EC]/60">{errorMessage}</p>
          <button
            onClick={() => setStage('idle')}
            className="mt-2 rounded-full bg-[#D97B4F] px-6 py-2.5 text-sm font-bold text-white"
          >
            Réessayer
          </button>
        </>
      )}

      <Link href="/app" className="mt-2 text-sm text-[#F7F3EC]/50 underline underline-offset-2">
        Retour au Fil
      </Link>
    </div>
  )
}

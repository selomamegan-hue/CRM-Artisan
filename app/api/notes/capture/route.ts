import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@/lib/openai'
import { findBestClientMatch } from '@/lib/client-match'
import { voiceNoteMonthlyLimit } from '@/lib/plans'
import { getUserPlan } from '@/lib/plans-server'

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    client_name: { type: ['string', 'null'] },
    type: { type: 'string', enum: ['devis', 'rappel', 'facture', 'autre'] },
    due_date: { type: ['string', 'null'], description: 'Format YYYY-MM-DD, ou null si aucune échéance mentionnée' },
    amount: { type: ['number', 'null'] },
    excerpt: { type: 'string', description: "Résumé très court de l'action à faire, en français, pour affichage dans une liste" },
  },
  required: ['client_name', 'type', 'due_date', 'amount', 'excerpt'],
  additionalProperties: false,
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const audio = formData.get('audio')

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'missing_audio' }, { status: 400 })
  }

  const plan = await getUserPlan()
  const limit = voiceNoteMonthlyLimit(plan)

  if (limit != null) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const { count } = await supabase
      .from('notes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('source', 'voice')
      .gte('created_at', startOfMonth)

    if ((count ?? 0) >= limit) {
      return NextResponse.json({ error: 'quota_exceeded', limit }, { status: 403 })
    }
  }

  let transcript: string
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: 'whisper-1',
      language: 'fr',
    })
    transcript = transcription.text.trim()
  } catch {
    return NextResponse.json({ error: 'transcription_failed' }, { status: 502 })
  }

  if (!transcript) {
    return NextResponse.json({ error: 'empty_transcript' }, { status: 422 })
  }

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const weekday = WEEKDAYS[now.getDay()]

  let extracted: {
    client_name: string | null
    type: 'devis' | 'rappel' | 'facture' | 'autre'
    due_date: string | null
    amount: number | null
    excerpt: string
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Tu extrais les informations structurées d'une note vocale dictée par un électricien indépendant en français, juste après une visite ou un appel avec un client. Nous sommes le ${today} (${weekday}). Résous les dates relatives ("mardi prochain", "dans 3 jours", "demain") par rapport à cette date. Si aucune échéance n'est mentionnée, due_date doit être null. Si le nom du client n'est pas clairement mentionné, client_name doit être null. Si aucun montant n'est mentionné, amount doit être null.`,
        },
        { role: 'user', content: transcript },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'extraction', strict: true, schema: EXTRACTION_SCHEMA },
      },
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) throw new Error('no content')
    extracted = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'extraction_failed' }, { status: 502 })
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, phone')
    .is('archived_at', null)
    .order('name')

  const matchedClient = extracted.client_name
    ? findBestClientMatch(extracted.client_name, clients ?? [])
    : null

  return NextResponse.json({
    transcript,
    type: extracted.type,
    due_date: extracted.due_date,
    amount: extracted.amount,
    excerpt: extracted.excerpt,
    client_name_heard: extracted.client_name,
    matched_client: matchedClient,
  })
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai, TRANSCRIBE_MODEL, EXTRACT_MODEL, EXTRACT_JSON_MODE } from '@/lib/openai'
import { findBestClientMatch } from '@/lib/client-match'
import { voiceNoteMonthlyLimit } from '@/lib/plans'
import { getUserPlan } from '@/lib/plans-server'
import { resolveOwnerId } from '@/lib/delegates'

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

type Extraction = {
  client_name: string | null
  type: 'devis' | 'rappel' | 'facture' | 'autre'
  due_date: string | null
  amount: number | null
  excerpt: string
}

/* En mode `json_object`, le fournisseur promet du JSON valide, pas le JSON
   attendu : la forme se décrit dans la consigne et se vérifie au retour. */
const FORME_ATTENDUE =
  ' Réponds uniquement par un objet JSON, sans texte autour, avec exactement ces cinq clés :' +
  ' "client_name" (chaîne ou null), "type" ("devis", "rappel", "facture" ou "autre"),' +
  ' "due_date" (chaîne "AAAA-MM-JJ" ou null), "amount" (nombre ou null),' +
  ' "excerpt" (chaîne : résumé très court de l\'action à faire, en français).'

function extractionValide(v: unknown): v is Extraction {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  const chaineOuNull = (x: unknown) => x === null || typeof x === 'string'
  return (
    chaineOuNull(o.client_name) &&
    typeof o.type === 'string' &&
    ['devis', 'rappel', 'facture', 'autre'].includes(o.type) &&
    (o.due_date === null || (typeof o.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.due_date))) &&
    (o.amount === null || (typeof o.amount === 'number' && Number.isFinite(o.amount))) &&
    typeof o.excerpt === 'string' &&
    o.excerpt.trim().length > 0
  )
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
    // Le quota est celui de l'activité de l'artisan, partagé par tous ses
    // comptes secondaires — pas un quota par connexion individuelle.
    const ownerId = await resolveOwnerId(supabase, user.id)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const { count } = await supabase
      .from('notes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ownerId)
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
      model: TRANSCRIBE_MODEL,
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

  let extracted: Extraction

  const consigne = `Tu extrais les informations structurées d'une note vocale dictée par un électricien indépendant en français, juste après une visite ou un appel avec un client. Nous sommes le ${today} (${weekday}). Résous les dates relatives ("mardi prochain", "dans 3 jours", "demain") par rapport à cette date. Si aucune échéance n'est mentionnée, due_date doit être null. Si le nom du client n'est pas clairement mentionné, client_name doit être null. Si aucun montant n'est mentionné, amount doit être null.`

  try {
    const completion = await openai.chat.completions.create({
      model: EXTRACT_MODEL,
      messages: [
        { role: 'system', content: EXTRACT_JSON_MODE === 'object' ? consigne + FORME_ATTENDUE : consigne },
        { role: 'user', content: transcript },
      ],
      response_format:
        EXTRACT_JSON_MODE === 'object'
          ? { type: 'json_object' }
          : { type: 'json_schema', json_schema: { name: 'extraction', strict: true, schema: EXTRACTION_SCHEMA } },
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) throw new Error('no content')
    const candidat = JSON.parse(raw)
    if (!extractionValide(candidat)) throw new Error('forme inattendue')
    extracted = candidat
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

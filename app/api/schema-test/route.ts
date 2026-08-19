import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const TABLES = ['profiles', 'clients', 'notes', 'actions'] as const

export async function GET() {
  const supabase = await createClient()

  const results: Record<string, { ok: boolean; error?: string }> = {}

  for (const table of TABLES) {
    const { error } = await supabase.from(table).select('id').limit(1)
    results[table] = error ? { ok: false, error: error.message } : { ok: true }
  }

  const allOk = Object.values(results).every((r) => r.ok)

  return NextResponse.json({ ok: allOk, tables: results })
}

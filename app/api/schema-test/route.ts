import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const CHECKS = [
  { table: 'profiles', columns: 'id, updated_at' },
  { table: 'clients', columns: 'id, is_minimal' },
  { table: 'notes', columns: 'id, status' },
  { table: 'actions', columns: 'id, amount, updated_at' },
] as const

export async function GET() {
  const supabase = await createClient()

  const results: Record<string, { ok: boolean; error?: string }> = {}

  for (const { table, columns } of CHECKS) {
    const { error } = await supabase.from(table).select(columns).limit(1)
    results[table] = error ? { ok: false, error: error.message } : { ok: true }
  }

  const allOk = Object.values(results).every((r) => r.ok)

  return NextResponse.json({ ok: allOk, tables: results })
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const CHECKS = [
  { table: 'profiles', columns: 'id, updated_at' },
  { table: 'profiles', columns: 'id, subscription_expires_at' },
  { table: 'clients', columns: 'id, is_minimal' },
  { table: 'clients', columns: 'id, archived_at' },
  { table: 'notes', columns: 'id, status' },
  { table: 'actions', columns: 'id, amount, updated_at' },
] as const

export async function GET() {
  const supabase = await createClient()

  const results: Record<string, { ok: boolean; error?: string }> = {}

  for (const { table, columns } of CHECKS) {
    const { error } = await supabase.from(table).select(columns).limit(1)
    results[`${table}: ${columns}`] = error ? { ok: false, error: error.message } : { ok: true }
  }

  const { error: annuleError } = await supabase.from('actions').select('id').eq('status', 'annule').limit(1)
  results['actions: status enum has annule'] = annuleError
    ? { ok: false, error: annuleError.message }
    : { ok: true }

  const allOk = Object.values(results).every((r) => r.ok)

  return NextResponse.json({ ok: allOk, checks: results })
}

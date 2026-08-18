import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { error } = await supabase.auth.getSession()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    message: 'Connexion à Supabase réussie.',
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  })
}

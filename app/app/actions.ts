'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { planHasFeature } from '@/lib/plans'
import { getUserPlan } from '@/lib/plans-server'
import { isActiveDelegate } from '@/lib/delegates'

// JPEG only : @react-pdf/renderer 4.6.1 a un décodeur PNG qui échoue
// silencieusement sur des PNG pourtant valides (bug connu du projet).
const ALLOWED_LOGO_TYPES = ['image/jpeg']
const MAX_LOGO_BYTES = 2 * 1024 * 1024

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function updateProfileName(formData: FormData) {
  const fullName = String(formData.get('full_name') ?? '').trim()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  // Le nom/signature de l'entreprise est réservé au compte principal — un
  // compte secondaire ne doit pas pouvoir renommer l'identité de l'artisan.
  if (await isActiveDelegate(supabase, user.id)) redirect('/app/settings')

  await supabase.from('profiles').update({ full_name: fullName || null }).eq('id', user.id)
  redirect('/app/settings?name_updated=1')
}

export async function updateProfileContact(formData: FormData) {
  const address = String(formData.get('address') ?? '').trim()
  const whatsapp = String(formData.get('whatsapp') ?? '').trim()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  // Ces coordonnées partent en en-tête des devis, au nom de l'artisan : un
  // compte secondaire ne doit pas pouvoir les changer, comme pour le nom.
  if (await isActiveDelegate(supabase, user.id)) redirect('/app/settings')

  await supabase
    .from('profiles')
    .update({ address: address || null, whatsapp: whatsapp || null })
    .eq('id', user.id)
  redirect('/app/settings?contact_updated=1')
}

export async function uploadLogo(formData: FormData) {
  const plan = await getUserPlan()
  if (!planHasFeature(plan, 'devis_logo')) redirect('/app/choisir-offre')

  const file = formData.get('logo')
  if (!(file instanceof File) || file.size === 0) redirect('/app/settings')

  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    redirect('/app/settings?logo_error=format')
  }
  if (file.size > MAX_LOGO_BYTES) {
    redirect('/app/settings?logo_error=size')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await isActiveDelegate(supabase, user.id)) redirect('/app/settings')

  const path = `${user.id}/logo`
  const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (uploadError) redirect('/app/settings?logo_error=upload')

  const {
    data: { publicUrl },
  } = supabase.storage.from('logos').getPublicUrl(path)

  // Cache-bust so <img> and the PDF pick up the new file immediately —
  // upsert overwrites the same storage path, so the URL never changes.
  await supabase.from('profiles').update({ logo_url: `${publicUrl}?v=${Date.now()}` }).eq('id', user.id)

  redirect('/app/settings?logo_updated=1')
}

export async function updateVatRegistered(formData: FormData) {
  const vatRegistered = formData.get('vat_registered') === 'on'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await isActiveDelegate(supabase, user.id)) redirect('/app/settings')

  await supabase.from('profiles').update({ vat_registered: vatRegistered }).eq('id', user.id)
  redirect('/app/settings?vat_updated=1')
}

export async function submitFeedback(formData: FormData) {
  const message = String(formData.get('message') ?? '').trim()
  if (!message) redirect('/app/settings')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('feedback').insert({ user_id: user.id, message })
  redirect('/app/settings?feedback=sent')
}

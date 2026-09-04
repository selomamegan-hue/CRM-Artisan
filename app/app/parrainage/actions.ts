'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DUREE_CODE_MOIS, nouveauCode } from '@/lib/parrainage'

const ECRAN = '/app/parrainage'

async function clientAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profil?.is_admin) redirect('/app')

  return supabase
}

export async function creerCode(formData: FormData) {
  const partenaire = String(formData.get('partner_name') ?? '').trim()
  if (!partenaire) redirect(`${ECRAN}?erreur=nom`)

  const whatsapp = String(formData.get('partner_whatsapp') ?? '').trim() || null
  const note = String(formData.get('note') ?? '').trim() || null

  const supabase = await clientAdmin()

  const expiration = new Date()
  expiration.setMonth(expiration.getMonth() + DUREE_CODE_MOIS)

  // Un tirage aléatoire peut retomber sur un code existant. Trois essais
  // suffisent très largement, et l'unicité reste garantie par la base.
  for (let essai = 0; essai < 3; essai++) {
    const { error } = await supabase.from('partner_codes').insert({
      code: nouveauCode(),
      partner_name: partenaire,
      partner_whatsapp: whatsapp,
      note,
      expires_at: expiration.toISOString(),
    })
    if (!error) {
      revalidatePath(ECRAN)
      redirect(`${ECRAN}?cree=1`)
    }
    if (error.code !== '23505') break
  }

  redirect(`${ECRAN}?erreur=creation`)
}

// Ferme le recrutement, rien d'autre. Les commissions déjà ouvertes courent
// jusqu'au terme des douze mois de chaque artisan — c'est la règle affichée
// sur /partenaire, et la révocation ne doit jamais pouvoir la contredire.
export async function revoquerCode(id: string) {
  const supabase = await clientAdmin()
  await supabase.from('partner_codes').update({ revoked_at: new Date().toISOString() }).eq('id', id)

  revalidatePath(ECRAN)
  redirect(`${ECRAN}?revoque=1`)
}

export async function reactiverCode(id: string) {
  const supabase = await clientAdmin()
  await supabase.from('partner_codes').update({ revoked_at: null }).eq('id', id)

  revalidatePath(ECRAN)
  redirect(ECRAN)
}

// Ouvre la fenêtre de commission d'un artisan. Bonfil n'encaisse pas les
// abonnements — c'est donc une saisie, faite le jour où l'argent arrive.
export async function marquerPremierPaiement(artisanId: string, formData: FormData) {
  const saisie = String(formData.get('date') ?? '').trim()
  const supabase = await clientAdmin()

  await supabase.rpc('parrainage_premier_paiement', {
    p_artisan: artisanId,
    p_date: saisie ? new Date(saisie).toISOString() : null,
  })

  revalidatePath(ECRAN)
  redirect(ECRAN)
}

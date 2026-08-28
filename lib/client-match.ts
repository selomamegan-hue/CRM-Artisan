function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

// Marc dicte « Akakpo », la fiche dit « M. Akakpo » : la civilité fait
// chuter le score sur les noms courts et fabrique un doublon. Elle ne
// distingue jamais deux clients — on l'écarte des deux côtés.
const CIVILITES = new Set(['m', 'mr', 'mme', 'mlle', 'monsieur', 'madame', 'dr', 'me', 'pr'])

function sansCivilite(s: string): string {
  return normalize(s)
    .split(/\s+/)
    .filter((mot) => !CIVILITES.has(mot))
    .join(' ')
    .trim()
}

function bigrams(s: string): Set<string> {
  const set = new Set<string>()
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
  return set
}

// Sørensen–Dice coefficient on character bigrams — cheap, no DB round-trip,
// tolerant to small mishearings ("Lefort" vs "Le Fort").
function similarity(a: string, b: string): number {
  const ba = bigrams(a)
  const bb = bigrams(b)
  if (ba.size === 0 || bb.size === 0) return a === b ? 1 : 0
  let overlap = 0
  for (const g of ba) if (bb.has(g)) overlap++
  return (2 * overlap) / (ba.size + bb.size)
}

// Distance d'édition : sur un nom court, elle voit ce que les bigrammes
// ratent — « Akakbo » et « Akakpo » ne diffèrent que d'une lettre.
function distance(a: string, b: string): number {
  const ligne = [...Array(b.length + 1).keys()]
  for (let i = 1; i <= a.length; i++) {
    let precedent = ligne[0]++
    for (let j = 1; j <= b.length; j++) {
      const courant = ligne[j]
      ligne[j] = Math.min(ligne[j] + 1, ligne[j - 1] + 1, precedent + (a[i - 1] === b[j - 1] ? 0 : 1))
      precedent = courant
    }
  }
  return ligne[b.length]
}

function proximite(a: string, b: string): number {
  if (!a.length || !b.length) return 0
  return 1 - distance(a, b) / Math.max(a.length, b.length)
}

// Un mot suffisamment long, presque identique de part et d'autre, désigne
// le même client : Marc dit souvent le seul nom de famille quand la fiche
// porte nom et prénom. Le plancher de 4 lettres et la tolérance serrée
// gardent « Yao » loin de « Yaovi », et « Kossi » de « Kossivi ».
const LONGUEUR_MOT_MIN = 4
const PROXIMITE_MOT_MIN = 0.8

function partageUnNom(a: string, b: string): boolean {
  const motsA = a.split(/\s+/).filter((mot) => mot.length >= LONGUEUR_MOT_MIN)
  const motsB = b.split(/\s+/).filter((mot) => mot.length >= LONGUEUR_MOT_MIN)
  for (const x of motsA) {
    for (const y of motsB) {
      if (proximite(x, y) >= PROXIMITE_MOT_MIN) return true
    }
  }
  return false
}

export function findBestClientMatch<T extends { id: string; name: string }>(
  mentionedName: string,
  clients: T[],
  threshold = 0.55
): T | null {
  const target = sansCivilite(mentionedName)
  if (!target) return null

  let best: T | null = null
  let bestScore = 0
  for (const client of clients) {
    const nom = sansCivilite(client.name)
    // Un nom partagé garantit d'atteindre le seuil, sans écraser le
    // classement : entre deux clients qui portent le même nom de famille,
    // c'est toujours la ressemblance d'ensemble qui départage.
    const ressemblance = similarity(target, nom)
    const score = partageUnNom(target, nom)
      ? threshold + ressemblance * (1 - threshold)
      : ressemblance
    if (score > bestScore) {
      bestScore = score
      best = client
    }
  }
  return bestScore >= threshold ? best : null
}

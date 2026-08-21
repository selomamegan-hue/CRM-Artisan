function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
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

export function findBestClientMatch<T extends { id: string; name: string }>(
  mentionedName: string,
  clients: T[],
  threshold = 0.55
): T | null {
  const target = normalize(mentionedName)
  if (!target) return null

  let best: T | null = null
  let bestScore = 0
  for (const client of clients) {
    const score = similarity(target, normalize(client.name))
    if (score > bestScore) {
      bestScore = score
      best = client
    }
  }
  return bestScore >= threshold ? best : null
}

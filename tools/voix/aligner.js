/* 2/4 — Retrouve chaque réplique dans la lecture continue.
 *
 *   node tools/voix/aligner.js f6
 *
 * Le comédien lit d'un trait, sans suivre les tops du film. On aligne donc
 * les deux suites de mots — celle du script, celle que la transcription a
 * entendue — par programmation dynamique. Cette méthode absorbe ce que le
 * modèle a mal entendu : « Bonfil » en « bon fil », « un » en « 1 ».
 *
 * En sortie : pour chaque réplique, son début et sa fin dans la bande, et
 * la part de ses mots effectivement retrouvés. Une couverture basse est un
 * signal — la réplique n'a peut-être pas été lue.
 */

const fs = require('fs')
const path = require('path')
const { repliques } = require('./repliques')
const { TRAVAIL } = require('./transcrire')

const NOMBRES = { un: '1', une: '1', deux: '2', trois: '3', dix: '10', quinze: '15', vingt: '20' }

function normaliser(mot) {
  const m = mot
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9']/g, '')
    .replace(/^l'|^d'|^qu'/, '')
  return NOMBRES[m] || m
}

const decouper = (texte) => texte.split(/\s+/).map(normaliser).filter(Boolean)

function distance(a, b) {
  const l = [...Array(b.length + 1).keys()]
  for (let i = 1; i <= a.length; i++) {
    let precedent = l[0]++
    for (let j = 1; j <= b.length; j++) {
      const courant = l[j]
      l[j] = Math.min(l[j] + 1, l[j - 1] + 1, precedent + (a[i - 1] === b[j - 1] ? 0 : 1))
      precedent = courant
    }
  }
  return l[b.length]
}

/* Deux mots se correspondent s'ils sont identiques, ou très proches sur une
   longueur qui exclut le hasard. */
function memeMot(a, b) {
  if (a === b) return true
  if (Math.min(a.length, b.length) < 4) return false
  return 1 - distance(a, b) / Math.max(a.length, b.length) >= 0.75
}

function correspondances(motsScript, motsEntendus) {
  const n = motsScript.length
  const m = motsEntendus.length
  const PAIRE = 2, ECART = -1, TROU = -1

  const g = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = 1; i <= n; i++) g[i][0] = i * TROU
  for (let j = 1; j <= m; j++) g[0][j] = j * TROU
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = g[i - 1][j - 1] + (memeMot(motsScript[i - 1], motsEntendus[j - 1]) ? PAIRE : ECART)
      g[i][j] = Math.max(diag, g[i - 1][j] + TROU, g[i][j - 1] + TROU)
    }
  }

  const paires = new Array(n).fill(-1)
  let i = n, j = m
  while (i > 0 && j > 0) {
    const estPaire = memeMot(motsScript[i - 1], motsEntendus[j - 1])
    if (g[i][j] === g[i - 1][j - 1] + (estPaire ? PAIRE : ECART)) {
      if (estPaire) paires[i - 1] = j - 1
      i--; j--
    } else if (g[i][j] === g[i - 1][j] + TROU) i--
    else j--
  }
  return paires
}

function aligner(film, { bavard = true } = {}) {
  const lignes = repliques(film)
  const entendu = JSON.parse(fs.readFileSync(path.join(TRAVAIL, `${film}.json`), 'utf8'))
  const mots = entendu.words.map((w) => ({ mot: normaliser(w.word), debut: w.start, fin: w.end }))

  const motsScript = []
  const ligneDuMot = []
  lignes.forEach((r, idx) => {
    for (const mot of decouper(r.texte)) {
      motsScript.push(mot)
      ligneDuMot.push(idx)
    }
  })

  const paires = correspondances(motsScript, mots.map((m) => m.mot))
  const bornes = lignes.map(() => ({ debut: null, fin: null, trouves: 0, total: 0 }))
  motsScript.forEach((_, k) => {
    const b = bornes[ligneDuMot[k]]
    b.total++
    if (paires[k] < 0) return
    b.trouves++
    const w = mots[paires[k]]
    if (b.debut === null || w.debut < b.debut) b.debut = w.debut
    if (b.fin === null || w.fin > b.fin) b.fin = w.fin
  })

  let faibles = 0
  if (bavard) console.log('   #   top     dans la bande     couverture  réplique')
  bornes.forEach((b, idx) => {
    const couverture = b.total ? Math.round((b.trouves / b.total) * 100) : 0
    if (couverture < 60 || b.debut === null) faibles++
    if (!bavard) return
    const plage = b.debut === null ? '      —       ' : `${b.debut.toFixed(1).padStart(6)} → ${b.fin.toFixed(1).padStart(6)}`
    console.log(`  ${String(idx + 1).padStart(2)}  ${String(lignes[idx].at).padStart(6)}s  ${plage}  ${String(couverture).padStart(4)} %  ${lignes[idx].texte.slice(0, 40)}`)
  })
  console.log(`  ${bornes.length - faibles}/${bornes.length} répliques localisées avec confiance`)
  if (faibles) console.log('  ⚠ vérifiez les répliques mal couvertes : ont-elles bien été lues ?')

  fs.writeFileSync(path.join(TRAVAIL, `${film}-bornes.json`), JSON.stringify(bornes))
  return bornes
}

module.exports = { aligner, normaliser, decouper }

if (require.main === module) {
  const film = process.argv[2]
  if (!film) {
    console.log('  usage : node tools/voix/aligner.js <film>')
    process.exit(1)
  }
  aligner(film)
}

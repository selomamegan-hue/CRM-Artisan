/* Lit les répliques et la durée de chaque film directement dans le lecteur.
 *
 * La source de vérité est public/om-player.json — jamais une copie : si les
 * textes ou les tops changent, la chaîne de montage suit sans qu'on ait à
 * penser à mettre un fichier à jour.
 */

const fs = require('fs')
const path = require('path')

const RACINE = path.resolve(__dirname, '..', '..')
const LECTEUR = path.join(RACINE, 'public', 'om-player.json')

function document() {
  return JSON.parse(fs.readFileSync(LECTEUR, 'utf8'))
}

/* Les modules des films, un par <script> qui expose window.BonfilFN */
function modules(doc) {
  const trouves = {}
  for (const m of doc.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    const nom = m[1].match(/window\.(BonfilF\d)\s*=/)
    if (nom) trouves['f' + nom[1].replace('BonfilF', '')] = m[1]
  }
  return trouves
}

/* Les sous-titres, tels que le film les affiche : { at, texte } */
function repliques(film) {
  const code = modules(document())[film]
  if (!code) throw new Error(`film inconnu : ${film}`)
  const lues = []
  for (const m of code.matchAll(/at:\s*([\d.]+),(?:\s*until:\s*[\d.]+,)?\s*text:\s*'((?:[^'\\]|\\.)*)'/g)) {
    lues.push({ at: Number(m[1]), texte: m[2].replace(/\\'/g, "'").replace(/\\\\/g, '\\') })
  }
  return lues.sort((a, b) => a.at - b.at)
}

/* La durée du film, somme des scènes déclarées dans OM_SCENES */
function duree(film) {
  const doc = document()
  const apps = JSON.parse(doc.match(/window\.__OM_APPS\s*=\s*(\{[\s\S]*?\});/)[1])
  if (!apps[film]) throw new Error(`film inconnu : ${film}`)
  return JSON.parse(apps[film].scenes).reduce((total, s) => total + s.dur, 0)
}

function films() {
  return Object.keys(modules(document())).sort()
}

module.exports = { repliques, duree, films, RACINE }

if (require.main === module) {
  for (const f of films()) {
    const r = repliques(f)
    console.log(`  ${f} : ${String(r.length).padStart(2)} répliques, ${duree(f)}s`)
  }
}

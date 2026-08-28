/* 4/4 — Remonte la bande au niveau d'une voix off mobile, et l'installe.
 *
 *   node tools/voix/normaliser.js f6
 *
 * Deux passes : la première mesure, la seconde corrige avec ces mesures.
 * La mesure est « gated » — les longs silences entre répliques ne tirent pas
 * le gain vers le haut, donc le souffle de la pièce ne remonte pas avec la
 * voix. Un simple gain à l'aveugle ferait exactement l'inverse.
 *
 * Le fichier finit dans public/, où le lecteur va le chercher.
 */

const fs = require('fs')
const path = require('path')
const { ffmpeg, mesurer, dureeFichier } = require('./ff')
const { RACINE } = require('./repliques')
const { TRAVAIL } = require('./transcrire')

const CIBLE = -16 // LUFS — repère des plateformes mobiles
const CRETE = -1.5 // dBTP — marge avant écrêtage
const ECART = 7 // LU — resserré pour rester audible dans un fourgon qui roule

function normaliser(film) {
  const source = path.join(TRAVAIL, `${film}-cale.wav`)

  const brut = mesurer(['-i', source, '-af', `loudnorm=I=${CIBLE}:TP=${CRETE}:LRA=${ECART}:print_format=json`, '-f', 'null', '-'])
  const json = brut.slice(brut.lastIndexOf('{'), brut.lastIndexOf('}') + 1)
  let m
  try {
    m = JSON.parse(json)
  } catch {
    throw new Error('mesure de niveau illisible')
  }

  const sortie = path.join(RACINE, 'public', `voix-${film}.mp3`)
  ffmpeg(['-y', '-i', source, '-af',
    `loudnorm=I=${CIBLE}:TP=${CRETE}:LRA=${ECART}:measured_I=${m.input_i}:measured_TP=${m.input_tp}` +
    `:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
    '-ac', '1', '-ar', '24000', '-b:a', '48k', sortie])

  const gain = CIBLE - Number(m.input_i)
  console.log(`  ${film} : ${Number(m.input_i).toFixed(1)} → ${CIBLE} LUFS (+${gain.toFixed(1)} dB)`)
  console.log(`  → public/voix-${film}.mp3 : ${Math.round(fs.statSync(sortie).size / 1024)} Ko, ${dureeFichier(sortie).toFixed(1)}s`)
  if (gain > 30) console.log('  ⚠ un gain aussi fort remonte aussi le souffle : réécoutez avant de publier')
  return sortie
}

module.exports = { normaliser }

if (require.main === module) {
  const film = process.argv[2]
  if (!film) {
    console.log('  usage : node tools/voix/normaliser.js <film>')
    process.exit(1)
  }
  normaliser(film)
}

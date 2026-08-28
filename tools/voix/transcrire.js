/* 1/4 — Transcrit une bande avec l'horodatage mot à mot.
 *
 *   node tools/voix/transcrire.js f6 chemin/vers/voix-f6.wav
 *
 * C'est cet horodatage qui rend tout le reste possible : sans lui, on ne
 * saurait pas où commence ni où finit chaque réplique dans la lecture.
 */

const fs = require('fs')
const path = require('path')
const { ffmpeg, cleIA } = require('./ff')
const { RACINE } = require('./repliques')

const TRAVAIL = path.join(__dirname, 'travail')

async function transcrire(film, source) {
  fs.mkdirSync(TRAVAIL, { recursive: true })

  // Un mono 16 kHz suffit à la transcription et divise le poids par vingt.
  const leger = path.join(TRAVAIL, `${film}.mp3`)
  ffmpeg(['-y', '-i', source, '-ac', '1', '-ar', '16000', '-b:a', '64k', leger])
  console.log(`  ${film} : ${Math.round(fs.statSync(leger).size / 1024)} Ko envoyés`)

  const { cle, base, modele } = cleIA(RACINE)
  const fd = new FormData()
  fd.append('file', new Blob([fs.readFileSync(leger)], { type: 'audio/mpeg' }), `${film}.mp3`)
  fd.append('model', modele)
  fd.append('language', 'fr')
  fd.append('response_format', 'verbose_json')
  fd.append('timestamp_granularities[]', 'word')

  const r = await fetch(`${base}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${cle}` }, body: fd })
  const texte = await r.text()
  if (!r.ok) throw new Error(`transcription refusée (HTTP ${r.status}) : ${texte.slice(0, 200)}`)

  const j = JSON.parse(texte)
  if (!j.words || !j.words.length) throw new Error('aucun mot horodaté — le modèle ne les fournit peut-être pas')

  fs.writeFileSync(path.join(TRAVAIL, `${film}.json`), JSON.stringify(j))
  console.log(`  ${film} : ${j.words.length} mots horodatés sur ${Number(j.duration).toFixed(1)}s`)
  return j
}

module.exports = { transcrire, TRAVAIL }

if (require.main === module) {
  const [film, source] = process.argv.slice(2)
  if (!film || !source) {
    console.log('  usage : node tools/voix/transcrire.js <film> <fichier.wav>')
    process.exit(1)
  }
  transcrire(film, source).catch((e) => {
    console.log('  ÉCHEC : ' + e.message)
    process.exit(1)
  })
}

/* 3/4 — Repose chaque réplique à son top dans le film.
 *
 *   node tools/voix/monter.js f6 chemin/vers/voix-f6.wav
 *
 * Trois leviers, du plus honnête au plus contraignant :
 *   1. resserrer les respirations à l'intérieur d'une réplique — on retire
 *      du silence, jamais de la parole. C'est ce qui récupère le plus de
 *      temps : vingt à trente secondes par film, sans rien dénaturer.
 *   2. accélérer très légèrement ce qui déborde encore, sans toucher à la
 *      hauteur de la voix.
 *   3. décaler, en dernier recours seulement.
 *
 * Le montage se fait par concaténation — silence, réplique, silence… — donc
 * aucune réplique ne peut en recouvrir une autre, par construction.
 */

const fs = require('fs')
const path = require('path')
const { ffmpeg, dureeFichier } = require('./ff')
const { repliques, duree } = require('./repliques')
const { TRAVAIL } = require('./transcrire')

const AVANT = 0.15 // reprise avant le premier mot, pour ne pas manger l'attaque
const APRES = 0.25 // laisse retomber la fin de phrase
const RESPIRATION = 0.28 // silence conservé à l'intérieur d'une réplique
const TEMPO_MAX = 1.14 // au-delà, la voix s'entend pressée

function monter(film, source) {
  const lignes = repliques(film)
  const bornes = JSON.parse(fs.readFileSync(path.join(TRAVAIL, `${film}-bornes.json`), 'utf8'))
  const dureeFilm = duree(film)

  const dossier = path.join(TRAVAIL, `${film}-morceaux`)
  fs.rmSync(dossier, { recursive: true, force: true })
  fs.mkdirSync(dossier, { recursive: true })

  // Passe 1 : extraire chaque réplique, respirations resserrées
  const bruts = []
  let gagne = 0
  lignes.forEach((r, i) => {
    const b = bornes[i]
    if (b.debut === null) return
    const debut = Math.max(0, b.debut - AVANT)
    const dureeSource = b.fin + APRES - debut
    const p = path.join(dossier, `rep-${String(i + 1).padStart(2, '0')}.wav`)
    ffmpeg(['-y', '-ss', String(debut), '-t', String(dureeSource), '-i', source, '-ac', '1', '-ar', '48000',
      '-af', `silenceremove=stop_periods=-1:stop_silence=${RESPIRATION}:stop_duration=0.4:stop_threshold=-38dB`, p])
    const d = dureeFichier(p)
    gagne += dureeSource - d
    bruts.push({ i, fichier: p, duree: d })
  })
  console.log(`  respirations resserrées : ${gagne.toFixed(1)}s récupérés sans toucher à la parole`)

  // Passe 2 : placer, accélérer ce qui déborde encore
  let curseur = 0
  let accelerees = 0
  let pire = 0
  const liste = []
  bruts.forEach((m, n) => {
    const cible = lignes[m.i].at
    const pose = Math.max(cible, curseur)
    const suivant = bruts[n + 1] ? lignes[bruts[n + 1].i].at : dureeFilm
    const place = suivant - pose

    let tempo = 1
    if (m.duree > place && place > 0.3) {
      tempo = Math.min(TEMPO_MAX, m.duree / place)
      if (tempo > 1.005) accelerees++
    }
    let fichier = m.fichier
    if (tempo > 1.005) {
      fichier = m.fichier.replace('.wav', '-vite.wav')
      ffmpeg(['-y', '-i', m.fichier, '-filter:a', `atempo=${tempo.toFixed(4)}`, fichier])
    }

    const silence = pose - curseur
    if (silence > 0.01) {
      const s = path.join(dossier, `silence-${n}.wav`)
      ffmpeg(['-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', String(silence), s])
      liste.push(s)
    }
    liste.push(fichier)
    pire = Math.max(pire, pose - cible)
    curseur = pose + dureeFichier(fichier)
  })

  const queue = dureeFilm - curseur
  if (queue > 0.05) {
    const s = path.join(dossier, 'silence-fin.wav')
    ffmpeg(['-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', String(queue), s])
    liste.push(s)
  } else if (queue < -0.5) {
    console.log(`  ⚠ le montage dépasse le film de ${(-queue).toFixed(1)}s — la lecture est trop lente pour ce minutage`)
  }

  const manifeste = path.join(dossier, 'liste.txt')
  fs.writeFileSync(manifeste, liste.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'))

  const sortie = path.join(TRAVAIL, `${film}-cale.wav`)
  ffmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', manifeste, '-c', 'copy', sortie])

  console.log(`  ${accelerees} réplique(s) légèrement accélérée(s) | décalage maximal +${pire.toFixed(1)}s`)
  console.log(`  → ${path.basename(sortie)} : ${dureeFichier(sortie).toFixed(1)}s pour un film de ${dureeFilm}s`)
  if (pire > 2) console.log('  ⚠ au-delà de deux secondes, la voix se remarque en retard sur l\'image')
  return sortie
}

module.exports = { monter }

if (require.main === module) {
  const [film, source] = process.argv.slice(2)
  if (!film || !source) {
    console.log('  usage : node tools/voix/monter.js <film> <fichier.wav>')
    process.exit(1)
  }
  monter(film, source)
}

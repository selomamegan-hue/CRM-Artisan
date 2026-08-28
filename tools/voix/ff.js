/* Le peu de ffmpeg dont la chaîne a besoin.
 *
 * Les binaires sont pris dans le PATH ; on peut les désigner autrement avec
 * les variables FFMPEG et FFPROBE si l'installation n'y est pas. */

const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const FFPROBE = process.env.FFPROBE || 'ffprobe'

function ffmpeg(args, { silencieux = true } = {}) {
  const r = spawnSync(FFMPEG, ['-hide_banner', silencieux ? '-loglevel' : '-nostats', silencieux ? 'error' : '-v', ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  if (r.error) throw new Error(`ffmpeg introuvable (${FFMPEG}) — installez-le ou renseignez la variable FFMPEG`)
  return r
}

/* silencedetect, loudnorm et consorts écrivent sur stderr, pas sur stdout. */
function mesurer(args) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (r.error) throw new Error(`ffmpeg introuvable (${FFMPEG})`)
  return (r.stdout || '') + (r.stderr || '')
}

function dureeFichier(fichier) {
  const r = spawnSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', fichier], { encoding: 'utf8' })
  if (r.error) throw new Error(`ffprobe introuvable (${FFPROBE})`)
  return Number((r.stdout || '').trim())
}

/* La clé du fournisseur d'IA, lue dans .env.local — jamais écrite ailleurs. */
function cleIA(racine) {
  const env = {}
  for (const ligne of fs.readFileSync(path.join(racine, '.env.local'), 'utf8').split('\n')) {
    const m = ligne.match(/^([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  const cle = env.AI_API_KEY || env.OPENAI_API_KEY
  if (!cle) throw new Error('aucune clé dans .env.local (AI_API_KEY ou OPENAI_API_KEY)')
  return {
    cle,
    base: (env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    modele: env.AI_TRANSCRIBE_MODEL || 'whisper-1',
  }
}

module.exports = { ffmpeg, mesurer, dureeFichier, cleIA }

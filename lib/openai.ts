import 'server-only'
import OpenAI from 'openai'

/* Le fournisseur d'IA est configurable, pas gravé dans le code.
 *
 * OpenAI reste le défaut : sans variable, rien ne change. Mais l'API de Groq
 * (entre autres) parle le même dialecte, donc basculer tient à trois réglages
 * dans Vercel — sans redéploiement, et réversible dans la minute. Ce qui
 * compte le jour où un fournisseur tombe, ou refuse une carte bancaire.
 *
 *   AI_BASE_URL          https://api.groq.com/openai/v1   (vide = OpenAI)
 *   AI_API_KEY           la clé du fournisseur choisi     (vide = OPENAI_API_KEY)
 *   AI_TRANSCRIBE_MODEL  whisper-large-v3-turbo           (défaut whisper-1)
 *   AI_EXTRACT_MODEL     llama-3.3-70b-versatile          (défaut gpt-4o-mini)
 *   AI_EXTRACT_JSON      object                           (défaut schema)
 */

export const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_BASE_URL || undefined,
})

export const TRANSCRIBE_MODEL = process.env.AI_TRANSCRIBE_MODEL || 'whisper-1'
export const EXTRACT_MODEL = process.env.AI_EXTRACT_MODEL || 'gpt-4o-mini'

/* OpenAI garantit la forme de la réponse avec `json_schema` strict. Les
 * fournisseurs compatibles n'ont souvent que `json_object`, qui promet du
 * JSON valide mais pas le bon JSON — d'où la validation systématique de
 * l'extraction, quel que soit le mode. */
export const EXTRACT_JSON_MODE = process.env.AI_EXTRACT_JSON === 'object' ? 'object' : 'schema'

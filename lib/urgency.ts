const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

function daysUntil(dueDate: string, today: Date) {
  const due = new Date(dueDate + 'T00:00:00')
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((due.getTime() - start.getTime()) / 86_400_000)
}

export function dueBucket(dueDate: string | null, today: Date): string {
  if (!dueDate) return 'Sans échéance'
  const diff = daysUntil(dueDate, today)
  if (diff < 0) return 'En retard'
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  if (diff <= 6) return WEEKDAYS[new Date(dueDate + 'T00:00:00').getDay()]
  return 'Plus tard'
}

export function dueLabel(dueDate: string | null, today: Date): string {
  if (!dueDate) return ''
  const diff = daysUntil(dueDate, today)
  if (diff < 0) return `${Math.abs(diff)} jour${Math.abs(diff) > 1 ? 's' : ''}`
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  if (diff <= 6) return WEEKDAYS[new Date(dueDate + 'T00:00:00').getDay()]
  return new Date(dueDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function isUrgent(dueDate: string | null, today: Date): boolean {
  if (!dueDate) return false
  return daysUntil(dueDate, today) <= 0
}

const BUCKET_ORDER = ['En retard', "Aujourd'hui", 'Demain']

export function bucketRank(bucket: string): number {
  const i = BUCKET_ORDER.indexOf(bucket)
  if (i !== -1) return i
  if (bucket === 'Sans échéance' || bucket === 'Plus tard') return 90
  return 10
}

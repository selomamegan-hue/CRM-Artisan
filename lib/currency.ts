export function formatAmount(value: number): string {
  return `${Math.round(value).toLocaleString('fr-FR')} FCFA`
}

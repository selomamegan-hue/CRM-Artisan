// Togo mobile numbers are stored locally (8 digits, no country code) —
// wa.me needs the full international number to open a chat reliably.
const TOGO_COUNTRY_CODE = '228'

export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  const international = digits.startsWith(TOGO_COUNTRY_CODE)
    ? digits
    : digits.length === 8
      ? `${TOGO_COUNTRY_CODE}${digits}`
      : digits
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`
}

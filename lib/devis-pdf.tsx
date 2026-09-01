import 'server-only'
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10.5, fontFamily: 'Helvetica', color: '#22303A' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  companyBlock: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, objectFit: 'contain' },
  companyName: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  small: { fontSize: 9.5, color: '#5B6B72', marginBottom: 1 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  meta: { fontSize: 9.5, color: '#5B6B72', textAlign: 'right', marginTop: 3 },
  clientBox: { marginBottom: 24 },
  clientLabel: { fontSize: 8.5, color: '#8B9298', marginBottom: 3, letterSpacing: 0.5 },
  clientName: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  table: { borderTopWidth: 1, borderTopColor: '#22303A', marginTop: 4 },
  tableHeaderRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#22303A' },
  tableRow: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: '#D8D2C4' },
  colDesc: { flex: 3 },
  colQty: { flex: 0.8, textAlign: 'right' },
  colPrice: { flex: 1.2, textAlign: 'right' },
  colAmount: { flex: 1.2, textAlign: 'right' },
  th: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#5B6B72', letterSpacing: 0.5 },
  summaryRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  summaryLabel: { fontSize: 10, color: '#5B6B72', marginRight: 12, width: 110, textAlign: 'right' },
  summaryAmount: { fontSize: 10, color: '#5B6B72', width: 90, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#22303A' },
  totalLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginRight: 12, width: 110, textAlign: 'right' },
  totalAmount: { fontSize: 13, fontFamily: 'Helvetica-Bold', width: 90, textAlign: 'right' },
  stampsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  stampValidated: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#3A9188',
    borderWidth: 1.5,
    borderColor: '#3A9188',
    borderStyle: 'solid',
    paddingVertical: 4,
    paddingHorizontal: 10,
    transform: 'rotate(-8deg)',
  },
  stampSolde: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1A5F7A',
    borderWidth: 1.5,
    borderColor: '#1A5F7A',
    borderStyle: 'solid',
    paddingVertical: 4,
    paddingHorizontal: 10,
    transform: 'rotate(-8deg)',
  },
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, fontSize: 8.5, color: '#8B9298', textAlign: 'center' },
})

function formatFcfa(value: number): string {
  // toLocaleString('fr-FR') inserts a narrow no-break space (U+202F) as the
  // thousands separator, which the PDF's base14 Helvetica can't render —
  // group digits manually with a plain ASCII space instead.
  const rounded = Math.round(value)
  const withSpaces = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${withSpaces} FCFA`
}

export type DevisItem = { description: string; quantity: number; unit_price: number }
// Data URI string — the {data, format} object shape has known silent-failure
// reports with @react-pdf/renderer; a base64 data URI is the documented,
// reliable path for embedding a Node-fetched image.
export type DevisLogo = string

export type DevisPdfData = {
  number: string
  companyName: string
  companyAddress: string | null
  companyWhatsapp: string | null
  clientName: string
  clientPhone: string | null
  date: string
  excerpt: string
  amount: number | null
  items: DevisItem[]
  logo: DevisLogo | null
  validated: boolean
  paidInFull: boolean
  discountAmount: number
  vatRate: number | null
}

function DevisDocument({ data }: { data: DevisPdfData }) {
  const items = data.items.length > 0 ? data.items : [{ description: data.excerpt, quantity: 1, unit_price: data.amount ?? 0 }]
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const afterDiscount = Math.max(0, subtotal - data.discountAmount)
  const vatAmount = data.vatRate ? afterDiscount * (data.vatRate / 100) : 0
  const total = afterDiscount + vatAmount

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.companyBlock}>
            {data.logo && <Image src={data.logo} style={styles.logo} />}
            <View>
              <Text style={styles.companyName}>{data.companyName}</Text>
              {data.companyAddress && <Text style={styles.small}>{data.companyAddress}</Text>}
              {data.companyWhatsapp && <Text style={styles.small}>WhatsApp : {data.companyWhatsapp}</Text>}
            </View>
          </View>
          <View>
            <Text style={styles.title}>DEVIS {data.number}</Text>
            <Text style={styles.meta}>{data.date}</Text>
          </View>
        </View>

        <View style={styles.clientBox}>
          <Text style={styles.clientLabel}>CLIENT</Text>
          <Text style={styles.clientName}>{data.clientName}</Text>
          {data.clientPhone && <Text style={styles.small}>{data.clientPhone}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colDesc]}>DESCRIPTION</Text>
            <Text style={[styles.th, styles.colQty]}>QTÉ</Text>
            <Text style={[styles.th, styles.colPrice]}>PRIX UNITAIRE</Text>
            <Text style={[styles.th, styles.colAmount]}>MONTANT</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatFcfa(item.unit_price)}</Text>
              <Text style={styles.colAmount}>{formatFcfa(item.quantity * item.unit_price)}</Text>
            </View>
          ))}
        </View>

        {(data.discountAmount > 0 || data.vatRate != null) && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sous-total</Text>
            <Text style={styles.summaryAmount}>{formatFcfa(subtotal)}</Text>
          </View>
        )}
        {data.discountAmount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Remise</Text>
            <Text style={styles.summaryAmount}>- {formatFcfa(data.discountAmount)}</Text>
          </View>
        )}
        {data.vatRate != null && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>TVA ({data.vatRate} %)</Text>
            <Text style={styles.summaryAmount}>+ {formatFcfa(vatAmount)}</Text>
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>{formatFcfa(total)}</Text>
        </View>

        {(data.validated || data.paidInFull) && (
          <View style={styles.stampsRow}>
            {data.validated && <Text style={styles.stampValidated}>VALIDÉ</Text>}
            {data.paidInFull && <Text style={styles.stampSolde}>SOLDÉ</Text>}
          </View>
        )}

        <Text style={styles.footer}>Devis émis par {data.companyName}</Text>
      </Page>
    </Document>
  )
}

export async function renderDevisPdf(data: DevisPdfData): Promise<Buffer> {
  return renderToBuffer(<DevisDocument data={data} />)
}

// Le logo vit sur une URL publique (Supabase Storage). Un logo injoignable
// ou trop lent ne doit jamais faire échouer tout le devis : on rend sans.
export async function fetchLogo(url: string): Promise<DevisLogo | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null

    const contentType = res.headers.get('content-type') ?? ''
    const mime = contentType.includes('png')
      ? 'image/png'
      : contentType.includes('jpeg') || contentType.includes('jpg')
        ? 'image/jpeg'
        : null
    if (!mime) return null

    const base64 = Buffer.from(await res.arrayBuffer()).toString('base64')
    return `data:${mime};base64,${base64}`
  } catch {
    return null
  }
}

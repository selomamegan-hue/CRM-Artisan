import 'server-only'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10.5, fontFamily: 'Helvetica', color: '#22303A' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
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
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#22303A' },
  totalLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginRight: 12 },
  totalAmount: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
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

export type DevisPdfData = {
  number: string
  companyName: string
  companyPhone: string | null
  companyWhatsapp: string | null
  clientName: string
  clientPhone: string | null
  date: string
  excerpt: string
  items: DevisItem[]
}

function DevisDocument({ data }: { data: DevisPdfData }) {
  const items = data.items.length > 0 ? data.items : [{ description: data.excerpt, quantity: 1, unit_price: 0 }]
  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.companyName}>{data.companyName}</Text>
            {data.companyPhone && <Text style={styles.small}>Tél : {data.companyPhone}</Text>}
            {data.companyWhatsapp && <Text style={styles.small}>WhatsApp : {data.companyWhatsapp}</Text>}
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

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>{formatFcfa(total)}</Text>
        </View>

        <Text style={styles.footer}>Devis émis par {data.companyName}</Text>
      </Page>
    </Document>
  )
}

export async function renderDevisPdf(data: DevisPdfData): Promise<Buffer> {
  return renderToBuffer(<DevisDocument data={data} />)
}

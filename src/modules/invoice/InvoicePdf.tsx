import { Document, Font, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import type { Invoice } from './domain/invoice'
import { invoiceDocument } from './document'
import fontUrl from './assets/noto-sans-regular.ttf?url'

Font.register({ family: 'Invoice Sans', src: fontUrl })
Font.registerHyphenationCallback((word) =>
  word.length > 32 ? (word.match(/.{1,24}/gu) ?? [word]) : [word],
)

const style = StyleSheet.create({
  page: {
    padding: 42,
    paddingBottom: 58,
    fontFamily: 'Invoice Sans',
    color: '#22213a',
    fontSize: 10,
    lineHeight: 1.42,
  },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '2pt solid #4837a6',
    paddingBottom: 16,
  },
  party: { width: '51%' },
  logo: { width: 85, height: 42, objectFit: 'contain', objectPosition: 'left', marginBottom: 8 },
  name: { fontSize: 14, marginBottom: 4 },
  title: { fontSize: 30, color: '#4837a6' },
  right: { width: '44%', textAlign: 'right' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16 },
  caption: { color: '#57556c', fontSize: 8, textTransform: 'uppercase' },
  table: { marginBottom: 12 },
  row: {
    flexDirection: 'row',
    borderBottom: '1pt solid #dedbe8',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tableHead: { backgroundColor: '#f0edf9' },
  description: { width: '41%', paddingRight: 8 },
  qty: { width: '11%', textAlign: 'right' },
  rate: { width: '19%', textAlign: 'right' },
  numeric: { width: '29%', textAlign: 'right' },
  summary: { marginLeft: '32%', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 3 },
  summaryLabel: { width: '49%' },
  summaryValue: { width: '47%', textAlign: 'right' },
  amount: { backgroundColor: '#f9e080', padding: 8, marginTop: 5 },
  extra: { marginBottom: 10 },
  footer: {
    position: 'absolute',
    bottom: 29,
    left: 42,
    right: 42,
    fontSize: 8,
    color: '#57556c',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1pt solid #dedbe8',
    paddingTop: 5,
  },
})

function InvoicePdf({ invoice }: { invoice: Invoice }) {
  const proof = invoiceDocument(invoice, 'code')
  return (
    <Document title={`Invoice ${proof.number}`} author={proof.sender} language="en">
      <Page size="A4" style={style.page}>
        <View style={style.heading}>
          <View style={style.party}>
            {proof.logo && <Image src={proof.logo} style={style.logo} />}
            <Text style={style.name}>{proof.sender}</Text>
            {proof.senderDetails.map((line, index) => (
              <Text key={index}>{line}</Text>
            ))}
          </View>
          <View style={style.right}>
            <Text style={style.title}>Invoice</Text>
            <Text>{proof.number}</Text>
          </View>
        </View>
        <View style={style.meta}>
          <View style={style.party}>
            <Text style={style.caption}>Bill to</Text>
            <Text style={style.name}>{proof.client}</Text>
            {proof.clientDetails.map((line, index) => (
              <Text key={index}>{line}</Text>
            ))}
          </View>
          <View style={style.right}>
            <Text style={style.caption}>Issue date</Text>
            <Text>{proof.issueDate}</Text>
            {invoice.dueDate && (
              <>
                <Text style={style.caption}>Due date</Text>
                <Text>{proof.dueDate}</Text>
              </>
            )}
          </View>
        </View>
        <View style={style.table}>
          <View style={[style.row, style.tableHead]} minPresenceAhead={24}>
            <Text style={style.description}>Description</Text>
            <Text style={style.qty}>Qty</Text>
            <Text style={style.rate}>Rate ({invoice.currency})</Text>
            <Text style={style.numeric}>Amount</Text>
          </View>
          {proof.lines.map((line) => (
            <View key={line.id} style={style.row} wrap={false}>
              <Text style={style.description}>{line.description}</Text>
              <Text style={style.qty}>{line.quantity}</Text>
              <Text style={style.rate}>{line.rate}</Text>
              <Text style={style.numeric}>{line.amount}</Text>
            </View>
          ))}
        </View>
        <View style={style.summary} wrap={false}>
          {proof.summary.map((row, index) => (
            <View key={index} style={style.summaryRow}>
              <Text style={style.summaryLabel}>{row.label}</Text>
              <Text style={style.summaryValue}>{row.amount}</Text>
            </View>
          ))}
          <View style={[style.summaryRow, style.amount]}>
            <Text style={style.summaryLabel}>Amount due</Text>
            <Text style={style.summaryValue}>{proof.total}</Text>
          </View>
        </View>
        {proof.extras.map((entry) => (
          <View key={entry.label} style={style.extra}>
            <Text style={style.caption} minPresenceAhead={14}>
              {entry.label}
            </Text>
            <Text>{entry.body}</Text>
          </View>
        ))}
        <View style={style.footer} fixed>
          <Text>{proof.number.slice(0, 44)}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export function createInvoicePdf(invoice: Invoice) {
  return pdf(<InvoicePdf invoice={invoice} />).toBlob()
}

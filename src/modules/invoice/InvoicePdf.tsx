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
    fontSize: 11,
    lineHeight: 1.42,
  },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '2pt solid #4837a6',
    paddingBottom: 20,
  },
  party: { width: '51%' },
  logo: { width: 132, height: 60, objectFit: 'contain', objectPosition: 'left', marginBottom: 8 },
  name: { fontSize: 17, marginBottom: 3 },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 42,
    lineHeight: 1.05,
    color: '#4837a6',
    marginBottom: 5,
  },
  right: { width: '44%', textAlign: 'right' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 21 },
  caption: { color: '#57556c', fontSize: 9, letterSpacing: 0.55, textTransform: 'uppercase' },
  dateGap: { marginTop: 6 },
  row: {
    flexDirection: 'row',
    borderBottom: '1pt solid #dedbe8',
    paddingVertical: 7,
    paddingHorizontal: 7,
  },
  tableHead: {
    backgroundColor: '#f0edf9',
    color: '#282049',
    fontFamily: 'Helvetica-Bold',
    borderBottomWidth: 0,
  },
  description: { width: '43%', paddingRight: 8 },
  qty: { width: '11%', textAlign: 'right' },
  rate: { width: '19%', textAlign: 'right' },
  numeric: { width: '27%', textAlign: 'right' },
  summary: { marginTop: 14, marginBottom: 20 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '59%',
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  summaryLabel: { width: '49%' },
  summaryValue: { width: '47%', textAlign: 'right' },
  amount: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9e080',
    color: '#282049',
    borderRadius: 3,
    paddingVertical: 11,
    paddingHorizontal: 15,
    marginTop: 10,
  },
  amountLabel: { fontFamily: 'Helvetica-Bold', fontSize: 14 },
  amountValue: { width: '66%', textAlign: 'right', fontSize: 28, lineHeight: 1.1 },
  extra: { marginBottom: 12 },
  footer: {
    marginTop: 12,
    fontSize: 8,
    color: '#57556c',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1pt solid #dedbe8',
    paddingTop: 5,
  },
  footerCurrency: { flexShrink: 0, marginLeft: 12 },
})

function InvoicePdf({ invoice }: { invoice: Invoice }) {
  const proof = invoiceDocument(invoice)
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
                <Text style={[style.caption, style.dateGap]}>Due date</Text>
                <Text>{proof.dueDate}</Text>
              </>
            )}
          </View>
        </View>
        <View style={[style.row, style.tableHead]} minPresenceAhead={30}>
          <Text style={style.description}>Description</Text>
          <Text style={style.qty}>Qty</Text>
          <Text style={style.rate}>Rate</Text>
          <Text style={style.numeric}>Amount</Text>
        </View>
        {/* Keep rows and summary as page siblings so a row break carries all remaining content. */}
        {proof.lines.map((line) => (
          <View key={line.id} style={style.row} wrap={false}>
            <Text style={style.description}>{line.description}</Text>
            <Text style={style.qty}>{line.quantity}</Text>
            <Text style={style.rate}>{line.rate}</Text>
            <Text style={style.numeric}>{line.amount}</Text>
          </View>
        ))}
        <View style={style.summary} wrap={false} minPresenceAhead={proof.extras.length ? 0 : 25}>
          {proof.summary.map((row, index) => (
            <View key={index} style={style.summaryRow}>
              <Text style={style.summaryLabel}>{row.label}</Text>
              <Text style={style.summaryValue}>{row.amount}</Text>
            </View>
          ))}
          <View style={style.amount}>
            <View>
              <Text style={style.amountLabel}>Amount due</Text>
              <Text>{invoice.currency}</Text>
            </View>
            <Text style={style.amountValue}>{proof.total}</Text>
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
        <View style={style.footer} wrap={false}>
          <Text>{proof.number}</Text>
          <Text style={style.footerCurrency}>{invoice.currency}</Text>
        </View>
      </Page>
    </Document>
  )
}

export function createInvoicePdf(invoice: Invoice) {
  return pdf(<InvoicePdf invoice={invoice} />).toBlob()
}

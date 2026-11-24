import { Document, Font, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import { resolveInvoiceLayout, resolveInvoicePalette, type Invoice } from './domain/invoice'
import { invoiceDocument } from './document'
import fontUrl from './assets/noto-sans-regular.ttf?url'

Font.register({ family: 'Invoice Sans', src: fontUrl })
Font.registerHyphenationCallback((word) =>
  word.length > 32 ? (word.match(/.{1,24}/gu) ?? [word]) : [word],
)

const ascii = /^[\x20-\x7e]*$/
const boldFont = (text: string) => (ascii.test(text) ? 'Helvetica-Bold' : 'Invoice Sans')

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
    paddingBottom: 20,
  },
  party: { width: '51%' },
  logo: { width: 132, height: 60, objectFit: 'contain', objectPosition: 'left', marginBottom: 8 },
  name: { fontSize: 17, marginBottom: 3 },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 42,
    lineHeight: 1.05,
    marginBottom: 5,
  },
  right: { width: '44%', textAlign: 'right' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 21 },
  caption: {
    color: '#57556c',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    letterSpacing: 0.55,
    textTransform: 'uppercase',
  },
  dateGap: { marginTop: 6 },
  dateValue: { fontFamily: 'Helvetica-Bold' },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    paddingVertical: 7,
    paddingHorizontal: 7,
  },
  tableHead: {
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
    width: '48%',
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  summaryLabel: { flexGrow: 1, flexShrink: 1, paddingRight: 10 },
  summaryValue: { flexShrink: 0, textAlign: 'right' },
  amount: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 3,
    paddingVertical: 11,
    paddingHorizontal: 15,
    marginTop: 10,
  },
  amountMeta: { flexShrink: 0, paddingRight: 12 },
  amountLabel: { fontFamily: 'Helvetica-Bold', fontSize: 14 },
  amountCurrency: { fontSize: 10, marginTop: 2 },
  amountValueWrap: { flex: 1, alignItems: 'flex-end' },
  amountValue: { textAlign: 'right', lineHeight: 1.1 },
  extrasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12,
  },
  extraCol: { flex: 1 },
  extra: { marginBottom: 12 },
  warning: { color: '#8b2336', marginBottom: 12 },
  footer: {
    marginTop: 12,
    fontSize: 8,
    color: '#57556c',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    paddingTop: 5,
  },
  footerCurrency: { flexShrink: 0, marginLeft: 12 },
})

function InvoicePdf({ invoice }: { invoice: Invoice }) {
  const proof = invoiceDocument(invoice)
  const palette = resolveInvoicePalette(invoice)
  const layout = resolveInvoiceLayout(invoice)
  const isModern = layout === 'modern'
  const isMinimal = layout === 'minimal'
  const tableHeadInk = isMinimal ? '#22213a' : palette.amountInk
  const amountInk = isMinimal ? '#22213a' : palette.amountInk
  const amountFontSize =
    proof.total.length > 16 ? 18 : proof.total.length > 13 ? 21 : proof.total.length > 10 ? 24 : 27
  const noteAndTerms = proof.extras.filter((entry) => entry.label !== 'Payment details')
  const paymentDetails = proof.extras.find((entry) => entry.label === 'Payment details')
  return (
    <Document title={`Invoice ${proof.number}`} author={proof.sender} language="en">
      <Page size="A4" style={style.page}>
        <View
          style={[
            style.heading,
            isModern
              ? {
                  backgroundColor: palette.soft,
                  borderTopWidth: 3.5,
                  borderTopStyle: 'solid',
                  borderTopColor: palette.accent,
                  borderBottomWidth: 0,
                  padding: 14,
                  borderRadius: 5,
                }
              : isMinimal
                ? {
                    borderBottomWidth: 1,
                    borderBottomStyle: 'solid',
                    borderBottomColor: palette.line,
                  }
                : {
                    borderBottomWidth: 2,
                    borderBottomStyle: 'solid',
                    borderBottomColor: palette.accent,
                  },
          ]}
        >
          <View style={style.party}>
            {proof.logo && <Image src={proof.logo} style={style.logo} />}
            <Text style={[style.name, { fontFamily: boldFont(proof.sender) }]}>{proof.sender}</Text>
            {proof.senderDetails.map((line, index) => (
              <Text key={index}>{line}</Text>
            ))}
          </View>
          <View style={style.right}>
            <Text style={[style.title, { color: palette.accent }]}>Invoice</Text>
            <Text>{proof.number}</Text>
          </View>
        </View>
        <View style={style.meta}>
          <View style={style.party}>
            <Text style={style.caption}>Bill to</Text>
            <Text style={[style.name, { fontFamily: boldFont(proof.client) }]}>{proof.client}</Text>
            {proof.clientDetails.map((line, index) => (
              <Text key={index}>{line}</Text>
            ))}
          </View>
          <View style={style.right}>
            <Text style={style.caption}>Issue date</Text>
            <Text style={style.dateValue}>{proof.issueDate}</Text>
            {invoice.dueDate && (
              <>
                <Text style={[style.caption, style.dateGap]}>Due date</Text>
                <Text style={style.dateValue}>{proof.dueDate}</Text>
              </>
            )}
          </View>
        </View>
        <View
          style={[
            style.row,
            style.tableHead,
            isMinimal
              ? {
                  backgroundColor: 'transparent',
                  borderTopWidth: 1,
                  borderTopStyle: 'solid',
                  borderTopColor: palette.accent,
                  borderBottomWidth: 1,
                  borderBottomStyle: 'solid',
                  borderBottomColor: palette.accent,
                }
              : { backgroundColor: palette.soft, borderBottomWidth: 0 },
          ]}
          minPresenceAhead={30}
        >
          <Text style={[style.description, { color: tableHeadInk }]}>Description</Text>
          <Text style={[style.qty, { color: tableHeadInk }]}>Qty</Text>
          <Text style={[style.rate, { color: tableHeadInk }]}>Rate</Text>
          <Text style={[style.numeric, { color: tableHeadInk }]}>Amount</Text>
        </View>
        {proof.lines.length === 0 && (
          <View style={[style.row, { borderBottomColor: palette.line }]}>
            <Text>No line items</Text>
          </View>
        )}
        {/* Keep rows and summary as page siblings so a row break carries all remaining content. */}
        {proof.lines.map((line) => (
          <View key={line.id} style={[style.row, { borderBottomColor: palette.line }]} wrap={false}>
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
          <View
            style={[
              style.amount,
              isMinimal
                ? {
                    backgroundColor: 'transparent',
                    borderTopWidth: 2,
                    borderTopStyle: 'solid',
                    borderTopColor: palette.accent,
                    paddingHorizontal: 0,
                    borderRadius: 0,
                  }
                : isModern
                  ? {
                      backgroundColor: palette.amountBg,
                      borderLeftWidth: 3.5,
                      borderLeftStyle: 'solid',
                      borderLeftColor: palette.accent,
                      borderRadius: 5,
                    }
                  : { backgroundColor: palette.amountBg, borderRadius: 3 },
            ]}
          >
            <View style={style.amountMeta}>
              <Text style={[style.amountLabel, { color: amountInk }]}>Amount due</Text>
              <Text style={[style.amountCurrency, { color: amountInk }]}>{invoice.currency}</Text>
            </View>
            <View style={style.amountValueWrap}>
              <Text
                style={[
                  style.amountValue,
                  { color: amountInk, fontFamily: boldFont(proof.total), fontSize: amountFontSize },
                ]}
              >
                {proof.total}
              </Text>
            </View>
          </View>
        </View>
        {proof.warning && <Text style={style.warning}>{proof.warning}</Text>}
        {noteAndTerms.length > 0 && (
          <View style={style.extrasRow}>
            {noteAndTerms.map((entry) => (
              <View key={entry.label} style={style.extraCol}>
                <Text style={style.caption} minPresenceAhead={14}>
                  {entry.label}
                </Text>
                <Text>{entry.body}</Text>
              </View>
            ))}
          </View>
        )}
        {paymentDetails && (
          <View style={style.extra}>
            <Text style={style.caption} minPresenceAhead={14}>
              {paymentDetails.label}
            </Text>
            <Text>{paymentDetails.body}</Text>
          </View>
        )}
        <View style={[style.footer, { borderTopColor: palette.line }]} wrap={false}>
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

import { Document, Font, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import { resolveInvoiceLayout, resolveInvoicePalette, type Invoice } from './domain/invoice'
import { invoiceDocument } from './document'
import fontUrl from './assets/noto-sans-regular.ttf?url'
import boldFontUrl from './assets/noto-sans-bold.ttf?url'

Font.register({
  family: 'Invoice Sans',
  fonts: [
    { src: fontUrl, fontWeight: 400 },
    { src: boldFontUrl, fontWeight: 700 },
  ],
})
Font.registerHyphenationCallback((word) =>
  word.length > 32 ? (word.match(/.{1,24}/gu) ?? [word]) : [word],
)

const boldTextStyle = { fontFamily: 'Invoice Sans', fontWeight: 700 } as const

const style = StyleSheet.create({
  page: {
    padding: 42,
    paddingBottom: 58,
    fontFamily: 'Invoice Sans',
    color: '#18181b',
    fontSize: 11,
    lineHeight: 1.42,
  },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  brand: { width: '48%' },
  party: { flex: 1 },
  logo: { width: 132, height: 60, objectFit: 'contain', objectPosition: 'left', marginBottom: 8 },
  name: { fontSize: 17, marginBottom: 3 },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 42,
    lineHeight: 1.05,
    marginBottom: 5,
  },
  right: { width: '48%', alignItems: 'flex-end', textAlign: 'right' },
  headerDates: { flexDirection: 'row', justifyContent: 'flex-end', gap: 18, marginTop: 10 },
  headerDateItem: { alignItems: 'flex-end' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: 20, paddingVertical: 21 },
  caption: {
    color: '#5d5a53',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    letterSpacing: 0.55,
    textTransform: 'uppercase',
  },
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
    borderRadius: 2,
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
    color: '#5d5a53',
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
  const tableHeadInk = isModern ? palette.accent : isMinimal ? '#18181b' : palette.amountInk
  const amountInk = isModern ? '#ffffff' : isMinimal ? '#18181b' : palette.amountInk
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
                  borderTopWidth: 2,
                  borderTopStyle: 'solid',
                  borderTopColor: palette.accent,
                  borderBottomWidth: 1,
                  borderBottomStyle: 'solid',
                  borderBottomColor: palette.line,
                  paddingTop: 14,
                  paddingBottom: 14,
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
          <View style={style.brand}>
            {proof.logo && <Image src={proof.logo} style={style.logo} />}
          </View>
          <View style={style.right}>
            <Text style={[style.title, { color: palette.accent }]}>Invoice</Text>
            <Text>{proof.number}</Text>
            <View style={style.headerDates}>
              <View style={style.headerDateItem}>
                <Text style={style.caption}>Issue date</Text>
                <Text style={style.dateValue}>{proof.issueDate}</Text>
              </View>
              {proof.dueDate && (
                <View style={style.headerDateItem}>
                  <Text style={style.caption}>Due date</Text>
                  <Text style={style.dateValue}>{proof.dueDate}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={style.meta}>
          <View style={style.party}>
            <Text style={style.caption}>From</Text>
            <Text style={[style.name, boldTextStyle]}>{proof.sender}</Text>
            {proof.senderDetails.map((line, index) => (
              <Text key={index}>{line}</Text>
            ))}
          </View>
          <View style={style.party}>
            <Text style={style.caption}>Bill to</Text>
            <Text style={[style.name, boldTextStyle]}>{proof.client}</Text>
            {proof.clientDetails.map((line, index) => (
              <Text key={index}>{line}</Text>
            ))}
          </View>
        </View>
        <View
          style={[
            style.row,
            style.tableHead,
            isMinimal || isModern
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
                      backgroundColor: palette.accent,
                      borderRadius: 2,
                    }
                  : { backgroundColor: palette.amountBg, borderRadius: 2 },
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
                  boldTextStyle,
                  { color: amountInk, fontSize: amountFontSize },
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

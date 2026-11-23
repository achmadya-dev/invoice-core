export const currencies = [
  'USD',
  'EUR',
  'GBP',
  'IDR',
  'SGD',
  'MYR',
  'JPY',
  'CNY',
  'AUD',
  'CAD',
  'INR',
  'AED',
  'CHF',
  'HKD',
  'THB',
  'PHP',
  'VND',
  'KRW',
  'NZD',
  'BRL',
  'ZAR',
  'SEK',
  'NOK',
  'SAR',
  'KWD',
] as const

export const countryCodes =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(
    ' ',
  )

const countries = new Intl.DisplayNames('en', { type: 'region' })
const currencyNames = new Intl.DisplayNames('en', { type: 'currency' })

export function countryName(code: string) {
  return code ? (countries.of(code) ?? code) : ''
}

export function currencyName(code: string) {
  return currencyNames.of(code) ?? code
}

export const lineTemplates = [
  {
    name: 'Software development',
    lines: ['Development services', 'Technical review', 'Hosting and tools'],
  },
  { name: 'Managed IT', lines: ['Monthly support', 'On-site visits', 'Licenses and hardware'] },
  {
    name: 'Coaching and consulting',
    lines: ['Consulting session', 'Preparation', 'Follow-up materials'],
  },
  { name: 'Design project', lines: ['Design services', 'Brand assets', 'Revisions and handoff'] },
  {
    name: 'Bookkeeping and tax',
    lines: ['Monthly bookkeeping', 'Reconciliation', 'Tax preparation'],
  },
  { name: 'Finance and advisory', lines: ['Advisory services', 'Financial modeling', 'Analysis'] },
  { name: 'Professional services', lines: ['Professional services', 'Reimbursable expenses'] },
  { name: 'Products and goods', lines: ['Product', 'Packaging'] },
]

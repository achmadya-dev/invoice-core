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

export type LineTemplate = {
  group: string
  name: string
  lines: readonly string[]
}

export const lineTemplates: readonly LineTemplate[] = [
  {
    group: 'Software & IT',
    name: 'Software development — retainer',
    lines: [
      'Monthly software engineering retainer',
      'Additional development hours',
      'Technical advisory and code review',
    ],
  },
  {
    group: 'Software & IT',
    name: 'Dev + infrastructure (pass-through)',
    lines: [
      'Development services',
      'Cloud hosting (pass-through)',
      'Third-party SaaS subscriptions (pass-through)',
      'Domain and SSL (pass-through)',
    ],
  },
  {
    group: 'Software & IT',
    name: 'IT / software consulting — hourly',
    lines: ['Engineering consulting', 'Project coordination'],
  },
  {
    group: 'Software & IT',
    name: 'Managed IT / support',
    lines: [
      'Monthly managed IT support',
      'On-site and remote support visits',
      'Licenses and hardware',
    ],
  },
  {
    group: 'Coaching & Consulting',
    name: 'Coaching — hourly',
    lines: ['Coaching session', 'Preparation and follow-up notes'],
  },
  {
    group: 'Coaching & Consulting',
    name: 'Advisory / strategy consulting',
    lines: ['Strategy consulting', 'Facilitated workshop'],
  },
  {
    group: 'Design',
    name: 'Design project',
    lines: ['Design services', 'Brand assets', 'Revisions and handoff'],
  },
  {
    group: 'Accounting & Tax',
    name: 'Monthly bookkeeping',
    lines: ['Monthly bookkeeping', 'Account reconciliation', 'Financial statements preparation'],
  },
  {
    group: 'Accounting & Tax',
    name: 'Tax & compliance',
    lines: ['Tax return preparation', 'Tax advisory', 'Filing fees (pass-through)'],
  },
  {
    group: 'Accounting & Tax',
    name: 'Payroll services',
    lines: ['Payroll processing', 'Payroll setup and onboarding'],
  },
  {
    group: 'Finance & Advisory',
    name: 'Financial advisory',
    lines: ['Advisory services', 'Financial modeling', 'Valuation and analysis'],
  },
  {
    group: 'Finance & Advisory',
    name: 'Due diligence / M&A',
    lines: ['Financial due diligence', 'Transaction advisory'],
  },
  {
    group: 'General',
    name: 'General professional services',
    lines: ['Professional services', 'Reimbursable expenses (pass-through)'],
  },
  {
    group: 'General',
    name: 'Products / goods',
    lines: ['Product', 'Shipping and handling'],
  },
]

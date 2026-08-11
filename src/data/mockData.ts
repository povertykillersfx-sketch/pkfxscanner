export type Sentiment = 'Bullish' | 'Bearish'

export interface Alert {
  id: string
  asset: string
  sentiment: Sentiment
  strategy: string
  date: string
  trending?: boolean
  targets?: string[]
  reversals?: string[]
}

export interface CourseVideo {
  id: string
  title: string
  description: string
  thumbnail?: string
  available: boolean
}

export interface CourseSection {
  id: string
  title: string
  videos: CourseVideo[]
}

export interface Ebook {
  id: string
  title: string
  description: string
  coverTitle: string
}

/** Available symbols users can add to their scanner */
export const INSTRUMENTS = [
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'NZDUSD',
  'USDZAR',
  'GOLD',
  'US30',
  'NASDAQ',
  'AUDUSD',
] as const

export type Instrument = (typeof INSTRUMENTS)[number]

/** TradingView symbol ids for chart embeds */
export const TRADINGVIEW_SYMBOLS: Record<string, string> = {
  EURUSD: 'FX:EURUSD',
  GBPUSD: 'FX:GBPUSD',
  USDJPY: 'FX:USDJPY',
  NZDUSD: 'FX:NZDUSD',
  USDZAR: 'FX:USDZAR',
  GOLD: 'OANDA:XAUUSD',
  US30: 'FOREXCOM:US30',
  NASDAQ: 'NASDAQ:NDX',
  AUDUSD: 'FX:AUDUSD',
}

export function tradingViewSymbol(asset: string): string {
  return TRADINGVIEW_SYMBOLS[asset] ?? `FX:${asset}`
}

export const DEMO_USER = {
  firstName: 'Kamogelo',
  fullName: 'Kamogelo Dube',
  email: 'povertykillersfx@gmail.com',
  plan: 'free',
}

export const STATS = {
  savedAlerts: 2,
  winRate: '94%',
  strategyScore: '0.0',
}

export const EBOOKS: Ebook[] = [
  {
    id: '1',
    title: 'What is Forex?',
    description: 'A brief introduction to Forex & Trading',
    coverTitle: 'WHAT IS\nFOREX?',
  },
  {
    id: '2',
    title: 'What are Currency Pairs',
    description: 'A brief introduction to currencies and trading assets',
    coverTitle: 'CURRENCY\nPAIRS',
  },
  {
    id: '3',
    title: 'Candlestick Patterns',
    description: 'Learn about candlestick patterns and how you can use them.',
    coverTitle: 'CANDLESTICK\nPATTERNS',
  },
  {
    id: '4',
    title: 'Breakout & Retest Theory',
    description: 'Study trendlines & breakout/retest principles',
    coverTitle: 'BREAKOUT &\nRETEST',
  },
]

export const COURSE_SECTIONS: CourseSection[] = [
  {
    id: 'intro',
    title: 'INTRODUCTION',
    videos: [
      {
        id: 'v1',
        title: 'What is forex?',
        description: 'This video breaks down what is forex and how it works',
        available: false,
      },
      {
        id: 'v2',
        title: 'Types of currency pairs',
        description: 'This video breaks down different types of currency pairs in forex trading.',
        available: true,
        thumbnail: 'TYPES OF CURRENCY PAIRS',
      },
    ],
  },
  {
    id: 'ta',
    title: 'TECHNICAL ANALYSIS',
    videos: [
      {
        id: 'v3',
        title: 'Support, Resistance & Trends',
        description: 'This video covers the basics of support, resistance, and trend lines in forex trading.',
        available: false,
      },
      {
        id: 'v4',
        title: 'Candlesticks Patterns',
        description: 'This video covers keys candlesticks patterns every forex trader should know.',
        available: false,
      },
      {
        id: 'v5',
        title: 'Breakouts',
        description: 'This video covers how breakouts works and how to trade them.',
        available: true,
        thumbnail: 'IMMEDIATE BREAKOUT',
      },
    ],
  },
]

/** Demo price levels used when generating sample alerts per symbol */
const SAMPLE_LEVELS: Record<string, { targets: string[]; reversals: string[] }> = {
  GOLD: { targets: ['3320.50', '3305.20'], reversals: ['3365.80', '3380.10'] },
  EURUSD: { targets: ['1.0820', '1.0785'], reversals: ['1.0910', '1.0945'] },
  GBPUSD: { targets: ['1.2640', '1.2595'], reversals: ['1.2740', '1.2785'] },
  USDJPY: { targets: ['148.20', '147.55'], reversals: ['149.80', '150.40'] },
  NZDUSD: { targets: ['0.5980', '0.5945'], reversals: ['0.6055', '0.6090'] },
  USDZAR: { targets: ['18.20', '18.05'], reversals: ['18.55', '18.72'] },
  US30: { targets: ['39850', '39620'], reversals: ['40280', '40510'] },
  NASDAQ: { targets: ['17820', '17690'], reversals: ['18140', '18275'] },
  AUDUSD: { targets: ['0.6520', '0.6485'], reversals: ['0.6610', '0.6645'] },
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Build dashboard alerts for the user's selected scanner symbols */
export function alertsForSymbols(symbols: string[]): Alert[] {
  if (symbols.length === 0) return []

  const alerts: Alert[] = []
  symbols.forEach((asset, si) => {
    const levels = SAMPLE_LEVELS[asset] ?? { targets: ['—', '—'], reversals: ['—', '—'] }
    alerts.push({
      id: `${asset}-bear-${si}`,
      asset,
      sentiment: 'Bearish',
      strategy: 'Momentum',
      date: daysAgo(si % 3),
      trending: si === 0,
      targets: levels.targets,
      reversals: levels.reversals,
    })
    alerts.push({
      id: `${asset}-bull-${si}`,
      asset,
      sentiment: 'Bullish',
      strategy: 'Momentum',
      date: daysAgo(si % 3),
    })
  })
  return alerts
}

export function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4`
}

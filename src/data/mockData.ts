export type Sentiment = 'Bullish' | 'Bearish'
export type MarketSession = 'Sydney' | 'Asian' | 'London' | 'New York'

export interface Alert {
  id: string
  asset: string
  sentiment: Sentiment
  strategy: string
  /** Calendar day the signal belongs to (YYYY-MM-DD, UTC) */
  date: string
  /** ISO timestamp when AI posted the signal */
  noticedAt: string
  session: MarketSession
  trending?: boolean
  /** AI possible targets for this signal */
  targets: string[]
  /** AI possible reversals for this signal */
  reversals: string[]
  /** Short AI note for the current market read */
  aiNote?: string
  entry?: string
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

/** Trading sessions that can produce alerts (max 4 signals/day per symbol) */
export const MARKET_SESSIONS: {
  id: MarketSession
  /** UTC hour when this session's AI signal can fire */
  signalHourUtc: number
  label: string
}[] = [
  { id: 'Sydney', signalHourUtc: 22, label: 'Sydney' },
  { id: 'Asian', signalHourUtc: 1, label: 'Asian' },
  { id: 'London', signalHourUtc: 8, label: 'London' },
  { id: 'New York', signalHourUtc: 13, label: 'New York' },
]

export const MAX_SIGNALS_PER_DAY = 4

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

export function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4`
}

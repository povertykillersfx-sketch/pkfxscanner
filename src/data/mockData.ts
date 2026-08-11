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

export const USER = {
  firstName: 'Kamogelo',
  fullName: 'Kamogelo Dube',
  email: 'povertykillersfx@gmail.com',
  plan: 'free',
  avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Kamogelo&backgroundColor=b6e3f4',
}

export const ALERTS: Alert[] = [
  {
    id: '1',
    asset: 'GOLD',
    sentiment: 'Bearish',
    strategy: 'Momentum',
    date: '2026-07-29',
    trending: true,
    targets: ['3320.50', '3305.20'],
    reversals: ['3365.80', '3380.10'],
  },
  {
    id: '2',
    asset: 'GOLD',
    sentiment: 'Bullish',
    strategy: 'Momentum',
    date: '2026-07-29',
  },
  {
    id: '3',
    asset: 'GOLD',
    sentiment: 'Bearish',
    strategy: 'Momentum',
    date: '2026-07-28',
  },
  {
    id: '4',
    asset: 'GOLD',
    sentiment: 'Bullish',
    strategy: 'Momentum',
    date: '2026-07-28',
  },
  {
    id: '5',
    asset: 'GOLD',
    sentiment: 'Bearish',
    strategy: 'Momentum',
    date: '2026-07-27',
  },
  {
    id: '6',
    asset: 'GOLD',
    sentiment: 'Bullish',
    strategy: 'Momentum',
    date: '2026-07-27',
  },
]

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

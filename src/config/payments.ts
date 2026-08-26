/**
 * Payment checkout URL for the PKFX plan.
 * Override with VITE_PAYMENT_URL if needed.
 */
export const PAYMENT_URL =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env.VITE_PAYMENT_URL as string | undefined)?.trim()) ||
  'https://paystack.shop/pay/povertykillersfx'

/** Approx. mid-market USDZAR used for display-only conversion (no cents). */
const USD_ZAR_RATE = 16.15

const ZAR_AMOUNT = 2499
const USD_AMOUNT = Math.round(ZAR_AMOUNT / USD_ZAR_RATE)

export const PLAN = {
  name: 'PKFX Access',
  priceLabel: 'R2 499',
  usdPriceLabel: `$${USD_AMOUNT}`,
  periodLabel: 'once off',
  currency: 'ZAR',
  amount: ZAR_AMOUNT,
  usdAmount: USD_AMOUNT,
  benefitsIntro: 'You’ll get access to:',
  benefits: [
    'Trade Ideas',
    'Education',
    'Private Community',
    'Leaderboards & Competitions',
    'Trading Tools',
    'And much more',
  ],
  welcomePackIntro:
    'And because you’re part of the PKFX community, we’re welcoming our members with an exclusive PKFX Welcome Pack.',
  welcomePackTitle: 'Your pack includes:',
  welcomePackItems: [
    'Exclusive PKFX T-Shirt',
    'PKFX Branded Mug',
    'PKFX Keychain',
  ],
} as const

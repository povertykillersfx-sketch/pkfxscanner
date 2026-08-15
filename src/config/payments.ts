/**
 * Payment checkout URL for the PKFX annual plan.
 * Paste your live payment-page link here (or set VITE_PAYMENT_URL).
 */
export const PAYMENT_URL =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env.VITE_PAYMENT_URL as string | undefined)?.trim()) ||
  ''

/** Approx. mid-market USDZAR used for display-only conversion (no cents). */
const USD_ZAR_RATE = 16.15

const ZAR_AMOUNT = 2499
const USD_AMOUNT = Math.round(ZAR_AMOUNT / USD_ZAR_RATE)

export const PLAN = {
  name: 'PKFX Annual Access',
  priceLabel: 'R2 499',
  usdPriceLabel: `$${USD_AMOUNT}`,
  period: 'year',
  currency: 'ZAR',
  amount: ZAR_AMOUNT,
  usdAmount: USD_AMOUNT,
  benefits: [
    'AI Chart scanner',
    'Access to Inner circle Community',
    'Live Trading streams',
    'Educational content',
  ],
} as const

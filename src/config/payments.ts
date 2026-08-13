/**
 * Payment checkout URL for the PKFX annual plan.
 * Paste your live payment-page link here (or set VITE_PAYMENT_URL).
 */
export const PAYMENT_URL =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env.VITE_PAYMENT_URL as string | undefined)?.trim()) ||
  ''

export const PLAN = {
  name: 'PKFX Annual Access',
  priceLabel: 'R1 499',
  period: 'year',
  currency: 'ZAR',
  amount: 1499,
  benefits: [
    'AI Chart scanner',
    'Access to Inner circle Community',
    'Live Trading streams',
    'Educational content',
  ],
} as const

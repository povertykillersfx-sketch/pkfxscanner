import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api/yahoo': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
      },
      '/api/tv-calendar': {
        target: 'https://economic-calendar.tradingview.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/tv-calendar/, '/events'),
        headers: {
          Origin: 'https://www.tradingview-widget.com',
          Referer: 'https://www.tradingview-widget.com/',
          Accept: 'application/json',
        },
      },
    },
  },
  preview: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api/yahoo': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
      },
      '/api/tv-calendar': {
        target: 'https://economic-calendar.tradingview.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/tv-calendar/, '/events'),
        headers: {
          Origin: 'https://www.tradingview-widget.com',
          Referer: 'https://www.tradingview-widget.com/',
          Accept: 'application/json',
        },
      },
    },
  },
})

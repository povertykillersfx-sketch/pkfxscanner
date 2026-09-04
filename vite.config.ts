import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { pkfxSyncPlugin } from './vite-plugin-pkfx-sync.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), pkfxSyncPlugin()],
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

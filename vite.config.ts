
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // In produzione (build) usa percorso relativo per GitHub Pages
  // In sviluppo (dev) usa root assoluta per evitare problemi di routing/proxy
  base: mode === 'production' ? './' : '/',
}))

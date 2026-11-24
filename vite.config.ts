import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Only a boolean is exposed to the client; the key itself stays server-side.
    __HAS_OPENAI__: JSON.stringify(!!(process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY)),
  },
  server: {
    proxy: {
      '/api/jiosaavn': {
        target: 'https://www.jiosaavn.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/jiosaavn/, '/api.php'),
      },
    },
  },
})

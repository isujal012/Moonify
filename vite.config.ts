import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const serverStartTime = Date.now();

function healthEndpointPlugin(): Plugin {
  const handler = (req: any, res: any, next: () => void) => {
    if (req.url === '/health' || req.url === '/api/health') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        status: 'ok',
        service: 'moonify',
        uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
        timestamp: new Date().toISOString(),
      }));
      return;
    }
    next();
  };

  return {
    name: 'moonify-health-endpoint',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), healthEndpointPlugin()],
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

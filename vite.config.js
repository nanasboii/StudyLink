import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { loadEnv } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = Number(env.PORT || 3000)

  return {
    plugins: [vue()],
    publicDir: 'src/public',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src/frontend', import.meta.url))
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              console.error('Proxy error:', err.message);
            });
          }
        },
        '/uploads': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              console.error('Uploads proxy error:', err.message);
            });
          }
        }
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    }
  }
})

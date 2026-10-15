import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const project = env.VITE_FIREBASE_PROJECT_ID || 'demo-vaultara';
  const region = env.VITE_FUNCTIONS_REGION || 'asia-south1';
  return {
    build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 700 },
    server: {
      port: 5173,
      // In production Firebase Hosting rewrites /api/download to the function.
      // In development the same path is proxied to the Functions emulator.
      proxy: {
        '/api/download': {
          target: 'http://127.0.0.1:5001',
          rewrite: (path) => `/${project}/${region}/download${path.slice(path.indexOf('?'))}`,
          changeOrigin: true
        }
      }
    }
  };
});

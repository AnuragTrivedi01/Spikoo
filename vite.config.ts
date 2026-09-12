import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, target: 'es2022',
    rollupOptions: { output: { manualChunks(id) {
      if (id.includes('node_modules/@supabase/')) return 'supabase';
      if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react';
    } } },
  },
  server: { port: 5173, strictPort: true },
});

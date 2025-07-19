import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  optimizeDeps: {
    include: ['@monaco-editor/loader', 'echarts']
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // External peer dependencies
        return ['svelte', 'svelte/'].some(dep => id.startsWith(dep));
      }
    }
  }
});

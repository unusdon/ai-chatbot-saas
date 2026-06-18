import { resolve } from 'node:path';

import { defineConfig } from 'vite';

/**
 * Build the widget bundle to `public/widget.js`. Next.js then serves it as a
 * static asset so the embed snippet just points at `/widget.js`.
 *
 * IIFE format (not ESM) so the script tag works without `type="module"` and
 * is friendly to older host pages.
 */
export default defineConfig({
  build: {
    target: 'es2019',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: false,
    outDir: resolve(__dirname, '../public'),
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AIChatbotWidget',
      formats: ['iife'],
      fileName: () => 'widget.js',
    },
    rollupOptions: {
      // Inline everything — the widget MUST be a single file the host site
      // can drop into their <head>.
      output: { inlineDynamicImports: true },
    },
  },
});

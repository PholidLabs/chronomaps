import { defineConfig, type Plugin } from 'vite';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const require = createRequire(import.meta.url);

/**
 * MapLibre v6 spawns its worker with `new URL('./maplibre-gl-worker.mjs', import.meta.url)`.
 * The bundler cannot see that, so the worker and its shared chunk are emitted next to the
 * entry chunk by hand. In dev the package is left unbundled so the same relative URL resolves.
 */
function maplibreWorkerAssets(): Plugin {
  return {
    name: 'maplibre-worker-assets',
    apply: 'build',
    generateBundle() {
      for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
        this.emitFile({
          type: 'asset',
          fileName: `assets/${file}`,
          source: readFileSync(require.resolve(`maplibre-gl/dist/${file}`), 'utf8'),
        });
      }
    },
  };
}

export default defineConfig({
  // The repo's data folder is the demo's static root: /campaigns/*.json and /basemap/*.geojson
  publicDir: resolve(root, 'data'),
  plugins: [maplibreWorkerAssets()],
  optimizeDeps: { exclude: ['maplibre-gl'] },
  resolve: {
    // most specific first: Vite matches aliases in order
    alias: [
      { find: '@chronomap/maplibre/style.css', replacement: resolve(root, 'packages/maplibre/src/chronomap.css') },
      { find: '@chronomap/maplibre', replacement: resolve(root, 'packages/maplibre/src/index.ts') },
      { find: '@chronomap/engine', replacement: resolve(root, 'packages/engine/src/index.ts') },
    ],
  },
  build: { target: 'es2022', chunkSizeWarningLimit: 1400 },
});

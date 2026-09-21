import { defineConfig, type Plugin } from 'vite';
import { createRequire } from 'node:module';
import { createReadStream, readFileSync, readdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';

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

const ICON_TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg',
};

/**
 * Favicons, the apple-touch icon, the manifest and the social card have to sit at
 * the site root, because that is where browsers and crawlers look for them. They
 * cannot live in publicDir: that is the repo's data/ folder, which holds campaigns
 * and basemap and should not collect site chrome. So dev serves them from
 * apps/demo/icons with a middleware and build emits them by hand — the same
 * approach the MapLibre worker assets above already use.
 */
function siteIcons(): Plugin {
  const dir = resolve(import.meta.dirname, 'icons');
  const files = readdirSync(dir);
  return {
    name: 'site-icons',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\//, '');
        if (!files.includes(name)) return next();
        res.setHeader('Content-Type', ICON_TYPES[extname(name)] ?? 'application/octet-stream');
        createReadStream(resolve(dir, name)).pipe(res);
      });
    },
    generateBundle() {
      for (const name of files) {
        this.emitFile({ type: 'asset', fileName: name, source: readFileSync(resolve(dir, name)) });
      }
    },
  };
}

export default defineConfig({
  // The repo's data folder is the demo's static root: /campaigns/*.json and /basemap/*.geojson
  publicDir: resolve(root, 'data'),
  plugins: [maplibreWorkerAssets(), siteIcons()],
  optimizeDeps: { exclude: ['maplibre-gl'] },
  resolve: {
    // most specific first: Vite matches aliases in order
    alias: [
      { find: '@chronomap/maplibre/style.css', replacement: resolve(root, 'packages/maplibre/src/chronomap.css') },
      { find: '@chronomap/maplibre', replacement: resolve(root, 'packages/maplibre/src/index.ts') },
      { find: '@chronomap/engine', replacement: resolve(root, 'packages/engine/src/index.ts') },
    ],
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1400,
    // Two pages: the landing explainer at / and the map app at /app/. Both entries'
    // chunks still land in assets/, so the hand-emitted MapLibre worker above stays
    // a sibling of the app chunk that asks for it by relative URL.
    rollupOptions: {
      input: {
        landing: resolve(import.meta.dirname, 'index.html'),
        app: resolve(import.meta.dirname, 'app/index.html'),
      },
    },
  },
});

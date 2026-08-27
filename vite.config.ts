import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const hmrEnabled = env.DISABLE_HMR !== 'true';
  const basePath = env.VITE_BASE_PATH || '/';

  const lazyPanelRewrites: Record<string, string> = {
    "./components/CanvasPanel": "./components/lazyPanels",
    "./components/WorkspaceView": "./components/lazyPanels",
    "./components/SettingsModal": "./components/lazyPanels",
    "./components/WorldModal": "./components/lazyPanels",
    "./components/ThoughtLogModal": "./components/lazyPanels",
    "./components/PortraitViewerModal": "./components/lazyPanels",
    "./components/CameraModal": "./components/lazyPanels",
  };

  return {
    base: basePath,
    define: {
      global: 'globalThis',
    },
    plugins: [
      {
        name: 'elara-memory-modal-mount-guard',
        enforce: 'pre',
        transform(code: string, id: string) {
          if (id.endsWith('/src/App.tsx')) {
            let next = code.replace(
              "from './components/MemoryModal';",
              "from './components/MemoryModalGuard';"
            );
            for (const [from, to] of Object.entries(lazyPanelRewrites)) {
              next = next.replace(`from '${from}';`, `from '${to}';`);
            }
            return next;
          }
          return null;
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: false,
        },
        manifest: {
          name: 'Elara Companion',
          short_name: 'Elara',
          description: 'A sophisticated AI companion',
          theme_color: '#ffffff',
          background_color: '#09090b',
          display: 'standalone',
          start_url: basePath,
          scope: basePath,
          icons: [
            { src: `${basePath}pwa-192x192.png`, sizes: '192x192', type: 'image/png' },
            { src: `${basePath}pwa-512x512.png`, sizes: '512x512', type: 'image/png' }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: hmrEnabled,
      watch: hmrEnabled ? {} : null,
    },
  };
});

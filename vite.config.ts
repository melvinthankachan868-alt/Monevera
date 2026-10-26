import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/**
 * In AI Studio Cloud Run preview environments, raw HMR WebSocket connections (port 24678)
 * are not routed because only HTTPS:443 is exposed.
 * This dev-only plugin satisfies Vite's internal @vite/client HMR check during 'serve' mode only,
 * preventing 'WebSocket closed without opened' errors while strictly leaving production builds
 * and all user-space WebSockets, errors, and unhandled rejections untouched.
 */
function devHmrStubPlugin() {
  return {
    name: 'dev-hmr-stub',
    apply: 'serve' as const,
    transformIndexHtml(html: string) {
      const stubScript = `
    <script>
      (function() {
        if (typeof window === 'undefined' || !window.WebSocket) return;
        var NativeWS = window.WebSocket;
        window.WebSocket = function(url, protocols) {
          // Strictly target Vite's internal development HMR WebSocket only
          if (protocols === 'vite-hmr') {
            var listeners = {};
            var fakeSocket = {
              readyState: 1, // OPEN
              url: String(url || ''),
              protocol: 'vite-hmr',
              send: function() {},
              close: function() {},
              addEventListener: function(evt, handler) {
                if (!listeners[evt]) listeners[evt] = [];
                listeners[evt].push(handler);
                if (evt === 'open') {
                  setTimeout(function() {
                    try { handler({ type: 'open', target: fakeSocket }); } catch (_) {}
                  }, 0);
                }
              },
              removeEventListener: function(evt, handler) {
                if (!listeners[evt]) return;
                listeners[evt] = listeners[evt].filter(function(h) { return h !== handler; });
              },
              dispatchEvent: function() { return true; }
            };
            return fakeSocket;
          }
          return new NativeWS(url, protocols);
        };
        window.WebSocket.prototype = NativeWS.prototype;
        window.WebSocket.CONNECTING = NativeWS.CONNECTING;
        window.WebSocket.OPEN = NativeWS.OPEN;
        window.WebSocket.CLOSING = NativeWS.CLOSING;
        window.WebSocket.CLOSED = NativeWS.CLOSED;
      })();
    </script>`;
      return html.replace('</head>', `${stubScript}\n  </head>`);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), devHmrStubPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
              return 'vendor-pdf';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('node_modules/motion') || id.includes('node_modules/canvas-confetti')) {
              return 'vendor-animation';
            }
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio: cloud run proxies do not support raw HMR WebSockets.
      hmr: false,
      ws: false,
      watch: null,
    },
  };
});

// ══════════════════════════════════════════════════════
// ATHARVA — Service Worker v5.0
// Enables offline use on Android (PWA / APK WebView)
// ══════════════════════════════════════════════════════

var CACHE_NAME = 'atharva-v5-cache';

var CACHE_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/storage.js',
  '/js/kernel.js',
  '/js/core.js',
  '/js/civilization.js',
  '/js/memory.js',
  '/js/ui.js',
  '/js/agents.js',
  '/js/boot.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install — cache all files
self.addEventListener('install', function(e) {
  console.log('[SW] Installing ATHARVA cache...');
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FILES.map(function(url) {
        return new Request(url, { cache: 'reload' });
      })).catch(function(err) {
        console.warn('[SW] Some files not cached:', err.message);
      });
    })
  );
  self.skipWaiting();
});

// Activate — clear old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — cache-first strategy for local assets, network-first for API
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // API calls → always network (no caching)
  if(url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(JSON.stringify({ error: 'Offline', mode: 'mock' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Local assets → cache-first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if(cached) return cached;
      return fetch(e.request).then(function(res) {
        if(res && res.status === 200) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return res;
      }).catch(function() {
        // Offline fallback
        if(e.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// VERSÃO 1.0 - Service Worker para Cache Offline
const CACHE_NAME = 'topmercado-v1';
const assetsToCache = [
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/database.js',
    './js/utils.js',
    './pages/adicionar.html',
    './pages/mes.html',
    './pages/relatorio.html',
    './pages/produtos.html',
    './controllers/adicionar.js',
    './controllers/mes.js',
    './controllers/relatorio.js',
    './controllers/produtos.js',
    './manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(assetsToCache);
        })
    );
    self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Interceptação de requisições (Cache First, fallback para rede)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).catch(() => {
                // Se falhar e for página, pode retornar o index.html offline se necessário
            });
        })
    );
});

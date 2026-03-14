const CACHE_NAME = 'willy-pro-cache-v3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './Sunrise Geometric Landscape Logo Template.jpg'
];

// 1. Installation : On met en cache les fichiers de base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert. Ajout des ressources...');
        // On essaie d'ajouter toutes les ressources, mais on ne bloque pas tout si une manque (ex: l'image)
        return Promise.allSettled(
            urlsToCache.map(url => {
                return cache.add(url).catch(err => console.log(`Echec de la mise en cache de ${url}`, err));
            })
        );
      })
  );
  // Force le service worker à s'activer immédiatement
  self.skipWaiting();
});

// 2. Activation : On nettoie les vieux caches si on a changé la version
self.addEventListener('activate', event => {
  const cacheAllowlist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
             console.log('Suppression de l\'ancien cache:', cacheName);
             return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Prend le contrôle des pages ouvertes immédiatement
  event.waitUntil(clients.claim());
});

// 3. Interception des requêtes réseau (Stratégie: Cache falling back to network)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si le fichier est dans le cache, on le retourne tout de suite (super rapide + marche hors ligne)
        if (response) {
          return response;
        }
        
        // Sinon, on va le chercher sur internet
        return fetch(event.request).then(
          function(networkResponse) {
            // Vérifier si la réponse réseau est valide
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // On clone la réponse car le flux ne peut être lu qu'une seule fois
            var responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                // On met la nouvelle ressource en cache pour la prochaine fois
                // On s'assure qu'on ne cache que les requêtes venant de notre propre domaine (sécurité)
                if(event.request.url.startsWith(self.location.origin) && event.request.method === 'GET') {
                   cache.put(event.request, responseToCache);
                }
              });

            return networkResponse;
          }
        );
      }).catch(err => {
         // Si la requête échoue et qu'on est hors ligne, on pourrait renvoyer une page "hors ligne" personnalisée ici
         console.log('Erreur de Fetch (probablement hors ligne)', err);
      })
  );
});
importScripts("https://cdn.jsdelivr.net/npm/@turf/turf@5.1.6/turf.min.js")
importScripts("./headland.min.js")

self.addEventListener('message', e => {
  if (e.data.msg === 'start') return self.postMessage('started');
  const result = headland.polygons(e.data.polygon, {
    maxAngle: e.data.maxAngle,
    minCoordDistance: e.data.minCoordDistance,
    width: e.data.width,
    debug: true
  })
  self.postMessage(result)
}, false);
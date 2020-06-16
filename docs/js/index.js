//
// Globals
//

let polygon
let timestamp_headlands_start
let timestamp_headlands_end
let layers = []
let markers = []
let markersShown = false;

const block = document.getElementById('jsonText')
const hideDebug = document.getElementById('hideDebug')
const turnAngle = document.getElementById('turnAngle')
const minCoordDistance = document.getElementById('minDist')
const headlandWidth = document.getElementById('headlandWidth')
const turnAngleOutput = document.getElementsByName('angleBubble')[0]
const minDistOutput = document.getElementsByName('minDistBubble')[0]
const headlandWidthOutput = document.getElementsByName('headlandWidthBubble')[0]
const urlParams = new URLSearchParams(window.location.search)

//
// Initiate the map and drawing plugin
//

// start a service worker to cache all tile requests to the mapbox api
if ('serviceWorker' in navigator) {
  console.log('yay');
  navigator.serviceWorker.register('js/tilesCache.js')
  .then(reg => console.log('registriert: ', reg))
  .catch(e => console.error(e))
}

mapboxgl.accessToken = 'pk.eyJ1IjoidG9mZmkiLCJhIjoiY2l3cXRnNHplMDAxcTJ6cWY1YWp5djBtOSJ9.mBYmcCSgNdaRJ1qoHW5KSQ';
const map = new mapboxgl.Map({
  container: 'map',
  center: [8.727953, 52.075006],
  zoom: 16,
  style: 'mapbox://styles/mapbox/satellite-v9?optimize=true',
  customAttribution: '<a href="https://www.ilr.uni-bonn.de/em/em_e.htm" target="_blank">Made with ♥ by the University of Bonn - EMAS Group</a>'
})

const Draw = new MapboxDraw({
  displayControlsDefault: false,
  controls: {
    polygon: true,
    trash: true
  }
})

map.addControl(Draw)

// once the map is ready, get an initial example field to showcase the algorithm
map.on('load', () => {
  // parse query parameters (if any)
  const field = urlParams.get('field');
  if (field && !isNaN(Number(field))) {
    getExample(true, Number(field))
  } else {
    getExample(true)
  }
})

//
// Setup the web worker for generating the headlands on a different thread
//

const worker = new Worker('js/worker.js')

worker.addEventListener('message', e => {
  if (e.data === 'started') {
    return
  } else {
    timestamp_headlands_end = new Date()
    console.log(`Took ${timestamp_headlands_end - timestamp_headlands_start} ms to generate headlands`);
    // draw the headlands on the map once they are received from the worker thread
    drawLayers(e.data.polygons)
    // only conditionally render the markers
    debug = e.data.debug
    if (markersShown) drawMarkers()
  }
}, false);

// start worker, so the worker starts downloading turf and is ready to go
// when we need it later
worker.postMessage({
  msg: 'start'
})

//
// Event listeners for form elements
//

// Listen to a polygon being pasted in the respective area
block.addEventListener('input', function(e) {
  polygon = JSON.parse(e.target.value);
  if (polygon.geometry.type === "Polygon") {
    addLayer()
    fitBounds()
  }
})

// listen to a new polygon being drawn on the map
map.on('draw.create', e => {
  polygon = e.features[0]
  addLayer();
  // delete the drawn polygon in order to improve visibility of the headlands
  Draw.delete(e.features[0].id)
})

// listen to changes to the different slider values
turnAngle.addEventListener('input', changeSlider);
minDist.addEventListener('input', changeSlider);
headlandWidth.addEventListener('input', changeSlider);

function changeSlider() {
  turnAngleOutput.innerHTML = turnAngle.value + "°";
  minDistOutput.innerHTML = minDist.value + " m";
  headlandWidthOutput.innerHTML = headlandWidth.value + " m";
  if (polygon !== undefined) addLayer();
}

// listen to the debug marker button being toggled    
function toggleDebug() {
  markersShown = !markersShown
  if (markersShown) { 
    drawMarkers()
    hideDebug.innerHTML = 'Hide debug info'
  } else { 
    removeMarkers()
    hideDebug.innerHTML = 'Show debug info'
  }
}

//
// Add headlands and debug markers to the map (once retreived from the worker)
//

function drawLayers(polygons) {
  // remove all previous layers first
  removeLayers()
  // add each headland as a seperate layer
  polygons.features.forEach((geom, i, arr) => {
    let id = Math.random().toString(36).substring(7);
    map.addLayer({
      'id': id,
      'type': 'line',
      'source': {
        type: "geojson",
        data: geom
      },
      'layout': {},
      'paint': {
        'line-color': randColor(i, arr.length),
        'line-width': 8
      }
    })
    layers.push(id);
  })
}

function drawMarkers() {
  // remove any existing markers before drawing the new ones
  removeMarkers()
  debug.forEach((point, i) => {
    const el = document.createElement('div');
    el.className = 'marker';
    if (point.type === 'Breakpoint') {
      el.className = 'marker lastPoint';
    } else if (point.type && point.type.includes('Below')) {
      el.className = 'marker firstUncertain';
    }

    el.innerHTML = i
    const marker1 = new mapboxgl.Marker(el)
      .setLngLat(point.coord)
      .setPopup(new mapboxgl.Popup({
          offset: 25
        }) // add popups
        .setHTML('<h3>' + point.type + '</h3><p>' +
          'Angle to last coordinate exceeding the min. distance: ' + point.angle + '<br>' +
          'Reference angle: ' + point.refAngle + '<br>' +
          'Angle difference (between cur. angle and reference): ' + point.angleDiff + '<br>' +
          'Distance: ' + point.distance + '<br>' +
          'Index of last point: ' + point.lastPointIndex + '<br>' +
          '</p>'))
      .addTo(map);
    markers.push(marker1)
  })
}

// debounce the creation of the headlands in order to reduce the workload
// in the worker
const addLayer = debounce(() => {
  timestamp_headlands_start = new Date()
  worker.postMessage({
    polygon,
    maxAngle: Number(turnAngle.value),
    minCoordDistance: Number(minDist.value),
    width: Number(headlandWidth.value),
    debug: true
  })
}, 150)

function getExample(onload, no) {
  let number = 60
  let duration
  // if the page was just loaded and no example number was passed in the 
  // url, always start off with the default example
  if (onload && !no) {
    // polygon = examplePlots[60]
    polygon = examplePlots[number]
    duration = 0
  // same as above, but jump to the example passed in the url
  } else if (onload && no) {
    number = no
    duration = 0
    polygon = examplePlots[number]
  // when the 'get example' button was clicked, get a random example and fly to it
  } else {
    let random = Math.floor(Math.random() * 79)
    // do not consider some examples for now, as they are not 'real' arable fields
    // or just too small 
    const ignoredFields = [33, 52, 61]
    if (ignoredFields.indexOf(random) > -1) random = 0
    number = no ? no : random
    polygon = examplePlots[number]
    console.log('Example number: ' + number);
  }
  // send call to worker, and eventually draw headlands on the map
  addLayer()
  fitBounds(duration)
  // update url, so bugs / issues can be shared more easily
  urlParams.set('field', number)
  let pageUrl = '?' + urlParams.toString();
  window.history.pushState('', '', pageUrl)
}
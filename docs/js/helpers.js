//
// Map helper functions
//
function removeLayers() {
  layers.forEach(layer => {
    map.removeLayer(layer)
  })
  layers = []
  // eventually also remove all hand drawn elements
  Draw.getAll().features.forEach(e => Draw.delete(e.id))
}

function removeMarkers() {
  markers.forEach(marker => {
    marker.remove()
  })
  markers = []
}

function fitBounds(duration) {
  const options = {
    padding: {
      left: 340,
      top: 80,
      right: 60,
      bottom: 60
    }
  }
  if (duration === 0) options.duration = 0
  map.fitBounds(getBoundingBox(polygon), options)
}

function getBoundingBox(data) {
  let bounds = {},
    coordinates, point, latitude, longitude;

  coordinates = data.geometry.coordinates;

  if (coordinates.length === 1) {
    // It's only a single Polygon
    // For each individual coordinate in this feature's coordinates...
    for (let j = 0; j < coordinates[0].length; j++) {
      longitude = coordinates[0][j][0];
      latitude = coordinates[0][j][1];

      // Update the bounds recursively by comparing the current xMin/xMax and yMin/yMax with the current coordinate
      bounds.xMin = bounds.xMin < longitude ? bounds.xMin : longitude;
      bounds.xMax = bounds.xMax > longitude ? bounds.xMax : longitude;
      bounds.yMin = bounds.yMin < latitude ? bounds.yMin : latitude;
      bounds.yMax = bounds.yMax > latitude ? bounds.yMax : latitude;
    }
  } else {
    // It's a MultiPolygon
    // Loop through each coordinate set
    for (let j = 0; j < coordinates.length; j++) {
      // For each individual coordinate in this coordinate set...
      for (let k = 0; k < coordinates[j][0].length; k++) {
        longitude = coordinates[j][0][k][0];
        latitude = coordinates[j][0][k][1];

        // Update the bounds recursively by comparing the current xMin/xMax and yMin/yMax with the current coordinate
        bounds.xMin = bounds.xMin < longitude ? bounds.xMin : longitude;
        bounds.xMax = bounds.xMax > longitude ? bounds.xMax : longitude;
        bounds.yMin = bounds.yMin < latitude ? bounds.yMin : latitude;
        bounds.yMax = bounds.yMax > latitude ? bounds.yMax : latitude;
      }
    }
  }
  // Returns an object that contains the bounds of this GeoJSON data.
  // The keys describe a box formed by the northwest (xMin, yMin) and southeast (xMax, yMax) coordinates.
  return [bounds.xMin, bounds.yMin, bounds.xMax, bounds.yMax]
}

//
// Other helper functions
//
function randColor(colorNum, colors) {
  if (colors < 1) colors = 1; // defaults to one color - avoid divide by zero
  return "hsl(" + (colorNum * (360 / colors) % 360) + ",100%,50%)";
}

function debounce(func, wait, immediate) {
  let timeout;
  return function() {
    let context = this,
      args = arguments;
    let later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    let callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}
/*
	Vorgewende
	API Methods
	lineString (poly, (options.maxAngle), (options.minCoordDistance), (options.debug)) - Returns array consisting of a GeoJSON lineString for each headland for the given field
	Polygon (poly, (options.maxAngle), (options.minCoordDistance), (options.width))- Returns an array consisting of a GeoJSON Polygon for each headland using the working width as its width for the given field
*/
import * as turf from '@turf/turf'
import polygonClipping from 'polygon-clipping'
// import jsts from 'jsts'

const headland = {
  lineStrings(poly, options = {}) {
    if (!poly) throw new Error('No GeoJSON polygon passed to lineStrings function')
    // define default options
    options.maxAngle = options.maxAngle || 30
    options.minCoordDistance = options.minCoordDistance || 10

    let debugData = []
    let holes = []
    let lineStrings = []
    let uncertainPoints = []
    let curLine = []
    let referencePoint = []
    let lastPointIndex = 0
    let lastPoint = []
    let refAngle = 0

    poly = turf.cleanCoords(poly)
    // interpolate polygon to improve results
    if (options.interpolate) poly = interpolate(poly, minCoordDistance)
    poly.geometry.coordinates[0].forEach((currentCoord, coordIndex) => {
      // always start a new lineString when the index is 0, or if a new featureIndex starts
      if (coordIndex === 0 || !curLine) {
        if (curLine.length) lineStrings.push(curLine)
        curLine = [currentCoord]
        lastPoint = currentCoord
        lastPointIndex = coordIndex
        return
      }
      const lastCoord = referencePoint.length ? referencePoint : lastPoint
      // make sure there are no duplicates messing with the algorithm
      const distToLastPoint = turf.distance(lastPoint, currentCoord) * 1000
      if (currentCoord[0] === lastCoord[0] && currentCoord[1] === lastCoord[1]) {
        // console.log('found duplicate');
        return
      } else if (distToLastPoint < 2) {
        // console.log('found point closer than 2m');
        return
      }
      // if this is the second point, calculate the angle between the first two
      // points and save it as a reference point
      if (curLine.length === 1) {
        refAngle = turf.bearing(lastCoord, currentCoord) // angleCoords(lastCoord,currentCoord)
        curLine.push(currentCoord)
        lastPoint = currentCoord
        lastPointIndex = coordIndex
        return
      }
      // acquire all relevant info for the coordinate
      const coord = getCoordDetails(currentCoord, lastCoord, refAngle, options.minCoordDistance, options.maxAngle)
      // first case: minCoordDistance held = true, and turning angle exceeded
      if (coord.aboveminCoordDistance && coord.exceedsTurnAngle) {
        // console.log('First case');
        // uncertain polys were already exceeding the turning angle,
        // so they are part of the new headland
        // only push the first point to the "old" headland as well
        referencePoint = []
        if (options.debug) debugData.push({
          ...coord,
          lastPointIndex,
          // uncertainPoints
          type: 'Breakpoint'
        })
        if (uncertainPoints.length) {
          lineStrings.push(curLine)
          curLine = [curLine[curLine.length - 1], ...uncertainPoints, currentCoord]
          refAngle = turf.bearing(uncertainPoints[0], currentCoord)

          uncertainPoints = []
        } else {
          lineStrings.push(curLine)
          refAngle = turf.bearing(lastPoint, currentCoord)
          curLine = [lastPoint, currentCoord]
        }
        // second case, minCoordDistance held = true, but turning angle is not exceeded
      } else if (coord.aboveminCoordDistance && !coord.exceedsTurnAngle) {
        // console.log('Second case');
        if (options.debug) debugData.push({
          ...coord,
          lastPointIndex,
          // uncertainPoints
          type: 'Regular point'
        })
        if (uncertainPoints.length) {
          curLine = curLine.concat(uncertainPoints)
          uncertainPoints = []
        }
        referencePoint = []
        refAngle = coord.angle
        curLine.push(currentCoord)
        // this point is uncertain, it could lead to a new headland, but might also
        // belong to the current one, move on with caution
      } else if (!coord.aboveminCoordDistance && coord.exceedsTurnAngle) {
        // console.log('Third case');
        if (options.debug) debugData.push({
          ...coord,
          lastPointIndex,
          // uncertainPoints
          type: 'Below distance, above turning angle'
        })
        if (!referencePoint.length) {
          referencePoint = lastCoord
          lastPointIndex = coordIndex - 1
        }
        uncertainPoints.push(currentCoord)
      } else {
        // console.log('Foruth case');
        // The minCoordDistance is not held and no danger due to not exceeded
        // turning angle. We add the poin to the line string, but save the previous
        // point for the next angle calculation
        const actAngle = turf.bearing(lastPoint, currentCoord)
        const diff = angleBetCoords(actAngle, refAngle)
        const correctedDiff = coord.distance / options.minCoordDistance
        // use uncertain polys to adapt the reference angle if they are not
        // too sharp
        if (Math.abs(diff) < 60) {
          refAngle += diff * correctedDiff
          if (refAngle < -180) refAngle += 360
          else if (refAngle > 180) refAngle -= 360
        }
        if (options.debug) debugData.push({
          ...coord,
          lastPointIndex,
          type: 'Below distance, below turning angle'
        })
        if (!referencePoint.length) {
          referencePoint = lastCoord
          lastPointIndex = coordIndex - 1
        }
        if (uncertainPoints.length === 1) {
          curLine.push(uncertainPoints[0])
          curLine.push(currentCoord)
          uncertainPoints = []
        } else if (uncertainPoints.length) {
          uncertainPoints.push(currentCoord)
        } else {
          curLine.push(currentCoord)
        }
      }
      // make this the point the last point
      lastPoint = currentCoord
      lastPointIndex = coordIndex
    })
    // add the remainder of the section to the lineString
    if (curLine.length && lineStrings.length) {
      // check if the section is actually part of the first headland
      const initAngle = turf.bearing(lineStrings[0][0], lineStrings[0][1]) //angleCoords(lineStrings[0][0],lineStrings[0][1])
      const lastAngleDiff = angleBetCoords(refAngle, initAngle)
      if (lastAngleDiff >= options.maxAngle || lastAngleDiff <= -options.maxAngle) {
        if (options.debug) debugData.push({
          angleDiff: lastAngleDiff,
          refAngle: initAngle,
          coord: lineStrings[0][0],
          lastPointIndex,
          type: 'Last point'
        })
        // TODO: This is missing one more point, but need to figure out which one exactly
        if (uncertainPoints.length) lineStrings[0] = uncertainPoints.concat(lineStrings[0]) // [curLine[0],...uncertainPoints,lineStrings[0]] // 
        lineStrings.push(curLine)
      } else {
        if (options.debug) debugData.push({
          angleDiff: lastAngleDiff,
          refAngle: initAngle,
          coord: lineStrings[0][0],
          lastPointIndex,
          type: 'lastPoint'
        })
        lineStrings[0] = curLine.concat(uncertainPoints, lineStrings[0])
      }
    } else if (curLine.length) {
      lineStrings.push(curLine)
    }
    // in valid GeoJSON, the first geometry in a feature is the outer ring,
    // on which we try to calculate the headlands. Any subsequent geometry in the feature is assumed to be
    // a hole in the polgyon
    // for these holes, we simply assume that the headland is wrapped around the hole
    for (let i = 1; i < poly.geometry.coordinates.length; i++) {
      const hole = poly.geometry.coordinates[i]
      holes.push(turf.polygon([hole]))
    }
    const lineStringFeatures = lineStrings.map(ls => turf.lineString(ls))
    return {
      lineStrings: turf.featureCollection(lineStringFeatures),
      holes: turf.featureCollection(holes),
      debug: debugData
    }
  },
  polygons(poly, options) {
    if (!poly) throw new Error('No GeoJSON polygon passed to headlands.polygons function')
    // define default settings
    options.maxAngle = options.maxAngle || 30
    options.minCoordDistance = options.minCoordDistance || 10
    options.width = options.width || 12
    // get the line strings first
    // first make sure windings are correct
    poly = turf.rewind(poly)
    const {
      lineStrings,
      holes,
      debug
    } = this.lineStrings(poly, options)
    
    let polygons
    try {
      polygons = lineStrings.features.map(ls => {
        // add additional point to start
        ls = extendLineString(ls, options.width)
        // and to the end of the linestring
        ls = extendLineString(ls, options.width, true)
        // buffer the line string
        let headland = turf.buffer(ls, options.width / 1000)
        // extent the line string once again, and split the buffered line string
        // into an inner and outer part (outer part is discarded)
        headland = splitBuffer(headland, ls, options.width)
        // finally we clip away any unwated parts of the polygon
        headland = clipHeadland(headland, poly, options.width)
        if (!headland) {
          // this shouldn't happen, but does happen due to various bugs
          // in this algorithm, but also in @turf and polygon-clipping
          return
        }
        // finally we check for intersections between the headlands, and return
        return headland
      })
    } catch (e) {
      throw new Error('Failed to create headland polygons. This is likely to occur when the input polygon is too small: ' + e)
    }
    
    if (holes && holes.features && holes.features.length) {
      holes.features.forEach(hole => {
        let headland = turf.buffer(hole, options.width / 1000)
        headland = turf.difference(headland, hole)
        polygons.push(headland)
      })
    }
    polygons = checkIntersections(polygons)
    return {
      polygons: turf.featureCollection(polygons),
      debug
    }
  }
}

function checkIntersections(polys) {
  const filtered = []
  for (let i = 0; i < polys.length; i++) {
    // if (i !== 5) continue
    if (!polys[i]) continue
    const curHeadland = polys[i]
    try {
      // create a 'unified' headland, which joins all headlands except the one
      // currently evaluated (i)
      const headlandsExceptCurrent = polys.filter(p => p !== curHeadland)
      const unified = polygonClipping.union(...headlandsExceptCurrent.map(h => h.geometry.coordinates))
      // calculate the intersection area of the the unified and the current headland
      // if the intersection area is within 99% of the currentHeadlands area, we throw it out
      const intersectionCoords = polygonClipping.intersection(curHeadland.geometry.coordinates,unified)
      if (!intersectionCoords) {
        continue
      }
      const intersectionPoly = turf.multiPolygon(intersectionCoords)
      const intersectionArea = turf.area(intersectionPoly)
      const curHeadlandArea = turf.area(curHeadland)
      if (intersectionArea > curHeadlandArea * 0.99) {
        continue
      }
      curHeadland.properties.area = curHeadlandArea
      filtered.push(curHeadland)
    } catch (e) {
      console.log(e);
      // weird ass errors thrown by Turf (actually JSTS) on some polys (???)
      // in these cases just hope for the best
      filtered.push(curHeadland)
    }
  }
  return filtered
}

function getCoordDetails(currentCoord, lastCoord, refAngle, minCoordDistance, maxAngle) {
  const curDistance = turf.distance(lastCoord, currentCoord) * 1000
  const curAngle = turf.bearing(lastCoord, currentCoord)
  const angleDiff = angleBetCoords(refAngle, curAngle)
  return {
    distance: curDistance,
    angle: curAngle,
    refAngle: refAngle,
    angleDiff: angleDiff,
    exceedsTurnAngle: angleDiff >= maxAngle || angleDiff <= -maxAngle ? true : false,
    aboveminCoordDistance: curDistance >= minCoordDistance ? true : false,
    coord: currentCoord
  }
}

function splitBuffer(headlandBuffer, ls, width) {
  // extent the line string again in both directions to make sure it's 
  // longer than the buffer polygon
  ls = extendLineString(ls, width * 1000)
  ls = extendLineString(ls, width * 1000, true)
  let sliced
  try {
    sliced = polygonCut(headlandBuffer, ls)
    sliced = sliced.features[0]
  } catch (e) {
    // this will throw a "topology exception" error in jsts for one headland
    // (in most of the cases) due to a precision error. 
    // In this case we just use the buffered headland, from wich we have to subtract
    // the outer part of the field in a subsequent step
    sliced = headlandBuffer
  }
  return sliced
}

function clipHeadland(headland, poly, width) {
  // clip the area that is outside of the original polygon
  const intersectionArea = polygonClipping.intersection(headland.geometry.coordinates,poly.geometry.coordinates)
  if (!intersectionArea) return headland
  // now remove the any inwards bound features from the polygon
  const innerPoly = turf.buffer(poly, width / 1000 * -1)
  headland = polygonClipping.difference(intersectionArea, innerPoly.geometry.coordinates)
  return turf.multiPolygon(headland)
}

// extend the line string by one point in each direction dpeending
// if the additional point is outside the polygon
function extendLineString(ls, width, lastPoint) {
  // calculate bearing between first/last two points
  const coordinates = ls.geometry.coordinates
  const point1 = lastPoint ? coordinates[coordinates.length - 2] : coordinates[1]
  const point2 = lastPoint ? coordinates[coordinates.length - 1] : coordinates[0]

  const newPointDirection = turf.bearing(point1, point2)
  const newPoint = turf.destination(point2, width / 1000, newPointDirection)

  if (lastPoint) {
    ls.geometry.coordinates.push(newPoint.geometry.coordinates)
  } else {
    ls.geometry.coordinates.unshift(newPoint.geometry.coordinates)
  }
  return ls
}

function interpolate(poly, minCoordDistance) {
  const coordinates = []
  // convert poly to line
  // const line = polygonToLine(poly)
  // add additional points
  turf.segmentEach(poly, (currentSegment, featureIndex, multiFeatureIndex, geometryIndex, segmentIndex) => {
    if (featureIndex > 1 || multiFeatureIndex > 1 || geometryIndex > 1) return
    const curDistance = length(currentSegment) * 1000
    // push first coordinate
    if (segmentIndex === 0) {
      coordinates.push(currentSegment.geometry.coordinates[0])
    }

    if (curDistance > minCoordDistance) {
      const interpolations = Math.floor(curDistance / minCoordDistance + 1)
      for (var i = 1; i <= interpolations; i++) {
        const point = along(currentSegment, i * minCoordDistance / 1000)
        coordinates.push(point.geometry.coordinates)
      }
    }
    // push second coordinate
    coordinates.push(currentSegment.geometry.coordinates[1])
  })
  return polygon([coordinates])
}

function polygonCut(polygon, line, idPrefix) {
  const THICK_LINE_UNITS = 'kilometers';
  const THICK_LINE_WIDTH = 0.0001;
  var i, j, id, intersectPoints, lineCoords, forCut, forSelect;
  var thickLineString, thickLinePolygon, clipped, polyg, intersect;
  var polyCoords = [];
  var cutPolyGeoms = [];
  var cutFeatures = [];
  var offsetLine = [];
  var retVal = null;

  if (typeof(idPrefix) === 'undefined') {
    idPrefix = '';
  }

  intersectPoints = turf.lineIntersect(polygon, line);
  if (intersectPoints.features.length == 0) {
    return retVal;
  }

  var lineCoords = turf.getCoords(line);
  if ((turf.booleanWithin(turf.point(lineCoords[0]), polygon) ||
      (turf.booleanWithin(turf.point(lineCoords[lineCoords.length - 1]), polygon)))) {
    return retVal;
  }

  offsetLine[0] = turf.lineOffset(line, THICK_LINE_WIDTH, {
    units: THICK_LINE_UNITS
  });
  offsetLine[1] = turf.lineOffset(line, -THICK_LINE_WIDTH, {
    units: THICK_LINE_UNITS
  });

  // remove NaN coords
  offsetLine[0].geometry.coordinates = offsetLine[0].geometry.coordinates.filter(coord => !isNaN(coord[0]))
  offsetLine[1].geometry.coordinates = offsetLine[1].geometry.coordinates.filter(coord => !isNaN(coord[0]))

  for (i = 0; i <= 1; i++) {
    forCut = i;
    forSelect = (i + 1) % 2;
    polyCoords = [];
    for (j = 0; j < line.geometry.coordinates.length; j++) {
      polyCoords.push(line.geometry.coordinates[j]);
    }
    for (j = (offsetLine[forCut].geometry.coordinates.length - 1); j >= 0; j--) {
      polyCoords.push(offsetLine[forCut].geometry.coordinates[j]);
    }
    polyCoords.push(line.geometry.coordinates[0]);
    polyCoords = polyCoords.filter(coord => !isNaN(coord[0]))
    thickLineString = turf.lineString(polyCoords);
    thickLinePolygon = turf.lineToPolygon(thickLineString);
    clipped = turf.difference(polygon, thickLinePolygon);

    cutPolyGeoms = [];
    for (j = 0; j < clipped.geometry.coordinates.length; j++) {
      polyg = turf.polygon(clipped.geometry.coordinates[j]);
      intersect = turf.lineIntersect(polyg, offsetLine[forSelect]);
      if (intersect.features.length > 0) {
        cutPolyGeoms.push(polyg.geometry.coordinates);
      };
    };

    cutPolyGeoms.forEach(function(geometry, index) {
      id = idPrefix + (i + 1) + '.' + (index + 1);
      cutFeatures.push(turf.polygon(geometry, {
        id: id
      }));
    });
  }

  if (cutFeatures.length > 0) retVal = turf.featureCollection(cutFeatures);

  return retVal;
};

function angleBetCoords(a, b) {
  let difference = a - (b)
  if (difference < -180) difference += 360
  else if (difference > 180) difference -= 360
  return difference
}

export default headland
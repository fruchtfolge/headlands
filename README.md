# headlands

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

headlands is a JavaScript module for creating agricultural [headlands](https://en.wikipedia.org/wiki/Headland_(agriculture)) from GeoJSON plots.
Works in NodeJS and in the browser.

![demo image](https://user-images.githubusercontent.com/20703207/84497032-4fb88080-acae-11ea-852f-ec9583dd9943.png)
## Install
The script is still in beta phase. To install, clone this repo or grab any of the bundled files suitable for your needs from the `dist` folder.

This module relies on [@turf](https://github.com/Turfjs/turf), which you need to include *before* using this module when running in a browser:
```html
<script src="https://cdn.jsdelivr.net/npm/@turf/turf@5/turf.min.js"></script>
```

## How fast is it?
For an average plot (as per the examples in this repo), creating headlands
takes approx. **60-150ms** (measured on a MBP early 2015).

*Not good, not terrible*

When running in a browser, it is advised to run the script inside a **web worker**
in order to avoid unnecessary blocking of the main thread. See the contents of the
`docs` folder for a working example.

## Usage

#### [Click here for an online demo](https://fruchtfolge.github.io/headlands/?field=60)

The module exports two methods:
### ```lineString(polygon, { (maxAngle: 30), (minCoordDistance: 10), (debug: false)})```

where

```polygon``` a GeoJSON polygon feature

```options.maxAngle``` the maximal allowed turning angle in degrees, defaults to 30 deg

```options.minCoordDistance``` the minimum distance between two coordinates (in meters) used for angle comparison, defaults to 10m.

#### Example
```js
const headlands = require('headlands')
const fs = require('fs')

let plot = fs.readFileSync('somePlotPolygonFeature.geojson')
let { lineStrings } = headlands.lineString(plot) // contains an array of all potential headlands as GeoJSON linestring features
```

#### Returns
An object of the following form:
```js
{
  lineStrings: {
    // a GeoJSON feature collection of lineString features representing each headland
  },
  debug: [
    // an array of GeoJSON points containing debug information (solely for development of this algorithm)
  ]
}
```

### ```polygons(polygon, { (maxAngle: 30), (minCoordDistance: 10), (width: 12), (debug: false)})```

where
```polygon``` a GeoJSON polygon feature

```options.maxAngle``` the maximal allowed turning angle in degrees, defaults to 30 deg

```options.minCoordDistance``` the minimum distance between two coordinates (in meters) used for angle comparison, defaults to 10m.

```options.width``` Width of each headland in meters, typically equal to (half) the working width of the sprayer used. Defaults to 12m.

#### Example
```js
const headlands = require('headlands')
const fs = require('fs')

let plot = fs.readFileSync('somePlotPolygonFeature.geojson')
let { polygons, debug } = headlands.polygons(plot, {width: 15, maxAngle: 40, debug: true}) // contains an array of all potential headlands as GeoJSON polygon features
```
#### Returns
An object of the following form:
```js
{
  polygons: {
    // a GeoJSON feature collection of polygon features representing each headland
  },
  debug: [
    // an array of GeoJSON points containing debug information (solely for development of this algorithm)
  ]
}

## License

MIT@Christoph Pahmeyer

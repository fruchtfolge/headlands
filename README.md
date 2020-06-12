# headlands

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

headlands is a JavaScript module for creating agricultural [headlands](https://en.wikipedia.org/wiki/Headland_(agriculture)) from GeoJSON plots.
Works in NodeJS and in the browser.

![demo image](https://user-images.githubusercontent.com/20703207/84497032-4fb88080-acae-11ea-852f-ec9583dd9943.png)
## Install
The script is still in beta phase, to install simply clone this repo.

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
An array of GeoJSON lineString features representing each headland.

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
An array of GeoJSON polygon features representing each headland.


## License

MIT

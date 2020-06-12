// const test = require('tape');
const { lineStrings } = require('../')
const fs = require('fs')

const plot = require('./plots/plotA.json')

const ls = lineStrings(plot)
console.log(ls);

/*
test('should return the correct headlands for each plot', function (t) {
  fs.readdirSync('plots').forEach(filename => {
  	let plot = filename.slice(0, -5)
    let poly = JSON.parse(fs.readFileSync('plots/' + plot + '.json'))
    let result = JSON.parse(fs.readFileSync('results/' + plot + '-result.json'))
    t.equal(result, vorgewende.lineString(poly, 50, 10))
  })
  t.end()
});
*/
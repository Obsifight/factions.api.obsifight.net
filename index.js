// ==========
// INIT
// ==========
var express = require('express')
var fs = require('fs')
var app = express()

// ==========
// HOMEPAGE
// ==========
app.get('/', function (req, res) {
  return res.json({
    name: 'obsiapi-factionranking',
    version: require('fs').readFileSync('./VERSION').toString().trim(),
    author: 'Eywek',
    environement: (process.env.NODE_ENV === 'production') ? 'production' : 'development'
  })
})

// ==========
// GET DATA
// ==========
app.get('/data', function (req, res) {
  console.info('[' + new Date() + '] Request factions.json from ' + req.ip)
  res.setHeader('Content-Type', 'application/json') // is json
  fs.createReadStream('./data/factions.json').pipe(res) // pipe cache file
})

// ==========
// LISTEN
// ==========
app.listen(3000, function () {
  console.log('App listen on port 3000')
})

// ==========
// INIT
// ==========
var express = require('express')
var fs = require('fs')
var CronJob = require('cron').CronJob
global.mysql = require('mysql')
global.config = require('./config/config')
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

// ===========
// UPDATE DATA
// ===========
new CronJob('0 0 */2 * * *', function () { // Every 2 hours
  require('./api/getData')(require('./api/formatting'))
}, null, true, 'Europe/Paris')

// ==========
// GET DATA
// ==========
app.get('/data', function (req, res) {
  console.info('[' + new Date() + '] Request factions.json from ' + req.ip)
  res.setHeader('Content-Type', 'application/json') // is json
  res.setHeader('Last-Modified', fs.statSync('./data/factions.json').mtime) // last modified
  var allowedOrigins = ['http://dev.obsifight.net', 'http://obsifight.net', 'https://obsifight.net']
  var origin = req.headers.origin
  if (allowedOrigins.indexOf(origin) > -1) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET') // only 1 method
  fs.createReadStream('./data/factions.json').pipe(res) // pipe cache file
})

app.get('/data/:factionid', function (req, res) {
  var factionId = req.params.factionid
  console.info('[' + new Date() + '] Request faction ' + factionId + ' from ' + req.ip)
  res.setHeader('Content-Type', 'application/json') // is json

  // allow
  var allowedOrigins = ['http://dev.obsifight.net', 'http://obsifight.net', 'https://obsifight.net']
  var origin = req.headers.origin
  if (allowedOrigins.indexOf(origin) > -1) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET') // only 1 method

  // connection
  var connection = mysql.createConnection({
    host: config.db.factions.host,
    user: config.db.factions.user,
    password: config.db.factions.password,
    database: config.db.factions.database
  })
  connection.connect()

  // find
  connection.query('SELECT * FROM `rsf_factions` WHERE id = ?', [factionId], function (err, rows, fields) {
    if (err) {
      console.error(err)
      return res.status(500).json({status: false})
    }
    return res.json({status: true, data: require('./api/formatting')(rows[0])})
  })
})

app.get('/player/is-leader/:username', function (req, res) {
  var username = req.params.username
  console.info('[' + new Date() + '] Request if is leader for ' + username + ' from ' + req.ip)
  res.setHeader('Content-Type', 'application/json') // is json

  // allow
  var allowedOrigins = ['http://dev.obsifight.net', 'http://obsifight.net', 'https://obsifight.net']
  var origin = req.headers.origin
  if (allowedOrigins.indexOf(origin) > -1) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET') // only 1 method

  // connection
  var connection = mysql.createConnection({
    host: config.db.factions.host,
    user: config.db.factions.user,
    password: config.db.factions.password,
    database: config.db.factions.database
  })
  connection.connect()

  // find
  connection.query('SELECT * FROM `rsf_factions` WHERE leader = ?', [username], function (err, rows, fields) {
    if (err) {
      console.error(err)
      return res.status(500).json({status: false})
    }
    var isLeader = (rows && rows[0] !== undefined)
    return res.json({
      status: true,
      isLeader: isLeader,
      factionId: (isLeader) ? rows[0].id : null
    })
  })
})

// ==========
// LISTEN
// ==========
app.listen(3000, function () {
  console.log('App listen on port 3000')
})

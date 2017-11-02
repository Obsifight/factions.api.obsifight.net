// ==========
// INIT
// ==========
var CronJob = require("cron").CronJob
var express = require("express")
var bodyParser = require('body-parser')
var dataHandler = require("./api/dataHandler")
var graphDataHandler = require("./api/graphDataHandler")

var app = express()
app.use(bodyParser.urlencoded({extended: false}))
app.all('/', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next()
})

// ==========
// DAEMON
// ==========
console.log("Start factions daemon...")
new CronJob("* */15 * * * *", dataHandler.generate, function () {
    console.log("Factions data are updated!")
}, true, "Europe/Paris")

console.log("Start factions graph daemon...")
new CronJob("0 0 0 * * 0", graphDataHandler.generate, function () {
    console.log("Factions graph data are updated!")
}, true, "Europe/Paris")

// ==========
// GET DATA
// ==========
app.get('/data', dataHandler.display)

app.get('/data/:factionId', dataHandler.displayFaction)
app.get('/data/:factionId/graph', graphDataHandler.displayFaction)

app.get('/data/search/user/:username', dataHandler.searchUser)

// ==========
// HANDLE WEB
// ==========
console.log("Start web api...")
app.listen(process.env.PORT || 8080);
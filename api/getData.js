// ==============================================
// Get data from mongodb and update factions.json
// ==============================================
var mysql = require('mysql')
var fs = require('fs')
var config = require('../config/config')

global.connection = mysql.createConnection({
  host: config.db.factions.host,
  user: config.db.factions.user,
  password: config.db.factions.password,
  database: config.db.factions.database
})
global.connection.connect()

module.exports = function () { // Call every 2 hours
  console.info('-- Start update factions.json --')
  var factions = []
  var faction
  var temp = {}

  console.info('   Get factions...')
  connection.query('SELECT * FROM `rsf_factions`', function (err, rows, fields) {
    if (err) return console.error(err)
    console.info('   ' + rows.length + ' factions finded !')

    for (var i = 0; i < rows.length; i++) {
      faction = rows[i]
      console.info('   ' + faction.name + ' added !')
      // Set temp data
      temp = {
        name: faction.name,
        description: faction.description,
        stats: {
          kills: parseInt(faction.kills),
          deaths: parseInt(faction.deaths),
          money: parseFloat(faction.money),
          ratio: 0
        },
        powers: {
          actual: parseInt(faction.power),
          max: parseInt(faction.powermax)
        },
        claims: {
          count: parseInt(faction.claim),
          outpost: parseInt(faction.outpost)
        },
        players: {
          list: faction.players.split(',')
        },
        events_wins: {
          wars: parseInt(faction.wars),
          totems: 0,
          kingzombie: 0,
          end: 0
        },
        points: faction.score
      }
      // calcul ratio
      if (faction.deaths > 0)
        temp.stats.ratio = (faction.kills / faction.deaths).toFixed()
      else
        temp.stats.ratio = faction.kills

      // push temp data
      factions.push(temp)
    }

    fs.writeFile('./data/factions.json', JSON.stringify(factions), function (err) {
      if (err) return console.error(err)
    })
    connection.end()
  })
}

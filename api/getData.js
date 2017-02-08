// ==============================================
// Get data from mongodb and update factions.json
// ==============================================
var mysql = require('mysql')
var fs = require('fs')
var config = require('../config/config')

global.connection = mysql.createPool({
  connectionLimit : 10,
  host: config.db.factions.host,
  user: config.db.factions.user,
  password: config.db.factions.password,
  database: config.db.factions.database
})

module.exports = function (formatting) { // Call every 2 hours
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
      temp = formatting(faction)

      // push temp data
      factions.push(temp)
    }

    // order
    factions.sort(function (a, b) {
      return b.points - a.points
    })

    fs.writeFile('./data/factions.json', JSON.stringify(factions), function (err) {
      if (err) return console.error(err)
    })
    connection.end()
  })
}

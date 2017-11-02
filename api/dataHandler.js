var databases = require('../config/db')
var async = require('async')
var _ = require('underscore')

module.exports = {

    maxPower: 10,

    generate: function () {
        var self = this
        var results = []
        var killStatsDb = databases.getMysql('killstats')
        var ecomomyDb = databases.getMysql('economy')
        var cacheDb = databases.getMysql('cache')

        databases.getMongo(function (mongoDatabase) {
            mongoDatabase.collection('factions_faction').find().toArray(function (err, factions) {
                if (err)
                    return console.error(err)

                mongoDatabase.collection('factions_board').find({"_id": "FACTION"}).toArray(function (err, claims) {
                    if (err)
                        return console.error(err)
                    claims = (claims.length > 0 ? claims[0] : [])

                    // Add data
                    async.each(factions, function (faction, next) {
                        if (['safezone', 'warzone', 'none'].indexOf(faction._id.toString()) !== -1)
                            return next()
                        var result = {}

                        // Set basic data
                        result.id = faction._id.toString()
                        result.name = faction.name
                        result.description = faction.description

                        // Get players
                        mongoDatabase.collection('factions_mplayer').find({"factionId": result.id}).toArray(function (err, players) {
                            if (err)
                                return console.error(err)
                            addData(players)
                        })

                        var addData = function (players) {
                            // Power/Claims data
                            result.current_power = players.reduce(function (result, player) { // calcul power
                                return result + player.power
                            }, 0)
                            result.max_power = players.length * self.maxPower
                            result.claims_count = _.reduce(claims, function (result, claim) {
                                if (_.values(claim).indexOf(result.id) !== -1)
                                    result.push(claim)
                                return result
                            }, []).length
                            result.outpost_count = 0 // TODO

                            // Get kills and deaths data
                            var deathsCount = 0
                            var killsCount = 0
                            var moneyCount = 0;
                            async.each(players, function (player, callback) {
                                // get kills/deaths and money
                                async.parallel([

                                    function (cb) {
                                        killStatsDb.query(
                                            'SELECT kills as kills, morts as deaths FROM obsikillstats_st WHERE player = "' + player._id.toString() + '" LIMIT 1',
                                            function (err, rows) {
                                                if (err)
                                                    return cb(err)
                                                cb(undefined, rows[0])
                                            })
                                    },

                                    function (cb) {
                                        ecomomyDb.query(
                                            'SELECT of_economy_balance.balance as money FROM of_economy_account ' +
                                            'INNER JOIN of_economy_balance ON of_economy_balance.username_id = of_economy_account.id ' +
                                            'WHERE uuid = "' + player._id.toString() + '" LIMIT 1',
                                            function (err, rows) {
                                                if (err)
                                                    return cb(err)
                                                cb(undefined, rows[0])
                                            })
                                    }

                                ], function (err, results) {
                                    if (err)
                                        return console.error(err)

                                    // save data
                                    deathsCount += results[0].deaths
                                    killsCount += results[0].kills
                                    moneyCount += results[1].money

                                    callback()
                                })
                            }, function (err) {
                                if (err)
                                    return console.error(err)

                                // Individual data
                                result.kills_count = killsCount
                                result.deaths_count = deathsCount
                                result.money = moneyCount

                                // Set score
                                result.score = calculScore(result)

                                results.push(result)
                                next()
                            })
                        }
                    }, function (err) {
                        if (err)
                            return console.error(err)

                        // Order
                        results.sort(function (a, b) {
                            return b.score - a.score;
                        })
                        results = results.map(function (result, position) {
                            result.position = position + 1
                            return result
                        })

                        // Save
                        saveToCache(results)
                    })
                })
            })

            var saveToCache = function (data) {
                var next = function () {
                    if (data.length === 0)
                        return closeDatabases()
                    var keys = Object.keys(data[0])
                    var keysString = keys.join(', ')
                    var values = []
                    for (var i = 0; i < data.length; i++) {
                        values.push(_.values(data[i]))
                    }

                    cacheDb.query("INSERT INTO factions (" + keysString + ") VALUES ?", [values], function (err) {
                        if (err)
                            return console.error(err)
                    })
                    closeDatabases()
                }

                cacheDb.query("DELETE FROM factions", next)
            }
            var calculScore = function (faction) {
                var score = 0

                score += faction.kills_count

                return score
            }
            var closeDatabases = function () {
                try {
                    databases.closeMysql('killstats')
                    databases.closeMysql('economy')
                    databases.closeMysql('cache')
                    databases.closeMongo()
                } catch (err) {
                    console.error(err)
                }
            }
        })
    },

    display: function (req, res) {

    },

    displayFaction: function (req, res) {

    },

    searchUser: function (req, res) {

    }

}
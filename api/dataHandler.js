var databases = require('../config/db')
var config = require('../config/config')
var async = require('async')
var _ = require('underscore')
var DatatableQueryBuilder = require('node-datatable')
var Api = require('obsifight-libs')
var api = new Api(config.api.credentials.user, config.api.credentials.password)

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
                        result.description = faction.description || null

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
                            }, 0) || 0
                            result.max_power = players.length * self.maxPower || 0
                            result.claims_count = _.reduce(claims, function (result, claim) {
                                if (_.values(claim).indexOf(result.id) !== -1)
                                    result.push(claim)
                                return result
                            }, []).length || 0
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
        var datatableQueryBuilder = new DatatableQueryBuilder({
            sTableName: 'factions'
        });

        // requestQuery is normally provided by the DataTables AJAX call
        var requestQuery = {
            iDisplayStart: 0,
            iDisplayLength: 5
        };
        requestQuery = Object.assign(requestQuery, req.query)

        // Build an object of SQL statements
        var queries = datatableQueryBuilder.buildQuery(requestQuery);

        // Execute the SQL statements generated
        var db = databases.getMysql('cache')

        async.parallel({
            recordsFiltered: function(cb) {
                if (queries.recordsFiltered)
                    db.query(queries.recordsFiltered, function (err, rows) {
                        cb(err, rows)
                    })
                else
                    cb(undefined, 0)
            },

            recordsTotal: function(cb) {
                db.query(queries.recordsTotal, function (err, rows) {
                    cb(err, rows)
                })
            },

            select: function(cb) {
                db.query(queries.select, function (err, rows) {
                    cb(err, rows)
                })
            }
        },
        function(err, results) {
            if (err) {
                console.error(err)
                return res.sendStatus(500);
            }
            res.json(datatableQueryBuilder.parseResponse(results))
        })
    },

    displayFaction: function (req, res) {
        // Check request
        var factionId = req.params.factionId

        // Find faction on cache
        databases.getMysql('cache').query('SELECT * FROM factions WHERE id = ?', [factionId], function (err, rows) {
            if (err) {
                console.error(err)
                return res.status(500).json({status: false, error: "Unable to get factions."})
            }
            if (rows.length === 0)
                return res.status(404).json({status: false, error: "Faction not found."})
            var faction = rows[0]

            // Add players list
            databases.getMongo(function (mongoDatabase) {
                mongoDatabase.collection('factions_mplayer').find({"factionId": faction.id}).toArray(function (err, rawPlayers) {
                    if (err) {
                        console.error(err)
                        return res.status(500).json({status: false, error: "Unable to find faction's players."})
                    }

                    // Get usernames
                    api.request({
                        route: '/user/infos/username',
                        method: 'post',
                        body: {
                            uuids: rawPlayers.map(function (player) {
                                return player._id.toString()
                            })
                        }
                    }, function (err, result) {
                        if (err || !result.status) {
                            console.error(err || result.error || result.body)
                            return res.status(500).json({status: false, error: "Unable to get player's usernames."})
                        }

                        var usersUsernameByUUID = result.body.users
                        var players = []

                        for (var i = 0; i < rawPlayers.length; i++) {
                            players.push({
                                uuid: rawPlayers[i]._id.toString(),
                                username: usersUsernameByUUID[rawPlayers[i]._id.toString()],
                                role: rawPlayers[i].role,
                                power: rawPlayers[i].power
                            })
                        }
                        faction.players = players

                        // Get materials
                        databases.getMysql('blockstats').query("SELECT material.name AS name, faction_material_count.count AS count\n" +
                            "FROM material\n" +
                            "LEFT JOIN faction_material_count\n" +
                            "ON faction_material_count.material_id = material.id AND faction_material_count.faction_id = ?", [faction.id],
                        function (err, rows) {
                            if (err) {
                                console.error(err)
                                return res.status(500).json({status: false, error: "Unable to find faction's materials"})
                            }

                            faction.materials = {}
                            for (var i = 0; i < rows.length; i++) {
                                if (rows[i].count)
                                    faction.materials[rows[i].name] = rows[i].count
                                else
                                    faction.materials[rows[i].name] = 0
                            }

                            // Get spawners count
                            databases.getMysql('blockstats').query("SELECT spawner.name AS name, faction_spawner_count.count AS count\n" +
                                "FROM spawner\n" +
                                "LEFT JOIN faction_spawner_count\n" +
                                "ON faction_spawner_count.spawner_id = spawner.id AND faction_spawner_count.faction_id = ?", [faction.id],
                            function (err, rows) {
                                if (err) {
                                    console.error(err)
                                    return res.status(500).json({status: false, error: "Unable to find faction's spawners"})
                                }

                                faction.spawners = {}
                                for (var i = 0; i < rows.length; i++) {
                                    if (rows[i].count)
                                        faction.spawners[rows[i].name] = rows[i].count
                                    else
                                        faction.spawners[rows[i].name] = 0
                                }

                                // close connections
                                databases.closeMysql('cache')
                                databases.closeMysql('blockstats')
                                databases.closeMongo()

                                // send
                                res.json({status: true, data: faction})
                            })
                        })
                    })
                })
            })
        })
    },

    searchUser: function (req, res) {
        // Get uuid
        api.request({
            route: '/user/uuid/from/' + req.params.username,
            method: 'get'
        }, function (err, result) {
            if (err || !result.status) {
                console.error(err || result.error || result.body)
                return res.status(500).json({status: false, error: "Unable to find player's uuid."})
            }

            // Search player
            databases.getMongo(function (mongoDatabase) {
                mongoDatabase.collection('factions_mplayer').find({"_id": result.body.uuid}).toArray(function (err, players) {
                    if (err) {
                        console.error(err)
                        return res.status(500).json({status: false, error: "Unable to find player."})
                    }
                    if (players.length === 0)
                        return res.status(404).json({status: false, error: "User not found."})
                    var player = {
                        power: players[0].power,
                        faction: {}
                    }

                    var next = function () {
                        databases.closeMongo()
                        return res.json({status: true, data: player})
                    }

                    if (players[0].factionId) {
                        player.faction.id = players[0].factionId
                        // Find faction on cache
                        databases.getMysql('cache').query('SELECT * FROM factions WHERE id = ?', [player.faction.id], function (err, rows) {
                            if (err) {
                                console.error(err)
                                return res.status(500).json({status: false, error: "Unable to get factions."})
                            }
                            if (rows.length === 0)
                                return res.status(404).json({status: false, error: "Faction not found."})
                            player.faction.name = rows[0].name

                            databases.closeMysql('cache')
                            next()
                        })
                    } else {
                        next()
                    }
                })
            })
        })
    }

}
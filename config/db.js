var mysql = require("mysql")
var config = require("./config")
var mongoClient = require("mongodb").MongoClient;

module.exports = {

    getMongo: function () {
        var self = this

        if (self.mongo !== undefined)
            return self.mongo
        mongoClient.connect("mongodb://" + config.db.factions.host + ":" + config.db.factions.port + "/" + config.db.factions.database, function(err, db) {
            if (err)
                return console.error(err)

            db.authenticate(config.db.factions.user, config.db.factions.password, function (err, status) {
                if (err || status)
                    return console.error(err || 'Unable to connect to MongoDB')
                self.mongo = db;
                return db;
            })
        });
    },

    getKillStats: function () {
        if (this.killstats !== undefined)
            return this.killstats
        var db = mysql.createConnection({
            host: config.db.killstats.host,
            user: config.db.killstats.user,
            password: config.db.killstats.password,
            database: config.db.killstats.database
        })
        this.killstats = db
        return db
    },

    getEconomy: function () {
        if (this.economy !== undefined)
            return this.economy
        var db = mysql.createConnection({
            host: config.db.economy.host,
            user: config.db.economy.user,
            password: config.db.economy.password,
            database: config.db.economy.database
        })
        this.economy = db
        return db
    },

    getCache: function () {
        if (this.cache !== undefined)
            return this.cache
        var db = mysql.createConnection({
            host: config.db.cache.host,
            user: config.db.cache.user,
            password: config.db.cache.password,
            database: config.db.cache.database
        })
        this.cache = db
        return db
    }

}
var mysql = require("mysql")
var config = require("./config")
var mongoClient = require("mongodb").MongoClient;

module.exports = {

    getMongo: function (next) {
        var self = this

        if (self.mongo !== undefined)
            return next(self.mongo)
        mongoClient.connect("mongodb://" + config.db.factions.user + ":" + config.db.factions.password + "@" + config.db.factions.host + ":" + config.db.factions.port + "/" + config.db.factions.database, function(err, db) {
            if (err)
                return console.error(err)

            self.mongo = db;
            next(db);
        });
    },

    closeMongo: function () {
        if (this.mongo !== undefined)
            this.mongo.close()
        this.mongo = undefined
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
        db.connect()
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
        db.connect()
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
        db.connect()
        this.cache = db
        return db
    },

    closeMysql: function (connectionName) {
        if (this[connectionName] !== undefined)
            this[connectionName].end()
        this[connectionName] = undefined
    }

}
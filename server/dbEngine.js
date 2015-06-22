var fs = require('fs'),db,engine;

// load config
var config = require('./config.js');

// load requestd engine and define engine agnostic getDB function
if (config.server.db.engine=="mongodb") {
    engine = require("mongodb");
    module.exports.getDB = function () {
        if (!db) db = new engine.Db(config.server.db.mongodb.db,
            new engine.Server(config.server.db.mongodb.host, config.server.db.mongodb.port, config.server.db.mongodb.opts),
                {native_parser: false, safe:true});
        return db;
    }
} else {
    engine = require("tingodb")({});
    module.exports.getDB = function () {
        if (!fs.existsSync(config.server.db.tingodb.path)) {
            console.log('TingoDb path \'' + config.server.db.tingodb.path + '\' does not exist. Creating dir')
            fs.mkdirSync(config.server.db.tingodb.path);
        }
        if (!db) db = new engine.Db(config.server.db.tingodb.path, {});
        return db;
    }
}
// Depending on engine this can be different class
module.exports.ObjectID = engine.ObjectID;

var fs = require('fs'),db,engine;

// load config
var config = require('./config.json');

// load requestd engine and define engine agnostic getDB function
if (config.server.db.engine=="mongodb") {
    engine = require("mongodb");
    module.exports.getDB = function () {
        if (!db) db = new engine.Db(config.server.db.mongo.db,
            new engine.Server(config.server.db.mongo.host, config.server.db.mongo.port, config.server.db.mongo.opts),
                {native_parser: false, safe:true});
        return db;
    }
} else {
    engine = require("tingodb")({});
    module.exports.getDB = function () {
        if (!fs.existsSync(config.server.db.tingo.path)) {
            console.log('TingoDb path \'' + config.server.db.tingo.path + '\' does not exist. Creating dir')
            fs.mkdirSync(config.server.db.tingo.path);
        }
        if (!db) db = new engine.Db(config.server.db.tingo.path, {});
        return db;
    }
}
// Depending on engine this can be different class
module.exports.ObjectID = engine.ObjectID;

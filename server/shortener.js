var engine = require('./dbEngine.js'),
  validUrl = require('valid-url'),
  shortId = require('shortid');
var db = engine.getDB();

module.exports.init = function(callback) {
  db.open(function(err, db) {
    if (err) return callback(err);
    var collection = db.collection("urls");


    var shorten = function(url, callback) {
      // {
      //   "name":"MongoError",
      //   "err":"E11000 duplicate key error index: test.test.$country_1  dup key: { : \"XYZ\" }",
      //   "code":11000,
      //   "n":0,
      //   "connectionId":10706,
      //   "ok":1
      // }
      if (!validUrl.isUri(url)) return callback({name: 'UrlError', err: 'Invalid URL \'' + url + '\''});
      collection.findOne({url:url}, function(err, result) {
        if (err) {
          return callback(err);
        } else if (result) {
          //already shortened. Use that one
          callback(err, result);
        } else {
          var short = shortId.generate(url);
          collection.insert({firstAdded: new Date().getTime(), url: url, short:short}, function(err, results) {
            if (err) {
              callback(err, results);
            } else {
              callback(err, results[0]);
            }
          });
        }
      });
    };
    var fetch = function(short, callback) {
      collection.findOne({short:short}, callback);
    }
    callback(null, {
      shorten: shorten,
      fetch: fetch
    })
  });
}

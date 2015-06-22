var shortenerFactory = require('./shortener.js'),
	config = require('./config.js');



module.exports = function(app) {
  shortenerFactory.init(function(err, shortener) {
    if (err) {
      return console.log("failed initializing shortener", err);
    }
		app.use('/shorten', function(req, res) {
			if (!req.query.url) {
				return res.status(400).send('Add ?url as URL argument');
			}
			shortener.shorten(req.query.url, function(err, result) {
				if (err) {
					return res.status(500).send(err.err);
				}
				return res.send(config.server.shortUrlBasename + result.short);
			})
		})
		app.use('/short/:short', function(req, res) {
			shortener.fetch(req.params.short, function(err, result) {
				if (err) return res.status(500).send(err.err);
				if (!result) return res.status(404).send('No URL found for ' + req.protocol + '://' + req.get('host') + req.originalUrl);
				return res.redirect(result.url);
			})
		})
  })
}

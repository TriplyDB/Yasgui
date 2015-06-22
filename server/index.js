var express = require('express'),
	http = require('http'),
	serveStatic = require('serve-static'),
	bodyParser = require('body-parser'),
	extend = require('deep-extend'),
	fs = require('fs'),
	config = require('./config.js');

var dev = !!process.env.yasguiDev;

var app = express();
var urlencodedParser = bodyParser.urlencoded({ extended: false })

var argv = require('minimist')(process.argv.slice(2));

if (argv.config) {
	//extend current config with the additional one
	extend(config, require(argv.config));
}

/**
 * update server.html with current config
 */
var htmlFile = __dirname + '/../server.html';
var html = fs.readFileSync(htmlFile).toString();
html = html.replace(/(var config = )\{.*\};/, '$1' + JSON.stringify(config.client) + ';');

if (!dev) {
	html = html.replace('manifest=""', 'manifest="server.html.manifest"');
}
fs.writeFileSync(htmlFile, html);



//js and css dependencies
app.use('/dist/', serveStatic(__dirname + '/../dist/', {index:false}));
//not really needed, but nice to have anyway
app.use('/doc/', serveStatic(__dirname + '/../doc/'))

//the URLs for the API
app.use('/proxy/', urlencodedParser, require('./corsProxy.js'));

app.use('/server.html.manifest', function(req,res) {
	res.sendFile('server.html.manifest', {root: __dirname + '/../'});
});

//Finally, just render yasgui
app.use(/^\/$/, function(req,res, next) {
	res.sendFile('server.html', {root: __dirname + '/../'});
});
require('./shortenerService.js')(app);
http.createServer(app).listen(config.server.port)

console.log('Running YASGUI on http://localhost:' + config.server.port);

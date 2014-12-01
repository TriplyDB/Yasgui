


var transformTools = require('browserify-transform-tools');

var options = {
	jsFilesOnly : true,
	fromSourceFileDir : true,
	evaluateArguments : true,
};
module.exports = transformTools.makeRequireTransform("optionalShim", options,
function(args, opts, cb) {
	var optionalShims = opts.configData.config;
	if (args[0] in optionalShims) {
		var optionalShim = optionalShims[args[0]];
		return cb(null, "(function(){try{return require('" + optionalShim.require + "')}catch(e){return window." + optionalShim.global + "}})()");
	} else {
		return cb();
	}
});

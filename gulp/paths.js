module.exports = function() {
	var paths = {
		yasqe: 'node_modules/yasgui-yasqe/',
		yasr: 'node_modules/yasgui-yasr/',
		style: ['src/scss/scoped.scss', 'src/scss/global.scss'],
		bundleDir: "dist",
		bundleName: "yasgui",
		docDir: "doc"
	};
//	var yasqeStyles = require('../node_modules/yasgui-yasqe/gulp/paths.js').style;
//	var yasrStyles = require('../node_modules/yasgui-yasr/gulp/paths.js').style;
//	//we might have some duplicates in there. avoid loading css twice (but: make sure to keep including the custom styles under 'src' dir)
//	yasrStyles = yasrStyles.filter( function( yasrStylePath ) {
//	  return yasrStylePath.indexOf("src") >= 0 || yasqeStyles.indexOf(yasrStylePath) < 0;
//	} );
//	yasqeStyles.forEach(function(path){paths.style.push('./node_modules/yasgui-yasqe/' + path)});
//	yasrStyles.forEach(function(path){paths.style.push('./node_modules/yasgui-yasr/' + path)});
//	//add own style path
//	paths.style.push('src/**/*.scss');
//	console.log(paths);
	return paths;
}()
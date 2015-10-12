var gulp = require('gulp'),
	concat = require('gulp-concat'),
	paths = require('./paths.js'),
	connect = require('gulp-connect'),
	sourcemaps = require('gulp-sourcemaps');
	autoprefixer = require('gulp-autoprefixer'),
	sass = require('gulp-sass'),
	cssImport = require('gulp-cssimport'),
	rename = require("gulp-rename"),
	notify = require('gulp-notify'),
	minifyCSS = require('gulp-minify-css');


gulp.task('makeCss', function() {
	  return gulp.src(paths.style)
		.pipe(cssImport())//needed, because css files are not -actually- imported by sass, but remain as css @import statement...
	    .pipe(sass())
	    .on("error", notify.onError(function(error) {
	    	return error.message;
	    }))
			.pipe(autoprefixer({
					browsers: ['> 5%']
			}))
	    .pipe(concat(paths.bundleName + '.css'))
	    .pipe(gulp.dest(paths.bundleDir))
	    .pipe(minifyCSS({
			//the minifyer does not work well with lines including a comment. e.g.
			///* some comment */ }
			//is completely removed (including the final bracket)
			//So, disable the 'advantaced' feature. This only makes the minified file 100 bytes larger
			noAdvanced: true,
		}))
	    .pipe(rename(paths.bundleName + '.min.css'))
	    .pipe(gulp.dest(paths.bundleDir))
	    .pipe(connect.reload());
})

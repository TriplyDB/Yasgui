var gulp = require('gulp'),
	connect = require('gulp-connect'),
	paths = require('./paths.js'),
	livereload = require('gulp-livereload'),
	server = require('gulp-express'),
	nodemon = require('gulp-nodemon');

gulp.task('watch', function() {
	gulp.watch(["./src/**/*.js"], [ 'browserifyForDebug' ]);
	gulp.watch("./src/**/*.scss", [ 'makeCss' ]);
	  gulp.watch(
		'./*.html'
	, function(files) {
		gulp.src(files.path).pipe(connect.reload());
	});
//	gulp.watch(["./server/*"], [server.run])
});

gulp.task('connect', function() {
	connect.server({
		root: ["./", './server'],
		port : 4000,
		livereload: true
	});
});

gulp.task('connectApi', function() {
	nodemon({ script: './server/index.js', watch: './server' })
});
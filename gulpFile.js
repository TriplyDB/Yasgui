require('require-dir')('./gulp');

var gulp = require('gulp');
gulp.task('default', ['browserifyWithDeps', 'makeCss', 'makeMainPage']);
gulp.task('serve', ['makeCss', 'makeMainPage', 'browserifyForDebug', 'watch', 'connect', 'connectApi']);


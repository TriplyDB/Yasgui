var gulp = require("gulp"),
  concat = require("gulp-concat"),
  paths = require("./paths.js"),
  connect = require("gulp-connect"),
  deleteLines = require('gulp-delete-lines'),
  sourcemaps = require("gulp-sourcemaps");
autoprefixer = require("gulp-autoprefixer"), sass = require("gulp-sass"), rename = require(
  "gulp-rename"
), notify = require("gulp-notify"), minifyCSS = require("gulp-clean-css");

gulp.task("makeCss", ["copyCssDeps"], function() {
  return gulp
    .src(paths.style)
    .pipe(sass())
    .on(
      "error",
      notify.onError(function(error) {
        return error.message;
      })
    )
    .pipe(
      autoprefixer({
        browsers: ["> 5%"]
      })
    )
    .pipe(concat(paths.bundleName + ".css"))
    .pipe(gulp.dest(paths.bundleDir))
    .pipe(
      minifyCSS({
        //the minifyer does not work well with lines including a comment. e.g.
        ///* some comment */ }
        //is completely removed (including the final bracket)
        //So, disable the 'advantaced' feature. This only makes the minified file 100 bytes larger
        advanced: false
      })
    )
    .pipe(rename(paths.bundleName + ".min.css"))
    .pipe(gulp.dest(paths.bundleDir))
    .pipe(connect.reload());
});
var cssDeps = [
  "./node_modules/codemirror/addon/fold/foldgutter.css",
  "./node_modules/codemirror/addon/display/fullscreen.css",
  "./node_modules/codemirror/lib/codemirror.css",
  "./node_modules/datatables.net-dt/css/jquery.dataTables.css",
  "./node_modules/jquery-ui/themes/base/jquery.ui.resizable.css",
  "./node_modules/pivottable/dist/pivot.css",
  "./node_modules/selectize/dist/css/selectize.bootstrap3.css",
  "./node_modules/selectize/dist/css/selectize.css",
  "./node_modules/leaflet/dist/leaflet.css"
];
gulp.task("copyCssDeps", function() {
  return gulp
    .src(cssDeps)
    .pipe(deleteLines({
      'filters': [
        /url\(/i //ignore anything loaded via url
      ]
    }))
    .pipe(
      rename({
        prefix: "_",
        extname: ".scss"
      })
    )
    .pipe(gulp.dest("./src/scss/cssIncludes"));
});

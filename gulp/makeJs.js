var gulp = require("gulp"),
  browserify = require("browserify"),
  connect = require("gulp-connect"),
  concat = require("gulp-concat"),
  embedlr = require("gulp-embedlr"),
  jsValidate = require("gulp-jsvalidate"),
  source = require("vinyl-source-stream"),
  uglify = require("gulp-uglify"),
  rename = require("gulp-rename"),
  streamify = require("gulp-streamify"),
  paths = require("./paths.js"),
  buffer = require("vinyl-buffer"),
  exorcist = require("exorcist"),
  optionalShim = require("./optionalShim.js"),
  shim = require("browserify-shim"),
  notify = require("gulp-notify"),
  runSequence = require("run-sequence").use(gulp),
  sourcemaps = require("gulp-sourcemaps");

gulp.task("browserifyWithDeps", function() {
  var bundler = browserify({ entries: ["./src/entry.js"], standalone: "YASGUI", debug: true });

  return bundler
    .transform({ global: true }, shim)
    .bundle()
    .pipe(exorcist(paths.bundleDir + "/" + paths.bundleName + ".js.map"))
    .pipe(source(paths.bundleName + ".js"))
    .pipe(gulp.dest(paths.bundleDir))
    .pipe(rename(paths.bundleName + ".min.js"))
    .pipe(buffer())
    .pipe(
      sourcemaps.init({
        loadMaps: true,
        debug: true
      })
    )
    .pipe(
      uglify({
        compress: {
          //disable the compressions. Otherwise, breakpoints in minified files don't work (sourcemaped lines get offset w.r.t. original)
          //minified files does increase from 457 to 459 kb, but can live with that
          negate_iife: false,
          sequences: false
        }
      })
    )
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest(paths.bundleDir));
});
gulp.task("browserify", function(cb) {
  runSequence("browserifyWithDeps", "makeBundledCopy", cb);
});
gulp.task("makeBundleCopyMin", function() {
  return gulp
    .src(paths.bundleDir + "/" + paths.bundleName + ".min.js")
    .pipe(rename(paths.bundleName + ".bundled.min.js"))
    .pipe(gulp.dest(paths.bundleDir));
});
gulp.task("makeBundleCopyMain", function() {
  return gulp
    .src(paths.bundleDir + "/" + paths.bundleName + ".js")
    .pipe(rename(paths.bundleName + ".bundled.js"))
    .pipe(gulp.dest(paths.bundleDir));
});
gulp.task("makeBundledCopy", ["makeBundleCopyMin", "makeBundleCopyMain"]);
/**
 * Faster, because we don't minify, and include source maps in js file (notice we store it with .min.js extension, so we don't have to change the index.html file for debugging)
 */
gulp.task("browserifyForDebug", function() {
  var bundler = browserify({ entries: ["./src/entry.js"], standalone: "YASGUI", debug: true });

  return bundler
    .transform({ global: true }, shim)
    .bundle()
    .on(
      "error",
      notify.onError(function(error) {
        return error.message;
      })
    )
    .pipe(source(paths.bundleName + ".min.js"))
    .pipe(embedlr())
    .pipe(gulp.dest(paths.bundleDir))
    .pipe(connect.reload());
});

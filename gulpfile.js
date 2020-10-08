// For future reference about Gulp 4 task execution: https://fettblog.eu/gulp-4-parallel-and-series/
 
var gulp = require("gulp");
var sass = require("gulp-sass");
var browserSync = require("browser-sync").create();

// Compile sass into CSS & auto-inject into browsers
function style() {
  return gulp.src('src/scss/**/*.scss')
  .pipe(sass().on('error',sass.logError))
  .pipe(gulp.dest('src/css'))
  .pipe(browserSync.stream());
}

function watch() {
  browserSync.init({
      server: {
         baseDir: "./src",
         index: "/index.html"
      }
  });
  gulp.watch('src/scss/**/*.scss', style)
  gulp.watch('./*.html').on('change',browserSync.reload);
  gulp.watch('./js/**/*.js').on('change', browserSync.reload);
}

exports.style = style;
exports.watch = watch;
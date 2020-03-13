// For future reference about Gulp 4 task execution: https://fettblog.eu/gulp-4-parallel-and-series/
 
var gulp = require("gulp");
var browserSync = require("browser-sync").create();
var sass = require("gulp-sass");
 
// Compile sass into CSS & auto-inject into browsers
gulp.task("sass", function()
{
  return gulp.src(["node_modules/bootstrap/scss/bootstrap.scss", "src/scss/*.scss"])
  .pipe(sass())
  .pipe(gulp.dest("src/css"))
  .pipe(browserSync.stream());
});
 
// Move the javascript files into our /src/js folder
gulp.task("js", function()
{
    return gulp.src(["node_modules/bootstrap/dist/js/bootstrap.min.js", "node_modules/jquery/dist/jquery.min.js", "node_modules/popper.js/dist/umd/popper.min.js"])
      .pipe(gulp.dest("src/js"))
      .pipe(browserSync.stream());
});
 
// Static server + watching for changes in scss/html files (recompiling scss files too)
gulp.task("serve", function()
{
  browserSync.init({
    server:"./src"
  });
 
  gulp.watch(["node_modules/bootstrap/scss/bootstrap.scss", "src/scss/*.scss"]).on("change", gulp.task("sass"));
  gulp.watch("src/*.html").on("change", browserSync.reload);
});
 
gulp.task("default", gulp.parallel(["js", "serve"]));
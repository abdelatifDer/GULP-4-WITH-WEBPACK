const { series, parallel, src, dest, watch } = require("gulp");
const pump = require("pump");
const sass = require("gulp-sass");
const cleanCss = require("gulp-clean-css");
const autoPrefixer = require("gulp-autoprefixer");
const concat = require("gulp-concat");
const sourcemaps = require("gulp-sourcemaps");
const rename = require("gulp-rename");
const pug = require("gulp-pug");
const uglify = require("gulp-uglify");
const webpackStream = require("webpack-stream");
const environments = require("gulp-environments");
const { config } = require("./webpack.config");
const del = require("del");
const image = require("gulp-image");
const chalk = require("chalk");
const path = require("path");
const browserSync = require("browser-sync").create();

// -----------------------------------------------
// assign the default mode locally
// so ce wan use it later on.
// -----------------------------------------------
let development = environments.development;
let production = environments.production;

// set the default compiler to node-sass complier
sass.compiler = require("node-sass");

// -----------------------------------------------
// declare all paths needed for tasks
// -----------------------------------------------
const paths = {
  stylesPaths: {
    src: "./src/scss/*.scss",
    dest: "./dist/css",
    watch: "./src/scss/**/*.scss",
  },
  scriptsPaths: {
    src: "./src/js/App.js",
    dest: "./dist/js",
    watch: "./src/js/**/*.js",
  },
  markupPaths: {
    src: "./src/views/pages/*.pug",
    dest: "./dist",
    watch: "./src/views/**/*.pug",
  },
};

// -----------------------------------------------
// clean script files
// -----------------------------------------------
const scriptsClean = () => {
  return del(["./dist/js/**/*.js"]);
};

// -----------------------------------------------
// clean style files
// -----------------------------------------------
const stylesClean = () => {
  return del(["./dist/css/**/*.css"]);
};

// -----------------------------------------------
// clean markup files
// -----------------------------------------------
const markupClean = () => {
  return del(["./dist/*.html"]);
};

// -----------------------------------------------
// clean assests
// -----------------------------------------------
const assetsClean = () => {
  return del(["./dist/assets"]);
};

// -----------------------------------------------
// start SASS task
// -----------------------------------------------
const sassCompiler = (done) => {
  let outputStyle;

  if (development()) outputStyle = "Nested ";
  else if (production()) outputStyle = "Compressed";

  pump(
    [
      src(paths.stylesPaths.src),
      development(sourcemaps.init()),
      sass({ outputStyle }).on("error", sass.logError),
      production(
        cleanCss({ debug: true }, (details) => {
          if (details.error) {
            console.log(chalk.red(`Error: ${details.error[0]}`));
          } else {
            console.log(
              chalk.greenBright(`original size: ${details.stats.originalSize}`)
            );
            console.log(
              chalk.greenBright(`minified size: ${details.stats.minifiedSize}`)
            );
          }
        })
      ),
      autoPrefixer(),
      concat("main.css"),
      development(sourcemaps.write()),
      dest(paths.stylesPaths.dest),
    ],
    done
  );
};

// -----------------------------------------------
// START SCRIPTS TASK
// -----------------------------------------------
const scripts = (done) => {
  let mode = undefined;

  if (development()) mode = "development";
  else if (production()) mode = "production";

  pump(
    [
      src(paths.scriptsPaths.src),
      development(sourcemaps.init()),
      webpackStream({
        ...config,
        mode,
      }),
      production(uglify()),
      development(sourcemaps.write()),
      dest(paths.scriptsPaths.dest),
    ],
    done
  );
};

// -----------------------------------------------
// START MARKUP TASK
// -----------------------------------------------
const markup = (done) => {
  let pretty;

  if (production()) pretty = false;
  else if (development()) pretty = true;

  pump(
    [
      src(paths.markupPaths.src),
      pug({
        pretty,
      }),
      dest(paths.markupPaths.dest),
    ],
    done
  );
};

// -----------------------------------------------
// START IMAGES TASK
// -----------------------------------------------
const imagesTask = (done) => {
  pump([src("./src/assets/**/*"), image(), dest("./dist/assets")], done);
};

// -----------------------------------------------
// All clean tasks
// -----------------------------------------------
exports.scriptsClean = series(scriptsClean);
exports.stylesClean = series(stylesClean);
exports.markupClean = series(markupClean);
exports.assetsClean = series(assetsClean);

// -----------------------------------------------
// Other tasks
// -----------------------------------------------
exports.styles = series(sassCompiler);
exports.scripts = series(scripts);
exports.markup = series(markup);
exports.images = series(imagesTask);

// SET ALL WATCHERS
exports.setWatchers = (done) => {
  // initialize the browser sync
  browserSync.init({
    server: "./dist",
  });

  // watch the style files
  // ignoreInitial: false => execute the task immediatly
  watch([paths.stylesPaths.watch], { ignoreInitial: true }, exports.styles).on(
    "change",
    browserSync.reload
  );

  // watch the javascript files
  watch(
    [paths.scriptsPaths.watch],
    { ignoreInitial: true },
    exports.scripts
  ).on("change", browserSync.reload);

  // watch the javascript files
  watch([paths.markupPaths.watch], { ignoreInitial: true }, exports.markup).on(
    "change",
    browserSync.reload
  );

  // watch for any changes in assests folder
  const watchImages = watch(
    ["./src/assets/**/*"],
    { ignoreInitial: true },
    exports.images
  );

  watchImages.on("unlink", (srcPath) => {
    del(["./" + srcPath.replace("src", "dist")]);
    browserSync.reload();
  });

  watchImages.on("add", () => browserSync.reload);

  // call the done func
  done();
};

// -----------------------------------------------
// generate task for development
// -----------------------------------------------
exports.default = series(
  // Clean all files before executin other tasks
  scriptsClean,
  stylesClean,
  markupClean,
  assetsClean,

  // chainin main tasks
  parallel(sassCompiler, scripts, markup, imagesTask),

  // call the watchers
  exports.setWatchers
);

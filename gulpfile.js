const gulp = require("gulp");
const gutil = require("gulp-util");
const babel = require('gulp-babel');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
const del = require("del");
const sass = require('gulp-sass');
const rename = require('gulp-rename');
const concat = require("gulp-concat");
const runSequence = require('run-sequence');
const merge = require('merge-stream');
const es2015 = require('babel-preset-es2015');
const react = require('babel-preset-react');

const fs = require("fs");
const argv = require('yargs').argv;
const path = require("path");

var dev = !!argv.dev;
var prjDir = argv.prjdir || 'tmp/trash-prj';
var buildDir = path.join(prjDir,argv.builddir || "build");
var template = argv.template || "skeleton";

var featDirs = ["src"];
if(argv.features)
    featDirs = featDirs.concat(argv.features.split(",").map(function(feature) {
        return "src-"+feature;
    }));

gulp.task("weh-background-scripts",function() {
    return gulp.src(["core","prefs","ui","ajax"].map(function(module) {
            return "src/background/weh-"+module+".js";
        }))
        .pipe(concat("weh-bg.js"))
        .pipe(babel({
            presets: [es2015]
        }))
        .pipe(!dev && uglify() || gutil.noop())
        .pipe(gulp.dest(path.join(buildDir,"background")));
});

gulp.task("weh-content-scripts",function() {
    return merge(
            gulp.src("src/content/weh-ct.js"),
            gulp.src("src/content/weh-ct-react.jsx")
                .pipe(babel({
                    presets: [react]
                }))
            )
        .pipe(concat("weh-ct.js"))
        .pipe(babel({
            presets: [es2015]
        }))
        .pipe(!dev && uglify() || gutil.noop())
        .pipe(gulp.dest(path.join(buildDir,"content")));
});

function Task(task,taskFn) {
    gulp.task(task,function(cb) {
        var index = 0;
        function Next(cb) {
            taskFn(featDirs[index],function() {
                index++;
                if(index<featDirs.length)
                    Next(cb);
                else
                    cb(null);
            });
        }
        Next(cb);
    });
}

Task("prj-background-scripts",function(src,cb) {
    return gulp.src(path.join(prjDir,src+"/background/**/*.js"))
        .pipe(babel({
            presets: [es2015]
        }))
        .pipe(gulp.dest(path.join(buildDir,"background")))
        .on("end",cb);
});

Task("prj-content-scripts",function(src,cb) {
    return gulp.src(path.join(prjDir,src+"/content/**/*.js"))
        .pipe(babel({
            presets: [es2015]
        }))
        .pipe(gulp.dest(path.join(buildDir,"content")))
        .on("end",cb);
});

Task("prj-content-jsx-scripts",function(src,cb) {
    return gulp.src(path.join(prjDir,src+"/content/**/*.jsx"))
        .pipe(babel({
            presets: [es2015,react]
        }))
        .pipe(gulp.dest(path.join(buildDir,"content")))
        .on("end",cb);
});

Task("prj-content-scss",function(src,cb) {
    return gulp.src(path.join(prjDir,src+"/content/**/*.scss"))
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest(path.join(buildDir,"content")))
        .on("end",cb);
});

Task("prj-content-assets",function(src,cb) {
    return gulp.src([path.join(prjDir,src+"/content/assets/**/*"),
                     path.join(prjDir,src+"/content/*.{html,css}")])
        .pipe(gulp.dest(path.join(buildDir,"content")))
        .on("end",cb);
});

Task("prj-assets",function(src,cb) {
    return gulp.src([path.join(prjDir,src+"/manifest.json"),
                     path.join(prjDir,src+"/assets/**/*")])
        .pipe(gulp.dest(buildDir))
        .on("end",cb);
});

Task("prj-locales",function(src,cb) {
    return gulp.src(path.join(prjDir,src+"/locales/**/*"))
        .pipe(gulp.dest(path.join(buildDir,"_locales")))
        .on("end",cb);
});

gulp.task("clean",function() {
    return del([buildDir+"/*"],{force:true});
});

gulp.task("build-weh",[
    "weh-background-scripts",
    "weh-content-scripts",
]);

gulp.task("build-prj",[
    "prj-background-scripts",
    "prj-content-scripts",
    "prj-content-jsx-scripts",
    "prj-content-scss",
    "prj-content-assets",
    "prj-assets",
    "prj-locales"
]);

gulp.task("vendor-react",function(callback) {
    if(argv.react===false)
        return callback(null);
    var reactDir = "node_modules/react/dist";
    var reactDomDir = "node_modules/react-dom/dist";
    
    return merge(
        gulp.src(dev ? "react.js" : "react.min.js",{base: reactDir, cwd: reactDir})
            .pipe(rename("react.js"))
            .pipe(gulp.dest(path.join(buildDir,"content","vendor"))),
        gulp.src(dev ? "react-dom.js" : "react-dom.min.js",{base: reactDomDir, cwd: reactDomDir})
            .pipe(rename("react-dom.js"))
            .pipe(gulp.dest(path.join(buildDir,"content","vendor")))
    );
});

gulp.task("vendor-bootstrap",function(callback) {
    if(argv.bootstrap===false)
        return callback(null);
    var dir = "node_modules/bootstrap/dist/css";

    return gulp.src(dev ? "bootstrap.css" : "bootstrap.min.css",{base: dir, cwd: dir})
        .pipe(rename("bootstrap.css"))
        .pipe(gulp.dest(path.join(buildDir,"content","vendor")));

});

gulp.task("build-vendor",[
    "vendor-react",
    "vendor-bootstrap"
]);

gulp.task("build",[
    "build-weh",
    "build-prj",
    "build-vendor"
]);

gulp.task("watch-weh",function() {
    gulp.watch("src/background/*.js", ["weh-background-scripts"]);
    gulp.watch(["src/content/*.js","src/content/*.jsx"], ["weh-content-scripts"]);
});

function Watch(files,tasks) {
    var watched = [];
    if(!Array.isArray(files))
        files = [files];
    featDirs.forEach(function(src) {
        watched = watched.concat(files.map(function(file) {
            return path.join(prjDir,src+"/"+file);
        }));
    });
    gulp.watch(watched,tasks);
}

gulp.task("watch-prj",function() {
    Watch("background/**/*.js", ["prj-background-scripts"]);
    Watch("content/**/*.js", ["prj-content-scripts"]);
    Watch("content/**/*.jsx", ["prj-content-jsx-scripts"]);
    Watch("content/**/*.scss", ["prj-content-scss"]);
    Watch(["content/assets/**/*","content/*.{html,css}"], ["prj-content-assets"]);
    Watch(["manifest.json","assets/**/*"], ["prj-assets"]);
    Watch("locales/**/*", ["prj-locales"]);
});

gulp.task("default", function(callback) {
    if(argv.help)
        return runSequence("help");
    var tasks = ["clean","build"];
    if(argv["watch-weh"])
        tasks.push("watch-weh");
    if(argv["watch"]!==false)
        tasks.push("watch-prj");
    tasks.push(callback);
    runSequence.apply(null,tasks);
});

gulp.task("copy-template",function(callback) {
    fs.access(prjDir,fs.F_OK,function(err) {
        if(!err && !argv.force)
            return callback(new Error(prjDir+" already exists"));
        gulp.src("templates/"+template+"/**/*")
            .pipe(gulp.dest(prjDir))
            .on("end",callback);
    });
});

gulp.task("init", function(callback) {
    runSequence("copy-template","build",callback);
});

gulp.task("help", function() {
    var help = [
        "usage: gulp [<commands>] [<options>]",
        "",
        "commands:",
        "  build: generate project build",
        "  clean: remove project build recursively",
        "  watch-prj: watch project and build dynamically on changes",
        "  init: generate project from template",
        "  watch-weh: watch weh source and update project build dynamically",
        "default commands: clean + build + watch-prj",
        "",
        "options:",
        "  --prjdir <dir>: project directory (required for most commands)",
        "  --dev: addon generated for development",
        "  --template <template>: template to be used when creating a new project",
        "  --features <feature1,...>: comma separated list of feature to amend add-on",
        "  --no-watch! do generate builds dynamically",
        "  --watch-weh! generate builds dynamically when weh source is modified",
        "  --no-react: do not include ReactJS vendor library",
        "  --no-bootstrap: do not include Bootstrap vendor library",
        "  --force: force overwrite output directory"
    ];
    console.log(help.join("\n"));
    process.exit(0);
});

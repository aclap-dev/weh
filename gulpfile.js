const gulp = require("gulp");
const gutil = require("gulp-util");
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const del = require("del");
const sass = require('gulp-sass');
const concat = require("gulp-concat");
const replace = require('gulp-replace');
const gulpif = require('gulp-if');
const debug = require('gulp-debug');
const cleanCSS = require('gulp-clean-css');
const header = require("gulp-header");
const manifest = require('./gulp-chrome-manifest');
const userefWeh = require("./gulp-useref-weh");
const runSequence = require('run-sequence');
const es2015 = require('babel-preset-es2015');
const react = require('babel-preset-react');

const fs = require("fs");
const argv = require('yargs').argv;
const path = require("path");
const glob = require("glob");

var dev = !!argv.dev;
var prjDir = argv.prjdir || 'tmp/trash-prj';
var buildDir = path.join(prjDir,argv.builddir || "build");
var template = argv.template || "skeleton";

var wehBackgroundModules = ["core","prefs","ui","ajax"];

var jsBanner = null, jsBannerData;

if(argv.jsheader || (!dev && argv.jsheader!==false)) {
    try {
        jsBannerData = {
            manifest: require(path.join(prjDir,"src/manifest.json"))
        }
        try {
            jsBanner = fs.readFileSync(path.join(prjDir,"etc/jsbanner.txt"),"utf8");
        } catch(e) {
            jsBanner = fs.readFileSync("etc/jsbanner.txt","utf8");
        }
    } catch(e) {}
}

gulp.task("prj-content",function(cb) {

    var staticSrc = [path.join(prjDir,"src/content/**/*.{js,css}")];
    if(argv.weh!==false)
        staticSrc.push("src/content/**/*.{js,css}");
    if(argv.react!==false) {
        staticSrc.push("node_modules/react/dist/**/*.{js,css}");
        staticSrc.push("node_modules/react-dom/dist/**/*.{js,css}");
    }
    if(argv.bootstrap!==false)
        staticSrc.push("node_modules/bootstrap/dist/css/*.css");

    function AddScripts(org,match) {
        var scripts = [];
        function AddVendorScripts() {
            if(argv.react!==false) {
                scripts.push("<script src=\"react.js\"><script>");
                scripts.push("<script src=\"react-dom.js\"><script>");
            }
        }
        function AddWehScripts() {
            if(argv.weh!==false) {
                scripts.push("<script src=\"weh-ct.js\"></script>");
                if(argv["weh-prefs"]!==false)
                    scripts.push("<script src=\"weh-ct-react.jsx\"><script>");
            }
        }
        match.split().map(function(term) {
            return term.trim();
        }).forEach(function(term) {
            switch(term) {
                case "weh-all":
                    AddVendorScripts();
                    AddWehScripts();
                    break;
                case "weh":
                    AddWehScripts();
                    break;
            }
        });
        return scripts.join("\n");
    }

    return gulp.src(path.join(prjDir,"src/content/**/*.html"))
        .pipe(replace(/<\!--\s*weh:js\s*(.*?)\s*-->/g,AddScripts))
        .pipe(userefWeh([{
            src: staticSrc,
        },{
            src: [path.join(prjDir,"src/content/**/*.jsx"),"src/content/**/*.jsx"],
            stream: function(fileName) {
                return gulp.src(fileName)
                    .pipe(babel({
                        presets: [es2015,react]
                    }));
            }
        },{
            src: [path.join(prjDir,"src/content/**/*.scss")],
            stream: function(fileName) {
                return gulp.src(fileName)
                    .pipe(sass().on('error', sass.logError));
            }
        }],{
            noconcat: dev
        }))
        .pipe(gulpif(!dev,gulpif('*.js', uglify())))
        .pipe(gulpif(!!jsBanner,gulpif('*.js',header(jsBanner,jsBannerData))))
        .pipe(gulpif(!dev,gulpif('*.css',cleanCSS({compatibility: 'ie8'}))))
        .pipe(gulp.dest(path.join(buildDir,"content")));
});

gulp.task("prj-content-assets",function() {
    return gulp.src([path.join(prjDir,"src/content/assets/**/*")])
        .pipe(gulp.dest(path.join(buildDir,"content")));
});


gulp.task("prj-assets",function() {
    return gulp.src(path.join(prjDir,"src/assets/**/*"))
        .pipe(gulp.dest(buildDir))
});

gulp.task("prj-manifest",function() {
    return gulp.src(path.join(prjDir,"src/manifest.json"))
        .pipe(manifest({
            background: {
                target: 'background/background.js',
                initialScripts: wehBackgroundModules.map(function(module) {
                    return "background/weh-"+module+".js";
                }),
                searchPath: [path.resolve("src")],
                noconcat: dev
            }
        }))
        .pipe(gulpif(!dev,gulpif('*.js', uglify())))
        .pipe(gulpif(!!jsBanner,gulpif('*.js',header(jsBanner,jsBannerData))))
        .pipe(gulp.dest(buildDir));
});

gulp.task("prj-locales",function() {
    return gulp.src(path.join(prjDir,"src/locales/**/*"))
        .pipe(gulp.dest(path.join(buildDir,"_locales")));
});

gulp.task("clean",function() {
    return del([buildDir+"/*"],{force:true});
});

gulp.task("build-weh",[
    "weh-background-scripts",
    "weh-content-scripts",
]);

gulp.task("build",[
    "prj-manifest",
    "prj-content",
    "prj-content-assets",
    "prj-assets",
    "prj-locales"
]);

gulp.task("watch-weh",function() {
    gulp.watch(["src/background/**/*.js","src/content/*.js","src/content/*.jsx"], ["build"]);
});

gulp.task("watch-prj",function() {
    gulp.watch(["src/background/**/*.js","content/**/*"], ["build"]);
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
    try {
        fs.accessSync(prjDir,fs.F_OK);
        if(!force)
            return callback(new Error(prjDir+" already exists"));
    } catch(e) {}
    gulp.src("templates/"+template+"/**/*")
        .pipe(gulp.dest(prjDir))
        .on("end",callback);
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
        "  --no-watch! do generate builds dynamically",
        "  --watch-weh! generate builds dynamically when weh source is modified",
        "  --no-react: do not include ReactJS vendor library",
        "  --no-bootstrap: do not include Bootstrap vendor library",
        "  --force: force overwrite output directory",
        "  --jsheader/--no-jsheader: force JS headers on dev builds/disable JS headers on non-dev builds"
    ];
    console.log(help.join("\n"));
    process.exit(0);
});

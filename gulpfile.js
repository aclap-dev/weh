/*
 * weh - WebExtensions Help
 *
 * @summary workflow and base code for developing WebExtensions browser add-ons
 * @author Michel Gutierrez
 * @link https://github.com/mi-g/weh
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const gulp = require("gulp");
const gutil = require("gulp-util");
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const del = require("del");
const sass = require('gulp-sass');
const replace = require('gulp-replace');
const gulpif = require('gulp-if');
const debug = require('gulp-debug');
const cleanCSS = require('gulp-clean-css');
const htmlmin = require('gulp-htmlmin');
const header = require("gulp-header");
const ejs = require("gulp-ejs");
const rename = require("gulp-rename");
const typescript = require("gulp-typescript");
const coffee = require("gulp-coffee");
const less = require("gulp-less");
const stylus = require("gulp-stylus");
const userefWeh = require("./gulp-useref-weh");
const runSequence = require('run-sequence');
const es2015 = require('babel-preset-es2015');
const react = require('babel-preset-react');
const manifest = require('./gulp-webext-manifest');

const merge = require('merge-stream');
const fs = require("fs");
const argv = require('yargs').argv;
const path = require("path");
const glob = require("glob");
const through = require('through2');

var dev = !!argv.dev;
var prjDir = argv.prjdir || 'tmp/trash-prj';
var buildDir = path.join(prjDir,argv.builddir || "build");
var srcDir = path.join(prjDir,argv.srcdir || "src");
var locDir = path.join(prjDir,argv.locdir || "src/locales");
var template = argv.template || "skeleton";

var wehBackgroundModules = ["core","inspect","prefs","ui","ajax"];

var jsBanner = null, jsBannerData;

// banner to go to js files after concat + minify
if(argv.jsheader || (!dev && argv.jsheader!==false)) {
    try {
        jsBannerData = {
            manifest: require(path.join(srcDir,"manifest.json"))
        }
        try {
            jsBanner = fs.readFileSync(path.join(prjDir,"etc/jsbanner.txt"),"utf8");
        } catch(e) {
            jsBanner = fs.readFileSync("etc/jsbanner.txt","utf8");
        }
    } catch(e) {}
}

// load data to be used in case of ejs pre-processing
var ejsData = {};
if(argv.ejsdata) {
    argv.ejsdata.split(path.delimiter).forEach(function(jsonFile) {
        try {
            Object.assign(ejsData,JSON.parse(fs.readFileSync(jsonFile,"utf8")));
        } catch(e) {
            console.warn("Error reading",jsonFile,":",e.message);
        }
    });
}

// replace gulp.src to process ejs if needed
function SrcExtend(glob) {
    if(!Array.isArray(glob))
        glob = [ glob ];
    var streams = [];
    glob.forEach(function(g) {
        streams.push(gulp.src(g));
        streams.push(gulp.src(g+".ejs")
            .pipe(ejs(ejsData))
            .pipe(rename(function (path) {
                path.extname = ""
            }))
        );
    });
    return merge.apply(null,streams);
}

// process input files to handle various script and styles languages
function ResolveInput(stream) {
    var error = null;
    return stream
        .pipe(gulpif('*.ejs',ejs(ejsData)))
        .on("error",function(err) {
            error = err;
            this.emit("end");
        })
       .pipe(gulpif('*.ejs',rename(function(path) {
            path.extname = "";
        })))
        .pipe(gulpif('*.jsx',babel({
            presets: [react],
            compact: false
        })))
        .pipe(gulpif('*.ts',typescript()))
        .pipe(gulpif('*.coffee',coffee({bare:true})))
        .on("error",function(err) {
            error = err;
            this.emit("end");
        })
        .pipe(gulpif('*.js',babel({
            presets: [es2015],
            compact: false
        })))
        .pipe(gulpif('*.scss',sass()))
        .pipe(gulpif('*.less',less()))
        .pipe(gulpif('*.styl',stylus()))
        .on("end",function() {
            if(error)
                this.emit("error",error);
        });
}

// potential input files in the process
var prjCodeGlobs = [path.join(srcDir,"**/*.{js,css,js.ejs,css.ejs,jsx,jsx.ejs,scss,scss.ejs,"+
    "ts,ts.ejs,coffee,coffee.ejs,less,less.ejs,styl,styl.ejs}")];
// files to be considered from weh
var wehCodeGlobs = ["src/**/*.{js,css,jsx}"];

// all potential input files, including vendor libraries
var globs = [].concat(wehCodeGlobs,prjCodeGlobs,[
    "node_modules/react/dist/**/*.{js,css}",
    "node_modules/react-dom/dist/**/*.{js,css}",
    "node_modules/bootstrap/dist/css/*.css",
    "node_modules/bootstrap/dist/js/*.js",
    "node_modules/jquery/dist/**/*.js"
])

var usedSourceFiles = {}; // retain files used when processing html or manifest

// streams to serve input files when processing html and manifest
var sources = [{
    src: globs,
    stream: function(fileName) {
        usedSourceFiles[path.resolve(fileName)] = 1;
        return ResolveInput(gulp.src(fileName))
    }
}];

// file extension translation map
var changeExt = {
    ".ejs": "",
    ".jsx": ".js",
    ".ts": ".js",
    ".coffee": ".js",
    ".scss": ".css",
    ".less": ".css",
    ".styl": ".css"
}

// processing output files for minification
function ResolveOutput(stream) {
    return stream
        .pipe(rename(function(path) {
            path.dirname = path.dirname.replace(/\b_assets\b/,"/").replace("//","/");
            return path;
        }))
        .pipe(gulpif(argv.minifyjs || (!dev && argv.minifyjs!==false),
                     gulpif('*.js', uglify())))
        .pipe(gulpif(!!jsBanner,
                     gulpif('*.js',header(jsBanner,jsBannerData))))
        .pipe(gulpif(argv.minifycss || (!dev && argv.minifycss!==false),
                     gulpif('*.css',cleanCSS({compatibility: 'ie8'}))))
        .pipe(gulpif(argv.minifyhtml || (!dev && argv.minifyhtml!==false),
                     gulpif('*.html',htmlmin({collapseWhitespace: true}))))
        .pipe(gulp.dest(buildDir));
}

// return html code to included required scripts
function AddScripts(org,match) {
    var scripts = [];
    function AddReactScripts() {
        if(argv.react!==false) {
            scripts.push("<script src=\"react.js\"></script>");
            scripts.push("<script src=\"react-dom.js\"></script>");
        }
    }
    function AddWehScripts() {
        if(argv.weh!==false) {
            scripts.push("<script src=\"weh-ct.js\"></script>");
            if(argv["weh-prefs"]!==false)
                scripts.push("<script src=\"weh-ct-react.jsx\"></script>");
        }
    }
    match.split(",").map(function(term) {
        return term.trim();
    }).forEach(function(term) {
        switch(term) {
            case "jquery":
                scripts.push("<script src=\"jquery.js\"></script>");
                break;
            case "bootstrap":
                scripts.push("<script src=\"bootstrap.js\"></script>");
                break;
            case "react":
                AddReactScripts();
                break;
            case "weh-all":
                AddReactScripts();
                AddWehScripts();
                break;
            case "weh":
                AddWehScripts();
                break;
            default:
                console.warn("Unknown term",term,"in weh:js placeholder");
        }
    });
    return scripts.join("\n");
}

// return html code to included required stylesheets
function AddStyles(org,match) {
    var styles = [];
    match.split(",").map(function(term) {
        return term.trim();
    }).forEach(function(term) {
        switch(term) {
            case "bootstrap":
                styles.push('<link href="bootstrap.css" type="text/css" rel="stylesheet">');
                break;
            default:
                console.warn("Unknown term",term,"in weh:css placeholder");
        }
    });
    return styles.join("\n");
}

// display error nicely and end the stream
function HandleError(err) {
    console.log('[Compilation Error]');
    if(err.plugin)
        console.info("plugin:",err.plugin);
    if(err.fileName && err.loc)
        console.log(err.fileName + ( err.loc ? `( ${err.loc.line}, ${err.loc.column} ): ` : ': '));
    console.log('error: ' + err.message + '\n');
    if(err.codeFrame)
        console.log(err.codeFrame);
    this.emit("end");
}

// process html files
gulp.task("build-html",function(callback) {
    ResolveOutput(SrcExtend(path.join(srcDir,"**/*.html"))
        .pipe(replace(/<\!--\s*weh:js\s*(.*?)\s*-->/g,AddScripts))
        .pipe(replace(/<\!--\s*weh:css\s*(.*?)\s*-->/g,AddStyles))
        .pipe(userefWeh(sources,{
            noconcat: argv.concat===false || (!!dev && argv.concat!==false),
            changeExt: changeExt,
            base: srcDir
        }))
        .on("error",function(err) {
            HandleError.call(this,err);
        })
    ).on("end",callback);
});

// process manifest.json file
gulp.task("build-manifest",function(callback) {
    ResolveOutput(SrcExtend(path.join(srcDir,"manifest.json"))
        .pipe(manifest(sources,{
            background: {
                initialScripts:  wehBackgroundModules.map(function(module) {
                    return "background/weh-"+module+".js";
                })
            },
            noconcat: argv.concat===false || (!!dev && argv.concat!==false),
            changeExt: changeExt
        }))
        .on("error",function(err) {
            HandleError.call(this,err);
        })
    ).on("end",callback);
});

// build assets: input files that need to be processed but discovered in html nor manifest
gulp.task("build-assets",function(callback) {
    return ResolveOutput(ResolveInput(SrcExtend(path.join(srcDir,"**/_assets/**/*"))));
});

// copy locale files
gulp.task("build-locales",function() {
    return gulp.src(path.join(locDir,"**/*"))
        .pipe(gulp.dest(path.join(buildDir,"_locales")));
});

// filter to prevent unused file to be processed on watch
function FilterUsed() {
    return through.obj(function (file, enc, callback) {
        if(usedSourceFiles[file.path])
            this.push(file);
        callback();
    });
}

// build project files on watch
gulp.task("build-code-prj",function() {
    return ResolveOutput(ResolveInput(gulp.src(prjCodeGlobs)
        .pipe(FilterUsed())
    ));
});

// build weh files on watch
gulp.task("build-code-weh",function() {
    return ResolveOutput(ResolveInput(gulp.src(wehCodeGlobs)
        .pipe(FilterUsed())
    ));
});

// erase build directory
gulp.task("clean",function() {
    return del([buildDir+"/*"],{force:true});
});

// build everything
gulp.task("build",[
    "build-html",
    "build-manifest",
    "build-assets",
    "build-locales"
]);

// watch for changes and rebuild what's needed
gulp.task("watch",function() {
    gulp.watch(path.join(locDir,"**/*"), ["build-locales"]);
    gulp.watch(path.join(srcDir,"**/_assets/**/*"), ["build-assets"]);
    gulp.watch(path.join(srcDir,"**/*.html"), ["build-html"]);
    gulp.watch(path.join(srcDir,"manifest.json"), ["build-manifest"]);
    gulp.watch(prjCodeGlobs,["build-code-prj"]);
    gulp.watch(wehCodeGlobs,["build-code-weh"]);
});

// default task if none specified in command line
gulp.task("default", function(callback) {
    if(argv.help)
        return runSequence("help");
    var tasks = ["clean","build"];
    if(argv["watch"]!==false && dev)
        tasks.push("watch");
    tasks.push(callback);
    runSequence.apply(null,tasks);
});

// copy template directory when creating new project
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

// create new project
gulp.task("init", function(callback) {
    runSequence("copy-template","build",callback);
});

// get some help
gulp.task("help", function() {
    var help = [
        "usage: gulp [<commands>] [<options>]",
        "",
        "commands:",
        "  build: generate project build",
        "  clean: remove project build recursively",
        "  watch: watch project and build dynamically on changes",
        "  init: generate project from template",
        "default commands: clean + build + watch",
        "",
        "options:",
        "  --prjdir <dir>: project directory (required for most commands)",
        "  --dev: addon generated for development",
        "  --template <template>: template to be used when creating a new project",
        "  --no-watch! do generate builds dynamically",
        "  --force: force overwrite output directory",
        "  --jsheader/--no-jsheader: force JS headers on dev builds/disable JS headers on non-dev builds",
        "  --minifyjs/--no-minifyjs: force JS minification on/off, default is minification on non-dev builds",
        "  --minifycss/--no-minifycss: force CSS minification on/off, default is minification on non-dev builds",
        "  --minifyhtml/--no-minifyhtml: force HTML minification on/off, default is minification on non-dev builds",
        "  --concat/--no-concat: force HTML and CSS concatenation on/off, default is concatenation on non-dev builds",
        "  --ejsdata: one or several (separated by '"+path.delimiter+"') JSON files used as data source when compiling "+
            "EJS files",
    ];
    console.log(help.join("\n"));
    process.exit(0);
});

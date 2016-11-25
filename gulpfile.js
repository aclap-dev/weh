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

var dev = !!argv.dev;
var prjDir = argv.prjdir || 'tmp/trash-prj';
var buildDir = path.join(prjDir,argv.builddir || "build");
var srcDir = path.join(prjDir,argv.srcdir || "src");
var locDir = path.join(prjDir,argv.locdir || "src/locales");
var template = argv.template || "skeleton";

var wehBackgroundModules = ["core","inspect","prefs","ui","ajax"];

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

var globs = [path.join(srcDir,"**/*.{js,css,js.ejs,css.ejs,jsx,jsx.ejs,scss,scss.ejs,"+
    "ts,ts.ejs,coffee,coffee.ejs,less,less.ejs,styl,styl.ejs}")];
globs.push("src/**/*.{js,css,jsx}");
globs.push("node_modules/react/dist/**/*.{js,css}");
globs.push("node_modules/react-dom/dist/**/*.{js,css}");
globs.push("node_modules/bootstrap/dist/css/*.css");
globs.push("node_modules/bootstrap/dist/js/*.js");
globs.push("node_modules/jquery/dist/**/*.js");

var sources = [{
    src: globs,
    stream: function(fileName) {
        return ResolveInput(gulp.src(fileName))
    }
}];

var changeExt = {
    ".ejs": "",
    ".jsx": ".js",
    ".ts": ".js",
    ".coffee": ".js",
    ".scss": ".css",
    ".less": ".css",
    ".styl": ".css"
}

function ResolveOutput(stream) {
    return stream
        .pipe(rename(function(path) {
            path.dirname = path.dirname.replace(/\/_assets\b/,"/");
            return path;
        }))
        .pipe(gulpif(!dev,gulpif('*.js', uglify())))
        .pipe(gulpif(!!jsBanner,gulpif('*.js',header(jsBanner,jsBannerData))))
        .pipe(gulpif(!dev,gulpif('*.css',cleanCSS({compatibility: 'ie8'}))))
        .pipe(gulp.dest(buildDir));
}

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

gulp.task("build-html",function(callback) {
    ResolveOutput(SrcExtend(path.join(srcDir,"**/*.html"))
        .pipe(replace(/<\!--\s*weh:js\s*(.*?)\s*-->/g,AddScripts))
        .pipe(replace(/<\!--\s*weh:css\s*(.*?)\s*-->/g,AddStyles))
        .pipe(userefWeh(sources,{
            noconcat: !!dev,
            changeExt: changeExt,
            base: srcDir
        }))
        .on("error",function(err) {
            HandleError.call(this,err);
        })
    ).on("end",callback);
});

gulp.task("build-manifest",function(callback) {
    ResolveOutput(SrcExtend(path.join(srcDir,"**/manifest.json"))
        .pipe(manifest(sources,{
            background: {
                initialScripts:  wehBackgroundModules.map(function(module) {
                    return "background/weh-"+module+".js";
                })
            },
            noconcat: !!dev,
            changeExt: changeExt
        }))
        .on("error",function(err) {
            HandleError.call(this,err);
        })
    ).on("end",callback);
});

gulp.task("build-assets",function(callback) {
    return ResolveOutput(ResolveInput(SrcExtend(path.join(srcDir,"**/_assets/**/*"))));
});

gulp.task("build-locales",function() {
    return gulp.src(path.join(locDir,"**/*"))
        .pipe(gulp.dest(path.join(buildDir,"_locales")));
});

gulp.task("clean",function() {
    return del([buildDir+"/*"],{force:true});
});

gulp.task("build",[
    "build-html",
    "build-manifest",
    "build-assets",
    "build-locales"
]);

gulp.task("watch-prj",function() {
    gulp.watch([path.join(srcDir,"**/*"),"src/**/*"], ["build"]);
});

gulp.task("default", function(callback) {
    if(argv.help)
        return runSequence("help");
    var tasks = ["clean","build"];
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
        "  --force: force overwrite output directory",
        "  --jsheader/--no-jsheader: force JS headers on dev builds/disable JS headers on non-dev builds"
    ];
    console.log(help.join("\n"));
    process.exit(0);
});

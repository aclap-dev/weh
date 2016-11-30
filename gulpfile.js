/*
 * weh - WebExtensions Helper
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
const gfile = require("gulp-file");
const lec = require('gulp-line-ending-corrector');
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
const exec = require('child_process').exec;
const File = gutil.File;

if(process.env.wehCwd)
    process.chdir(process.env.wehCwd);

var dev = !argv.prod;
var prjDir = path.resolve(argv.prjdir || '.');
var buildDir = path.join(prjDir,argv.builddir || "build");
var srcDir = path.join(prjDir,argv.srcdir || "src");
var locDir = path.join(prjDir,argv.locdir || "src/locales");
var etcDir = path.join(prjDir,argv.etcdir || "etc");
var template = argv.template || "skeleton";
var resourceMap = {};

var wehBackgroundModules = ["background/weh-core.js","common/weh-prefs.js","common/weh-i18n.js"];
if(argv.inspect!==false)
    wehBackgroundModules.push("background/weh-inspect.js");
wehBackgroundModules.push("background/weh-bg-prefs.js","background/weh-ui.js","background/weh-ajax.js");
if(argv.i18nkeys!==false)
    wehBackgroundModules.push("background/weh-i18n-keys.js");

var jsBanner = null, jsBannerData;

// banner to go to js files after concat + minify
if(argv.jsheader || (!dev && argv.jsheader!==false)) {
    try {
        jsBannerData = {
            manifest: require(path.join(srcDir,"manifest.json"))
        }
        try {
            jsBanner = fs.readFileSync(path.join(etcDir,"jsbanner.txt"),"utf8");
        } catch(e) {
            jsBanner = fs.readFileSync(path.join(__dirname,"etc/jsbanner.txt"),"utf8");
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
    return merge.apply(null,streams)
        .pipe(gulpif('*.html',lec()));
}

// process input files to handle various script and styles languages
function ResolveInput(stream) {
    var error = null;
    function Error(err) {
        if(!error) {
            error = err;
            this.emit("end")
        }
    }
    return stream
        .pipe(gulpif('*.ejs',ejs(ejsData)))
        .on("error",Error)
       .pipe(gulpif('*.ejs',rename(function(path) {
            path.extname = "";
        })))
        .pipe(gulpif('*.jsx',babel({
            presets: [react],
            compact: false
        })))
        .on("error",Error)
        .pipe(gulpif('*.ts',typescript()))
        .on("error",Error)
        .pipe(gulpif('*.coffee',coffee({bare:true})))
        .on("error",Error)
        .pipe(gulpif('*.js',babel({
            presets: [es2015],
            compact: false
        })))
        .on("error",Error)
        .pipe(gulpif('*.scss',sass()))
        .on("error",Error)
        .pipe(gulpif('*.less',less()))
        .on("error",Error)
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
var wehCodeGlobs = [path.join(__dirname,"src/{background,content,common}/*.{js,css,jsx}")];

var wehAssetsGlobs = [
    path.join(srcDir,"**/_assets/**/*"),
    path.join(__dirname,"src/**/_assets/**/*")
];

// all potential input files, including vendor libraries
var globs = [].concat(wehCodeGlobs,prjCodeGlobs,[
    "node_modules/react/dist/**/*.{js,css}",
    "node_modules/react-dom/dist/**/*.{js,css}",
    "node_modules/bootstrap/dist/css/*.css",
    "node_modules/bootstrap/dist/js/*.js",
    "node_modules/jquery/dist/**/*.js"
].map(function(pattern) {
    return path.join(__dirname,pattern);
}));

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

// use resource pathes discovered in HTML processing when writing target file
function RelocateHtmlResources() {
    return through.obj(function (file, enc, callback) {
        var self = this;
        var retarget = resourceMap[path.basename(file.path)];
        if(retarget)
            retarget.forEach(function(target) {
                self.push(new File({
                    path: target,
                    contents: file.contents
                }));
            });
        else
            this.push(file);
        callback();
    });
}

// processing output files for minification
function ResolveOutput(stream) {
    var error = null;
    function Error(err) {
        error = err;
    }
    return stream
        .on("error",Error)
        .pipe(rename(function(path) {
            path.dirname = path.dirname.replace(/\b_assets\b/,"/").replace("//","/");
            return path;
        }))
        .on("error",Error)
        .pipe(gulpif(argv.minifyjs || (!dev && argv.minifyjs!==false),
                     gulpif('*.js', uglify())))
        .on("error",Error)
        .pipe(gulpif(!!jsBanner,
                     gulpif('*.js',header(jsBanner,jsBannerData))))
        .on("error",Error)
        .pipe(gulpif(argv.minifycss || (!dev && argv.minifycss!==false),
                     gulpif('*.css',cleanCSS({compatibility: 'ie8'}))))
        .on("error",Error)
        .pipe(gulpif(argv.minifyhtml || (!dev && argv.minifyhtml!==false),
                     gulpif('*.html',htmlmin({collapseWhitespace: true}))))
        .on("error",Error)
        .pipe(RelocateHtmlResources())
        .pipe(gulp.dest(buildDir))
        .on("error",Error)
        .on("end",function() {
            if(error)
                this.emit("error",error);
        });
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
            scripts.push("<script src=\"weh-i18n.js\"></script>");
            if(argv["react"]!==false)
                scripts.push("<script src=\"weh-ct-react.jsx\"></script>");
            if(argv["prefs"]!==false) {
                scripts.push("<script src=\"weh-prefs.js\"></script>");
                scripts.push("<script src=\"weh-ct-prefs.js\"></script>");
                scripts.push("<script src=\"weh-ct-react-prefs.jsx\"></script>");
            }
            if(argv["translator"]!==false)
                scripts.push("<script src=\"weh-ct-react-translate.jsx\"></script>");
            scripts.push("<script src=\"weh-ct-ready.js\"></script>");
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

// display error nicely
function HandleError(err) {
    console.log('[Compilation Error]');
    if(err.plugin)
        console.info("plugin:",err.plugin);
    if(err.fileName && err.loc)
        console.log(err.fileName + ( err.loc ? `( ${err.loc.line}, ${err.loc.column} ): ` : ': '));
    console.log('error: ' + err.message + '\n');
    if(err.codeFrame)
        console.log(err.codeFrame);
    if(argv.onerror)
        exec(argv.onerror,function(error) {
             if(error)
                 console.warn("Could not execute onerror handle:",error.message);
        });
}

// display error nicely and end the stream
function HandleErrorEnd(err) {
    HandleError.call(this,err);
    this.emit("end");
}

// process html files
gulp.task("build-html",function(callback) {
    ResolveOutput(SrcExtend(path.join(srcDir,"**/*.html"))
        .pipe(replace(/<\!--\s*weh:js\s*(.*?)\s*-->/g,AddScripts))
        .pipe(replace(/<\!--\s*weh:css\s*(.*?)\s*-->/g,AddStyles))
        .pipe(userefWeh(sources,{
            noconcat: argv.concat===false || (dev && argv.concat!==false),
            changeExt: changeExt,
            base: srcDir,
            map: resourceMap
        }))
        .on("error",function(err) {
            HandleErrorEnd.call(this,err);
        })
    ).on("end",callback);
});

// process manifest.json file
gulp.task("build-manifest",function(callback) {
    ResolveOutput(SrcExtend(path.join(srcDir,"manifest.json"))
        .pipe(manifest(sources,{
            background: {
                initialScripts:  wehBackgroundModules
            },
            noconcat: argv.concat===false || (dev && argv.concat!==false),
            changeExt: changeExt,
            ignoreMissing: ["background/weh-i18n-keys.js"]
        }))
        .on("error",function(err) {
            HandleErrorEnd.call(this,err);
        })
    ).on("end",callback);
});

// build assets: input files that need to be processed but discovered in html nor manifest
gulp.task("build-assets",function(callback) {
    return ResolveOutput(ResolveInput(SrcExtend(wehAssetsGlobs)));
});

// copy locale files
gulp.task("build-locales",function() {
    var localeKeys = {};
    function LocaleKeys() {
        return through.obj(function (file, enc, callback) {
            try {
                var json = JSON.parse(file.contents);
                Object.keys(json).forEach(function(key) {
                    localeKeys[key] = 1;
                });
            } catch(e) {
                console.warn("File",file.path,"is not JSON",file.contents)
            }
            this.push(file);
            callback();
        });
    }

    return gulp.src(path.join(locDir,"**/*.json"))
        .pipe(LocaleKeys())
        .pipe(gulp.dest(path.join(buildDir,"_locales")))
        .on("end",function() {
            if(argv.i18nkeys!==false) {
                var str = "/* generated automatically by weh */\nweh.i18nKeys="+
                    JSON.stringify(Object.keys(localeKeys));
                gfile('background/weh-i18n-keys.js', str, { src: true })
                    .pipe(gulp.dest(path.join(buildDir)));
            }
        });
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
gulp.task("build-code-prj",function(callback) {
    ResolveOutput(ResolveInput(gulp.src(prjCodeGlobs)
        .pipe(FilterUsed())
        ).on("error",function(err) {
            HandleError.call(this,err);
        })
    ).on("end",callback);
});

// build weh files on watch
gulp.task("build-code-weh",function(callback) {
    ResolveOutput(ResolveInput(gulp.src(wehCodeGlobs)
        .pipe(FilterUsed())
        ).on("error",function(err) {
            HandleError.call(this,err);
        })
    ).on("end",callback);
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
    gulp.watch(wehAssetsGlobs, ["build-assets"]);
    gulp.watch(path.join(srcDir,"**/*.html"), ["build-html"]);
    gulp.watch(path.join(srcDir,"manifest.json"), ["build-manifest"]);
    gulp.watch(prjCodeGlobs,["build-code-prj"]);
    gulp.watch(wehCodeGlobs,["build-code-weh"]);
    setTimeout(function() {
        console.info("Watching for changes");
    });
});

// default task if none specified in command line
gulp.task("default", function(callback) {
    if(argv.help)
        return runSequence("help");
    if(argv.templates)
        return runSequence("templates");

    console.info("Directories:");
    console.info("  src:",srcDir);
    console.info("  build:",buildDir);
    console.info("  locales:",locDir);
    console.info("  etc:",etcDir);

    try {
        JSON.parse(fs.readFileSync(path.join(srcDir,"manifest.json"),"utf8"));
    } catch(e) {
        console.error("Directory",srcDir,"does not contain a valid manifest.json file. You may want to init a new weh project first with 'weh init --prjdir my-project'");
        process.exit(-1);
    }

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
        if(!argv.force) {
            console.error(prjDir+" already exists. Use --force option to overwrite.");
            process.exit(-1);
            return;
        }
    } catch(e) {}
    gulp.src(path.join(__dirname,"templates",template,"/**/*"))
        .pipe(gulp.dest(prjDir))
        .on("end",callback);
});

// list available templates
gulp.task("templates",function() {
    var templates = fs.readdirSync(path.join(__dirname,"templates"));
    templates.forEach(function(template) {
        var manifest = null;
        try {
            manifest = JSON.parse(fs.readFileSync(path.join(__dirname,"templates",template,"src/manifest.json"),"utf8"));
        } catch(e) {}
        console.info(template+":",manifest && manifest.description ? manifest.description : "no description found");
    });
    process.exit(0);
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
        "  --prod: addon generated for production",
        "  --template <template>: template to be used when creating a new project",
        "  --no-watch! do generate builds dynamically",
        "  --force: force overwrite output directory",
        "  --jsheader/--no-jsheader: force JS headers on dev builds/disable JS headers on prod builds",
        "  --minifyjs/--no-minifyjs: force JS minification on/off, default is minification on prod builds",
        "  --minifycss/--no-minifycss: force CSS minification on/off, default is minification on prod builds",
        "  --minifyhtml/--no-minifyhtml: force HTML minification on/off, default is minification on prod builds",
        "  --concat/--no-concat: force HTML and CSS concatenation on/off, default is concatenation on prod builds",
        "  --ejsdata: one or several (separated by '"+path.delimiter+"') JSON files used as data source when compiling "+
            "EJS files",
        "  --onerror <command>: execute a command (like playing a sound) on errors",
        "  --no-inspect: do not allow this add-on to be accessed by weh inspector tools",
        "  --no-i18nkeys: do not generate the translation keys automatically",
        "  --no-prefs: do not include preference editor module",
        "  --no-translator: do not include locale editor module"
    ];
    console.log(help.join("\n"));
    process.exit(0);
});

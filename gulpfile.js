
const gulp = require("gulp");
const clean = require('gulp-clean');
const runSequence = require('run-sequence');
const rename = require("gulp-rename");
const through = require('through2');
const gulpif = require('gulp-if');
const lazypipe = require('lazypipe');
const buffer = require("vinyl-buffer");
const source = require('vinyl-source-stream');
const filter = require('gulp-filter');
const debug = require('gulp-debug');
const sass = require('gulp-sass');
const less = require("gulp-less");
const stylus = require("gulp-stylus");
const babel = require('gulp-babel');
const es2015 = require('babel-preset-es2015');
const react = require('babel-preset-react');
const typescript = require("gulp-typescript");
const coffee = require("gulp-coffee");
const sourcemaps = require('gulp-sourcemaps');
const gutil = require('gulp-util');
const install = require('gulp-install');
const merge = require('merge-stream');
const ejs = require('gulp-ejs');

const package = require('./package.json');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const uglify = require("uglifyjs-webpack-plugin");

const named = require('vinyl-named');
var argv = require('yargs').argv;
const fs = require("fs");
const path = require("path");
const exec = require('child_process').exec;

if(process.env.wehCwd)
    process.chdir(process.env.wehCwd);

function OverrideOptions() {
	var globalOptions = {};
	var globalOptionsFile = process.env.HOME ? 
		path.join(process.env.HOME,".weh.json") : 
		path.join(process.env.HOMEPATH,"AppData","Local","weh","config.json");
	try {
		fs.lstatSync(globalOptionsFile);
		try {
			globalOptions = JSON.parse(fs.readFileSync(globalOptionsFile,"utf8"));
		} catch(e) {
			console.warn("Error parsing",globalOptionsFile,"option file:",e);			
		}
	} catch(e) {}
	var wehOptions = {};
	// on init project, the options file is in the template not the project dir
	var optionsFile = argv._.indexOf("init")<0 ?
		path.join(etcDir,"weh-options.json") :
		path.join(__dirname,"templates",template,"etc/weh-options.json");
	try {
		fs.lstatSync(optionsFile);
		try {
			wehOptions = JSON.parse(fs.readFileSync(optionsFile,"utf8"));
		} catch(e) {
			console.warn("Error parsing",optionsFile,"option file:",e);
		}
	} catch(e) {}
	var newArgv = {}
	Object.assign(
		newArgv,
		Object.assign({},globalOptions.all,wehOptions.all),
		dev ? Object.assign({},globalOptions.dev,wehOptions.dev) : Object.assign({},globalOptions.prod,wehOptions.prod),
		argv);
	argv = newArgv;
}

var dev = !argv.prod;
var prjDir = path.resolve(argv.prjdir || '.');
var etcDir = path.join(prjDir,argv.etcdir || "etc");
var template = argv.template || "skeleton";
OverrideOptions();
var buildPost = argv.buildpost && "-"+argv.buildpost || "";
var buildDir = path.join(prjDir,argv.builddir || "build"+buildPost);
var buildTmpDir = path.join(prjDir,argv.buildtmpdir || "build-tmp"+buildPost);
var buildTmpAddonDir = path.join(buildTmpDir,"addon");
var buildTmpModDir = path.join(buildTmpDir,"modules");
var buildTmpWehDir = path.join(buildTmpDir,"weh");
var srcDir = path.join(prjDir,argv.srcdir || "src");
var srcModDir = path.join(prjDir,argv.srcmoddir || "src-modules");
var locDir = path.join(prjDir,argv.locdir || "locales");
var ejsData = {};
const mapExtensions = /.*\.(js|jsx|ts|coffee)$/;

if(typeof argv.ejsdata !== "undefined") {
	if(!Array.isArray(argv.ejsdata))
		argv.ejsdata = [argv.ejsdata];
	argv.ejsdata.forEach((statement)=>{
		var m = /^(.*?)=(.*)$/.exec(statement);
		if(m)
			ejsData[m[1]] = m[2];
		else
			console.warn("Invalid statement --args",statement);
	});
}

var buildTmpError = null;

gulp.task('clean', function() {
	return gulp.src([buildDir+"/*",buildTmpDir+"/*"],{read: false})
		.pipe(clean());
});

var WebPack = (function() {
	var paths = {};
	return lazypipe()
		.pipe(named)
		.pipe(function() {
				return rename(function(filePath) {
					paths[filePath.basename] = filePath.dirname;
				});
		})
		.pipe(function() {
			return webpackStream({
				context: srcDir,
				output: {
					filename: '[name].js'
				},
				resolve: {
					modules: [
						buildTmpModDir,
						buildTmpWehDir,
						buildTmpDir+"/node_modules",
						__dirname+"/node_modules"
					],
				},
				module: { 
					loaders: [{
						test: /\.css$/,
						loader: __dirname+"/node_modules/style-loader!"+__dirname+"/node_modules/css-loader?importLoaders=1"
					},{ 
						test: /\.(png|woff|woff2|eot|ttf|svg)$/, 
						loaders: [__dirname+"/node_modules/url-loader?limit=100000"]
					}
				]},
				plugins: dev ? [
					new webpack.DefinePlugin({
						'process.env': {
							NODE_ENV: `""`
						}
					})
				] : [
					new webpack.DefinePlugin({
						'process.env': {
							NODE_ENV: `"production"`
						}
					}),
					new uglify()
				]
			},webpack,(err,stats) => {
				if(stats.compilation.errors.length) {
					gutil.log(stats.toString({
    			      colors: gutil.colors.supportsColor
					}));
					if(argv.onerror)
						exec(argv.onerror,function(error) {
							if(error)
								console.warn("Could not execute onerror handle:",error.message);
						});
				} else {
					if(argv.onsuccess)
						exec(argv.onsuccess,function(error) {
							if(error)
								console.warn("Could not execute onsuccess handle:",error.message);
						});
				}
				return true;
			});
		})
		.pipe(function() {
			return rename(function(filePath) {
				filePath.dirname = paths[filePath.basename] || filePath.dirname;
			});
		})
		;
})();

gulp.task("build-locales",function() {
	return gulp.src(locDir+"/**/*")
		.pipe(gulp.dest(buildTmpAddonDir+"/_locales"));
});

gulp.task("build-final",function(callback) {
	if(buildTmpError) {
		console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
		console.error("!!! INTERMEDIATE BUILD HAS AN ERROR !!!");
		console.error("!!! Skipping final build            !!!");
		console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
		callback();
		return;
	}
	gulp.src(buildTmpAddonDir+"/**/*")
		.pipe(gulpif('*.js',gulpif(dev,sourcemaps.init({loadMaps:true}))))
		.pipe(gulpif("*.js",WebPack()))
		.on("error",function(error) {
			this.emit("end");
		})
		.pipe(gulpif(dev,sourcemaps.write('.')))
		.pipe(gulp.dest(buildDir))
		.on("end",()=>{
			fs.writeFileSync(buildDir+"/build.date",new Date());
			callback();
		})
});

function ProcessFiles(stream) {
    var error = null;
    function Error(err) {
		HandleError(err);
		buildTmpError = err;
		this.emit("end");
    }
	return stream
		.pipe(gulpif(mapExtensions,gulpif(dev,sourcemaps.init())))
		.pipe(gulpif('*.ejs',ejs(ejsData)))
		.pipe(rename(function(filePath) {
			if(filePath.extname==".ejs")
				filePath.extname = "";
		}))
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
        .on("error",Error)
		.pipe(gulpif(dev,sourcemaps.write('.')))
        .on("error",Error)
}

gulp.task("build-tmp-src",function() {
	buildTmpError = null;
	return ProcessFiles(gulp.src([srcDir+"/**/*"]))
		.pipe(gulp.dest(buildTmpAddonDir))
		;
});

gulp.task("build-tmp-src-mod",function() {
	buildTmpError = null;
	return ProcessFiles(gulp.src([srcModDir+"/**/*"]))
		.pipe(gulp.dest(buildTmpModDir))
		;
});

gulp.task("build-tmp-install",function() {
	return gulp.src(prjDir+'/package.json')
		.pipe(gulp.dest(buildTmpDir))
  		.pipe(install());
});

gulp.task("build-tmp-weh",function() {
	return ProcessFiles(gulp.src(__dirname+"/src/**/*"))
		.pipe(gulp.dest(buildTmpWehDir));
});

gulp.task("make-i86n-keys",function(callback) {
	var keys = {};
	fs.readdir(locDir,(err,files) => {
		if(err)
			throw err;
		var promises = files.map((lang) => {
			return new Promise((resolve,reject)=>{
				fs.readFile(path.join(locDir,lang,"messages.json"),(err,content)=>{
					if(err)
						return reject(err);
					try {
						var messages = JSON.parse(content);
						Object.keys(messages).forEach((key)=>{
							keys[key] = 1;
						});
						resolve();
					} catch(e) {
						reject(e);
					}
				});
			});
		});
		Promise.all(promises)
			.then(()=>{
				var stream = source('weh-i18n-keys.js');
				stream.end('module.exports = ' + JSON.stringify(keys,null,4));
				stream
					.pipe(buffer())
					.pipe(gulp.dest(buildTmpModDir))
					.on('end',callback);
			})
			.catch((err)=>{
				throw err;
			});
	});
});

gulp.task("make-build-manifest",function(callback) {
	const buildManifest = {
		prod: !dev,
		buildDate: ""+new Date(),
		buildOptions: ejsData
	};
	const buildManifestCode = "module.exports = "+JSON.stringify(buildManifest,null,4);
	fs.writeFile(buildTmpWehDir+"/weh-build.js",buildManifestCode,(err)=>{
		if(err)
			throw err;
		callback();
	});
});

gulp.task("build",function(callback) {
	return runSequence(
		["build-tmp-src","build-tmp-src-mod","build-tmp-weh","build-locales","make-i86n-keys"],
		["make-build-manifest"],
		["build-tmp-install"],
		["build-final"], 
		callback);
});

gulp.task("watch-locales",function(callback) {
	return runSequence(
		["build-locales","make-i86n-keys"],
		["build-final"], 
		callback);
});

gulp.task("watch-src",function(callback) {
	return runSequence(
		["build-tmp-src","build-tmp-src-mod","build-tmp-weh"],
		["build-tmp-install"],
		["build-final"], 
		callback
		);
});

gulp.task("watch", function() {
	gulp.watch([srcDir+"/**/*",srcModDir+"/**/*","src/**/*",__dirname+"/src/**/*"],["watch-src"]);
	gulp.watch(locDir+"/**/*",["watch-locales"]);
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
		try {
			fs.readFileSync(path.join(srcDir,"manifest.json.ejs"),"utf8");			
		} catch(e) {
	        console.error("Directory",srcDir,"does not contain a valid manifest.json nor manifest.json.ejs file. You may want to init a new weh project first with 'weh init --prjdir my-project'");
			process.exit(-1);
		}
    }

    var tasks = ["clean","build"];
    if(argv["watch"]!==false && dev)
        tasks.push("watch");
    tasks.push(callback);
    runSequence.apply(null,tasks);
});

// create new project
gulp.task("init", function(callback) {
    runSequence("copy-template","build",callback);
});

// get some help
gulp.task("help", function() {
    var help = [
	"weh version "+package.version,
        "usage: gulp [<commands>] [<options>]",
        "",
        "commands:",
        "  build: generate project build",
        "  clean: remove project build recursively",
        "  watch: watch project and build dynamically on changes",
        "  init: generate project from template",
		"  templates: display available templates",
		"",
        "default commands: clean + build + watch",
        "",
        "options:",
        "  --prjdir <dir>: project directory (required for most commands)",
        "  --prod: addon generated for production",
        "  --template <template>: template to be used when creating a new project",
        "  --no-watch: do not generate builds dynamically",
        "  --force: force overwrite output directory",
        "  --onerror <command>: execute a command (like playing a sound) on errors",
		"  --onsuccess <command>: execute a command (like playing a sound) on build success",
		"  --buildpost <string>: if set, the build directory names are appended with '-<value>'",
		"  --ejsdata <name=value>: define variable to be used in EJS preprocessing"
    ];
    console.log(help.join("\n"));
    process.exit(0);
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
	console.info("copying template from",path.join(__dirname,"templates",template,"/**/*"), "to", prjDir);
    gulp.src(path.join(__dirname,"templates",template,"/**/*"))
        .pipe(gulp.dest(prjDir))
        .on("end",callback);
});

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

'use strict';

const gulp = require("gulp");
const through = require('through2');
const minimatch = require("minimatch");
const concat = require("gulp-concat");
const streamqueue = require('streamqueue');
const glob = require("glob");
const gulpif = require("gulp-if");
const path = require("path");
const gutil = require('gulp-util');
const File = gutil.File;

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
    var subjectString = this.toString();
    if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
      position = subjectString.length;
    }
    position -= searchString.length;
    var lastIndex = subjectString.lastIndexOf(searchString, position);
    return lastIndex !== -1 && lastIndex === position;
  };
}

module.exports = function () {

    var handlers, options;

    if(Array.isArray(arguments[0])) {
        handlers = arguments[0];
        options = arguments[1] || {};
    } else {
        handlers = [{src:"**/*.{js,css}"}];
        options = arguments[0] || {};
    }

    function GetAssetStreams(scripts) {

        var assetStreams = [];
        var fileScriptMap = {};

        scripts.forEach(function(script) {
            if(handlers.every(function(handler) {
                var patterns = handler.src;
                if(!Array.isArray(patterns))
                    patterns = new Array(patterns);
                if(!patterns.every(function(pattern) {
                    var files = glob.sync(pattern);
                    if(!files.every(function(file) {
                        if(file.endsWith(script)) {
                            assetStreams.push(handler.stream && handler.stream(file) || gulp.src(file));
                            fileScriptMap[path.resolve(file)] = script;
                            return false;
                        }
                        return true;
                    }))
                       return false;
                    return true;
                }))
                   return false
                return true;
            }))
                if((options.ignoreMissing || []).indexOf(script)<0)
                    console.warn("gulp-webext-manifest: No handler found for",script);
        });

        return {
            assetStreams: assetStreams,
            fileScriptMap: fileScriptMap
        }
    }

    function ChangeExt(name) {
        while(options.changeExt && (path.extname(name) in options.changeExt))
            name = name.substr(0, name.lastIndexOf(".")) + options.changeExt[path.extname(name)];
        return name;
    }

	return through.obj(function (file, enc, callback) {

        var self = this;
        var processCount = 1;
        var baseDir = path.dirname(file.path);
        var relDir = path.dirname(path.relative(baseDir,file.path));

        function Done() {
            if(--processCount==0)
                callback();
        }

        function HandleAssets(scripts) {
            if(!Array.isArray(scripts))
                scripts = [ scripts ];

            var streamsObj = GetAssetStreams(scripts);
            var streams = streamsObj.assetStreams;
            var fileScriptMap = {};
            for(var key in streamsObj.fileScriptMap)
                fileScriptMap[ChangeExt(key)] = ChangeExt(streamsObj.fileScriptMap[key]);

            if(options.noconcat)
                processCount += streams.length;
            else
                processCount++;

            streamqueue.apply(null,[{objectMode:true}].concat(streams))
                .on("error",function(err) {
                    console.info("gulp-webext-manifest got an error");
                    self.emit("error",err);
                    this.emit("end");
                })
                .pipe(gulpif(!options.noconcat,concat(bundle)))
                .pipe(through.obj(function(file,enc,cb) {
                    var scriptFile = fileScriptMap[file.path];
                    var targetName = path.join(relDir,options.noconcat ? scriptFile : bundle);
                    if(options.map) {
                        var baseName = path.basename(file.path);
                        if(!options.map[baseName])
                            options.map[baseName] = [];
                        if(options.map[baseName].indexOf(targetName)<0)
                            options.map[baseName].push(targetName);
                    }
                    self.push(new File({
                        path: targetName,
                        contents: file.contents
                    }));

                    cb();
                    Done();
                }));

            if(!options.noconcat)
                return [bundle];
            else
                return scripts.map(function(script) {
                    return ChangeExt(script);
                });

        }

        var manifest = JSON.parse(file.contents.toString(enc));

        if(manifest.background && manifest.background.scripts) {
            if(options.background && options.background.initialScripts)
                manifest.background.scripts = options.background.initialScripts.concat(manifest.background.scripts);
            var bundle = options.background && options.background.target || "background/background.js";
            manifest.background.scripts = HandleAssets(manifest.background.scripts,bundle);
        }

        if(Array.isArray(manifest.content_scripts))
            manifest.content_scripts.forEach(function(cs,index) {
                if(Array.isArray(cs.js)) {
                    var bundle = options.content && options.content[index] && options.content[index].js_target ||
                        "content/content-script-"+index+".js";
                    manifest.content_scripts[index].js = HandleAssets(cs.js,bundle);
                }
                if(Array.isArray(cs.css)) {
                    var bundle = options.content && options.content[index] && options.content[index].css_target ||
                        "content/content-style-"+index+".css";
                    manifest.content_scripts[index].css = HandleAssets(cs.css,bundle);
                }
            });


        var appBasePath = path.dirname(file.path);
		var cwd = process.cwd();
        process.chdir(appBasePath);

        this.push(new File({
            path: file.path,
            contents: Buffer.from(JSON.stringify(manifest,null,2))
        }));

        process.chdir(cwd);

        Done();
    });
}


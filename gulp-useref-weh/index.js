/*
 * gulp-useref-weh
 *
 * @summary an integration of useref into gulp, solves some gulp-useref issues
 * @author Michel Gutierrez
 * @link https://github.com/mi-g/weh
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const useref = require("./useref");
const es = require('event-stream');
const through = require('through2');
const minimatch = require("minimatch");
const glob = require("glob");
const gulp = require("gulp");
const debug = require("gulp-debug");
const concat = require("gulp-concat");
const gulpif = require("gulp-if");
const streamqueue = require('streamqueue');
const path = require("path");
const gutil = require('gulp-util');
const File = gutil.File;

module.exports = function () {

    var handlers, options;

    if(Array.isArray(arguments[0])) {
        handlers = arguments[0];
        options = arguments[1] || {};
    } else {
        handlers = [{src:"**/*.{js,css}"}];
        options = arguments[0] || {};
    }

    return through.obj(function (file, enc, callback) {

        var self = this;
        var output = useref(file.contents.toString(),{
            noconcat: !!options.noconcat,
            changeExt: options.changeExt
        });
        var outputHTML = output[0];
        var allAssets = output[1];
        var processCount = 1;
        var errorEmitted = false;

		var cwd = process.cwd();
        var baseDir = path.dirname(file.path);
        if(options.base)
            baseDir = options.base;
        process.chdir(baseDir);
        this.push(new File({
            path: file.path,
            contents: Buffer.from(outputHTML)
        }));
        process.chdir(cwd);
        var relDir = path.dirname(path.relative(baseDir,file.path));

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
                            if(minimatch(file,script,{matchBase:true})) {
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
                    console.warn("gulp-useref-weh: No handler found for",script);
            });

            return {
                assetStreams: assetStreams,
                fileScriptMap: fileScriptMap
            }
        }

        function Done() {
            if(--processCount==0)
                callback();
        }

        function ChangeExt(name) {
            while(options.changeExt && (path.extname(name) in options.changeExt))
                name = name.substr(0, name.lastIndexOf(".")) + options.changeExt[path.extname(name)];
            return name;
        }

        for(var type in allAssets) {
            for(var oName in allAssets[type])
                (function(oName) {
                    var streamsObj = GetAssetStreams(allAssets[type][oName].assets);
                    var streams = streamsObj.assetStreams;
                    var fileScriptMap = {};
                    for(var key in streamsObj.fileScriptMap)
                        fileScriptMap[ChangeExt(key)] = ChangeExt(streamsObj.fileScriptMap[key]);

                    if(options.noconcat)
                        processCount+=streams.length;
                    else
                        processCount++;

                    streamqueue.apply(null,[{objectMode:true}].concat(streams))
                        .on("error",function(err) {
                            self.emit("error",err);
                            this.emit("end");
                        })
                        .pipe(gulpif(!options.noconcat,concat(oName)))
                        .pipe(through.obj(function(file,enc,cb) {
                            var scriptFile = fileScriptMap[file.path];

                            self.push(new File({
                                path: options.noconcat ? path.join(relDir,scriptFile) : oName,
                                contents: file.contents
                            }));

                            cb();
                            Done();
                        }));
                })(oName);
        }

        Done();
    });

}

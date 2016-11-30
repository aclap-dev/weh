#!/usr/bin/env node

var spawn = require("child_process").spawn;

var cwd = process.cwd();
process.chdir(__dirname);

var gulpBin = process.platform=="win32" ? "gulp.cmd" : "gulp";
var cmd = spawn(gulpBin, process.argv.slice(2) , {
    env: Object.assign({},process.env,{
        wehCwd: cwd
    })
});

cmd.stdout.on('data', function(data) {
    process.stdout.write(data);
});

cmd.stderr.on('data', function(data) {
    process.stderr.write(data);
});

cmd.on('close', function(code) {
    process.exit(code);
});

#  [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-url]][daviddm-image]

> gulp plug-in manages properties in manifest for Chrome Apps or Extensions.

## Getting Started

The plug-in generates stream of files according to file list in manifest. Follow up, You can get a new manifest that has newer properties has been removed or modified for production version. 

## Install

```sh
$ npm install --save gulp-chrome-manifest
```

## Usage

```js
var manifest = require('gulp-chrome-manifest');
gulp.task('default', function() {
	return gulp.src('fixtures/manifest.json')
		.pipe(manifest({
			buildnumber: true,
			exclude: [
			  'key'
			],
			background: {
				target: 'scripts/background.js',
				exclude: [
					'scripts/not-exist-test-script1.js',
					'scripts/willbe-remove-only-for-debug.js',
					'components/jquery/jquery.min.js',
				]
			}
		}))
		.pipe(gulpif('*.css', cssmin()))
		.pipe(gulpif('*.js', sourcemaps.init()))
		.pipe(gulpif('*.js', uglify()))
		.pipe(gulpif('*.js', sourcemaps.write()))
		.pipe(gulp.dest('.tmp'));
});
```

## Options

### buildnumber

Auto-increment version in manifest. Can be:

- `true`: Increase build number
- `false` or `undefined`: Do not increase build number
- `String`: Update version as passed value. version should be in [this format](http://developer.chrome.com/apps/manifest/version)

### exclude 

Exclude fields from source manifest.json. Using `exclude`, If there is fields what you want to prevent to publish.

### background

Concatenate scripts in `background.scripts` or `app.background` of manifest for uglify / minify / sourcemap

- target: `String`, Set new background script path for concatenated
- exclude: `Array`, exclude script in `background.scripts` or `app.background` of manifest

## License

MIT © [Jimmy Moon](http://ragingwind.me)

[npm-url]: https://npmjs.org/package/gulp-chrome-manifest
[npm-image]: https://badge.fury.io/js/gulp-chrome-manifest.svg
[travis-url]: https://travis-ci.org/ragingwind/gulp-chrome-manifest
[travis-image]: https://travis-ci.org/ragingwind/gulp-chrome-manifest.svg?branch=master
[daviddm-url]: https://david-dm.org/ragingwind/gulp-chrome-manifest.svg?theme=shields.io
[daviddm-image]: https://david-dm.org/ragingwind/gulp-chrome-manifest

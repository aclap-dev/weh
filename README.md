# weh

**weh** stands for *WebExtensions Helper*.

This toolkit speeds up browser add-ons development by providing a number of facilities for WebExtensions-based (Firefox, Chrome, Opera and Edge) extensions.

This is not a framework in the sense that the developer does not have to embrace all the provided utilities and there is not many architectural constraints to follow in order to take benefit of the tool.

The build system generates automatically a directory you can directly install into your browser, compiling
automatically CoffeeScript, TypeScript and JSX to Javascript, Sass, Less and Stylus to CSS.

**weh** also provides some libraries that goes into your addon to ease a number of common tasks like managing preferences and two-way communications between the extension background and its user interface content pages, 
providing a way for the end-user to customize any string in the add-on user interface. Developing the user interface using ReactJS is also simplified but you may choose 
not to use this library.

In addition, an inspector application (under the form of a **weh**-based extension) is provided to monitor other **weh** extensions in real-time.

**weh**-generated extensions are compatible with Firefox, Chrome, Opera and Edge. You should of course maintain this compatibility in the code you add to your project.

## install from npm

```
npm install -g weh gulp
```

### testing installation

```
weh init --prjdir myextension
```

You can now install your skeleton extension from the `myextension/build` directory as described 
[here](#install-local).

## install from github

```
npm install -g gulp
git clone https://github.com/mi-g/weh.git
cd weh
npm install
npm link
```

You can now move away from the *weh* directory.

## using weh

To create a new extension project:

```
weh init --prjdir myextension
```

You now have a `myextension` folder. The `myextension/src` sub-directory is the place where your add-on specific
code goes. After running `weh init`, the directory contains a simple skeleton code that demonstrates preferences edition. This code is to be modified
to do what your extension is supposed to do.
The `myextension/build` contain an add-on ready to be installed into your browser.

To build and maintain the add-on:

```
cd myextension
weh
```

You will notice that the last `weh` command does not return. It is in watch mode, meaning whenever you make a change into the `myextension/src`
directory, those changes are rebuild into `myextension/build`. If you do not want this behavior and prefer running the build command manually,
add `--no-watch` to the command line.

Run `weh help` to see more command line options.

## <a name="install-local"></a>installing a local add-on into the browser

- on ***Firefox***: visit `about:debugging`, click *Load Temporary Addon*, select the `myextension/build/manifest.json` file
- on ***Chrome***: visit `chrome://extension`, check *Developer mode*, click *Load unpacked extension*, select the `myextension/build` directory
- on ***Opera***: visit `about:extension`, click *Developer mode*, *Load unpacked extension*, select `myextension/build` directory
- on ***Edge***: (tested with insider *Edge version 39.14959*) click the 3 dots icon at the top right, select *Extensions*, click *Load extension*, select `myextension/build` directory 

## extension directory structure

**weh** expects all project-specific code to be put into the `src` sub-directory:

- `src/manifest.json`: your add-on's manifest
- `src/**/*`: those files are processed, so resources like js and css (and other supported languages) are learned and processed to the build directory.
- `src-modules/**/*`: files here are used to resolve dependencies
- `locales`: files are copied to `build/_locales`

Also note that you can change the `src` directory by specifying a directory path with the `--srcdir` option.

## accessing weh services

Declaring `weh` from a background script: `const weh = require('weh-background');`
From a content script: `const weh = require('weh-content');`
From a web worker: `const weh = 

You can then access a number of services from the `weh` variable:

- `weh.rpc`: making function calls (both ways) through various components completely transparent: beetwen background and content, background and workers, background and native apps, background and injected-content
- `weh.prefs`: preferences system
- `weh.i18n`: translation system
- `weh.ui`: content management from background utilities

## multi-language support

*Weh* obviously supports Javascript (`.js` file extension) for scripts and Cascading Style Sheets (`.css` extension), but you can also use other languages:

- scripts: *JSX* (`.jsx`), *Typescript* (`.ts`), *Coffee* (`.coffee`)
- styling: *Sass* (`.scss`), *Less* (`.less`), *Stylus* (`.styl`)

## pre-processing files

All files with a `.ejs` are processed first by an *EJS* processor. For instance, a file named `myscript.js.ejs` will
be transformed to `myscript.js` before being processed. You can specify one or several JSON files to provide data 
for the EJS resolution using the `--ejsdata` option.

The EJS pre-processing occurs in a first place, so a file named `myscript.ts.ejs` will first be EJS-processed, then
compiled using Typescript, and will endup in the build directory as `myscript.js`.

Any text file in the `src` directory can be processed with EJS, not only js and css-like.

Pre-processing is useful if you want to generate different builds from the same source code.

## using weh libraries

### weh preferences

Preferences are to be formally defined in order to be used in your add-on. An example of preferences description could be:
```js
weh.prefs.declare([{
    name: "myparam_string",
    type: "string",
    defaultValue: "Default value",
    maxLength: 15,
    regexp: "^[a-zA-Z ]+$"
},{
    name: "myparam_integer",
    type: "integer",
    defaultValue: 42,
    minimum: -10,
    maximum: 100
},{
    name: "myparam_float",
    type: "float",
    defaultValue: 3.14159,
    minimum: 1.5,
    maximum: 10.8
},{
    name: "myparam_boolean",
    type: "boolean",
    defaultValue: true
},{
    name: "myparam_choice",
    type: "choice",
    defaultValue: "second",
    choices: [{
        name: "First choice",
        value: "first"
    },{   
        name: "Second choice",
        value: "second"
    },{   
        name: "Third choice",
        value: "third"
    }]
}]);
```
For each parameter, you must provide at least `name`, `type` and `defaultValue`. `type` must be one of `string`, `integer`, `float`, `boolean` or
`choice`. A specific preference parameter can then be accessed, as read or write, through `weh.prefs["parameter name"]`.

You can install preferences listeners using `weh.prefs.on(whatToWatch,callback)` and uninstall listeners using `weh.prefs.off` with the same parameters. `whatToWatch` uses a dotted notation. For instance, listening to `""`, `"a"`, `"a.b"` or `"a.b.c"` will trigger the callback whenever
parameter `a.b.c` is modified. Note that the preferences listeners are available from both background and local content.

You should also define a couple of human viewable strings associated to each parameter in `locales/<locale>/messages.json`:
- `weh_prefs_label_<parameter name>` defines a label for the parameter
- `weh_prefs_description_<parameter name>` defines an optional longer description for this parameter

Example (`locales/en_US/messages.json`):
```js
    "weh_prefs_label_myparam_string": {
        "message": "String parameter"
    },
    "weh_prefs_description_myparam_string": {
        "message": "Only letters and spaces, 20 characters max"
    },
```

You can define a number of constraints to your preferences. This is useful with the settings user interface provided by *weh*.
- `maxLength`: (type `string`, `integer` and `float`) the number of characters in the input
- `regexp`: (type `string`) a regular expression the string must match
- `minimum`: (type `integer` and `float`) the minimum acceptable value
- `maximum`: (type `integer` and `float`) the maximum acceptable value
- `choices`: (type `choice`) the set of possible choices to appear in a select input. This is array of either:
    - object containing fields `value` (the actual preference value) and `name` (what is to be displayed to the user)
    - string representing the actual preference value. The label to be displayed for this choice is searched in `locales/<locale>/messages.json` as `weh_prefs_label_<parameter name>_option_<parameter value>`

Note that the preferences definition can be declared or updated at any time. This is useful if, for instance, you don't the list of choices in advance.

*weh* takes care of adding/removing the listener when the component is mounted/unmounted and delivering the message to the `onWehMessage` method.

## debugging tools

The *weh* toolkit includes an extension called *weh-inspector* which allows to:
- monitor messages between the background and UI
- read/write addon preferences
- read add-on storage

The *weh-inspector* is available as a template in the *weh* toolkit. As such, you can install it with `weh init --template inspector --prjdir inspector` and then load the generated extension into the browser like any regular weh addon.

## i18n

*weh* provides some utilities for dealing with locales.

Instead of `browser.i18n.getMessage()`, you should use `weh._()`, with the same parameters:
- it's shorter
- it automatically turns character `'-'` into `'_'` in string tags while leaving a warning in the console
- more important: it allows overwriting some or all locale strings. Whenever a call is made to `weh._()`, the library first searches for a storage-based translation for this tag. If not found, it uses the default string defined in `_locales/<locale>/messages.json`. By default, *weh* provides a user interface page for the user to edit locale strings. It is up to the add-on developer to write the code to centralize the user-generated translations on a server, so that it can be shared amongst all users.

## rpc

*weh* provides an easy way to call functions across components that do not run within the same threads.

All the functions return promises. If a declared function returns something other than a Promise object, *weh* takes of promisifying the returned value.

Functions are declared on the called side using `weh.rpc.listen()` and are called with `weh.rpc.call()`.

For instance, the background can define a function like this:
```js
weh.rpc.listen({
	my_function: (a,b) => {
		return a + b;
	}
})
```

and a content script can call the function this way:
```js
weh.call("my_function",39,3)
	.then((result)=>{
		console.info("=",result);
	});
```

`weh.rpc.listen()` can declare several functions at once, and can be called several times: only function with the same name are overwritten.

When using the `weh.ui` module to create a content, for instance creating a tab, a name is given to this content, for instance `settings`. When the background wants to call a function declared within this content, it must use the content name as the first parameter: `weh.rpc.call("settings","my_function",39,3);

If the called function does not exists, throw an exception or return explicitly a failed promise the returned promise is rejected.

## native messaging

*weh* is also very useful when dealing with native messaging.

```js
var nativeApp = require('weh-natmsg')("com.example.myapp");

nativeApp.call("my_function",...params)
	.then((result)=>{
		// do something
	})
	.catch((err)=>{
		// handle error
	})
```

You can catch all errors due to the native app not being installed (or at least not being callable):
```js
nativeApp.onAppNotFound.addListener((err)=>{
	// for instance, open a tab to a site where to download the app
})
```

You can just check whether the app is present, without triggering the `onAppNotFound()` if it is not:
```js
nativeApp.callCatchAppNotFound((err)=>{
	// this is called if the app could not be launched
},"my_function",...params);
```

On the native app side, assuming it is developed on node.js, you can use the exact same rpc mechanism, using `rpc.listen()` and `rpc.call()` to communicate both ways with the add-on. 

For now, the only implementation of such a native is available on the [`vdhcoapp` project](https://github.com/mi-g/vdhcoapp) under GPL-2.0 license. It is planned to release a version using a less restrictive license.

## UI utilities

`weh.ui` provides the ability to open a tab or a panel, so that the created content can directly be callable from the background using `weh.rpc`.

```js
weh.ui.open("some_name",{
	url: "content/content.html",
	type: "tab"
});
weh.rpc.call("some_name","my_content_function",...params);
```

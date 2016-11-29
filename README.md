# weh

**weh** stands for *WebExtensions Helper*.

This tool speeds up browser add-ons development by providing a workflow that generates automatically a build extension directory
you can directly install into your browser.

**weh** also provides source code that goes into your addon to ease a number of common tasks like managing preferences and two-way communications between the extension background and its user interface content pages. Developing the user interface using ReactJS is simplified but you may choose 
not to use this library.

**weh**-generated extensions are compatible with Firefox, Chrome, Opera and Edge. You should of course maintain this compatibility in the code you add to your project.

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
directory, those changes are rebuild into `myextension/build`. If you do not want this behaviour and prefer running the build command manually,
add `--no-watch` to the command line.

Run `weh help` to see more command line options.

## installing a local add-on into the browser

- on ***Firefox***: visit `about:debugging`, click *Load Temporary Addon*, select the `myextension/build/manifest.json` file
- on ***Chrome***: visit `chrome://extension`, check *Developer mode*, click *Load unpacked extension*, select the `myextension/build` directory
- on ***Opera***: visit `about:extension`, click *Developer mode*, *Load unpacked extension*, select `myextension/build` directory
- on ***Edge***: (tested with insider *Edge version 39.14959*) click the 3 dots icon at the top right, select *Extensions*, click *Load extension*, select `myextension/build` directory 

## extension directory structure

**weh** expects all project-specific code to be put into the `src` sub-directory:

- `src/manifest.json`: your add-on's manifest
- `src/**/*.html`: those files are processed, so resources like js and css (and other supported languages) are learned and
processed to the build directory.
- `src/locales`: files are copied to `build/_locales`
- `src/manifest.json`: file is copied to `build`
- `src/**/_assets/`: files and directories are processed (for language compilation) and copied to the build directory 
(without the `_assets` part)
- `etc/jsbanner.txt`: file that you can optionnally create to setup a header in the JS files.

Note that a `.js` or `css` file that would be located in `src/` but not referenced from `manifest.json` nor any `.html`
file won't be copied to the build directory. If you want this file in the build, you must put it in a `_assets`
sub-directory of `src/`.

Also note that you can change the `src` directory by specifying a directory path with the `--srcdir` option.

## defining resources

You don't need to do anything special to make *weh* background libraries available to your add-on. Just declare your own modules in  `manifest.json`:

```
   "background": {
        "scripts": [
            "background/main.js"
        ]
    }
```

When the add-on is built, *weh* background modules will be added automatically. If the `--prod` option is provided, *weh* and custom files
will be concatenated and minified.

Content scripts and styles included in `manifest.json`are processed the same way:
```
   "content_scripts": [{
        "js": [ "script1.js", "script2.js" ],
        "css": [ "style1.css", "style2.css" ]
    }]
```

For content files, you must load a number of scripts and styles into your HTML files. For instance:
```
<!DOCTYPE html>
<html>
    <head>
        <!-- build:css settings.css -->
        <link href="vendor/bootstrap.css" type="text/css" rel="stylesheet">
        <link href="myextension-ui.css" type="text/css" rel="stylesheet">
        <!-- endbuild -->
    </head>
    <body class="container-fluid">
        <div id="root"></div>
        <!-- build:js vendor-bundle.js -->
        <!-- weh:js weh-all -->
        <!-- endbuild -->

        <!-- build:js myextension-ui.min.js -->
        <script src="myextension-ui.js"></script>
        <!-- endbuild -->
    </body>
</html>
```

When the extension is built, `<!-- weh:js weh-all -->` is first replaced by weh scripts inclusion. Then, the sections between
`<!-- build:type file -->` and `<!-- endbuild -->` are processed to be concatenated into a single file (per section) and minified
if you specify the `--prod` for production mode.

## multi-language support

*Weh* obviously supports Javascript (`.js` file extension) for scripts and Cascading Style Sheets (`.css` extension),
but you can also use other languages:

- scripts: *JSX* (`.jsx`), *Typescript* (`.ts`), *Coffee* (`.coffee`)
- styling: *Sass* (`.scss`), *Less* (`.less`), *Stylus* (`.styl`)

Whether in `manifest.json`or `.html` files, just use the file as if it was Javascript or CSS:
```
        <!-- build:css settings.css -->
        <link href="my-styles.scss" type="text/css" rel="stylesheet">
        <link href="my-styles2.less" type="text/css" rel="stylesheet">
        <!-- endbuild -->
        ...
        <!-- build:js myextension-ui.min.js -->
        <script src="myextension-ui.jsx"></script>
        <script src="myextension-ui2.ts"></script>
        <!-- endbuild -->
```

*Weh* will then take care of calling the appropriate processors and renaming the files inside `manifest.json` and
`.html` files, so that the browser will be able to run this code.

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
```
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
parameter `a.b.c` is modified. Note that the preferences listeners are only available from the background in this version.

You should also define a couple of human viewable strings associated to each parameter in `locales/<locale>/messages.json`:
- `weh_prefs_label_<parameter name>` defines a label for the parameter
- `weh_prefs_description_<parameter name>` defines an optional longer description for this parameter

Example (`locales/en_US/messages.json`):
```
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
- `choices`: (type `choice`) the set of possible choices to appear in a select input. This is array of objects containing fields `value` (the
actual preference value) and `name` (what is to be displayed to the user)

Note that the preferences definition can be declared or updated at any time. This is useful if, for instance, you don't the list of choices
in advance.

From the content side, you should create an HTML file in your source code to represent the settings page:
```
<!DOCTYPE html>
<html>
    <head>
        <!-- build:css settings.css -->
		<link href="bootstrap.css" type="text/css" rel="stylesheet">
		<link href="styles.css" type="text/css" rel="stylesheet">
        <!-- endbuild -->
    </head>
    <body class="container-fluid">
        <div id="root"></div>

        <!-- build:js vendor-bundle.js -->
        <!-- weh:js weh-all -->
        <!-- endbuild -->

        <!-- build:js settings-bundle.js -->
        <script src="settings.jsx"></script>
        <!-- endbuild -->

    </body>
</html>
```

And a settings JSX file like this:
```
function Prefs() {
    return (
        <WehParams>
            <WehVersion/>
            <WehParamSet wehPrefs={["myparam_string","myparam_integer","myparam_float","myparam_boolean","myparam_choice"]}>
                <WehParam/>
            </WehParamSet>
        </WehParams>
    )
}

ReactDOM.render (
    <div>
        <h1 className="text-center">{weh._("settings")}</h1>
        <br/>
        <Prefs/>
    </div>,
    document.getElementById('root')
)
```

*weh* will automatically create a dynamic form to allow modifying settings based on the preferences definition.

### weh user interface

*weh* simplifies communications between background and content by handling automatically the message ports.

Let's see an example (`src/background/main.js`):
```
weh.ui.update("default",{
    onMessage: function(message) {
        switch(message.type) {
            case "open-settings":
                weh.ui.close("default");
                weh.ui.open("settings");
                break;
        }
    }
});

weh.ui.update("settings",{
    type: "tab",
    contentURL: "content/settings.html",
});
```

Here we defined 2 user interface pages. The first one has a special name `default` meaning this is the popup declared in `manifest.json`. When
this popup sends a message with the `type` field equal to `open-settings`, a tab is opened to URL `content/settings.html`. If a tab is already
open to this URL, it is activated instead.

In the content popup code, when the *Setting* button/link is pressed, we just do: 
```
    weh.post({
        type: "open-settings"
    });
```

To send asynchronous messages to the content pages, just do:

```
    weh.ui.post(panelName,message)
```

Where `panelName` is the name of a page your previously defined with `weh.ui.update` and `message` is any JSONizable javascript object.

You can also call `weh.ui.post(message)` to send the same message to all open pages.

When defining a content page, you can, in addition to catching messages with `onMessage`, define callbacks for page opening with `onShow` or closing 
with `onHide`.

The callback parameters are:
- `onMessage(message,postFn,panelName)` with `message` is the object sent from the content, `postFn` a function that can be used to send back messages directly and `panelName` the name of the panel (as defined in `weh.ui.update`) that sent the message. So doing `postFn({...})` is equivalent to `weh.ui.post(panelName,{...})`.

From the content side, you can listen for incoming background messages with `weh.on(callback)` and `weh.off(callback)` to remove the listerner.

If you go for ReactJS for building your user interface, you can defines components like this:
```
class MyComponent extends React.Component {
    constructor(props) {
        super(props);
        weh.react.attach(this,this.onWehMessage);
    }
    onWehMessage(message) {
        /* do something wxith the incoming message */
    }
}
```

*weh* takes care of adding/removing the listener when the component is mounted/unmounted and delivering the message to the `onWehMessage` method.

## debugging tools

The *weh* toolkit includes an extension called *weh-inspector* which allows to:
- monitor messages between the background and UI
- read/write addon preferences
- read add-on storage

As of now, this tool is only available on Chrome and Opera, as Firefox currently lacks some APIs for the tool to operate.

The *weh-inspector* is available as a template in the *weh* toolkit. As such, you can install it with `weh init --template weh-inspector --prjdir weh-inspector` and then load the generated extension into the browser like any regular weh addon.

## i18n

*weh* provides some utilities for dealing with locales.

Instead of `browser.i18n.getMessage()`, you should use `weh._()`, with the same parameters:
- it's shorter
- it automatically turns character `'-'` into `'_'` in string tags while leaving a warning in the console
- more important: it allows overwriting some or all locale strings. Whenever a call is made to `weh._()`, the library first searches for a storage-based translation for this tag. If not found, it uses the default string defined in `_locales/<locale>/messages.json`. By default, *weh* provides a user interface page for the user to edit locale strings. It is up to the add-on developer to write the code to centralize the user-generated translations on a server, so that it can be shared amongst all users.


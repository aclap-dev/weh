# weh

**weh** stands for *WebExtensions Helper*.

This is a tool that speeds up browser add-ons development by providing a workflow that generates automatically a build extension directory
that you can directly install into your browser.

**weh** also provides source code that goes into your addon to make easier a number of common tasks like managing preferences and two-way communications between the extension background and its user interface content pages. Developing the user interface using ReactJS is simplified but you may choose 
not to use this library.

**weh**-generated extensions are compatible with Firefox, Chrome, Opera and Edge. You should of course maintain this compatibility in the code you add to your project.

## install

```
npm install -g gulp
git clone https://github.com/mi-g/weh.git
cd weh
npm install
```

## using weh

Create a new extension project:

```
gulp init --prjdir ../myextension
```

You now have, next to your `weh` directory, a `myextension` folder. The `myextension/src` sub-directory is the place where your add-on specific
code goes. After running `gulp init`, the directory contains a simple skeleton code that demonstrates preferences edition. This code is to be modified
to do what your extension is supposed to do.

```
gulp --prjdir ../myextension
```

`myextension` now has a sub-directory `build` ready to be installed into your browser.

You will notice that the last `gulp` command does not return. It is in watch mode, meaning whenever you make a change into the `myextension/src`
directory, those changes are rebuild into `myextension/build`. If you do not want this behaviour and prefer running the build command manually,
add `--no-watch` to the command line.

Run `gulp help` to see more command line options.

## installing a local add-on into the browser

- on ***Firefox***: visit `about:debugging`, click *Load Temporary Addon*, select the `myextension/build/manifest.json` file
- on ***Chrome***: visit `chrome://extension`, check *Developer mode*, click *Load unpacked extension*, select the `myextension/build` directory
- on ***Opera***: visit `about:extension`, click *Developer mode*, *Load unpacked extension*, select `myextension/build` directory
- on ***Edge***: (tested with insider *Edge version 39.14959*) click the 3 dots icon at the top right, select *Extensions*, click *Load extension*, select `myextension/build` directory 

## extension directory structure

**weh** expects all project-specific code to be put into the `src` sub-directory:

- `src/background/`: the code that runs into your extension background. *.js* files are copied to `build/background`
- `src/content/`: the code to be run as content, into an add-on-controlled panel or tab. *.js* files are copied to the `build/content` 
directory, *.jsx* file are processed with a *JSX* processor to generate *.js* files. *.scss* files are compiled to *.css*. *.html* and *.css* files
- `src/content/assets`: all files and directory from there are copied verbatim to `build/content` (without the `assets` part). Make sure not to have a 
same *.js* or ".css* file name into both `src/content` and `src/content/assets` to prevent conflicts
- `src/locales`: files are copied to `build/_locales`
- `src/manifest.json`: file is copied to `build`
- `src/assets/`: files and directory are copied verbatim (without the `assets` part)


## using weh libraries

In order to make *weh* background libraries available to your add-on, add `background/weh-bg.js` into the background scripts of `manifest.json`.
For instance:

```
   "background": {
        "scripts": [
            "background/weh-bg.js",
            "background/main.js"
        ]
    }
```

For content files, you must load a number of scripts and styles into your HTML files. For instance:
```
<!DOCTYPE html>
<html>
    <head>
        <link href="vendor/bootstrap.css" type="text/css" rel="stylesheet">
        <link href="myextension-ui.css" type="text/css" rel="stylesheet">
    </head>
    <body class="container-fluid">
        <div id="root"></div>
        <script src="vendor/react.js"></script>
        <script src="vendor/react-dom.js"></script>
        <script src="weh-ct.js"></script>
        <script src="weh-ct-react.js"></script>
        <script src="myextension-ui.js"></script>
    </body>
</html>
```

Note that you do not have to provide vendor libraries *ReactJS* and *Bootstrap* as they are automatically installed by *weh* (unless you specify not to with command line arguments `--no-react` and `--no-bootstrap`)

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
        <link href="vendor/bootstrap.css" type="text/css" rel="stylesheet">
        <link href="styles.css" type="text/css" rel="stylesheet">
    </head>
    <body class="container-fluid">
        <div id="root"></div>
        <script src="vendor/react.js"></script>
        <script src="vendor/react-dom.js"></script>
        <script src="weh-ct.js"></script>
        <script src="weh-ct-react.js"></script>
        <script src="settings.js"></script>
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
        wehReactAttach(this,this.onWehMessage);
    }
    wehReactAttach(message) {
        /* do something wxith the incoming message */
    }
}
```

*weh* takes care of adding/removing the listener when the component is mounted/unmounted and delivering the message to the `wehRectAttach` method.

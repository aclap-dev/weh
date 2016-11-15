
(function(window) {
    
    window.browser = window.browser || window.chrome;

    var weh = require("./weh-core.js");
    window.weh = weh;
    weh.prefs = require("./weh-prefs.js");
    weh.ui = require("./weh-ui.js");
    weh.ajax = require("./weh-ajax.js");
    
})(this || window);


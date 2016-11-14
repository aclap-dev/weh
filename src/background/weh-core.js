
if(typeof browser == "undefined" && typeof chrome !== "undefined" && chrome.runtime) {
    if(/\bOPR\//.test(navigator.userAgent))
        exports.browserType = "opera";
    else
        exports.browserType = "chrome";
} else if(/\bEdge\//.test(navigator.userAgent))
    exports.browserType = "edge";
else
    exports.browserType = "firefox";

exports.is = function() {
    for(var i=0; i<arguments.length; i++)
        if(arguments[i]==exports.browserType)
            return true;
    return false;
}

exports._ = browser.i18n.getMessage;


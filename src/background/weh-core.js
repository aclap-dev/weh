
(function() {

    window.browser = window.browser || window.chrome;
    window.weh = {};

    if(typeof browser == "undefined" && typeof chrome !== "undefined" && chrome.runtime) {
        if(/\bOPR\//.test(navigator.userAgent))
            weh.browserType = "opera";
        else
            weh.browserType = "chrome";
    } else if(/\bEdge\//.test(navigator.userAgent))
        weh.browserType = "edge";
    else
        weh.browserType = "firefox";

    weh.is = function() {
        for(var i=0; i<arguments.length; i++)
            if(arguments[i]==weh.browserType)
                return true;
        return false;
    }

    weh._ = browser.i18n.getMessage;
})();


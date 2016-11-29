/*
 * weh - WebExtensions Help
 *
 * @summary workflow and base code for developing WebExtensions browser add-ons
 * @author Michel Gutierrez
 * @link https://github.com/mi-g/weh
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

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

})();


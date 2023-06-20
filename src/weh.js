/*
 * weh - WebExtensions Helper
 *
 * @summary workflow and base code for developing WebExtensions browser add-ons
 * @author Michel Gutierrez
 * @link https://github.com/mi-g/weh
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

exports.browser = require('webextension-polyfill');

var browserType;
if(typeof browser == "undefined" && typeof chrome !== "undefined" && chrome.runtime) {
        if(/\bOPR\//.test(navigator.userAgent))
            browserType = "opera";
        else
            browserType = "chrome";
    } else if(/\bEdge\//.test(navigator.userAgent))
        browserType = "edge";
    else
        browserType = "firefox";
exports.browserType = browserType;

// Monkey-patching to support MV2 & MV3.
// browser.action is a MV3 features equivalent to MV2' browserAction.
// There doesn't seem to be a path-forward to support that in webextension-polyfill:
// https://github.com/mozilla/webextension-polyfill/issues/329
if (typeof exports.browser.action == "undefined") {
  exports.browser.action = exports.browser.browserAction;
}

exports.isBrowser = (...args) => {
	for(var i=0; i<args.length; i++)
		if(args[i]==exports.browserType)
			return true;
	return false;
}

exports.error = (err) => {
	console.groupCollapsed(err.message);
	if(err.stack)
		console.error(err.stack);
	console.groupEnd();
}

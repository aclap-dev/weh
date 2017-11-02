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

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

const { browser } = require('weh');

var customStrings = {}

const SUBST_RE = new RegExp("\\$[a-zA-Z]*([0-9]+)\\$","g");

function Load() {
	try {
		customStrings = JSON.parse(window.localStorage.getItem("wehI18nCustom")) || {};
	} catch(e) {
		customStrings = {};
	}
}
Load();

function GetMessage(messageName,substitutions) {
	if(/-/.test(messageName)) {
		var fixedName = messageName.replace(/-/g,"_");
		console.warn("Wrong i18n message name. Should it be",fixedName,"instead of",messageName,"?");
		messageName = fixedName;
	}
	var custom = customStrings[messageName];
	if(custom && custom.message.length>0) {
		if(!Array.isArray(substitutions))
			substitutions = [ substitutions ];
		var str = (custom.message || "").replace(SUBST_RE,(ph)=>{
			var m = SUBST_RE.exec(ph);
			if(m)
				return substitutions[parseInt(m[1])-1] || "??";
			else	
				return "??";
		});
		return str;
	}
	return browser.i18n.getMessage.apply(browser.i18n,arguments);
}

module.exports = {
	getMessage: GetMessage,
	reload: Load			
}


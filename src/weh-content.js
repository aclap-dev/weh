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

var weh = require('weh');
var browser = weh.browser;

/* extracting running parameters from URL */
var urlParams = typeof _wehPanelName !== "undefined" && { panel: _wehPanelName } || function () {
	var m = /^([^\?]*)(?:\?(.*))?$/.exec(window.location.href);
	var params = {};
	if (m[2]) m[2].split("&").forEach(function (paramExpr) {
		var terms = paramExpr.split("=");
		params[terms[0]] = decodeURIComponent(terms[1]);
	});
	return params;
}();

if (!urlParams.panel) throw new Error("Panel name not defined in URL");

weh.uiName = urlParams.panel;
var usePrefs = !urlParams.noprefs;

/* setting up RPC */
weh.rpc = require('weh-rpc');
//weh.rpc.setDebug(2);
weh.rpc.listen({
	close: () => {
		window.close()
	}
})

/* connecting communication port with background */
var port = browser.runtime.connect({ name: "weh:" + browser.runtime.id + ":" + weh.uiName });
weh.rpc.setPost(port.postMessage.bind(port));
port.onMessage.addListener((message) => {
	weh.rpc.receive(message, port.postMessage.bind(port));
});

/* notify background app is started */
weh.rpc.call("appStarted", {
		uiName: weh.uiName,
		usePrefs: usePrefs
	}).catch(function (err) {
		console.info("appStarted failed", err);
	});

/* initializing */
let onDOMLoaded = new Promise((resolve, _) => {
  window.addEventListener("DOMContentLoaded", resolve);
});

async function init_prefs() {
  let wehPrefs = require('weh-prefs');
  weh.prefs = wehPrefs;
  let entries = await browser.storage.local.get("weh-prefs");
  let initialPrefs = entries["weh-prefs"] || {};
  wehPrefs.assign(initialPrefs);
  wehPrefs.on("", { pack: true }, (newPrefs, oldPrefs) => {
    weh.rpc.call("prefsSet",newPrefs);
  });
  weh.rpc.listen({ setPrefs: (prefs) => {
    wehPrefs.assign(prefs);
  } });
  let specs = await weh.rpc.call("prefsGetSpecs");
  wehPrefs.declare(specs);
  let all_prefs = await weh.rpc.call("prefsGetAll");
  wehPrefs.assign(all_prefs);
  wehPrefs.forceNotify(false);
}

let pref_promise = Promise.resolve();
if (usePrefs) {
  pref_promise = init_prefs();
}

/* notifies app ready: DOM and prefs, if used, are loaded */
onDOMLoaded.then(pref_promise).then(() => weh.rpc.call("appReady", {
  uiName: weh.uiName
})).then(() => {
  appStarted = true;
  if(triggerRequested) {
    let result = triggerArgs;
    triggerArgs = undefined;
    triggerRequested = false;
    weh.doTrigger(result);
  }
}).catch((err) => {
  console.error("app not ready:",err);
});

var triggerRequested = false;
var triggerArgs = undefined;
var appStarted = false;

weh.doTrigger = function (result) {
	return weh.rpc.call("trigger",weh.uiName,result)
		.catch(()=>{});
}
	
weh.trigger = function (result) {
	if(appStarted)
		return weh.doTrigger(result);
	else {
		triggerArgs = result;
		triggerRequested = true;
	}
}

/* setting up translation */
weh._ = require("weh-i18n").getMessage;

/* utility functions */
weh.copyToClipboard = function (data, mimeType) {
	mimeType = mimeType || "text/plain";
	document.oncopy = function (event) {
		event.clipboardData.setData(mimeType, data);
		event.preventDefault();
	};
	document.execCommand("Copy", false, null);
};
weh.setPageTitle = function (title) {
	var titleElement = document.querySelector("head title");
	if (!titleElement) {
		titleElement = document.createElement("title");
		document.head.appendChild(titleElement);
	} else while (titleElement.firstChild)
		titleElement.removeChild(titleElement.firstChild);
	titleElement.appendChild(document.createTextNode(title));
};

module.exports = weh;

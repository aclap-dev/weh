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
var urlParams = function () {
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
	}).then(function () {
	}).catch(function (err) {
		console.info("appStarted failed", err);
	});

/* initializing */
var readyPromises = [
	new Promise((resolve,reject)=>{
		window.addEventListener("DOMContentLoaded", function () {
			resolve();
		});
		
	})
];

if(usePrefs) {
	let wehPrefs = require('weh-prefs');
	weh.prefs = wehPrefs;
	wehPrefs.assign({});
	wehPrefs.on("", {
		pack: true
	}, function (newPrefs, oldPrefs) {
		weh.rpc.call("prefsSet",newPrefs);
	});
	readyPromises.push(new Promise((resolve,reject)=>{
		weh.rpc.call("prefsGetSpecs")
			.then(function (specs) {
				wehPrefs.declare(specs);
				return weh.rpc.call("prefsGetAll");
			})
			.then((allPrefs)=>{
				wehPrefs.assign(allPrefs);
				wehPrefs.forceNotify(false);
				resolve();
			})
		.catch(reject);
	}));
	weh.rpc.listen({
		setPrefs: (prefs) => {
			wehPrefs.assign(prefs);
		}
	});

}

/* notifies app ready: DOM and prefs, if used, are loaded */
Promise.all(readyPromises)
	.then(()=>{
		return weh.rpc.call("appReady",{
			uiName: weh.uiName
		});
	})
	.catch((err)=>{
		console.error("app not ready:",err);
	});

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

weh.trigger = function (result) {
	return weh.rpc.call("trigger",weh.uiName,result)
		.catch(()=>{});
}

module.exports = weh;
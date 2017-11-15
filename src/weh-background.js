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

var apps = {};

weh.rpc = require('weh-rpc');
//weh.rpc.setDebug(2);
weh.rpc.setUseTarget(true);

weh.rpc.setPost((app,message)=>{
	var appOptions = apps[app];
	if(appOptions)
		appOptions.port.postMessage(message);
	//else
	//	console.warn("Cannot post message to unknown app",app);
});

weh.rpc.listen({
	appStarted: (options) => {
	},
	appReady: (app) => {
	},
	closePanel: (app) => {
		weh.ui.close(app);
	}
});

browser.runtime.onConnect.addListener((port) => {
	var m = /^weh:(.*?):(.*)/.exec(port.name);
	if(!m)
		return;
	port.onMessage.addListener((message) => {
		if(typeof message._method !== "undefined" && (message._method==="appStarted" || message._method==="appReady")) {
			var app = message._args[0] && message._args[0].uiName || null;
			var appOptions = apps[app] || {
				ready: false
			};
			apps[app] = appOptions;
			Object.assign(appOptions,message._args[0],{ port: port });
			if(message._method=="appReady") {
				appOptions.ready = true;
				var wait = waiting[app];
				if(wait && wait.timer) {
					clearTimeout(wait.timer);
					delete wait.timer;
				}
			}
			port._weh_app = app;

		}
		weh.rpc.receive(message,port.postMessage.bind(port),port._weh_app);
	});
	port.onDisconnect.addListener(() => {
		var app = port._weh_app;
		if(app) {
			delete apps[app];
			var wait = waiting[app];
			if(wait) {
				if(wait.timer)
					clearTimeout(wait.timer);
				delete waiting[app];
				wait.reject(new Error("Disconnected waiting for "+app));
			}
		}
	});
});

weh._ = require('weh-i18n').getMessage;
weh.ui = require('weh-ui');

var wehPrefs = require('weh-prefs');
weh.prefs = wehPrefs;

function Hash(str){
	var hash = 0, char;
	if (str.length === 0) return hash;
	for(var i=0; i<str.length; i++) {
		char = str.charCodeAt(i);
		hash = ((hash<<5)-hash)+char;
		hash = hash & hash;
	}
	return hash;
}

function Stringify(object) {
	return JSON.stringify(Object.keys(object).sort().map(function(k) {
		return {
			name: k,
			value: object[k]
		}
	}));
}

function Parse(str) {
	var object = {};
	JSON.parse(str).forEach(function(pair) {
		object[pair.name] = pair.value;
	});
	return object;
}

var lastHash = 0;
var prefs = {};

try {
	var prefsStr = localStorage.getItem("weh-prefs");
	if(prefsStr===null) {
		browser.storage.local.get("weh-prefs")
			.then((result)=>{
				var wePrefs = result["weh-prefs"];
				if(wePrefs)
					wehPrefs.assign(wePrefs);
			})
	} else {
		prefs = Parse(prefsStr);
		lastHash = Hash(prefsStr);
	}
} catch(e) {}

wehPrefs.assign(prefs);
wehPrefs.on("",{
	pack: true
},function(newPrefs,oldPrefs) {
	Object.assign(prefs,newPrefs);
	var prefsStr = Stringify(prefs);
	var hash = Hash(prefsStr);
	if(hash!=lastHash) {
		lastHash = hash;
		localStorage.setItem("weh-prefs",prefsStr);
		browser.storage.local.set({
			"weh-prefs": prefs
		});
	}
	Object.keys(apps).forEach((app)=>{
		var appOptions = apps[app];
		if(appOptions.usePrefs) {
			weh.rpc.call(app,"setPrefs",newPrefs);
		}
	});
});

const waiting = {};

weh.wait = (id,options={}) => {
	var wait = waiting[id];
	if(wait) {
		if(wait.timer)
			clearTimeout(wait.timer);
		delete waiting[id];
		wait.reject(new Error("Waiter for "+id+" overriden"));
	}
	return new Promise((resolve, reject) => {
		waiting[id] = {
			resolve,
			reject,
			timer: setTimeout(()=>{
				delete waiting[id];
				reject(new Error("Waiter for "+id+" timed out"));
			}, options.timeout || 5000)
		}
	});
}

weh.rpc.listen({
	prefsGetAll: () => {
		return wehPrefs.getAll();
	},
	prefsGetSpecs: () => {
		return wehPrefs.getSpecs();
	},
	prefsSet: (prefs) => {
		return wehPrefs.assign(prefs);
	},
	trigger: (id,result) => {
		var wait = waiting[id];
		if(!wait)
			throw new Error("No waiter for",id);
		if(wait.timer) {
			clearTimeout(wait.timer);
			delete wait.timer;
		}
		delete waiting[id];
		wait.resolve(result);
	}
});


module.exports = weh;

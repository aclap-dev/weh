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
var wehRpc = require('weh-rpc');

var browser = weh.browser;
var panels = {};
var tabs = {};

function Open(name,options) {
	switch(options.type) {
		case "panel":
			return OpenPanel(name,options);
			break;
		case "tab":
		default:
			return OpenTab(name,options);
	}
}

function OpenTab(name,options) {
	return new Promise((resolve, reject) => {
		var url = browser.extension.getURL(options.url+"?panel="+name);
		GotoTab(url)
			.then(function(foundTab) {
				if(!foundTab)
					browser.tabs.create({
							url: url,
						})
						.then(function(tab) {
							panels[name] = {
								type: "tab",
								tabId: tab.id
							}
							tabs[tab.id] = name;
							resolve
						})
						.catch(reject);
				else
					resolve();
			})
			.catch(reject);		
	})
}

function OpenPanel(name,options) {
	return new Promise((resolve, reject) => {
		var url = browser.extension.getURL(options.url+"?panel="+name);

		browser.windows.getCurrent()
			.then((currentWindow) => {
				var width = options.width || 500;
				var height = options.height || 400;
				var cwcParam = {
					url,
					width,
					height,
					type: "popup",
					left: Math.round((currentWindow.width-width)/2+currentWindow.left),
					top: Math.round((currentWindow.height-height)/2+currentWindow.top),
				};
				if(weh.isBrowser("chrome","opera"))
					cwcParam.focused = true;

				browser.windows.create(cwcParam)
					.then((window) => {
						panels[name] = {
							type: "window",
							windowId: window.id
						}
						return browser.windows.update(window.id,{
							focused: true
						});
					})
					.then((window) => {
						browser.tabs.query({
								windowId: window.id
							}).then((_tabs)=>{
								if(_tabs.length>0) {
									tabs[_tabs[0].id] = name;
									resolve();
								}
							});
						// trick to repaint window on Firefox
						browser.windows.update(window.id,{
							width: window.width,
							height: window.height+1
						});
						function OnFocusChanged(focusedWindowId) {
							if(focusedWindowId==window.id)
								return;

							browser.windows.getCurrent()
								.then((currentWindow) => {
									if(currentWindow.id!=window.id)
										browser.windows.remove(window.id)
											.then(()=>{},()=>{});
								});
						}
						function OnRemoved(removedWindowId) {
							if(removedWindowId==window.id) {
								browser.windows.onFocusChanged.removeListener(OnFocusChanged);
								browser.windows.onFocusChanged.removeListener(OnRemoved);
							}
						}
						browser.windows.onFocusChanged.addListener(OnFocusChanged);
						browser.windows.onRemoved.addListener(OnRemoved);
					})
					.catch(reject);
			})
			.catch(reject);		
	})
}

browser.tabs.onRemoved.addListener((tabId)=>{
	var panelName = tabs[tabId];
	if(panelName) {
		delete tabs[tabId];
		delete panels[panelName];
	}
});

function GotoTab(url, callback) {
	var foundTab = false;
	return new Promise( function(resolve, reject) {
		return browser.tabs.query({})
			.then(function (tabs) {
				tabs.forEach(function (tab) {
					if (tab.url === url) {
						browser.tabs.update(tab.id, {
							active: true
						});
						browser.windows.update(tab.windowId, {
							focused: true
						});
						foundTab = true;
					}
				});
				resolve(foundTab);
			})
	});
}


function Close(name) {
	var tab = panels[name];
	if(tab && tab.type=="tab")
		browser.tabs.remove(tab.tabId);
	else
		wehRpc.call(name,"close");
}

module.exports = {
	open: Open,
	close: Close,
	panels: () => Object.getKeys(panels)
}

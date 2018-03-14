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
					return browser.tabs.create({
							url: url,
						})
						.then(function(tab) {
							weh.__declareAppTab(name,tab.id);
							panels[name] = {
								type: "tab",
								tabId: tab.id
							}
							tabs[tab.id] = name;
							if(options.initData) {
								return new Promise((resolve, reject) => {
									const onUpdated = (tabId,changeInfo) => {
										if(tabId==tab.id && changeInfo.status=="complete") {
											weh.rpc.call(name,"wehInitData",options.initData)
												.then(resolve,reject);
											browser.tabs.onUpdated.removeListener(onUpdated);
										}
									}
									browser.tabs.onUpdated.addListener(onUpdated);
								})
							}
						});
			})
			.then(resolve)
			.catch(reject);		
	})
}

function CreatePanel(name,options) {
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

				return browser.windows.create(cwcParam)
					.then((window) => {
						panels[name] = {
							type: "window",
							windowId: window.id
						}
						return Promise.all([window,browser.windows.update(window.id,{
							focused: true
						})]);
					})
					.then(([window]) => {
						// trick to repaint window on Firefox
						// useless if auto resize
						Promise.resolve()
						.then(()=>{
							if(options.initData && options.initData.autoResize)
								return;
							else
								return browser.windows.update(window.id,{
									height: window.height+1
								})
								.then(()=>{
									return browser.windows.update(window.id,{
										height: window.height-1
									})
								});
						})
						.then(()=>{
							var promise1 = new Promise((resolve, reject) => {
								var timer = setTimeout(()=>{
									browser.tabs.onCreated.removeListener(ListenOpenedTabs);
									reject(new Error("Tab did not open"));
								},5000);
								function ListenOpenedTabs(tab) {
									if(tab.windowId==window.id) {
										clearTimeout(timer);
										browser.tabs.onCreated.removeListener(ListenOpenedTabs);
										resolve(tab);
									}
								}
								browser.tabs.onCreated.addListener(ListenOpenedTabs);
							});
							var promise2 = browser.tabs.query({
								windowId: window.id
							}).then((_tabs)=>{
								return new Promise((resolve, reject) => {
									if(_tabs.length>0)
										resolve(_tabs[0]);
								});
							});
							return Promise.race([promise1,promise2]);
						})
						.then((tab)=>{
							if(tab.status=="loading") {
								return new Promise((resolve, reject) => {
									var timer = setTimeout(()=>{
										browser.tabs.onCreated.removeListener(onUpdated);
										reject(new Error("Tab did not complete"));
									},5000);
									function onUpdated(tabId,changeInfo,_tab) {
										if(tabId == tab.id && _tab.status=="complete") {
											clearTimeout(timer);
											browser.tabs.onUpdated.removeListener(onUpdated);
											resolve(_tab);
										}
									}
									browser.tabs.onUpdated.addListener(onUpdated);
								})
							} else 
								return tab;
						})
						.then((tab)=>{
							weh.__declareAppTab(name,tab.id);
							tabs[tab.id] = name;
							if(options.initData)
								return weh.rpc.call(name,"wehInitData",options.initData);
						}).then(resolve)
						.catch(reject);

						
						function OnFocusChanged(focusedWindowId) {
							if(focusedWindowId==window.id)
								return;

							if(!options.autoClose)
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

function OpenPanel(name,options) {
	return new Promise((resolve, reject) => {
		var url = browser.extension.getURL(options.url+"?panel="+name);
		GotoTab(url)
			.then((found)=>{
				if(!found)
					return CreatePanel(name,options);
			})
			.then(resolve)
			.catch(reject);
	})
}


browser.tabs.onRemoved.addListener((tabId)=>{
	weh.__closeByTab(tabId);
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
	else if(tab && tab.type=="window")
		browser.windows.remove(tab.windowId);
	else
		wehRpc.call(name,"close");
}

function IsOpen(name) {
	return !!panels[name];
}

module.exports = {
	open: Open,
	close: Close,
	isOpen: IsOpen
}

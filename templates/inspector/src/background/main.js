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

var weh = require('weh-background');

var browser = weh.browser;

var allowFromAddonId = null;

weh.rpc.listen({
	openSettings: () => {
		weh.ui.open("settings",{
			type: "tab",
			url: "content/settings.html"
		});
		weh.ui.close("main");
	},
	openTranslation: () => {
		weh.ui.open("translation",{
			type: "tab",
			url: "content/translation.html"
		});
		weh.ui.close("main");
	},
	getAddons: () => {
		return new Promise((resolve,reject)=>{
			if(!browser.management)
				return reject(new Error("Browser management not available"));
			browser.management.getAll()
				.then((extensions) => {
					Promise.all(extensions.map(CheckAddon))
						.then((addons)=>{
							resolve(addons.filter((addon)=>{
								return addon!==null;
							}))
						})
						.catch(reject);
				})
				.catch(reject);
		});
	},
	updateMonitoredAddon: (newAddonId,oldAddonId) => {
		allowFromAddonId = newAddonId;
		if(oldAddonId && oldAddonId!=newAddonId)          
			browser.runtime.sendMessage(oldAddonId,{ 
					type: "weh#inspect",
					inspected: false
				});
		if(newAddonId)          
			browser.runtime.sendMessage(newAddonId,{ 
					type: "weh#inspect",
					inspected: true
				});
	},
	getPrefs: (addonId) => {
		return new Promise((resolve,reject) => {
			browser.runtime.sendMessage(addonId,{ 
					type: "weh#get-prefs"
				})
				.then((response) => {
					if(!response)
						reject(new Error("No addon answer"));
					else
						resolve(response);
				})
				.catch(reject);
		})
	},
	getStorage: (addonId) => {
		return new Promise((resolve,reject) => {
			browser.runtime.sendMessage(addonId,{ 
					type: "weh#get-storage"
				})
				.then((response) => {
					if(!response)
						reject(new Error("No addon answer"));
					else
						resolve(response);
				})
				.catch(reject);
		})
	},
	setAddonPref: (pref,value,addonId) => {
		return new Promise((resolve,reject) => {
			browser.runtime.sendMessage(addonId,{ 
					type: "weh#set-pref",
					pref,
					value
				})
				.then((response) => {
					if(!response)
						reject(new Error("No addon answer"));
					else
						resolve(response);
				})
				.catch(reject);
		})		
	}
});

function CheckNewAddon(addon) {
	if(addon.id==allowFromAddonId) {
		var counter=0;
		function Connect() {
			if(counter++>100)
				return;
			browser.runtime.sendMessage(addon.id,{ 
					type: "weh#inspect",
					inspected: true
				})
			.then((response)=>{
				if(!response)
					setTimeout(Connect,100);
			})
			.catch((err)=>{
				setTimeout(Connect,100);
			});
		}
		Connect();
	}
}

function SetupContextMenu() {
    browser.contextMenus.create({
        "title": weh._("weh_inspector"),
        "type": "normal",
        "contexts":["page"],
        "id": "weh-inspector"
    });
}

SetupContextMenu();

function CheckAddon(extension) {
	var id = extension.id;
	return new Promise((resolve,reject)=>{
		browser.runtime.sendMessage(id,{
				type: "weh#inspect-ping"
			})
		.then((response) => {
				if(response && response.type=="weh#inspect-pong") {
					resolve(Object.assign({},response.manifest,{ id }));
				} else {
					resolve(null);
				}
			})
		.catch(()=>{
			resolve(null);
		});
	});
}

browser.contextMenus.onClicked.addListener(function(info) {
    if(info.menuItemId == "weh-inspector" ) {
        weh.ui.open("inspector",{
			type: "tab",
			url: "content/inspector.html"			
		});
    }
});

browser.runtime.onMessageExternal.addListener(function(message, sender, sendResponse) {
	switch(message.type) {
		case "weh#inspect-message":
			if(sender.id===allowFromAddonId)
				weh.rpc.call("inspector","newMessage",message.message);
			break;
		case "weh#storage":
			if(sender.id===allowFromAddonId)
				weh.rpc.call("inspector","setAddonStorage",message);
			break;
	}
	sendResponse(true);				
});

weh.prefs.declare(require('default-prefs'));

if(browser.management.onInstalled)
	browser.management.onInstalled.addListener(CheckNewAddon);
if(browser.management.onEnabled)
	browser.management.onEnabled.addListener(CheckNewAddon);

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

const weh = require('weh');
const wehRpc = require('weh-rpc');
const wehPrefs = require('weh-prefs');

var browser = weh.browser;

var inspectorId = null;
var inspect = null;
var inspected = false;

if(browser.runtime.onMessageExternal) {
	browser.runtime.onMessageExternal.addListener(function(message, sender, sendResponse) {
		switch(message.type) {
			case "weh#inspect-ping":
				inspectorId = sender.id;
				sendResponse({
					type: "weh#inspect-pong",
					version: 1,
					manifest: browser.runtime.getManifest()
				});
				break;
			case "weh#inspect":
				inspectorId = sender.id;
				inspected = message.inspected;
				if(inspected)
					wehRpc.setHook((message) => {
						if(inspected && inspectorId)
							browser.runtime.sendMessage(inspectorId,{
								type: "weh#inspect-message",
								message
							})
							.catch((err)=>{
								console.info("Error sending message",err);
								inspected = false;
							});
					});
				else
					wehRpc.setHook(null);
				sendResponse({
					type: "weh#inspect",
					version: 1,
					inspected
				});
				break;
            case "weh#get-prefs":
                inspectorId = sender.id;
                sendResponse({
                    type: "weh#prefs",
                    prefs: wehPrefs.getAll(),
                    specs: wehPrefs.getSpecs()
                });
                break;
			case "weh#set-pref":
                wehPrefs[message.pref] = message.value;
                sendResponse(true);
                break;
		}
	});
	inspect = {
		send: () => {
			console.info("TODO implement inspect.send");
		}
	}
}

module.exports = inspect;

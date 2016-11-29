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

weh.inspect = (function() {

    var inspectorId = null;

    browser.runtime.onMessageExternal.addListener(function(message, sender, sendResponse) {
        switch(message.type) {
            case "weh#ping":
                inspectorId = sender.id;
                sendResponse({
                    type: "weh#pong",
                    version: 1,
                    manifest: browser.runtime.getManifest(),
                    monitorBgUi: exports.monitorBgUi
                });
                break;
            case "weh#inspect-bgui":
                inspectorId = sender.id;
                exports.monitorBgUi = message.status;
                break;
            case "weh#get-storage":
                inspectorId = sender.id;
                GetStorageData(function(data) {
                    exports.send({
                        type: "weh#storage",
                        storage: data
                    });
                });
                break;
            case "weh#get-prefs":
                inspectorId = sender.id;
                exports.send({
                    type: "weh#prefs",
                    prefs: weh.prefs.getAll(),
                    specs: weh.prefs.getSpecs()
                });
                break;
            case "weh#save-prefs":
                inspectorId = sender.id;
                weh.prefs.assign(message.prefs);
                break;
        }
    });

    function GetStorageData(callback) {
        var count = 1;
        var data = {}
        function Done() {
            if(--count==0)
                callback(data);
        }
        ["localStorage","sessionStorage"].forEach(function(which) {
            var storage = window[which];
            if(storage) {
                var webStorage = {};
                for(var i=0; i<storage.length; i++) {
                    var key = storage.key(i);
                    var value = storage.getItem(key);
                    try {
                        webStorage[key] = JSON.parse(value);
                    } catch(e) {
                        webStorage[key] = value;
                    }
                }
                data[which] = webStorage;
            }
        });
        ["local","sync","managed"].forEach(function(which) {
            var storage = browser.storage && browser.storage[which];
            if(storage) {
                count++;
                storage.get(null,function(items) {
                    data[which] = items;
                    Done();
                });
            }

        });
        Done();
    }

    var exports = {
        monitorBgUi: false,
        send: function(message) {
            if(!inspectorId)
                return;
            message.timestamp = Date.now();
            browser.runtime.sendMessage(inspectorId,message);
        },
        sendBgUi: function(message) {
            if(!inspectorId)
                return;
            message.timestamp = Date.now();
            message.type = "weh#bgui";
            browser.runtime.sendMessage(inspectorId,message,function(response) {
                if(!response || response.type!="weh#ok")
                    exports.monitorBgUi = false;
            });
        }
    }

    return exports;

})();

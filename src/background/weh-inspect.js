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
                    console.info("storage",data);
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
            var storage = browser.storage[which];
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
        }
    }

    return exports;

})();

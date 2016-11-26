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
                exports.monitorBgUi = message.status;
                break;
        }
    });

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

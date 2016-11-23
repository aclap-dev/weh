weh.inspect = (function() {

    console.info("weh:inspect listening");

    var inspectorId = null;

    browser.runtime.onMessageExternal.addListener(function(request, sender, sendResponse) {
        console.info("weh:inspect receive message",request,sender);
        inspectorId = sender.id;
        sendResponse({
            type: "weh#pong",
            version: 1,
            manifest: browser.runtime.getManifest()
        })
    });

    return {
    }

})();

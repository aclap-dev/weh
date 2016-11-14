
weh.ui.update("default",{
    type: "popup",
    onMessage: function(message) {
        console.info("background default receives",message);
        switch(message.type) {
            case "open-settings":
                weh.ui.close("default");
                weh.ui.open("settings");
                console.info("open-settings");
                break;
        }
    }
});

weh.ui.update("settings",{
    type: "tab",
    contentURL: "content/settings.html",
    onMessage: function(message) {
        console.info("background settings receives",message);
    }
});

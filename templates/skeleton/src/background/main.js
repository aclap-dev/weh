
/* if you don't need a panel that opens from a toolbar button:
   - delete the call below
   - remove entry browser_action in manifest.json
   - delete files src/content/popup.* files
*/
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

/* if you don't need settings in your add-on:
   - delete the call below
   - remove entry options_page in manifest.json
   - delete files src/content/settings.* files
*/
weh.ui.update("settings",{
    type: "tab",
    contentURL: "content/settings.html",
    onMessage: function(message) {
        console.info("background settings receives",message);
    }
});

/* if you don't need to activate the addon from the browser context menu,
    - remove section below
*/
browser.contextMenus.create({
    "title": weh._("title"),
    "type": "normal",
    "contexts":["page"],
    "id": "weh-skeleton"
});

browser.contextMenus.onClicked.addListener(function(info) {
    if(info.menuItemId == "weh-skeleton" ) {
        /* do something here */
    }
});


/* if you don't need a panel that opens from a toolbar button:
   - delete the call below
   - remove entry browser_action in manifest.json
   - delete files src/content/popup.* files
*/
weh.ui.update("default",{
    type: "popup",
    onMessage: function(message) {
        switch(message.type) {
            case "open-settings":
                weh.ui.close("default");
                weh.ui.open("settings");
                break;
            case "open-translation":
                weh.ui.close("default");
                weh.ui.open("translation");
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
    contentURL: "content/settings.html"
});

/* if you don't want custom translation in your add-on:
   - delete the call below
   - delete files src/content/manifest.* files
*/
weh.ui.update("translation",{
    type: "tab",
    contentURL: "content/translation.html",
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

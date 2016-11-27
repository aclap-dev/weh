
if(!browser.runtime.onMessageExternal) {
    var error = "weh-inspector: This browser lacks support for browser.runtime.onMessageExternal";
    console.error(error);
    throw new Error(error);
}

if(!browser.management) {
    var error = "weh-inspector: This browser lacks support for browser.management";
    console.error(error);
    throw new Error(error);
}

var addons = {}
var bguiIndex = 1;

weh.ui.update("inspector",{
    type: "tab",
    contentURL: "content/inspector.html",
    onMessage: function(message,post) {
        switch(message.type) {
            case "get-addons":
                post({
                    type: "addons",
                    addons: addons,
                });
                break;
            case "scan-addons":
                ScanAddons(message.addons);
                break;
            case "monitor-bgui":
                if(addons[message.addonId])
                    addons[message.addonId].monitorBgUi = message.status;
                browser.runtime.sendMessage(message.addonId,{
                    type: "weh#inspect-bgui",
                    status: message.status
                });
                break;
            case "get-storage":
                browser.runtime.sendMessage(message.addonId,{
                    type: "weh#get-storage",
                });
                break;
            case "get-prefs":
                browser.runtime.sendMessage(message.addonId,{
                    type: "weh#get-prefs",
                });
                break;
            case "save-prefs":
                browser.runtime.sendMessage(message.addonId,{
                    type: "weh#save-prefs",
                    prefs: message.prefs
                });
                break;
        }
    },
    onShow: function() {
    }
});

function CheckAddon(id) {
    browser.runtime.sendMessage(id,{
        type: "weh#ping"
    },function(response) {
        if(response) {
            addons[id] = response.manifest;
            addons[id].id = id;
            addons[id].monitorBgUi = response.monitorBgUi;
            weh.ui.post("inspector",{
                type: "add-addon",
                addon: addons[id],
            });
        } else {
            delete addons[id];
            weh.ui.post("inspector",{
                type: "remove-addon",
                id: id,
            });
        }
    });
}

function ScanAddons() {

    if(browser.management) {
        browser.management.getAll(function(extensions) {
            extensions.forEach((extension) => CheckAddon(extension.id));
        });
    }
}
ScanAddons();

function SetupContextMenu() {
    browser.contextMenus.create({
        "title": weh._("weh_inspector"),
        "type": "normal",
        "contexts":["page"],
        "id": "weh-inspector"
    });
}

if(browser.runtime.onInstalled)
    browser.runtime.onInstalled.addListener(SetupContextMenu);
else
    SetupContextMenu();

browser.contextMenus.onClicked.addListener(function(info) {
    if(info.menuItemId == "weh-inspector" ) {
        weh.ui.open("inspector");
    }
});

browser.runtime.onMessageExternal.addListener(function(message, sender, sendResponse) {
    message.addonId = sender.id;
    switch(message.type) {
        case "weh#bgui":
            message.key = bguiIndex++;
            weh.ui.post("inspector",message);
            break;
        case "weh#storage":
            weh.ui.post("inspector",message);
            break;
        case "weh#prefs":
            message.type = "weh#foreign-prefs";
            weh.ui.post("inspector",message);
            break;
    }
});


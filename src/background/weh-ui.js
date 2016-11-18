/*
 * weh - WebExtensions Help
 *
 * @summary workflow and base code for developing WebExtensions browser add-ons
 * @author Michel Gutierrez
 * @link https://github.com/mi-g/weh
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

weh.ui = (function() {
    
    var manifest = browser.runtime.getManifest();
	var panels = {};
    
    function Void() {}
    
 	function UpdateOptions(options) {
        options.type = options.type || "panel";
        options.contentURL = options.contentURL || null;
        options.onShow = options.onShow || Void;
        options.onHide = options.onHide || Void;
        options.onMessage = options.onMessage || Void;
        options.prefs = options.prefs!==false;
        return options;
	}
    
    function GotoTab(url, callback) {
        var foundTab = false;
        browser.tabs.query({}, function (tabs) {
            tabs.forEach(function (tab) {
                if (tab.url === url) {
                    browser.tabs.update(tab.id, {
                        selected: true
                    });
                    browser.windows.update(tab.windowId, {
                        focused: true
                    });
                    foundTab = true;
                }
            });
            if (callback) callback(foundTab);
        });
    }

	browser.runtime.onConnect.addListener(function(port) {
		var m = /^weh:panel:(.*):(.*)/.exec(port.name);
		if(!m)
			return;
        if(m[1]!=browser.runtime.id)
            return;
		var panelName = m[2];
		var panel = panels[panelName];
        
		if(!panel)
            panel = panels[panelName] = {
                options: UpdateOptions({}),
            }
        panel.open = true;

		panel.post = function(message) {
            if(panel.open)
                port.postMessage(message);
		}

		port.onMessage.addListener(function(message) {
			switch(message.type) {
                case "weh#on":
                    panel.open = true;
                    panel.post({
                        type: "weh#panel-info",
                        details: {
                            panelType: panel.options.type
                        }
                    });
                    if(panel.options.prefs) {
                        panel.post({
                            type: "weh#prefs-specs",
                            specs: weh.prefs.getSpecs()
                        });
                        panel.post({
                            type: "weh#prefs",
                            prefs: weh.prefs.getAll()
                        });
                    }
                    break;
                case "weh#prefs":
                    if(message.prefs)
                        for(var k in message.prefs)
                            weh.prefs[k] = message.prefs[k];
                    break;
                case "weh#get-prefs": 
                    var prefs = {};
                    if(typeof message.prefs=="undefined")
                        prefs = weh.prefs.getAll();
                    else {
                        if(!Array.isArray(message.prefs))
                            message.prefs = [message.prefs];
                        message.prefs.forEach(function(pref) {
                            prefs[pref] = weh.prefs[pref]; 
                        });
                    }
                    panel.post({
                        type: "weh#prefs",
                        prefs: prefs
                    });
                    break;
                case "weh#get-prefs-specs":
                    var specs = {};
                    var allSpecs = weh.prefs.getSpecs();
                    if(typeof message.specs=="undefined")
                        specs = allSpecs;
                    else {
                        if(!Array.isArray(message.specs))
                            message.specs = [message.specs];
                        message.specs.forEach(function(pref) {
                            specs[pref] = allSpecs[pref]; 
                        });
                        panel.post({
                            type: "weh#prefs-specs",
                            specs: specs
                        });
                    }
                    break;
                default:
				    panel.options.onMessage(message,panel.post,panelName);
			}
		});
		port.onDisconnect.addListener(function(msg) {
			panel.open = false;
			panel.options.onHide(panelName);
		});
		panel.options.onShow(panel.post,panelName);
	});
    
    weh.prefs.on("",function(pref,value) {
        console.info("ui prefs change",pref,value);
        for(var k in panels) {
            var panel = panels[k];
            if(panel.open) {
                var prefs = {};
                prefs[pref] = value;
                panel.post({
                    type: "weh#prefs",
                    prefs: prefs
                });
            }
        }
    });

    function UrlAddIds(url,panelName) {
        var m = /^([^\?]*)(?:\?(.*))?$/.exec(url);
        var params = {};
        if(m[2])
            m[2].split("&").forEach(function(paramExpr) {
                var terms = paramExpr.split("=");
                params[terms[0]] = decodeURIComponent(terms[1]);
            });
        params["panel"] = panelName;
        params["addon"] = browser.runtime.id;
        var paramExprs = [];
        for(var param in params)
            paramExprs.push(param + "=" + encodeURIComponent(params[param]));
        return m[1] + "?" + paramExprs.join("&");
    }
    
    var defaultPopup = manifest.browser_action && manifest.browser_action.default_popup;
    if(defaultPopup) {
        defaultPopup = UrlAddIds(defaultPopup,"default");
        browser.browserAction.setPopup({
            popup: defaultPopup
        });
    }
    
    return {

        update: function(panelName,options) {
            var panel = panels[panelName] || {
                open: false,
                options: options,
            }
            UpdateOptions(panel.options);
            panels[panelName] = panel;
            return panel;
        },
        
        open: function(panelName, options) {
            options = options || {};
            var panel = panels[panelName] || this.update(panelName,options);
            UpdateOptions(panel.options);
            
            if(panel.options.type=="panel") 
                browser.windows.getCurrent(function(currentWindow) {
                    var width = 500;
                    var cwcParam = {
                        url: browser.extension.getURL(panel.options.contentURL+"?panel="+panelName+"&addon="+browser.runtime.id),
                        type: "detached_panel",
                        //width: width,
                        //height: 100,
                        left: Math.round((currentWindow.width-width)/2+currentWindow.left),
                        top: currentWindow.top,
                    };
                    if(weh.is("chrome","opera"))
                        cwcParam.focused = true;
                    if(weh.is("edge","opera"))
                        cwcParam.type = "popup";

                    browser.windows.create(cwcParam,function(window) {
                        panels[panelName].windowId = window.id;
                        function OnFocusChanged(focusedWindowId) {
                            browser.windows.getCurrent(function(currentWindow) {
                                if(currentWindow.id!=window.id)
                                    try {
                                    browser.windows.remove(window.id,function() {});
                                    } catch(e) { }
                            });
                        }
                        function OnRemoved(removedWindowId) {
                            if(removedWindowId==window.id) {
                                browser.windows.onFocusChanged.removeListener(OnFocusChanged);
                                browser.windows.onFocusChanged.removeListener(OnRemoved);
                            }
                        }
                        browser.windows.onFocusChanged.addListener(OnFocusChanged);
                        browser.windows.onRemoved.addListener(OnRemoved);
                    });
                });
            else if(panel.options.type=="tab") {
                var url = browser.extension.getURL(panel.options.contentURL+"?panel="+panelName+"&addon="+browser.runtime.id);
                GotoTab(url,function(foundTab) {
                    if(!foundTab)
                        browser.tabs.create({
                            url: url,
                        },function(tabs) {});
                });
            } else if(panel.options.type=="popup") {
                console.warn("weh: a popup cannot be opened programmatically");
            }
        },
        
        close: function(panelName) {
            var panel = panels[panelName];
            if(panel && panel.open)
                panel.post({
                    type: "weh#close"
                });
        },
        
        post: function() {
            var message;
            if(typeof arguments[0]=="string") {
                var panelName = arguments[0];
                message = arguments[1];
                var panel = panels[panelName];
                if(panel && panel.post)
                    panel.post(message);
            } else {
                message = arguments[0];
                for(var panelName in panels) {
                    var panel = panels[panelName];
                    if(panel.post)
                        panel.post(message);
                }
            }
        },
        
    }
    
})();

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

(function() {

    const ANY_TYPE = "<any>";

    window.browser = window.browser || window.chrome;

    var m = /^([^\?]*)(?:\?(.*))?$/.exec(window.location.href);
    var params = {};
    if(m[2])
        m[2].split("&").forEach(function(paramExpr) {
            var terms = paramExpr.split("=");
            params[terms[0]] = decodeURIComponent(terms[1]);
        });
    if(!params.panel)
        throw new Error("Panel name not defined in URL");
    
    var listeners = {};
    var port = browser.runtime.connect({name: "weh:panel:"+browser.runtime.id+":"+params.panel});
    
    function NotifyListeners(message) {
        function Dispatch(type) {
            var typeListeners = listeners[type];
            if(!typeListeners)
                return;
            typeListeners.forEach(function(listener) {
               try {
                   listener.call(null,message);
               } catch(e) {
                   console.warn("weh: exception in message listener",e,e.stack);
               }
            });
        }
        if(message.type)
            Dispatch(message.type);
        Dispatch(ANY_TYPE);        
    }
    
    port.onMessage.addListener(function(message) {
        switch(message.type) {
            case "weh#close":
                window.close();
                return;
            case "weh#panel-info":
                if(message.details.panelType) {
                    var className = document.body.getAttribute("class");
                    className = (className && className+" " || "") + "weh-type-" + message.details.panelType;
                    document.body.setAttribute("class",className);
                }
                return;
        }
        NotifyListeners(message);
    });
        
    port.postMessage({
        type: "weh#on"
    });
    
    var weh = {
        post: function(message) {
            port.postMessage(message);
        },
        postLocal: function(message) {
            NotifyListeners(message);
        },
        on: function() {
            var type, handler;
            if(typeof arguments[0]=="function") {
                type = ANY_TYPE;
                handler = arguments[0];
            } else {
                type = arguments[0];
                handler = arguments[1];
            }
            if(!listeners[type])
                listeners[type] = [];
            listeners[type].push(handler);
        },
        off: function() {
            var type, handler;
            if(typeof arguments[0]=="function") {
                type = "<any>";
                handler = arguments[0];
            } else {
                type = arguments[0];
                handler = arguments[1];
            }
            if(!listeners[type])
                return;
            for(var i=listeners[type].length-1;i>=0;i--)
                if(listeners[type][i]==handler)
                    listeners[type].splice(i,1);
        }
    }

    window.weh = weh;
    
})();

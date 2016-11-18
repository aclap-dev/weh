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

weh.ajax = function(options) {
    
    const JSON_RE = new RegExp("\\bjson\\b");
    
    if(!options.url)
        throw new Error("ajax: url not present");
    options.onComplete = options.onComplete || function() {};
    options.headers = options.headers || {};
    options.content = options.content || null;
    options.contentType = options.contentType || "application/x-www-form-urlencoded";
    if(options.overrideMimeType)
        throw new Error("ajax: overrideMimeType not supported");
    options.anonymous = options.anonymous || false;
    
    var httpRequest = new XMLHttpRequest();

    httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === XMLHttpRequest.DONE) {
            var data = null;
            var contentType = httpRequest.getResponseHeader("Content-Type");
            if(contentType && JSON_RE.test(contentType)) {
                try {
                    data = JSON.parse(httpRequest.responseText);
                } catch(e) {}
            }
            data = data || httpRequest.responseXML;
            data = data || httpRequest.responseText;
            var err;
            if(httpRequest.status==200)
                err = null;
            else if(httpRequest.status==0)
                err = new Error("Network error");
            else
                err = new Error("HTTP status "+httpRequest.status);
            options.onComplete(err,data);
        }
    }

    function Request() {}
    Request.prototype = {
        proceed: function(method) {
            httpRequest.open(method,options.url,true);
            for(var header in options.headers)
                if(options.headers.hasOwnProperty(header))
                    httpRequest.setRequestHeader(header, options.headers[header]);
            if(options.contentType)
                httpRequest.setRequestHeader("Content-Type", options.contentType);
            if(options.anonymous) {
                httpRequest.setRequestHeader("Cookie", "");
                httpRequest.setRequestHeader("Authentication", "");
                httpRequest.mozAnon = true;
            }
            httpRequest.send(options.content);            
        },
        get: function() {
            this.proceed("GET");
        },
        post: function() {
            this.proceed("POST");
        },
    }
    return new Request;
};

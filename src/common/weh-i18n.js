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

    var customStrings = {}

    const substRe = new RegExp("^(|.*?[^\\\\])(?:\\$)(.*?[^\\\\])(?:\\$)(.*)");

    function GetMessage(messageName,substitutions) {
        if(/-/.test(messageName)) {
            var fixedName = messageName.replace(/-/g,"_");
            console.warn("Wrong i18n message name. Should it be",fixedName,"instead of",messageName,"?");
            messageName = fixedName;
        }
        var custom = customStrings[messageName];
        if(custom) {
            if(!Array.isArray(substitutions))
                substitutions = [ substitutions ];
            var substs = {};
            substitutions.forEach(function(val,index) {
                substs["$"+(index+1)] = val;
            });
            var str = custom.message || "";
            var trans = [];
            do {
                var m = substRe.exec(str);
                if(m) {
                    trans.push(m[1]);
                    if(custom.placeholders &&
                       custom.placeholders[m[2]] &&
                       custom.placeholders[m[2]].content &&
                        substs[custom.placeholders[m[2]].content] )
                        trans.push(substs[custom.placeholders[m[2]].content]);
                    else
                        trans.push("$"+m[2]+"$");
                    str = m[3];
                }
            } while(m);
            trans.push(str);
            return trans.join("");
        }
        return browser.i18n.getMessage.apply(browser.i18n,arguments);
    }

    weh.i18n = {
        getMessage: GetMessage,
        assignCustom: function(custom) {
            Object.assign(customStrings,custom);
        },
        resetCustom: function() {
            customStrings = {};
        },
        getCustom: function() {
            return customStrings;
        }
    }
    weh._ = weh.i18n.getMessage;

})();

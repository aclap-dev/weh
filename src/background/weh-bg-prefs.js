/*
 * weh - WebExtensions Helper
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

    function Hash(str){
        var hash = 0, char;
        if (str.length == 0) return hash;
        for(var i=0; i<str.length; i++) {
            char = str.charCodeAt(i);
            hash = ((hash<<5)-hash)+char;
            hash = hash & hash;
        }
        return hash;
    }

    function Stringify(object) {
        return JSON.stringify(Object.keys(object).sort().map(function(k) {
            return {
                name: k,
                value: object[k]
            }
        }));
    }

    function Parse(str) {
        var object = {};
        JSON.parse(str).forEach(function(pair) {
            object[pair.name] = pair.value;
        });
        return object;
    }

    var lastHash = 0;
    var prefs = {};

    try {
        var prefsStr = localStorage.getItem("weh-prefs");
        prefs = Parse(prefsStr);
        lastHash = Hash(prefsStr);
    } catch(e) {}

    weh.prefs.assign(prefs);
    weh.prefs.on("",{
        pack: true
    },function(newPrefs,oldPrefs) {
        Object.assign(prefs,newPrefs);
        var prefsStr = Stringify(prefs);
        var hash = Hash(prefsStr);
        if(hash!=lastHash) {
            lastHash = hash;
            localStorage.setItem("weh-prefs",prefsStr);
        }
    });

})();

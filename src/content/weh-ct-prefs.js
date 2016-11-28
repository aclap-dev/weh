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

    weh.prefs.on({pack: true},function(prefs) {
        weh.post({
            type: "weh#prefs",
            prefs: prefs
        });
    });

    weh.on(function(message) {

        switch(message.type) {
            case "weh#prefs":
                weh.prefs.assign(message.prefs);
                break;
            case "weh#prefs-specs":
                weh.prefs.declare(message.specs);
                break;
        }

    });

})();

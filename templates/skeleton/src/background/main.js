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

var weh = require('weh-background');
require('weh-inspect');

weh.rpc.listen({
	openSettings: () => {
		console.info("openSettings");
		weh.ui.open("settings",{
			type: "tab",
			url: "content/settings.html"
		});
		weh.ui.close("main");
	},
	openTranslation: () => {
		console.info("openTranslation");
		weh.ui.open("translation",{
			type: "tab",
			url: "content/translation.html"
		});
		weh.ui.close("main");
	},
});

weh.prefs.declare(require('./default-prefs'));


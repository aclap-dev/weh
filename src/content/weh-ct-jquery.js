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

(function($) {

    $.fn.wehI18n = function() {
        var args = arguments;
        this.each( function() {
            var text = args[0] ? weh._.apply(null,args) : weh._($(this).attr("data-weh-i18n"));
            $(this).text(text);
        });

    }

}(jQuery));

$(document).ready( function() {
    $("[data-weh-i18n]").wehI18n();
});

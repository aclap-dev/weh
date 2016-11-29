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

    function wehReactAttach(component,callback) {
        var previous = {
            componentDidMount: component.componentDidMount,
            componentWillUnmount: component.componentWillUnmount
        }
        var receiveCallback = callback.bind(component);
        component.componentDidMount = function() {
            weh.on(receiveCallback);
            if(previous.componentDidMount)
                previous.componentDidMount.apply(component,arguments);
        }
        component.componentWillUnmount = function() {
            weh.off(receiveCallback);
            if(previous.componentWillUnmount)
                previous.componentWillUnmount.apply(component,arguments);
        }
    }

    weh.react = {
        attach: wehReactAttach
    }

})();

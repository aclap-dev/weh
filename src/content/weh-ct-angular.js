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

weh.ngBootstrap = function(mod) {
    angular.element(document).ready(function() {
        angular.bootstrap(document.documentElement,['weh',mod]);
    });
}

weh.ngController = function(scope) {
    //scope.weh = weh;
    scope.post = weh.post;
    scope._ = weh._;
}

angular.module('weh',[])
.controller('WehCtrl',["$scope",function($scope) {
    weh.ngController($scope);
}]);

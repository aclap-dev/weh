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

var transApp = angular.module('weh.translation',[]);

transApp.directive('wehTranslationItem',function() {
    return {
        restrict: "E",
        scope: true,
        replace: true,
        template: `
            <div ng-class="formGroupClass()">
                <label class="col-sm-4 control-label" for="weh-{{key}}">
                    {{key}}</label>
                <div class="col-sm-8">
                    <input class="form-control"
                        ng-model="custom[key].message"
                        type="text"
                        id="weh-{{key}}"
                        />
                    <div class="help-block">{{ original[key] }}</div>
                </div>
            </div>
        `,
        link: function(scope,element,attrs) {
            scope.key = attrs.key;
            scope.formGroupClass = function() {
                var classes = ["form-group"];
                if((scope.custom[scope.key].message || "") !==
                    ((scope.customOrg[scope.key] && scope.customOrg[scope.key].message) || ""))
                    classes.push("has-success");
                return classes.join(" ");
            }
        }
    }
});

transApp.directive('wehTranslation',function() {
    return {
        restrict: "E",
        scope: true,
        replace: true,
        template: function(elem,attr) {
            return `
                <div>
                    <form class="form-horizontal"
                        role="form">

                        <div
                            class="form-group"
                            ng-style="{'background-color':'#eee',padding:'8px'}">
                            <div class="col-sm-4"></div>
                            <div class="col-sm-8">
                                <input class="form-control"
                                    ng-model="search"
                                    placeholder="Search..."
                                    type="text"
                                    />
                            </div>
                        </div>

                        <weh-translation-item
                            ng-repeat="key in keys | orderBy | filter:filterSearch()"
                            key="{{key}}"
                            custom="{{custom[key]}}"
                            original="{{original[key]}}"
                            changed="{{(custom[key] && custom[key].message)!==                                (customOrg[key] && customOrg[key].message)}}"
                        />

                    </form>
                    <div class="text-center">
                        <br/>
                        <div class="btn-toolbar" ng-style="{display:'inline-block'}">
                            <button type="button"
                                ng-click="handleSave()"
                                ng-class="saveButtonClass()">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            `
        },
        link: function(scope,element,attrs) {
            var custom = {};
            try {
                custom = JSON.parse(window.localStorage.getItem("wehI18nCustom")) || {};
            } catch(e) {}
            Object.assign(scope,{
                keys: [],
                strings: {},
                original: {},
                custom: custom,
                customOrg: JSON.parse(JSON.stringify(custom)),
                search: ""
            });
            scope.saveButtonClass = function() {
                var classes = ['btn', 'btn-primary'];
                var changed = false;
                for(var key in scope.custom)
                    if((scope.custom[key].message || "") !==
                        ((scope.customOrg[key] && scope.customOrg[key].message) || "")) {
                        changed = true;
                        break;
                    }
                if(!changed)
                    classes.push("disabled");
                return classes.join(" ");
            }

            function UpdateKeys(message) {
                scope.keys = message.i18nKeys;
                scope.keys.forEach(function(key) {
                    scope.original[key] = browser.i18n.getMessage(key);
                });
                scope.$apply("keys");
            }
            weh.on("weh#i18n-keys",UpdateKeys);
            scope.$on("$destroy",function() {
                weh.off("weh#i18n-keys",UpdateKeys);
            });
            weh.post({type:"weh#get-i18n-keys"});

            scope.filterSearch = function() {
                return function(key) {
                    if(scope.search.length==0)
                        return true;
                    if(key.indexOf(scope.search)>=0)
                        return true;
                    if(scope.customOrg[key] &&
                        scope.customOrg[key].message.indexOf(scope.search)>=0)
                        return true;
                    if(scope.original[key].indexOf(scope.search)>=0)
                        return true;
                    return false;
                }
            }

            scope.handleSave = function() {
                window.localStorage.setItem("wehI18nCustom",
                    JSON.stringify(scope.custom));
                scope.customOrg = Object.assign({},scope.custom);
            }
        }
    }
});

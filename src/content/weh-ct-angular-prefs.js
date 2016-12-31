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

var weh_prefs_paramIndex = 1;

var prefsApp = angular.module('weh.prefs',[]);

prefsApp.controller('wehParams',["$scope",function($scope) {
    $scope.prefs = {
        values: weh.prefs.getAll(),
        saved: weh.prefs.getAll()
    };

    function UpdateSpecs(specs) {
        $scope.prefs.specs = specs;
        for(var spec in specs) {
            if(typeof $scope.prefs.values[spec]=="undefined")
                $scope.prefs.values[spec] = specs[spec].defaultValue;
            if(typeof $scope.prefs.saved[spec]=="undefined")
                $scope.prefs.saved[spec] = specs[spec].defaultValue;
        }
        $scope.$apply("prefs");
    }
    weh.prefs.on({specs:true,pack:true},UpdateSpecs);
    $scope.$on("$destroy",function() {
        weh.prefs.off(UpdateSpecs);
    });

    function UpdatePrefs(prefs) {
        Object.assign($scope.prefs.values,prefs);
        Object.assign($scope.prefs.saved,prefs);
        $scope.$apply("prefs")
    }
    weh.prefs.on({pack:true},UpdatePrefs);
    $scope.$on("$destroy",function() {
        weh.prefs.off(UpdatePrefs);
    });

    $scope.canCancel = function() {
        for(var param in $scope.prefs.values) {
            if($scope.prefs.values[param]!=$scope.prefs.saved[param])
                return true;
        }
        return false;
    }
    $scope.canDefault = function() {
        if(!$scope.prefs.specs)
            return false;
        for(var param in $scope.prefs.values) {
            if($scope.prefs.values[param]!=$scope.prefs.specs[param].defaultValue)
                return true;
        }
        return false;
    }
    $scope.canSave = function() {
        for(var param in $scope.prefs.values)
            if(!weh.prefs.isValid(param,$scope.prefs.values[param]))
                return false;
        for(var param in $scope.prefs.values) {
            if($scope.prefs.values[param]!=$scope.prefs.saved[param])
                return true;
        }
        return false;
    }
    $scope.handleCancel = function() {
        for(var param in $scope.prefs.values)
            $scope.prefs.values[param] = $scope.prefs.saved[param];
    }
    $scope.handleDefault = function() {
        for(var param in $scope.prefs.values)
            $scope.prefs.values[param] = $scope.prefs.specs[param].defaultValue;
    }
    $scope.handleSave = function() {
        for(var param in $scope.prefs.values) {
            var value = $scope.prefs.values[param];
            weh.prefs[param] = value;
            $scope.prefs.saved[param] = value;
        }
    }
}]);

prefsApp.directive('wehPrefButtons',function() {
    return {
        restrict: "E",
        scope: true,
        replace: true,
        template: function(elem,attr) {
            return `
               <div class="text-center">
                    <br/>
                    <div class="btn-toolbar" ng-style="{display: 'inline-block'}">
                        <button type="button"
                            ng-click="handleCancel()"
                            ng-class="{btn:1, 'btn-default':1, disabled: !canCancel()}">
                                {{_("cancel")}}
                        </button>
                        <button type="button"
                            ng-click="handleDefault()"
                            ng-class="{btn:1, 'btn-warning':1, disabled: !canDefault()}">
                                {{_("default")}}
                        </button>
                        <button type="button"
                            ng-click="handleSave()"
                            ng-class="{btn:1, 'btn-primary':1, disabled: !canSave()}">
                                {{_("save")}}
                        </button>
                    </div>
                </div>
            `
        },
        link: function(scope,element,attrs) {
        }
    }
});

prefsApp.directive('wehParamSet',function() {
    return {
        restrict: "E",
        scope: true,
        replace: true,
        template: function(elem,attr) {
            return `
                <form class="form-horizontal" role="form">
                    <weh-param
                         ng-repeat='param in params'
                         param="{{param}}"
                         >
                    </weh-param>
                </form>
            `
        },
        link: function(scope,element,attrs) {
            scope.params = attrs.params.split(",");
        }
    }
});

prefsApp.directive('wehParam',function() {
    return {
        restrict: "E",
        scope: true,
        replace: true,
        require: "?^ngController",
        template: `
            <div ng-class="formGroupClass()" ng-show="spec">
                <label class="col-sm-4 control-label" for="weh-param-{{this.paramIndex}}">
                    {{spec.label}}</label>
                <div class="col-sm-8">

                    <input
                        ng-if="['string','integer','float'].indexOf(spec.type)>=0"
                        ng-model="prefs.values[prefName]"
                        class="form-control"
                        maxLength="{{spec.maxLength || -1}}"
                        id="weh-param-{{paramIndex}}"
                        type="text"
                        ng-style="{ width: getInputWidth() }"/>

                    <input
                        ng-if="spec.type=='boolean'"
                        class="form-control"
                            ng-model="prefs.values[prefName]"
                            id="weh-param-{{paramIndex}}"
                            type="checkbox"
                            ng-style="{width:'34px'}"
                            />

                    <select
                        ng-if="spec.type=='choice' && spec.choices.length>0"
                        ng-model="prefs.values[prefName]"
                        class="form-control"
                        id="weh-param-{{paramIndex}}"
                        ng-style="{ width: getInputWidth() }">
                        <option
                            ng-repeat="option in spec.choices"
                            value="{{option.value}}">
                                {{ option.name }}
                        </option>
                    </select>

                    <div class="help-block" ng-show="spec.description">
                        {{ spec.description }}
                    </div>
                </div>
            </div>
        `,
        link: function(scope,element,attrs,ctrl) {
            scope.paramIndex = weh_prefs_paramIndex++;
            scope.prefName = attrs.param;
            scope.spec = {};
            function UpdateSpec(param,spec) {
                scope.spec = spec;
                scope.$apply("spec")
            }
            weh.prefs.on(attrs.param,{specs:true},UpdateSpec);
            scope.$on("$destroy",function() {
                weh.prefs.off(attrs.params,UpdateSpec);
            });
            scope.formGroupClass = function() {
                var value = scope.prefs.values[scope.prefName];
                var classes = ["form-group"];
                if(!scope.spec || !weh.prefs.isValid(scope.prefName,value))
                    classes.push("has-error");
                else if(value != scope.prefs.saved[scope.prefName])
                    classes.push("has-success");
                else if(value != scope.spec.defaultValue)
                    classes.push("has-warning");

                return classes.join(" ");
            }
            scope.getInputWidth = function() {
                switch(scope.spec.type) {
                    case "string":
                        return scope.spec.width || "20em";
                    case "integer":
                    case "float":
                        return scope.spec.width || "8em";
                    case "boolean":
                        return "34px";
                    case "choice":
                        return scope.spec.width || "12em";
                }
            }

        }
    }
});

prefsApp.directive('wehVersion',function() {
    return {
        restrict: "E",
        scope: true,
        replace: true,
        template: function(elem,attr) {
            return `
                <form class="form-horizontal">
                    <div class="form-group">
                        <label class="col-sm-4 control-label">
                            {{_("version")}}
                        </label>
                        <div class="col-sm-8">
                            <p class="form-control-static">{{versionName}}</p>
                        </div>
                    </div>
                </form>
            `
        },
        link: function(scope,element,attrs) {
            var manifest = browser.runtime.getManifest();
            var version = manifest.version;
            scope.versionName = manifest.version_name;
            if(scope.versionName)
                if(version && version!=scope.versionName) {
                    scope.versionName += " (" + version + ")";
                }
            else
                scope.versionName = version;
        }
    }
});


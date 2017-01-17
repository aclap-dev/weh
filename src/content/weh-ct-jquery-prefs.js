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

    $.fn.wehParams = function() {
        this.each( function() {

            var jElem = $(this);

            jElem.append($("<div/>").addClass("weh-buttons").wehPrefButtons());

            var widgets = {};
            var prefs = {
                values: weh.prefs.getAll()
            }
            function SendPrefs(param) {
                for(var key in widgets) {
                    if(param && param!=key)
                        continue;
                    var widget = widgets[key];
                    if(typeof prefs.values[key]!="undefined") {
                        widget.wehParam("value",prefs.values[key]);
                    }
                }
                UpdateButtons();
            }
            function UpdateSpecs(specs) {
                for(var key in specs) {
                    let spec = specs[key];
                    var widget = widgets[key];
                    if(widget)
                        widget.wehParam("spec",spec);
                }
                UpdateButtons();
            }
            weh.prefs.on({specs:true,pack:true},UpdateSpecs);

            function UpdatePrefs(prefs2) {
                Object.assign(prefs.values,prefs2);
                SendPrefs();
            }
            weh.prefs.on({pack:true},UpdatePrefs);

            jElem.on("weh-param",(event,extra)=>{
                widgets[extra.param] = extra.widget;
                SendPrefs(extra.param);
            });

            function AllWidgets() {
                var params = $();
                Object.keys(widgets).forEach((p)=>{
                    params = params.add(widgets[p]);
                });
                return params;
            }

            function UpdateButtons() {
                var info = AllWidgets().wehParam("info");
                var states = {
                    cancel: info.invalid || info.changed,
                    "default": info.invalid || info.notDefault,
                    save: !info.invalid && info.changed,
                }
                jElem.find(".weh-buttons").wehPrefButtons("setState",states);
            }

            jElem.on("weh-info",UpdateButtons);

            jElem.on("weh-action",(event,action)=>{
                switch(action) {
                    case "save":
                        var values = {};
                        AllWidgets().wehParam("get",values);
                        for(var param in values)
                            weh.prefs[param] = values[param];
                        AllWidgets().wehParam("set",values);
                        UpdateButtons();
                        break;
                    case "default":
                        var values = {};
                        var specs = weh.prefs.getSpecs();
                        for(var param in specs)
                            values[param] = specs[param].defaultValue;
                        AllWidgets().wehParam("set",values);
                        UpdateButtons();
                        break;
                    case "cancel":
                        var values = weh.prefs.getAll();
                        AllWidgets().wehParam("set",values);
                        UpdateButtons();
                        break;
                }
            });

            jElem.find("[data-weh-param-set]").wehParamSet();

        });
        return this;
    }

    $.fn.wehParamSet = function() {
        this.each( function() {
            var children = $(this).html();
            $(this).html(`
                <form class="weh-paramset-form form-horizontal" role="form">
                    ${children}
                </form>
            `);
            var form = $(this).find("form.weh-paramset-form");
            var params = $(this).attr("params") || "";
            params.split(",").forEach((paramName)=>{
                var param = $("<div/>");
                form.append(param);
                param.wehParam("new",paramName);
            });
        });
        return this;
    }

    $.fn.wehPrefButtons = function() {
        var args = arguments;
        var operation = args[0] || "new";
        this.each( function() {
            var jElem = $(this);
            switch(operation) {
                case "new":
                    jElem.html(`
                       <div class="text-center">
                            <br/>
                            <div class="btn-toolbar" style="display: inline-block">
                                <button type="button"
                                    action="cancel"
                                    class="btn btn-default disabled" data-weh-i18n="cancel">
                                </button>
                                <button type="button"
                                    action="default"
                                    class="btn btn-warning disabled" data-weh-i18n="default">
                                </button>
                                <button type="button"
                                    action="save"
                                    class="btn btn-primary disabled" data-weh-i18n="save">
                                </button>
                            </div>
                        </div>
                    `);
                    jElem.find("[data-weh-i18n]").wehI18n();
                    jElem.find("button").bind("click",(event)=>{
                        jElem.trigger("weh-action",$(event.target).attr("action"));
                    });
                    break;
                case "setState":
                    var states = args[1];
                    for(var action in states) {
                        var button = jElem.find(`button[action=${action}]`);
                        if(states[action])
                            button.removeClass("disabled");
                        else
                            button.addClass("disabled");
                    }
                    break;
            }
        });
        return this;
    }

    var weh_prefs_paramIndex = 1;

    $.fn.wehParam = function(operation) {
        var args = arguments;
        var changed = false;
        var invalid = false;
        var notDefault = false;
        this.each( function() {
            var jElem = $(this);
            var context = jElem.data("context");

            function Get() {
                if(!context.spec)
                    return undefined;
                if(context.spec.type=="boolean")
                    return context.input.prop("checked");
                else
                    return context.input.val();
            }

            function Set(value) {
                if(!context.spec)
                    return;
                if(context.spec.type=="boolean")
                    return context.input.prop("checked",value);
                else
                    return context.input.val(value);
            }

            function IsChanged() {
                var value = Get();
                if(typeof context.value!="undefined" && context.value != value)
                    return true;
                if(context.spec && typeof context.value=="undefined" && context.spec.defaultValue != value)
                    return true;
                return false;
            }

            function UpdateClass() {
                context.group.removeClass("has-success has-warning has-error");
                var value = Get();
                if(!weh.prefs.isValid(context.paramName,value))
                    return context.group.addClass("has-error");
                if(IsChanged())
                    return context.group.addClass("has-success");
                if(value != context.spec.defaultValue)
                    return context.group.addClass("has-warning");
            }

            switch(operation) {
                case "new":
                    context = {
                        paramName: args[1]
                    }
                    jElem.data("context",context);
                    jElem.trigger("weh-param",{
                        widget: jElem,
                        param: context.paramName
                    });
                    break;

                case "spec":
                    context.spec = args[1];
                    var paramIndex = weh_prefs_paramIndex++;
                    function BuildInput() {
                        switch(context.spec.type) {
                            case "string":
                            case "integer":
                            case "float":
                                return `
                                    <input
                                        class="weh-input form-control"
                                        maxLength="${context.spec.maxLength || -1}"
                                        id="weh-param-${paramIndex}"
                                        type="text"
                                        />
                                `;
                            case "boolean":
                                return `
                                    <input
                                        class="weh-input form-control"
                                        id="weh-param-${paramIndex}"
                                        type="checkbox"
                                        style="width:34px"
                                        />
                                `;
                            case "choice":
                                var options = context.spec.choices.map((option)=>{
                                    return `
                                        <option
                                            ng-repeat="option in spec.choices"
                                            value="${option.value}">
                                                ${option.name}
                                        </option>
                                    `;
                                });
                                return `
                                    <select
                                        ng-model="prefs.values[prefName]"
                                        class="weh-input form-control"
                                        id="weh-param-{{paramIndex}}"
                                        ng-style="{ width: getInputWidth() }">
                                        ${options.join("\n")}
                                    </select>
                                `;
                        }
                    }
                    jElem.html(`
                        <div class="weh-group form-group">
                            <label class="col-sm-4 control-label" for="weh-param-${paramIndex}">
                                ${context.spec.label}</label>
                            <div class="col-sm-8">
                                ${BuildInput()}
                                <div class="help-block" ng-show="spec.description">
                                    ${context.spec.description}
                                </div>
                            </div>
                        </div>
                    `);
                    context.group = jElem.find(".weh-group");
                    context.input = jElem.find(".weh-input");
                    function GetInputWidth() {
                        switch(context.spec.type) {
                            case "string":
                                return context.spec.width || "20em";
                            case "integer":
                            case "float":
                                return context.spec.width || "8em";
                            case "boolean":
                                return "34px";
                            case "choice":
                                return context.spec.width || "12em";
                        }
                    }
                    context.input.width(GetInputWidth());
                    Set(context.spec.defaultValue);
                    context.input.bind("change keyup",()=>{
                        UpdateClass();
                        jElem.trigger("weh-info");
                    });
                    break;

                case "value":
                    context.value = args[1];
                    Set(context.value);
                    UpdateClass();
                    break;

                case "info":
                    changed = changed || IsChanged();
                    invalid = invalid || (!weh.prefs.isValid(context.paramName,Get()));
                    notDefault = notDefault || (context.spec && Get()!=context.spec.defaultValue);
                    break;

                case "get":
                    var values = args[1];
                    values[context.paramName] = Get();
                    break;

                case "set":
                    var values = args[1];
                    if(typeof values[context.paramName!="undefined"]) {
                        Set(values[context.paramName]);
                        UpdateClass();
                    }
                    break;
            }
        });
        if(operation=="info")
            return {
                changed: changed,
                invalid: invalid,
                notDefault: notDefault
            }
        return this;
    }

    $.fn.wehVersion = function() {
        this.each( function() {
            var manifest = browser.runtime.getManifest();
            var version = manifest.version;
            var versionName = manifest.version_name;
            if(versionName)
                if(version && version!=versionName) {
                    versionName += " (" + version + ")";
                }
            else
                versionName = version;
            $(this).html(`
                <form class="form-horizontal">
                    <div class="form-group">
                        <label class="col-sm-4 control-label" data-weh-i18n="version">
                        </label>
                        <div class="col-sm-8">
                            <p class="form-control-static">${versionName}</p>
                        </div>
                    </div>
                </form>
            `);
            $(this).find("[data-weh-i18n]").wehI18n();
        });
        return this;
    }



}(jQuery));


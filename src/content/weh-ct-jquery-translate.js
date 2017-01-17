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

    $.fn.wehTranslationItem = function() {
        var args = arguments;
        var operation = args[0] || "new";
        var changed = false;
        this.each( function() {
            var key = $(this).attr("key");
            var original = $(this).attr("original");
            var custom = $(this).data("custom");
            var customOrg = $(this).data("customOrg");
            if(operation=="new")
                $(this).html(`
                    <div class="form-group">
                        <label class="col-sm-4 control-label" for="weh-${key}">
                            ${key}</label>
                        <div class="col-sm-8">
                            <input class="form-control"
                                type="text"
                                id="weh-${key}"
                                />
                            <div class="help-block">${original}</div>
                        </div>
                    </div>
                `);
            var group = $(this).find(".form-group");
            var input = $(this).find("input");
            if(operation=="new") {
                input.val(custom && custom.message || "");
                input.bind("change keyup",() => {
                    var value = input.val();
                    if(value!==(customOrg.message || ""))
                        group.addClass("has-success");
                    else
                        group.removeClass("has-success");
                    $.event.trigger({
                        type: "wehChange",
                        message: key,
                        time: new Date()
                    });
                });
            }
            changed = changed || (input.val()!==(customOrg && customOrg.message || ""));
            if(operation=="save") {
                var val = input.val();
                if(val.length>0) {
                    args[1][key] = val;
                    customOrg.message = val;
                    group.removeClass("has-success");
                }
            }
        });
        if(operation=="isChanged")
            return changed;
        return this;
    }

    $.fn.wehTranslation = function() {
        this.each( function() {
            var transRoot = $(this);
            var keys = {}
            transRoot.html(`
                <div>
                    <form class="form-horizontal"
                        role="form">

                        <div
                            class="form-group"
                            style="background-color:#eee;padding:8px">
                            <div class="col-sm-4"></div>
                            <div class="col-sm-8">
                                <input class="form-control"
                                    id="search"
                                    placeholder="Search..."
                                    type="text"
                                    />
                            </div>
                        </div>

                        <div class="weh-translation-item-model" style="display:none"></div>

                    </form>
                    <div class="text-center">
                        <br/>
                        <div class="btn-toolbar" style="display:inline-block">
                            <button type="button"
                                id="save"
                                class="btn btn-primary disabled">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            `);
            var custom = JSON.parse(window.localStorage.getItem("wehI18nCustom")) || {};
            function Update() {
                transRoot.find(".weh-translation-item").remove();
                var model = transRoot.find(".weh-translation-item-model");
                keys.forEach((key) => {
                    model.parent().append(
                        model.clone()
                        .removeClass("weh-translation-item-model")
                        .addClass("weh-translation-item")
                        .attr("key",key)
                        .attr("original",browser.i18n.getMessage(key))
                        .data("custom", custom[key] || {})
                        .data("customOrg", custom[key] || {})
                        .show()
                        .wehTranslationItem()
                    );
                });
            }
            function UpdateKeys(message) {
                keys = message.i18nKeys;
                Update();
            }
            var search = $("#search");
            function UpdateSearch() {
                var query = search.val();
                keys.forEach((key) => {
                    var elem = $(`.weh-translation-item[key=${key}]`);
                    if(elem.length==0)
                        return;
                    if(query.length==0)
                        return elem.show();
                    if(key.indexOf(query)>=0)
                        return elem.show();
                    var customOrg = elem.data("customOrg");
                    if(customOrg.message && custom.message.indexOf(query)>=0)
                        return elem.show();
                    if(elem.attr("original").indexOf(query)>=0)
                        return elem.show();
                    elem.hide();
                });
            }
            search.bind("change keyup",UpdateSearch);
            var save = $("#save");
            save.bind("click",()=>{
                var transMap = {}
                transRoot.find(".weh-translation-item").wehTranslationItem("save",transMap);
                var newCustom = {};
                for(var key in transMap) {
                    newCustom[key] = custom[key] || {};
                    newCustom[key].message = transMap[key];
                }
                custom = newCustom;
                window.localStorage.setItem("wehI18nCustom",
                    JSON.stringify(custom));
                save.addClass("disabled");
            });
            $(document).on("wehChange",()=>{
                var changed = transRoot.find(".weh-translation-item").wehTranslationItem("isChanged");
                if(changed)
                    save.removeClass("disabled");
                else
                    save.addClass("disabled");
            });
            weh.on("weh#i18n-keys",UpdateKeys);
            weh.post({type:"weh#get-i18n-keys"});
        });

    }

}(jQuery));


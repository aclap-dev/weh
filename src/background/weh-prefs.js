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

    function Prefs() {

        this.$specs = {};
        this.$values = null
        try {
            this.$values = JSON.parse(localStorage.getItem("prefs"));
        } catch(e) {
            console.error("weh: error loading prefs",e);
        }
        if(!this.$values)
            this.$values = {};
        this.$listeners = {};

    }

    Prefs.prototype = {

        declare: function(specs) {

            var self = this;

            if(!Array.isArray(specs))
                specs = Object.keys(specs).map(function(prefName) {
                    var spec = specs[prefName];
                    spec.name = prefName;
                    return spec;
                });

            specs.forEach(function(spec) {

                if(forbiddenKeys[spec.name])
                    throw new Error("Forbidden prefs key "+spec.name);

                var localeName = spec.name.replace(/[^0-9a-zA-Z_]/g,'_');
                spec.label = spec.label || weh._("weh_prefs_label_"+localeName) || spec.name;
                spec.description = spec.description || weh._("weh_prefs_description_"+localeName) || "";

                if(!self.$specs[spec.name])
                    (function(p) {
                        Object.defineProperty(self, p, {
                            set: function(val) {
                                var oldVal = self.$values[p];
                                if(oldVal===val)
                                    return;
                                self.$values[p] = val;
                                localStorage.setItem("prefs",JSON.stringify(self.$values));
                                var terms = p.split(".");
                                var keys = [];
                                for(var i=terms.length;i>=0;i--)
                                    keys.push(terms.slice(0,i).join("."));
                                keys.forEach(function(key) {
                                    var listeners = self.$listeners[key];
                                    if(listeners)
                                        listeners.forEach(function(listener) {
                                            try {
                                                listener(p,val,oldVal);
                                            } catch(e) {}
                                        });
                                });
                            },
                            get: function() {
                                return self.$values[p]!==undefined ? self.$values[p] : null;
                            }
                        });
                    })(spec.name);

                self.$specs[spec.name] = spec;
                if(typeof self.$values[spec.name]=="undefined")
                    self.$values[spec.name] = spec.defaultValue;
            });

        },

        on: function(pref,callback) {
            if(!this.$listeners[pref])
                this.$listeners[pref] = [];
            this.$listeners[pref].push(callback);
        },

        off: function(pref,callback) {
            var listeners = this.$listeners[pref];
            if(!listeners)
                return;
            for(var i=listeners.length-1;i>=0;i--)
                if(!callback || listeners[i]==callback)
                    listeners.splice(i,1);
        },

        getAll: function() {
            return Object.assign({},this.$values);
        },

        getSpecs: function() {
            return Object.assign({},this.$specs);
        },

        assign: function(prefs) {
            console.info("prefs.assign",prefs);
            for(var k in prefs)
                this[k] = prefs[k];
        }

    }


    weh.prefs = new Prefs();

    var forbiddenKeys = {};
    for(var k in weh.prefs)
        forbiddenKeys[k] = true;

})();

sap.ui.define([
    
], function() {
    'use strict';
    
    var oCache = new Map();

    return {
        get: function(vKey) {
            return oCache.get(vKey);
        },
        has: function(vKey) {
            return oCache.has(vKey);
        },
        set: function(vKey, vValue) {
            if(!oCache.has(vKey)) {
                return oCache.set(vKey, vValue);
            }

            return false;
        }
    }
});
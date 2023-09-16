sap.ui.define([
	"sap/ui/core/Control",
    "z_tech_appeal/controls/UploadCollectionAttributeType",
    "sap/ui/base/Object"
], function (Control, UploadCollectionAttributeType, BaseObject) {
	"use strict";

	var UploadCollectionAttribute = Control.extend("z_tech_appeal.controls.UploadCollectionAttribute", {
        metadata : {
			properties : {
                value: 	{type : "string", defaultValue : ""},
                label: {type : "string", defaultValue : ""},
                name: {type : "string", defaultValue : ""},
                required: {type : "boolean", defaultValue : false},
                type: {type : "string", defaultValue : UploadCollectionAttributeType.Input},

            },
			aggregations : {
				items : {type : "sap.ui.core.Item", multiple: true }
			}
		},

        _oMethodMapping: {
            'getValue': {
                [UploadCollectionAttributeType.Input]: 'getValue',
                [UploadCollectionAttributeType.Select]: 'getSelectedKey'
            },

            'setValue': {
                [UploadCollectionAttributeType.Input]: 'setValue',
                [UploadCollectionAttributeType.Select]: 'setSelectedKey'
            }
        },

        _oControlClassMapping: {
            [UploadCollectionAttributeType.Input]: 'sap/m/Input',
            [UploadCollectionAttributeType.Select]: 'sap/m/Select'
        },

        _oControlParameterMapping: {
            items: {
                [UploadCollectionAttributeType.Input]: 'suggestionItems',
                [UploadCollectionAttributeType.Select]: 'items'
            }
        },

        init: function() {
            this._oControl = null;
        },

        exit: function() {
            this.getControl().destroy();
        },

        getValue: function() {
            var sType = this.getProperty('type');
            var oControl = this.getControl();

            return oControl[this._oMethodMapping.getValue[sType]]();
        },

        setValue: function(vValue) {
            var sType = this.getProperty('type');
            var oControl = this.getControl();

            oControl[this._oMethodMapping.setValue[sType]](vValue);

            return this;
        },

        getControl: function() {
            if(!this._oControl) {
                var sType = this.getProperty('type');
                var oControlClass = sap.ui.require(this._oControlClassMapping[sType]);

                this._oControl = new oControlClass({
                    [this._oControlParameterMapping.items[sType]]: this.getAggregation('items'),
                    name: this.getProperty('name')
                });
            }

            return this._oControl;
        },


        getAttributeObject: function() {
            return {
                label: this.getLabel(),
                name: this.getName(),
                value: this.getValue(),
                required: this.getRequired(),
                type: this.getType()
            }
        },

        resetValue: function() {
            return this.setValue(undefined);
        }
	});

    return UploadCollectionAttribute;
});
sap.ui.define([
  "sap/m/UploadCollection",
    "sap/m/UploadCollectionRenderer",
    "sap/m/Button",
    "sap/m/ButtonType",
    "sap/m/Dialog",
    "sap/m/OverflowToolbar",
    "sap/m/ToolbarSpacer",
    "sap/m/Title",
    "sap/m/Input",
    "sap/ui/layout/form/SimpleForm",
    "sap/m/Label",
    "sap/ui/thirdparty/jquery",
    "sap/m/ObjectStatus",
    "sap/m/MessageBox"
], function (UploadCollection,UploadCollectionRenderer, Button, ButtonType, Dialog, OverflowToolbar, ToolbarSpacer, Title, Input, SimpleForm, Label, jQuery, ObjectStatus, MessageBox) {
  "use strict";
  return UploadCollection.extend("z_tech_appeal.controls.UploadCollection", {

        _bIsToolbarExtended: false,
        _bIsUploadDialogOpen: false,
        _oAdditionalControls: {},

    metadata : {
            properties: {
                uploadDialogTitle: 	{type : "string", defaultValue : ""},
                useExtension: { type: 'boolean', default: false }
            },
      aggregations : {
        items : { type : "sap.m.UploadCollectionItem", multiple: true },
                attributes: { type: "z_tech_appeal.controls.UploadCollectionAttribute", multiple: true }
      }
    },

        init: function() {
            UploadCollection.prototype.init.apply(this, arguments);
        },

        exit: function() {
            UploadCollection.prototype.exit.apply(this, arguments);

            jQuery.map(this._oAdditionalControls, function(oControl, key) {
                this._oAdditionalControls[key] = oControl.destroy();
            }.bind(this));
        },

        renderer: function(oRm, oControl) {
            UploadCollectionRenderer.render.apply(this, arguments);
        },

        _handleUploadButtonPress: function(oEvent) {
            this._openUploadDialog();
        },

        _handleCancelPress: function(oEvent) {
            this._closeUploadDialog();
        },

        _handleUploadPress: function(oEvent) {

            if(this._validateUploadAttributes()) {
                this.openFileDialog();
            } else {
                MessageBox.error("Заполните все обязательные поля", {
                    styleClass: "sapUiSizeCompact"
                });
            }
        },

        _resetUploadAttributes: function() {
            var aAttributes = this.getAggregation('attributes');

            jQuery.each(aAttributes, function(index, oAttribute) {
                oAttribute.resetValue();
            }.bind(this));
        },

        _onChange: function(oEvent) {
            var oFileUploader = oEvent.getSource();
            var bUseExtesion = this.getProperty('useExtension');
            
            if(bUseExtesion) {
              oFileUploader._aUploadAttributes = this._getUploadAttributes();

              UploadCollection.prototype._onChange.apply(this, arguments);

              jQuery.each(this.getAggregation('items'), function(index, oItem) {
                  var sFileUploadId = oItem.getAssociation('fileUploader');
                  var oFileUploader = sap.ui.getCore().byId(sFileUploadId);
                  oItem.aUplaodAttributes = oFileUploader._aUploadAttributes;

                  jQuery.each(oItem.aUplaodAttributes, function(index, oUploadAttribute) {
                      oItem.addStatus(new ObjectStatus({ title: oUploadAttribute.label, text: oUploadAttribute.value }));
                  }.bind(this));
              }.bind(this));
              
              this._closeUploadDialog();
            } else {
              UploadCollection.prototype._onChange.apply(this, arguments);
            }
        },

        _validateUploadAttributes: function() {
            var aValidations = jQuery.map(this._getUploadAttributes(), function(oUploadAttribute) {
                var bIsRequired = oUploadAttribute.required;
                var bIsValue = oUploadAttribute.value;

                return !bIsRequired || (bIsRequired && !!bIsValue);
            }.bind(this));

            return aValidations.indexOf(false) < 0;
        },

        _openUploadDialog: function() {
            if(!this._bIsUploadDialogOpen) {
                this._getUploadDialog().open();
                this._bIsUploadDialogOpen = true;
            }
        },

        _closeUploadDialog: function() {
            if(this._bIsUploadDialogOpen) {
                this._getUploadDialog().close();
                this._resetUploadAttributes();
                this._bIsUploadDialogOpen = false;
            }
        },

        _getUploadAttributes: function() {
            var aAttributes = this.getAggregation('attributes');

            return jQuery.map(aAttributes, function(oAttribute, index) {
               return oAttribute.getAttributeObject();
            }.bind(this));
        },

        _getUplaodButton: function() {
            if(!this._oAdditionalControls.oUploadButton) {
                this._oAdditionalControls.oUploadButton = new Button({
                    icon: 'sap-icon://add',
                    type: ButtonType.Transparent,
                    visible: !this.getUploadButtonInvisible(),
                    press: this._handleUploadButtonPress.bind(this)
                });
            }

            return this._oAdditionalControls.oUploadButton;
        },

        _getDialogButtons: function() {
            if(!this._oAdditionalControls.oDialogUploadButton) {
                this._oAdditionalControls.oDialogUploadButton = new Button({
                    text: 'Загрузить файл',
                    press: this._handleUploadPress.bind(this)
                });
            }

            if(!this._oAdditionalControls.oDialogCancelButton) {
                this._oAdditionalControls.oDialogCancelButton = new Button({
                    text: 'Отмена',
                    press: this._handleCancelPress.bind(this)
                });
            }

            return [
                this._oAdditionalControls.oDialogUploadButton,
                this._oAdditionalControls.oDialogCancelButton
            ]
        },

        _getUploadDialog: function() {
            if(!this._oAdditionalControls.oUploadDialog) {
                this._oAdditionalControls.oUploadDialog = new Dialog({
                    title: this.getProperty('uploadDialogTitle'),
                    content: this._getDialogForm(),
                    buttons: this._getDialogButtons(),
                    styleClass: "sapUiSizeCompact"
                });
            }

            return this._oAdditionalControls.oUploadDialog;
        },

        _getDialogForm: function() {
            if(!this._oAdditionalControls.oDialogForm) {
                var aAttributes = this.getAggregation('attributes');
                this._oAdditionalControls.oDialogForm = new SimpleForm({
                    content: aAttributes.reduce(function(aContent, oAttribute) {
                        var aContentPart = [
                            new Label({ 
                                text: oAttribute.getProperty('label'), 
                                required: oAttribute.getProperty('required')
                            }),
                            oAttribute.getControl()
                        ];

                        return aContent.concat(aContentPart);
                    }.bind(this), [])
                });
            }

            return this._oAdditionalControls.oDialogForm;
        },

        _getListHeader: function() {
            UploadCollection.prototype._getListHeader.apply(this, arguments);

            var bUseExtension = this.getProperty('useExtension');

            if(bUseExtension && !this._bIsToolbarExtended) {
                this._oHeaderToolbar.addContent(this._getUplaodButton());
                this._toggleFileUploaderVisibility(this._oFileUploader, false);

                this._bIsToolbarExtended = true;
            }

            if(!bUseExtension && this._bIsToolbarExtended) {
                this._oHeaderToolbar.removeContent(this._getUplaodButton());
                this._toggleFileUploaderVisibility(this._oFileUploader, true);

                this._bIsToolbarExtended = false;
            }
        },

        _getFileUploader: function() {
            var oFileUploader = UploadCollection.prototype._getFileUploader.apply(this, arguments);
            var bUseExtension = this.getProperty('useExtension');

            return this._toggleFileUploaderVisibility(oFileUploader, !bUseExtension);
        },

        _toggleFileUploaderVisibility: function(oFileUploader, bVisible) {
            var bHasClass = oFileUploader.hasStyleClass('invisibility');
            
            if(bVisible && bHasClass) {
                oFileUploader.removeStyleClass('invisibility');
            }

            if(!bVisible && !bHasClass) {
                oFileUploader.addStyleClass('invisibility');
            }

            return oFileUploader;
        },

        setUploadButtonInvisible: function(bUploadButtonInvisible) {
            return UploadCollection.prototype.setUploadButtonInvisible.apply(this, arguments);

            // if(this._oUploadButton) {
            //     this._oUploadButton.setVisible(!bUploadButtonInvisible);
            // }

            // return this;
        },

        setUseExtension: function(bValue) {
            this.setProperty('useExtension', bValue);
            this.removeAllItems();

            return this;
        }
        
  });
});
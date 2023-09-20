/* global document */
sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/m/MessageToast",
    "z_tech_appeal/model/models",
    "z_tech_appeal/controller/ListSelector",
    "z_tech_appeal/controller/ErrorHandler",
    "./utils/SignTool",
    "sap/m/MessageBox"
  ],
  function (
    UIComponent,
    Device,
    MessageToast,
    models,
    ListSelector,
    ErrorHandler,
    SignTool,
    MessageBox
  ) {
    "use strict";

    return UIComponent.extend("z_tech_appeal.Component", {
      metadata: {
        manifest: "json"
      },
      
      init: function () {
        this.oListSelector = new ListSelector();
        this._oErrorHandler = new ErrorHandler(this);

        // set the device model
        this.setModel(models.createDeviceModel(), "device");

        // call the base component's init function and create the App view
        UIComponent.prototype.init.apply(this, arguments);

        // create the views based on the url/hash
        this.getRouter().initialize();
        
        this.oAttachmentSignTool = new SignTool('z_tech_appeal/resources/codesplugin_api', {
        	cache: true,
        	decoding: 'utf-8'
        });
        
        this.oDocumentSignTool = new SignTool('z_tech_appeal/resources/codesplugin_api', {
        	cache: true,
        	decoding: 'windows-1251'
        });
      },

      destroy: function () {
        this.oListSelector.destroy();
        this.oDocumentSignTool.destroy();
        this.oAttachmentSignTool.destroy();
        this._oErrorHandler.destroy();
        UIComponent.prototype.destroy.apply(this, arguments);
      },

      getContentDensityClass: function () {
        if (this._sContentDensityClass === undefined) {
          // check whether FLP has already set the content density class; do nothing in this case
          if (
            jQuery(document.body).hasClass("sapUiSizeCozy") ||
            jQuery(document.body).hasClass("sapUiSizeCompact")
          ) {
            this._sContentDensityClass = "";
          } else if (!Device.support.touch) {
            // apply "compact" mode if touch is not supported
            this._sContentDensityClass = "sapUiSizeCompact";
          } else {
            // "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
            this._sContentDensityClass = "sapUiSizeCozy";
          }
        }
        return this._sContentDensityClass;
      },
    });
  }
);
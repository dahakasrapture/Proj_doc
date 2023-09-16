sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/UploadCollectionParameter",
    "sap/ui/thirdparty/jquery"
  ],
  function (Controller, MessageToast, UploadCollectionParameter, jQuery) {
    "use strict";
    return {
      //////main function body///////begin/////////// ZodataAjaxUploader.controller.js
      PingFunc: function (iPing) {
        if (!iPing) {
          iPing = "Hi from ZodataAjaxUploader";
        }
        MessageToast.show(iPing.toString());
      },

      JustUpload: function (oEvent, ithis, inoUploadCollection) {
        this._onStartUpload(oEvent, ithis, inoUploadCollection);
      },

      _onStartUpload: function (oEv, ithat, inoUploadCollection) {
        var vCsrfToken = oEv.getParameters()["headers"]["x-csrf-token"];
        // var oUploadCollection = ithat.byId("UploadCollection");
        var oUploadCollection = inoUploadCollection;

        var uploadUrl =
          "/sap/opu/odata/sap/ZTC_MSGTECH_GTW_SRV/TechMsgAttachmentSet";

        jQuery.ajax({
          url: uploadUrl,
          type: "GET",
          "Content-Type": "application/json",
          dataType: "json",
          beforeSend: function (xhr) {
            xhr.setRequestHeader("X-CSRF-Token", "Fetch");
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            xhr.setRequestHeader("DataServiceVersion", "2.0");
          },

          //  var aSelectedItems = oUploadCollection.getSelectedItems();
          /*
      var aSelectedItems = oUploadCollection.getItems();
      if (aSelectedItems) {
        for (var i = 0; i < aSelectedItems.length; i++) {
        //  oUploadCollection.downloadItem(aSelectedItems[i], true);
        oUploadCollection.setSelectedItem(aSelectedItems[i], true);
        }
      } else {
        sap.m.MessageToast.show("Select an item to download");
      }
      oUploadCollection.upload();
    */
          success: function (data, textStatus, XMLHttpRequest) {
            var token = XMLHttpRequest.getResponseHeader("X-CSRF-Token");
            var oCustomerHeaderToken = new UploadCollectionParameter({
              name: "x-csrf-token",
              value: token,
            });
            oUploadCollection.addHeaderParameter(oCustomerHeaderToken);
            oUploadCollection.addParameter(oCustomerHeaderToken);

            var oCustomerHeaderSlug = new UploadCollectionParameter({
              name: "slug",
              value: "slug_name",
            });
            oUploadCollection.addHeaderParameter(oCustomerHeaderSlug);
            oUploadCollection.addParameter(oCustomerHeaderSlug);

            var oCustomerHeaderxreq = new UploadCollectionParameter({
              name: "X-Requested-With",
              value: "XMLHttpRequest",
            });
            oUploadCollection.addHeaderParameter(oCustomerHeaderxreq);
            oUploadCollection.addParameter(oCustomerHeaderxreq);
            /*
          var oCustomerHeaderContentType = new UploadCollectionParameter({
            name: "Content-Type",
            value: "application/atom+xml"
          });
          oUploadCollection.addHeaderParameter(oCustomerHeaderContentType);


          DataServiceVersion
          */

            /// oUploadCollection.upload();
            var aSelectedItems = oUploadCollection.getItems();
            //var Upload2MSG = uploadUrl + "(MsgId='" + ithat._newMsgId + "')";
            if (aSelectedItems) {
              var fileNum = 0;
              if (aSelectedItems.length === fileNum) {
                ithat.filesUploaded();
              }
              for (var i = 0; i < aSelectedItems.length; i++) {
                //  oUploadCollection.downloadItem(aSelectedItems[i], true);
                // oUploadCollection.setSelectedItem(aSelectedItems[i], true);
                var fd = aSelectedItems[i].getFileName();
                var fileuploader_str =
                  aSelectedItems[i].getFileUploader().toString() +
                  "-fu".toString();
                var fileuploader = jQuery.sap.domById(fileuploader_str);
                //if(!(fileuploader)){  continue; }
                var file = fileuploader.files[0];
                var vSlug = ithat._newMsgId + "_$_$_" + file.name;
                var aUploadAttrs = aSelectedItems[i].aUplaodAttributes;
                jQuery.ajax({
                  url: uploadUrl,
                  type: "POST",
                  processData: false,
                  contentType: file.type,
                  data: file,
                  filename: file.name,
                  beforeSend: function (xhr) {
                    xhr.setRequestHeader("X-CSRF-Token", token);
                    xhr.setRequestHeader("FILE_NAME", encodeURI(file.name));
                    xhr.setRequestHeader("SLUG", encodeURI(vSlug));
                    
                    if(aUploadAttrs) {
                    	jQuery.each(aUploadAttrs, function(index, oUploadAttribute) {
		                    xhr.setRequestHeader(oUploadAttribute.name, encodeURI(oUploadAttribute.value));
		                }.bind(this));
                    }
                  },
                  success: function (data, textStatus, XMLHttpRequest) {
                    var resptext = XMLHttpRequest.responseText;
                    jQuery.sap.require("sap.m.MessageToast");
                    // sap.ui.commons.MessageBox.show(resptext, sap.ui.commons.MessageBox.Icon.INFORMATION, "Information");
                    // sap.ui.getCore().byId("BatchTable").getModel().refresh();
                    sap.m.MessageToast.show(
                      "Файл " + file.name.toString() + " успешно загружен"
                    );
                    fileNum++;
                    if (aSelectedItems.length === fileNum) {
                      sap.m.MessageToast.show("Файлы успешно загружены");
                      ithat.filesUploaded();
                    }
                  },
                  error: function (data, textStatus, XMLHttpRequest) {
                    // sap.ui.commons.MessageBox.show("File could not be uploaded.", sap.ui.commons.MessageBox.Icon.ERROR, "Error");
                    jQuery.sap.require("sap.m.MessageToast");
                    sap.m.MessageToast.show(
                      "Файл " + file.name.toString() + " загрузить не удалось"
                    );
                  },
                });
              }

              //
            } else {
              sap.m.MessageToast.show("Select an item to download");
            }
            /*
             */
          },
        });
      },

      getMasterController: function () {
        var oMasterLaunchpad = sap.ui
          .getCore()
          .byId("application-Z_TECH_APPEAL-display-component---master");
        if (!(oMasterLaunchpad === undefined)) {
          return oMasterLaunchpad.getController();
        }
        var oMasterDirect = sap.ui.getCore().byId("Z_MSG_TECH_V1---master");
        if (!(oMasterDirect === undefined)) {
          return oMasterDirect.getController();
        }
      },

      //////main function body////////end ///////////////
    };
  }
);
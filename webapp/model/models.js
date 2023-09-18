sap.ui.define(
  ["sap/ui/model/json/JSONModel", "sap/ui/Device"],
  function (JSONModel, Device) {
    "use strict";

    return {
      createDeviceModel: function () {
        var oModel = new JSONModel(Device);
        oModel.setDefaultBindingMode("OneWay");
        return oModel;
      },

      path2DetailData: function (MsgId) {
        var vMsgId = "('" + MsgId + "')";
        var odataDetailData =
          "/sap/opu/odata/SAP/ZTC_MSGTECH_GTW_SRV/TechMsgDetailSet" +
          vMsgId +
          "/?$format=json&$expand=AisStatusCatalog,RequestBaseCatalog";
        return odataDetailData;
      },

      path2ItemsData: function (MsgId) {
        var odatapath =
          "/sap/opu/odata/SAP/ZTC_MSGTECH_GTW_SRV/TechMsgItemSet/?$filter=(MessageId eq '" +
          MsgId +
          "')&$format=json";
        return odatapath;
      },

      path2DetailAttach: function (MsgId) {
        //var vMsgId = "('" + MsgId + "')";
        var odatapath =
          "/sap/opu/odata/SAP/ZTC_MSGTECH_GTW_SRV/TechMsgAttachmentSet/?$filter=(MsgId eq '" +
          MsgId +
          "')&$format=json";
        return odatapath;
      },

      path2DetailChatText: function (MsgId) {
        var odatapath =
          "/sap/opu/odata/SAP/ZTC_MSGTECH_GTW_SRV/TechChatSet/?$filter=(MsgId eq '" +
          MsgId +
          "')&$format=json";
        return odatapath;
      },

      path2DocCatalogSet: function (DocId) {
        var vDocId = "('" + DocId + "')";
        var odataDetailDocData =
          "/sap/opu/odata/SAP/ZTC_MSGTECH_GTW_SRV/DocumentCodeCatalogSet" +
          vDocId +
          "/?$format=json";
        return odataDetailDocData;
      },

    };
  }
);
/*global history */
sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/core/routing/History", "../resources1/codesplugin_api"], function(Controller, History) {
  "use strict";
  return Controller.extend("z_tech_appeal.controller.BaseController", {

    getRouter: function() {
      return this.getOwnerComponent().getRouter();
    },

    getModel: function(sName) {
      return this.getView().getModel(sName);
    },

    setModel: function(oModel, sName) {
      return this.getView().setModel(oModel, sName);
    },

    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n").getResourceBundle();
    },

    onNavBack: function() {
      var sPreviousHash = History.getInstance().getPreviousHash();
      if (sPreviousHash !== undefined) {
        history.go(-1);
      } else {
        this.getRouter().navTo("master", {}, true);
      }
    },

     // TODO Транспортный контейнер
     
     onFileIdBindingChange: function(oEvent) {
     	var sRecivedValue = oEvent.getSource().getValue();
     	var oInput = this.byId('FileId');

     	oInput.setSelectedKey(sRecivedValue);
     },
     
     onKndBindingChange: function(oEvent) {
     	var sRecivedValue = oEvent.getSource().getValue();
     	var oInput = this.byId('Knd');

     	oInput.setSelectedKey(sRecivedValue);
     },

     onFileIdFilterBarSearch: function(oEvent) {
      var aSelectionSet = oEvent.getParameter('selectionSet');
      var TypeBukrs = this.byId("ComboMessageType3").getSelectedKey();
      var aFilters = [ new sap.ui.model.Filter('Bukrs', 'EQ', TypeBukrs) ];

      for(var i = 0; i < aSelectionSet.length; i++) {
        var oSelection = aSelectionSet[i];
        var sValue = oSelection.getValue();
        var sName = oSelection.getName();

        if(sValue && sName) {
          var oFilter = new sap.ui.model.Filter(sName, 'Contains', sValue);
          aFilters.push(oFilter);
        }
      }

      this._oValueHelpFileIdDialog.getTableAsync().then(function(oTable) {
        var oBinding = null;

        if (oTable.bindRows) {
          oBinding = oTable.getBinding('rows');
        }

        if (oTable.bindItems) {
          oBinding = oTable.getBinding('items');
        }

        if(oBinding) {
          oBinding.filter(aFilters);
        }
      }.bind(this));
    },

    onFileIdValueHelp: function(oEvent) {
      var oInput = oEvent.getSource();
      var sArea = oInput.data('area');
      var TypeBukrs;
      
      if(sArea === 'create') {
        TypeBukrs = this.byId("ComboMessageType3").getSelectedKey();
      } else if(sArea === 'update') {
        TypeBukrs = this.getModel('DetailData').getProperty('/d/Bukrs');
      }

      this._oValueHelpFileIdColumnModel = this.getModel('ValueHelpFileIdColumnModel');
      this._oValueHelpFileIdDialog = sap.ui.xmlfragment("z_tech_appeal.view.ValueHelpDialogFileId", this);
      this.getView().addDependent(this._oValueHelpFileIdDialog);

      this._oValueHelpFileIdDialog.getTableAsync().then(function (oTable) {
        var aCols = this._oValueHelpFileIdColumnModel.oData.cols;

        oTable.setModel(this.getModel());
        oTable.setModel(this._oValueHelpFileIdColumnModel, "columns");

        if (oTable.bindRows) {
          oTable.bindAggregation("rows", {
            path: "/FileCatalogSet",
            filters: [
              new sap.ui.model.Filter('Bukrs', 'EQ', TypeBukrs)
            ]
          });
        }

        if (oTable.bindItems) {
          oTable.bindAggregation("items", "/FileCatalogSet", function () {
            return new sap.m.ColumnListItem({
              cells: aCols.map(function (column) {
                return new sap.m.Label({ text: "{" + column.template + "}" });
              })
            });
          });
        }

        this._oValueHelpFileIdDialog.update();
      }.bind(this));

      var oToken = new sap.m.Token();
      oToken.setKey(oInput.getSelectedKey());
      oToken.setText(oInput.getValue());
      this._oValueHelpFileIdDialog.setTokens([oToken]);
      this._oValueHelpFileIdDialog.open();
    },

    onFileIdValueHelpOkPress: function (oEvent) {
      this._oValueHelpFileIdDialog.getTableAsync().then(function (oTable) {
        var iSelectedIndex = oTable.getSelectedIndex();
        var aRows = oTable.getRows();
        var oSelectedRow = null;

        for(var i = 0; i < aRows.length; i++) {
          if(aRows[i].getIndex() === iSelectedIndex) {
            oSelectedRow = aRows[i];
            break;
          }
        }

        if(oSelectedRow) {
          var oBindingContext = oSelectedRow.getBindingContext();
          var oProperty = oBindingContext.getProperty();

          this.byId("Knd").setSelectedKey(oProperty.Knd);
          this.byId("Repyear").setValue(oProperty.Repyear);
          this.byId("TaxInspectionCode").setValue(oProperty.TaxInspectionCode);
          this.byId("ContType").setValue(oProperty.ContType);
          this.byId("DocName").setValue(oProperty.DocName);
          this.byId("FileName").setValue(oProperty.FileName);
        }
      }.bind(this));

      var oInput = this.byId('FileId');
      var aTokens = oEvent.getParameter("tokens");
      oInput.setSelectedKey(aTokens[0].getKey());
      this._oValueHelpFileIdDialog.close();
    },

    onFileIdValueHelpCancelPress: function () {
      this._oValueHelpFileIdDialog.close();
    },

    onFileIdValueHelpAfterClose: function () {
      this._oValueHelpFileIdDialog.destroy();
    },

    onKndFilterBarSearch: function(oEvent) {
      var aSelectionSet = oEvent.getParameter('selectionSet');
      var aFilters = [];

      for(var i = 0; i < aSelectionSet.length; i++) {
        var oSelection = aSelectionSet[i];
        var sValue = oSelection.getValue();
        var sName = oSelection.getName();

        if(sValue && sName) {
          var oFilter = new sap.ui.model.Filter(sName, 'Contains', sValue);
          aFilters.push(oFilter);
        }
      }

      this._oValueHelpKndDialog.getTableAsync().then(function(oTable) {
        var oBinding = null;

        if (oTable.bindRows) {
          oBinding = oTable.getBinding('rows');
        }

        if (oTable.bindItems) {
          oBinding = oTable.getBinding('items');
        }

        if(oBinding) {
          oBinding.filter(aFilters);
        }
      }.bind(this));
    },

    onKndValueHelp: function() {
      var oInput = this.byId('Knd');

      this._oValueHelpKndColumnModel = this.getModel('ValueHelpKndColumnModel');
      this._oValueHelpKndDialog = sap.ui.xmlfragment("z_tech_appeal.view.ValueHelpDialogKnd", this);
      this.getView().addDependent(this._oValueHelpKndDialog);

      this._oValueHelpKndDialog.getTableAsync().then(function (oTable) {
        var aCols = this._oValueHelpKndColumnModel.oData.cols;

        oTable.setModel(this.getModel());
        oTable.setModel(this._oValueHelpKndColumnModel, "columns");

        if (oTable.bindRows) {
          oTable.bindAggregation("rows", "/KndCatalogSet");
        }

        if (oTable.bindItems) {
          oTable.bindAggregation("items", "/KndCatalogSet", function () {
            return new sap.m.ColumnListItem({
              cells: aCols.map(function (column) {
                return new sap.m.Label({ text: "{" + column.template + "}" });
              })
            });
          });
        }

        this._oValueHelpKndDialog.update();
      }.bind(this));

      var oToken = new sap.m.Token();
      oToken.setKey(oInput.getSelectedKey());
      oToken.setText(oInput.getValue());
      this._oValueHelpKndDialog.setTokens([oToken]);
      this._oValueHelpKndDialog.open();
    },

    onKndValueHelpOkPress: function (oEvent) {
      var oInput = this.byId('Knd');
      var aTokens = oEvent.getParameter("tokens");
      oInput.setSelectedKey(aTokens[0].getKey());
      this._oValueHelpKndDialog.close();
    },

    onKndValueHelpCancelPress: function () {
      this._oValueHelpKndDialog.close();
    },

    onKndValueHelpAfterClose: function () {
      this._oValueHelpKndDialog.destroy();
    },

  });
});
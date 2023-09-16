/*global history */
sap.ui.define(
  [
    "z_tech_appeal/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/GroupHeaderListItem",
    "sap/ui/Device",
    "z_tech_appeal/model/formatter",
  ],
  function (
    BaseController,
    JSONModel,
    Filter,
    FilterOperator,
    GroupHeaderListItem,
    Device,
    formatter
  ) {
    "use strict";
    return BaseController.extend("z_tech_appeal.controller.Master", {
      formatter: formatter,
      /* =========================================================== */
      /* lifecycle methods                                           */
      /* =========================================================== */
      /**
       * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
       * @public
       */
      onInit: function () {
        // Control state model
        this._setAppTitle("Техническое/Методологическое обращение");

        var oList = this.byId("list"),
          oViewModel = this._createViewModel(),
          // Put down master list's original value for busy indicator delay,
          // so it can be restored later on. Busy handling on the master list is
          // taken care of by the master list itself.
          iOriginalBusyDelay = oList.getBusyIndicatorDelay();
        this._oList = oList;
        // keeps the filter and search state
        this._oListFilterState = {
          aFilter: [],
          aSearch: [],
        };
        this.setModel(oViewModel, "masterView");
        // Make sure, busy indication is showing immediately so there is no
        // break after the busy indication for loading the view's meta data is
        // ended (see promise 'oWhenMetadataIsLoaded' in AppController)
        oList.attachEventOnce("updateFinished", function () {
          // Restore original busy indicator delay for the list
          oViewModel.setProperty("/delay", iOriginalBusyDelay);
        });
        this.getView().addEventDelegate({
          onBeforeFirstShow: function () {
            this.getOwnerComponent().oListSelector.setBoundMasterList(oList);
          }.bind(this),
        });
        this.getRouter()
          .getRoute("master")
          .attachPatternMatched(this._onMasterMatched, this);
        this.getRouter().attachBypassed(this.onBypassed, this);

        this._RefreshParams = {
          doNav: false,
          MsgNavigation: "",
        };

        this._FragmentsAdded = {};
      },
      /* =========================================================== */
      /* event handlers                                              */
      /* =========================================================== */
      /**
       * After list data is available, this handler method updates the
       * master list counter and hides the pull to refresh control, if
       * necessary.
       * @param {sap.ui.base.Event} oEvent the update finished event
       * @public
       */
      onUpdateFinished: function (oEvent) {
        // update the master list object counter after new data is loaded
        this._updateListItemCount(oEvent.getParameter("total"));
        // hide pull to refresh if necessary
        this.byId("pullToRefresh").hide();
        this._doNavigate();
      },
      /**
       * Event handler for the master search field. Applies current
       * filter value and triggers a new search. If the search field's
       * 'refresh' button has been pressed, no new search is triggered
       * and the list binding is refresh instead.
       * @param {sap.ui.base.Event} oEvent the search event
       * @public
       */
      onSearch: function (oEvent) {
        if (oEvent.getParameters().refreshButtonPressed) {
          // Search field's 'refresh' button has been pressed.
          // This is visible if you select any master list item.
          // In this case no new search is triggered, we only
          // refresh the list binding.
          this.onRefresh();
          return;
        }
        var sQuery = oEvent.getParameter("query");
        if (sQuery) {
          this._oListFilterState.aSearch = [
            new Filter("MessageTx", FilterOperator.Contains, sQuery),
          ];
        } else {
          this._oListFilterState.aSearch = [];
        }
        this._applyFilterSearch();
      },
      /**
       * Event handler for refresh event. Keeps filter, sort
       * and group settings and refreshes the list binding.
       * @public
       */
      onRefresh: function () {
        this._oList.getBinding("items").refresh();
      },
      /**
       * Event handler for the list selection event
       * @param {sap.ui.base.Event} oEvent the list selectionChange event
       * @public
       */
      onSelectionChange: function (oEvent) {
        // get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
        this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
      },
      /**
       * Event handler for the bypassed event, which is fired when no routing pattern matched.
       * If there was an object selected in the master list, that selection is removed.
       * @public
       */
      onBypassed: function () {
        this._oList.removeSelections(true);
      },
      /**
       * Used to create GroupHeaders with non-capitalized caption.
       * These headers are inserted into the master list to
       * group the master list's items.
       * @param {Object} oGroup group whose text is to be displayed
       * @public
       * @returns {sap.m.GroupHeaderListItem} group header with non-capitalized caption.
       */
      createGroupHeader: function (oGroup) {
        return new GroupHeaderListItem({
          title: oGroup.text,
          upperCase: false,
        });
      },
      /**
       * Event handler for navigating back.
       * We navigate back in the browser historz
       * @public
       */
      onNavBack: function () {
        history.go(-1);
      },
      /* =========================================================== */
      /* begin: internal methods                                     */
      /* =========================================================== */
      _createViewModel: function () {
        return new JSONModel({
          isFilterBarVisible: false,
          filterBarLabel: "",
          delay: 0,
          title: this.getResourceBundle().getText("masterTitleCount", [0]),
          noDataText: this.getResourceBundle().getText("masterListNoDataText"),
          sortBy: "Author",
          groupBy: "None",
        });
      },
      /**
       * If the master route was hit (empty hash) we have to set
       * the hash to to the first item in the list as soon as the
       * listLoading is done and the first item in the list is known
       * @private
       */
      _onMasterMatched: function () {
        this.getOwnerComponent().oListSelector.oWhenListLoadingIsDone.then(
          function (mParams) {
            if (mParams.list.getMode() === "None") {
              return;
            }
            var sObjectId = mParams.firstListitem
              .getBindingContext()
              .getProperty("MessageId");
            this.getRouter().navTo(
              "object",
              {
                objectId: sObjectId,
              },
              true
            );
          }.bind(this),
          function (mParams) {
            if (mParams.error) {
              return;
            }
            this.getRouter().getTargets().display("detailNoObjectsAvailable");
          }.bind(this)
        );
      },
      /**
       * Shows the selected item on the detail page
       * On phones a additional history entry is created
       * @param {sap.m.ObjectListItem} oItem selected Item
       * @private
       */
      _showDetail: function (oItem) {
        var bReplace = !Device.system.phone;
        this.getRouter().navTo(
          "object",
          {
            objectId: oItem.getBindingContext().getProperty("MessageId"),
          },
          bReplace
        );
      },
      /**
       * Sets the item count on the master list header
       * @param {integer} iTotalItems the total number of items in the list
       * @private
       */
      _updateListItemCount: function (iTotalItems) {
        var sTitle;
        // only update the counter if the length is final
        if (this._oList.getBinding("items").isLengthFinal()) {
          sTitle = this.getResourceBundle().getText("masterTitleCount", [
            iTotalItems,
          ]);
          this.getModel("masterView").setProperty("/title", sTitle);
        }
      },
      /**
       * Internal helper method to apply both filter and search state together on the list binding
       * @private
       */
      _applyFilterSearch: function () {
        var aFilters = this._oListFilterState.aSearch.concat(
            this._oListFilterState.aFilter
          ),
          oViewModel = this.getModel("masterView");
        this._oList.getBinding("items").filter(aFilters, "Application");
        // changes the noDataText of the list in case there are no filter results
        if (aFilters.length !== 0) {
          oViewModel.setProperty(
            "/noDataText",
            this.getResourceBundle().getText(
              "masterListNoDataWithFilterOrSearchText"
            )
          );
        } else if (this._oListFilterState.aSearch.length > 0) {
          // only reset the no data text to default when no new search was triggered
          oViewModel.setProperty(
            "/noDataText",
            this.getResourceBundle().getText("masterListNoDataText")
          );
        }
      },
      /**
       * Internal helper method to apply both group and sort state together on the list binding
       * @param {sap.ui.model.Sorter[]} aSorters an array of sorters
       * @private
       */
      _applyGroupSort: function (aSorters) {
        this._oList.getBinding("items").sort(aSorters);
      },
      /**
       * Internal helper method that sets the filter bar visibility property and the label's caption to be shown
       * @param {string} sFilterBarText the selected filter value
       * @private
       */
      _updateFilterBar: function (sFilterBarText) {
        var oViewModel = this.getModel("masterView");
        oViewModel.setProperty(
          "/isFilterBarVisible",
          this._oListFilterState.aFilter.length > 0
        );
        oViewModel.setProperty(
          "/filterBarLabel",
          this.getResourceBundle().getText("masterFilterBarText", [
            sFilterBarText,
          ])
        );
      },
      /**
       *@memberOf Z_MSG_TECHV1.Z_MSG_TECH_V1.controller.Master
       */
      _go2CreateDet: function (oEvent) {
        //This code was generated by the layout editor.
        var bReplace = !Device.system.phone;
        this.getRouter().navTo("newmsg", { 
          MsgId: 0
        }, bReplace);
      },

      _go2FilterMain: function (oEvent) {
        sap.m.MessageToast.show("Filter opening");

        /*      if (!this._oFilterDialog) {
              var oFragment = this._getFormFragment("MasterFilter");
              oFragment.open();
            }*/
        if (this._oFilterDialog) {
          this._oFilterDialog.destroy();
        }

        this._oFilterDialog = sap.ui.xmlfragment(
          "z_tech_appeal.view.MasterFilter",
          this
        );
        //this._oFilterDialog.setModel(this.oViewModelAddData, "ModelAddData");
        this.getView().addDependent(this._oFilterDialog);
        this._oFilterDialog.open();
      },

      onFilterClose: function (oEvent) {
        sap.m.MessageToast.show("Закрываем диалог");
        if (this._oFilterDialog) {
          this._oFilterDialog.close();
        }
      },

      onFilterGo: function (oEvent) {
        sap.m.MessageToast.show("Передаем критерии в выборку.");

        // берем фильтры и отправляем их в binding
        //
        //var oMultiComboType = this.byId("MultiMsgType");
        var oMultiComboType = sap.ui.getCore().byId("MultiMsgType");
        var aSelectedTypes = oMultiComboType.getSelectedKeys();
        this._oListFilterState.aSearch = [];
        if (aSelectedTypes) {
          // var oMsgtyFilter = new Filter("Msgty");
          for (var i = 0; i < aSelectedTypes.length; i++) {
            this._oListFilterState.aSearch.push(
              new Filter("Msgty", FilterOperator.EQ, aSelectedTypes[i])
            );
            // this._oListFilterState.aSearch = [new Filter("Msgty", FilterOperator.EQ, aSelectedTypes[i])];
          }
        }

        var oMultiComboStatus = sap.ui.getCore().byId("MultiMsgStatus");
        var aSelectedStatuses = oMultiComboStatus.getSelectedKeys();
        if (aSelectedStatuses) {
          for (var iStatus = 0; iStatus < aSelectedStatuses.length; iStatus++) {
            this._oListFilterState.aSearch.push(
              new Filter(
                "Status",
                FilterOperator.EQ,
                aSelectedStatuses[iStatus]
              )
            );
          }
        }

        this._fillCreateDateFilter();
        this._fillResponsDateFilter();

        if (this._oFilterDialog) {
          this._oFilterDialog.close();
        }

        this._applyFilterSearch();
      },

      _fillCreateDateFilter: function () {
        var DatePickerCreateDate = sap.ui.getCore().byId("MsgCreateDate");
        var DateCreateFrom = DatePickerCreateDate.getFrom();
        var DateCreateTo = DatePickerCreateDate.getTo();
        if (DateCreateFrom && DateCreateTo) {
          this._oListFilterState.aSearch.push(
            new Filter(
              "CreateDate",
              FilterOperator.BT,
              formatter.Date2ABAP(DateCreateFrom),
              formatter.Date2ABAP(DateCreateTo)
            )
          );
        }
      },

      _fillResponsDateFilter: function () {
        var DateResponseRange = sap.ui.getCore().byId("MsgRangeResponsDate");
        var DateResponseFrom = DateResponseRange.getFrom();
        var DateResponseTo = DateResponseRange.getTo();
        if (DateResponseFrom && DateResponseTo) {
          this._oListFilterState.aSearch.push(
            new Filter(
              "DtLimit",
              FilterOperator.BT,
              formatter.Date2ABAP(DateResponseFrom),
              formatter.Date2ABAP(DateResponseTo)
            )
          );
        }
      },

      handleValueHelp: function (oEvent) {
        sap.m.MessageToast.show("Вызываем средство поиска по пользователю.");
      },

      _getFormFragment: function (sFragmentName) {
        // var globPath = "Z_MSG_TECHV1.Z_MSG_TECH_V1.view.";
        var globPath = "z_tech_appeal.view.";
        if (!this._FragmentsAdded.hasOwnProperty(sFragmentName)) {
          var oFormFragment = sap.ui.xmlfragment(
            this.getView().getId(),
            (globPath + sFragmentName).toString(),
            this
          );
          this._FragmentsAdded[sFragmentName] = oFormFragment;
          this.getView().addDependent(oFormFragment);
          return oFormFragment;
        } else {
          return this._FragmentsAdded[sFragmentName];
        }
      },

      doRefreshOutside: function (RefreshParams) {
        // this._doNav = true;
        var doNav = true;
        if (!(RefreshParams === undefined)) {
          if (!(RefreshParams.doNav === undefined)) {
            doNav = RefreshParams.doNav;
          }
        }
        //this._doNav = doNav;
        this._RefreshParams.doNav = doNav;
        this._RefreshParams.MsgNavigation = RefreshParams.MsgNavigation;
        this.onRefresh();
      },

      _doNavigate: function () {
        // var oViewModel = this.getModel("masterView");
        // var MsgId = oViewModel.getProperty("MessageId");
        if (this._RefreshParams.doNav === undefined) {
          return;
        }
        if (this._RefreshParams.doNav) {
          var MsgId = "";
          if (!(this._RefreshParams.MsgNavigation == "")) {
            MsgId = this._RefreshParams.MsgNavigation;
          } else {
          	var oListItem = this._oList.getItems()[0];
          	
            MsgId = oListItem ? oListItem.getIntro() : null;
          }

          var bReplace = !Device.system.phone;
          
          if(MsgId) {
        		this.getRouter().navTo(
		            "object",
		            {
		              objectId: MsgId,
		            },
		            bReplace
	          );
          } else {
          	this.getRouter().navTo(
		            "detailNoObjectsAvailable",
		            bReplace
	          );
          }
          
          this._doNav = false;
          this._RefreshParams.MsgNavigation = "";
        }
      },

      _setAppTitle: function (appTitleNew) {
        /*var oModeli18n = this.getModel("i18n").getResourceBundle();
      var text1 = oModeli18n.getText("title", ["SuoerTitle"]);
      var text2 = oModeli18n.getText("appTitle", ["SuoerappTitle"]);
      */

        //Set employee info in title
        // var oInfo = this.oConfiguration.getInitialInfoModel();
        // if (oInfo) {
        this.getOwnerComponent()
          .getService("ShellUIService")
          .then(
            // promise is returned
            function (oService) {
              var sTitle = appTitleNew;
              oService.setTitle(sTitle);
            }
          );
        // }
      },
    });
  }
);
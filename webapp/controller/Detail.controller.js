/*global location */
sap.ui.define(
  [
    "z_tech_appeal/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "z_tech_appeal/model/formatter",
    "z_tech_appeal/model/models",
    "z_tech_appeal/controller/ZodataAjaxUploader",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/m/Token",
    "sap/m/SearchField",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/ui/export/Spreadsheet",
    "z_tech_appeal/controller/Jszip",
    "z_tech_appeal/controller/Xlsx",
    "sap/ui/export/Spreadsheet"
  ],
  function (
    BaseController,
    JSONModel,
    formatter,
    models,
    zodataajax,
    ODataModel,
    Token,
    SearchField,
    Filter,
    FilterOperator,
    Fragment,
    Spreadsheet
  ) {
    "use strict";

    return BaseController.extend("z_tech_appeal.controller.Detail", {
      formatter: formatter,
      models: models,
      zodataajax: zodataajax,
      /* =========================================================== */
      /* lifecycle methods                                           */
      /* =========================================================== */

      onInit: function () {
        // Model used to manipulate control states. The chosen values make sure,
        // detail page is busy indication immediately so there is no break in
        // between the busy indication for loading the view's meta data

        var oViewModel = new JSONModel({
          busy: false,
          delay: 0,
        });
        this.oViewModelAddData = new JSONModel({
          NewDate: "",
          NewDateComment: "",
        });

        var oUploadredModel = new JSONModel({
          sign: {
            enabled: true,
            visible: false,
          },
          verify: {
            enabled: true,
            visible: false,
          },
          download: {
            enable: true,
            visible: false
          },
          selectedData: null,
          enableDelete: false
        });

        this.setModel(oUploadredModel, "Uploader");

        this._FragmentsAdded = {};

        this.getRouter()
          .getRoute("object")
          .attachPatternMatched(this._onObjectMatched, this);

        this._oDetailData = new sap.ui.model.json.JSONModel();
        //this._oDetailDocData = new sap.ui.model.json.JSONModel();
        // this._setModelViewData();
        this.setModel(oViewModel, "detailView");
        this.getOwnerComponent()
          .getModel()
          .metadataLoaded()
          .then(this._onMetadataLoaded.bind(this));

        this._putfragment2info();
        this._putfragment2attachments();
        this._putfragment2textChat();
        
        this.getOwnerComponent().oDocumentSignTool.attachEvent('signed', function(oEvent) {
      		var oSelectedData = oEvent.getParameter('selectedData');
      		var sSignature = oEvent.getParameter('signature');
      		this
      			._pushDocumentSign(oSelectedData.Id, oSelectedData.Burks, sSignature)
      			.then(function(oResponce) {
      				this.getModel('documents').refresh(true);
      				sap.m.MessageToast.show(`Документ ${oSelectedData.Filename} успешно подписан`);
      			}.bind(this))
      			.catch(function(oResponce) {
      				sap.m.MessageBox.error(oResponce);
      			}.bind(this));
          }, this);
          
          this.getOwnerComponent().oAttachmentSignTool.attachEvent('signed', function(oEvent) {
      		var oSelectedData = oEvent.getParameter('selectedData');
      		var sSignature = oEvent.getParameter('signature');
      		this
      			._pushAttachmentSign(oSelectedData.MsgId, oSelectedData.documentId, sSignature)
      			.then(function(oResponce) {
      				var oUploaderModel = this.getModel("Uploader");
      				oUploaderModel.setProperty("/sign/enabled", false);
			        oUploaderModel.setProperty("/verify/enabled", true);
			        oUploaderModel.setProperty("/download/enabled", true);
      				sap.m.MessageToast.show(`Файл ${oSelectedData.Filename} успешно подписан`);
      				this._setModelAttach(oSelectedData.MsgId);
      			}.bind(this))
      			.catch(function(oResponce) {
      				sap.m.MessageBox.error(oResponce);
      			}.bind(this));
          }, this);
      },

      /* =========================================================== */
      /* event handlers                                              */
      /* =========================================================== */

      /**
       * Event handler when the share by E-Mail button has been clicked
       * @public
       */
      onShareEmailPress: function () {
        var oViewModel = this.getModel("detailView");

        sap.m.URLHelper.triggerEmail(
          null,
          oViewModel.getProperty("/shareSendEmailSubject"),
          oViewModel.getProperty("/shareSendEmailMessage")
        );
      },

      /**
       * Updates the item count within the line item table's header
       * @param {object} oEvent an event containing the total number of items in the list
       * @private
       */
      onListUpdateFinished: function (oEvent) {
        var sTitle,
          iTotalItems = oEvent.getParameter("total"),
          oViewModel = this.getModel("detailView");

        // only update the counter if the length is final
        if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
          if (iTotalItems) {
            sTitle = this.getResourceBundle().getText(
              "detailLineItemTableHeadingCount",
              [iTotalItems]
            );
          } else {
            //Display 'Line Items' instead of 'Line items (0)'
            sTitle = this.getResourceBundle().getText(
              "detailLineItemTableHeading"
            );
          }
          oViewModel.setProperty("/lineItemListTitle", sTitle);
        }
      },

      /* =========================================================== */
      /* begin: internal methods                                     */
      /* =========================================================== */

      /**
       * Binds the view to the object path and expands the aggregated line items.
       * @function
       * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
       * @private
       */
      _onObjectMatched: function (oEvent) {
        var sObjectId = oEvent.getParameter("arguments").objectId;
        this._MsgId = sObjectId.toString();

        this._putfragment2info("DetailsFragInfo");

        this._setModelViewData(sObjectId.toString());

        this._clearUploaderModel();
      },

      _clearUploaderModel: function () {
        var oUploaderModel = this.getModel("Uploader");

        oUploaderModel.setProperty("/sign/visible", false);
        oUploaderModel.setProperty("/verify/visible", false);
        oUploaderModel.setProperty("/download/visible", false);
        oUploaderModel.setProperty("/selectedData", null);
      },

      /**
       * Binds the view to the object path. Makes sure that detail view displays
       * a busy indicator while data for the corresponding element binding is loaded.
       * @function
       * @param {string} sObjectPath path to the object to be bound to the view.
       * @private
       */
      _bindView: function (sObjectPath) {
        // Set busy indicator during view binding
        var oViewModel = this.getModel("detailView");

        // If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
        oViewModel.setProperty("/busy", false);

        this.getView().bindElement({
          path: sObjectPath,
          events: {
            change: this._onBindingChange.bind(this),
            dataRequested: function () {
              oViewModel.setProperty("/busy", true);
            },
            dataReceived: function () {
              oViewModel.setProperty("/busy", false);
            },
          },
        });
      },

      _onBindingChange: function () {
        var oView = this.getView(),
          oElementBinding = oView.getElementBinding();

        // No data for the binding
        if (!oElementBinding.getBoundContext()) {
          this.getRouter().getTargets().display("detailObjectNotFound");
          // if object could not be found, the selection in the master list
          // does not make sense anymore.
          this.getOwnerComponent().oListSelector.clearMasterListSelection();
          return;
        }

        var sPath = oElementBinding.getPath(),
          oResourceBundle = this.getResourceBundle(),
          oObject = oView.getModel().getObject(sPath),
          // sObjectId = oObject.Message_ID,
          sObjectId = oObject.MessageId,
          sObjectName = oObject.Author,
          oViewModel = this.getModel("detailView");

        this.getOwnerComponent().oListSelector.selectAListItem(sPath);

        oViewModel.setProperty(
          "/shareSendEmailSubject",
          oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId])
        );
        oViewModel.setProperty(
          "/shareSendEmailMessage",
          oResourceBundle.getText("shareSendEmailObjectMessage", [
            sObjectName,
            sObjectId,
            location.href,
          ])
        );
      },

      _onMetadataLoaded: function () {
        // Store original busy indicator delay for the detail view
        var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay();
        var oViewModel = this.getModel("detailView");
        var oLineItemTable = this.byId("lineItemsList");
        if (oLineItemTable) {
          var iOriginalLineItemTableBusyDelay =
            oLineItemTable.getBusyIndicatorDelay();
        } else {
          return;
        }
        // Make sure busy indicator is displayed immediately when
        // detail view is displayed for the first time
        oViewModel.setProperty("/delay", 0);
        oViewModel.setProperty("/lineItemTableDelay", 0);

        oLineItemTable.attachEventOnce("updateFinished", function () {
          // Restore original busy indicator delay for line item table
          oViewModel.setProperty(
            "/lineItemTableDelay",
            iOriginalLineItemTableBusyDelay
          );
        });

        // Binding the view will set it to not busy - so the view is always busy if it is not bound
        oViewModel.setProperty("/busy", true);
        // Restore original busy indicator delay for the detail view
        oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
      },

      _putfragment2info: function (iFragname) {
        if (!iFragname) {
          iFragname = "DetailsFragInfo";
        }
        var ItemTabFilter = this.byId("iconTabBarFilter1");
        var BlockFragmentName = iFragname;
        ItemTabFilter.removeAllContent();
        ItemTabFilter.insertContent(this._getFormFragment(BlockFragmentName));
      },

      _putfragment2attachments: function () {
        var ItemTabFilter = this.byId("iconTabBarFilter2");
        var BlockFragmentName = "DetailsFragAttachments";
        ItemTabFilter.removeAllContent();
        ItemTabFilter.insertContent(this._getFormFragment(BlockFragmentName));
      },

      _putfragment2textChat: function () {
        var ItemTabFilter = this.byId("iconTabBarFilter3");
        var BlockFragmentName = "DetailsFragTextChats";
        ItemTabFilter.removeAllContent();
        ItemTabFilter.insertContent(this._getFormFragment(BlockFragmentName));
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

        /*
      var vDependents = this.getView().getDependents();
      for(var deps = 0; deps < vDependents.length; deps++){
        console.log(vDependents[deps].getMetadata());
      }
      */
      },

      onHideStatus: function(bHide) {
        var oFileUploader = this.byId('UploadCollectionShow');
            oFileUploader.getItems().forEach(function(oItem) {
              oItem.getStatuses().forEach(function(oStatus) {
                oStatus.setVisible(!bHide);
              });
            });
    },

      _setModelViewData: function (vmsgId) {
        if (!vmsgId) {
          return;
        }
        var oModel = new sap.ui.model.json.JSONModel();
        oModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
        var oView = this.getView();
        var vPath2Model = models.path2DetailData(vmsgId.toString());
        //oModel = this._oDetailData;

        oModel.loadData(vPath2Model, "local", true, "GET", true);

        oModel.attachRequestCompleted(function () {
          this.oModelView = oModel;
          oView.setModel(this.oModelView, "DetailData");
          this.getModel('Uploader').setProperty('/enableDelete', this.oModelView.oData.d.State === 'Черновик');
          if(this.oModelView.oData.d.Msgty !== 'F') {
            this.onHideStatus(true);
          } else {
            this.onHideStatus(false);
          }
          if (this.oModelView.oData.d.Msgty === 'R') {
             if (this.oModelView.oData.d.DocCode) {
               var oDocModel = new sap.ui.model.json.JSONModel();
               oDocModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
               var vPath2DocModel = models.path2DocCatalogSet(this.oModelView.oData.d.DocCode);
               oDocModel.loadData(vPath2DocModel, "local", true, "GET", true);
               oDocModel.attachRequestCompleted(function () {
                oView.setModel(oDocModel, "DetailDocData");
               }, this);
             } else {
               var oDocModel = new sap.ui.model.json.JSONModel();
                 oDocModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
               oDocModel.oData = {d: {}};
               oView.setModel(oDocModel, "DetailDocData");
             }

          }
          
          var oSignArea = this.byId('singTools');
          oSignArea.unbindElement();
          
          if(this.oModelView.oData.d.Msgty === 'F') {
          	var sFileId = this.oModelView.oData.d.FileId;
          	var sBukrs = this.oModelView.oData.d.Bukrs;
          	var sMandt = jQuery.sap.getUriParameters().get("sap-client") || "100";
          	
          	oSignArea.bindElement({
          		path: `/RegDocsSet(Id='${sFileId}',Bukrs='${sBukrs}',Mandt='${sMandt}')`,
          		model: 'documents'
          	});
          }
        }, this);

        this._setModelAttach(vmsgId);
        this._setModelChatText(vmsgId);
        this._setModelItems(vmsgId);
        var MsgEventBut = {};
        MsgEventBut.msgId = vmsgId;
        MsgEventBut.event = "init";
        this._setModelButtonsVisibility(MsgEventBut);
      },

      _setModelAttach: function (vmsgId) {
        if (!vmsgId) {
          return;
        }
        var oModel = new sap.ui.model.json.JSONModel();
        //var oView = this.getView();
        var vPath2Model = models.path2DetailAttach(vmsgId.toString());
        oModel.loadData(vPath2Model, "local", true, "GET", true);

        oModel.attachRequestCompleted(function () {
          this.setModel(oModel, "AttachData");
        }, this);
      },

      _setModelChatText: function (vmsgId) {
        if (!vmsgId) {
          return;
        }
        var oModel = new sap.ui.model.json.JSONModel();
        // var oView = this.getView();
        var vPath2Model = models.path2DetailChatText(vmsgId.toString());
        oModel.loadData(vPath2Model, "local", true, "GET", true);

        oModel.attachRequestCompleted(function () {
          this.setModel(oModel, "ChatText");
        }, this);
      },

      _setModelItems: function (vmsgId) {
        if (!vmsgId) {
          return;
        }
        var oModel = new sap.ui.model.json.JSONModel();
        var vPath2Model = models.path2ItemsData(vmsgId.toString());
        oModel.loadData(vPath2Model, "local", true, "GET", true);

        oModel.attachRequestCompleted(function () {
          this.setModel(oModel, "ItemsData");
        }, this);
      },

      _setModelButtonsVisibility: function (MsgEvent) {
        var oModelVisibilty = new sap.ui.model.json.JSONModel();
        var path = "/sap/opu/odata/sap/ZTC_MSGTECH_GTW_SRV";
        var Entry = { MsgId: MsgEvent.msgId, Event: MsgEvent.event };
        path =
          path +
          "/ButtonsVisSet(MsgId='" +
          Entry.MsgId.toString() +
          "',Event='" +
          Entry.Event.toString() +
          "')";

        oModelVisibilty.loadData(path, "local", true, "GET", true);

        oModelVisibilty.attachRequestCompleted(
          this,
          function (oEv, Response) {
            this.setModel(oModelVisibilty, "ButtonVis");
            this._busyDialog(false);
          },
          this
        );
      },

      onFileNamePress: function (oEvent) {
        sap.m.MessageToast.show("Запрашиваем файл с сервера.");
        var w = window.open(oEvent.getSource().getUrl(), "_blank");
      },

      onSelectionChange: function (oEvent) {
        //sap.m.MessageToast.show("FileName Pressed");
      },

      onEditText: function (oEvent) {
        sap.m.MessageToast.show("Открываем режим редактирования.");
        this._busyDialog(true);
        var oTabBar = this.byId("iconTabBar");
        oTabBar.setSelectedKey(this.byId("iconTabBarFilter1").getKey());

        this._putfragment2info("DetailsEditInfo");

        this.onSelectTypeChange();

        this._oValueInput = this.getView().byId("EditDocCode");

        // this._buttonLine4EditText(true);

        var MsgEventBut = {};
        MsgEventBut.msgId = this._MsgId;
        MsgEventBut.event = "onedit";
        MsgEventBut.NewStatus = "1";
        this._setModelButtonsVisibility(MsgEventBut);
      },

      _messageUpdate: function (oEvent, ObjMeta) {
        this._newMsgId = this._MsgId;
        var mParameters = {
          headers: {
            "Content-ID": "102",
            "X-CSRF-Token": "Fetch",
          },
          //defaultUpdateMethod: sap.ui.model.odata.UpdateMethod.Put,
          useBatch: false,
        };
        this.oModelChange = new ODataModel(
          "/sap/opu/odata/sap/ZTC_MSGTECH_GTW_SRV/",
          mParameters
        );
        // var MessageTypeScr = this.byId("ComboMessageType").getSelectedKey();
        var vTextMsg = this.byId("TextEditBlock");
        var vFreeComment = "";
        if (!(this.byId("EditFreeComment") === undefined)) {
          vFreeComment = this.byId("EditFreeComment").getValue();
        }
        if (vFreeComment == "" || vFreeComment == " ") {
          if (!(this.byId("EditFreeComment") === undefined)) {
            vFreeComment = this.byId("ShowFreeComment").getValue();
          }
        }
        var MsgTx = "";
        if (!(vTextMsg === undefined)) {
          MsgTx = vTextMsg.getValue();
        }
        var typeR = oEvent.getSource().getModel("DetailData").getProperty("/d/Msgty") === 'R';
        var typeF = oEvent.getSource().getModel("DetailData").getProperty("/d/Msgty") === 'F';
        var Entry = {
          MessageId: this._MsgId,
          // Msgty: MessageTypeScr,
          MessageTx: MsgTx,
          ExtLimitTx: ObjMeta.NewDate,
          ExtReason: ObjMeta.NewDateComment,
          FreeComment: vFreeComment
        };
        if (ObjMeta.NewStatus) {
          Entry.Status = ObjMeta.NewStatus.toString()
        } else {
          Entry.Status = oEvent.getSource().getModel("DetailData").getProperty("/d/Status")
        }

        if (typeR && !ObjMeta.NewStatus) {
//          var docDate = this.byId("EditDocDate").getDateValue();
          Entry.AisStatus = this.byId("EditAisStatus").getSelectedKey();
          Entry.RejectReason = ( Entry.AisStatus === '2' || Entry.AisStatus === '3' ) ? this.byId("EditRejectReason").getValue(): "";
//          Entry.DocCode = this.byId("EditDocCode").getCustomData()[0].getValue();
//          Entry.DocName = this.byId("EditDocName").getValue();
//          Entry.DocNum = this.byId("EditDocNum").getValue();
//          Entry.DocDate = docDate == null ? null : formatter.Date2ABAP(docDate) + "T00:00:00";
          Entry.DocUrl = this.byId("EditDocUrl").getValue();
//          Entry.DocId = this.byId("EditDocId").getValue();
        }

        // TODO add fields to Entry which regard 'F' type
        if(typeF) {
          var oFileId = this.byId("FileId");
          var oKnd = this.byId("Knd");
          var oRepyear = this.byId("Repyear");
          var oTaxInspectionCode = this.byId("TaxInspectionCode");
          var oContType = this.byId("ContType");
          var oDocName = this.byId("DocName");
          var oFileName = this.byId("FileName");
          var oDetailModel = oEvent.getSource().getModel("DetailData");

          Entry.FileId = oFileId ? oFileId.getSelectedKey() : oDetailModel.getProperty('/d/FileId');
          Entry.Knd = oKnd ? oKnd.getSelectedKey() : oDetailModel.getProperty('/d/Knd');
          Entry.Repyear = oRepyear ? oRepyear.getValue() : oDetailModel.getProperty('/d/Repyear');
          Entry.TaxInspectionCode = oTaxInspectionCode ? oTaxInspectionCode.getValue() : oDetailModel.getProperty('/d/TaxInspectionCode');
          Entry.ContType = oContType ? oContType.getValue() : oDetailModel.getProperty('/d/ContType');
          Entry.DocName = oDocName ? oDocName.getValue() : oDetailModel.getProperty('/d/DocName');
          Entry.FileName = oFileName ? oFileName.getValue() : oDetailModel.getProperty('/d/TaxInspectionCode');
        }

        var that = this;
        that.oModelChange.update(
          "/TechMsgShortSet(MessageId='" + Entry.MessageId.toString() + "')",
          Entry
        );
        that._RefreshModeTmp = ObjMeta.RefreshMode;
      
        if (typeR){
        var tableItems = this.byId('TableEditInfo').getItems();
        var itemTable = [];
        if (tableItems.length > 0) {
          tableItems.map((item, index) => {
            itemTable.push({
              MessageId: Entry.MessageId,
              Item: index,
              DocID: item.getCells()[0].getValue(),
              DocCode: item.getCells()[1].getValue().substring(0,10),
              DocName: item.getCells()[2].getValue(),
              DocNum: item.getCells()[3].getValue(),
              DocDate: item.getCells()[4].getDateValue() == null ? null : formatter.Date2ABAP(item.getCells()[4].getDateValue()) + "T00:00:00",
            })
          })
        };
        var EntryItem = {
          MessageId: Entry.MessageId,
          ToItems : [...itemTable]
        };
        var oDataModel = new sap.ui.model.odata.ODataModel(this.getView().getModel().sServiceUrl)
        oDataModel.create(
          "/TechMsgDetailSet",
          EntryItem,
          null,
          function() {
            var msg;
          }
        ); 
      }



        // this.getModel("CreateMsgHeaderView").setProperty("/busy", true);
        this.oModelChange.attachRequestCompleted(
          this,
          function (oEv, Response) {
            if (oEv.mParameters.response.statusCode == 500 || oEv.mParameters.response.statusCode == 400) {
              that._busyDialog(false);
              var vErrJson = oEv.mParameters.response.responseText;
              var vError = JSON.parse(vErrJson);
              var vMsg = "";
              if (vError.error && vError.error.message && vError.error.message.value && vError.error.code) {
                vMsg = vError.error.code + ": " + vError.error.message.value;
              } else {
                vMsg = "Неизвестная ошибка";
              }
              sap.m.MessageToast.show(
                vMsg
              );
            } else {
              var oUploadCollection = that.byId("UploadCollectionEdit");
              zodataajax.JustUpload(oEv, that, oUploadCollection);
              sap.m.MessageToast.show(
                "Сообщение " + that._MsgId.toString() + " успешно обновлено."
              );
              // that._openMsg(newMsgId.toString());
              //setTimeout(that._openMsg, 2000, that._MsgId, that);
              setTimeout(that._doRefreshAll, 2000, that._RefreshModeTmp, that);
            }
          }
        );
      },

      _openMsg: function (iMsgId, ithat) {
        // ithat._CreateMsgHeaderViewModel.setProperty("/busy", false);
        var bReplace = (bReplace = true); // !Device.system.phone;
        ithat.getRouter().navTo(
          "object",
          {
            objectId: iMsgId,
          },
          bReplace
        );
      },

    onMsgSave: function(oEvent) {
      if (this.oModelView.oData.d.Msgty === 'R') {
        var ais = this.byId("EditAisStatus");
        var reject = this.byId("EditRejectReason");
        var docUrl = this.byId("EditDocUrl");
        var docs = this.byId("UploadCollectionEdit");
        var tableItems = this.byId("TableEditInfo").getItems();
/*        var docCode = this.byId("EditDocCode");
        var docName = this.byId("EditDocName");        
        var docDate = this.byId("EditDocDate");
        var docId = this.byId("EditDocId");
*/
        var check = true;
        check = check && this.setValidation(reject, ( ais.getSelectedKey() === '2' || ais.getSelectedKey() === '3' )  && this.byId("EditRejectReason").getValue() === '');
        if ( ais.getSelectedKey() !== '2' ){
 /*
          check = check && this.setValidation(docCode, !docCode.getCustomData()[0].getValue() || docCode.getCustomData()[0].getValue() === '');
          check = check && this.setValidation(docName, !docName.getValue() || docName.getValue() === '');
          check = check && this.setValidation(docDate, !docDate.getValue() || docDate.getValue() === '');
          check = check && this.setValidation(docId, !docId.getValue() || docId.getValue() === '');
*/ 
//Валидация данных MessageItem
/*          tableItems.forEach(item => {
            check = check && !item.getCells()[0].getValue() === '';
            check = check && !item.getCells()[1].getValue() === '';
            check = check && !item.getCells()[2].getValue() === '';
            check = check && !item.getCells()[4].getValue() === '';
          })
*/
          var checkItem = true;
          tableItems.forEach(item => {
            checkItem = checkItem && this.setValidation(item.getCells()[0], !item.getCells()[0].getValue() || item.getCells()[0].getValue() === '');
            checkItem = checkItem && this.setValidation(item.getCells()[1], !item.getCells()[1].getValue() || item.getCells()[1].getValue() === '');
            checkItem = checkItem && this.setValidation(item.getCells()[2], !item.getCells()[2].getValue() || item.getCells()[2].getValue() === '');
            checkItem = checkItem && this.setValidation(item.getCells()[4], !item.getCells()[4].getValue() || item.getCells()[4].getValue() === '');
          })
          if (!checkItem){
            sap.m.MessageToast.show("Не заполнены обязательные поля в таблице");
            check = false;  
          }


          if (docUrl.getValue() && docs.getItems().length > 0 ) {
            sap.m.MessageToast.show("Необходимо либо прикрепить документ, либо указать ссылку");
          check = false;
          }
          if (!docUrl.getValue() && docs.getItems().length == 0 ) {
            sap.m.MessageToast.show("Необходимо прикрепить документ или указать ссылку");
            check = false;
          }
        }
        if (!check) return;
      }

        sap.m.MessageToast.show("Обновляем обращение " + this._MsgId + ".");
        this._busyDialog(true);
        //  this._putfragment2info("DetailsFragInfo");
        var ObjMeta = {};
        ObjMeta.RefreshMode = "1";
        this._messageUpdate(oEvent, ObjMeta);
        //this._doRefreshAll('1');
      },

      setValidation: function (input, check) {
         input.setValueState(check ? sap.ui.core.ValueState.Error : sap.ui.core.ValueState.None);
         return !check;
      },

    onPressAcceptEditR: function (oEvent) {
        sap.m.MessageToast.show("Обновляем обращение " + this._MsgId + ".");
        this._busyDialog(true);
        //  this._putfragment2info("DetailsFragInfo");
        var ObjMeta = {};
        ObjMeta.NewStatus = "7";
        ObjMeta.RefreshMode = "1";
        this._messageUpdate(oEvent, ObjMeta);
        //this._doRefreshAll('1');
      },

      onPressAcceptEdit: function (oEvent) {
        sap.m.MessageToast.show("Обновляем обращение " + this._MsgId + ".");
        this._busyDialog(true);
        //  this._putfragment2info("DetailsFragInfo");
        var ObjMeta = {};
        ObjMeta.NewStatus = "2";
        ObjMeta.RefreshMode = "1";
        this._messageUpdate(oEvent, ObjMeta);
        //this._doRefreshAll('1');
      },

      filesUploaded: function (ObjMeta) {
        this._clearFileModel();
        this._putfragment2info("DetailsFragInfo");
      },

      onPressRejectEdit: function (oEvent) {
        //  sap.m.MessageToast.show(oEvent.id.toString());
        this._busyDialog(true);
        this._putfragment2info("DetailsFragInfo");
        //  this._buttonLine4EditText(false);
        var MsgEventBut = {};
        MsgEventBut.msgId = this._MsgId;
        MsgEventBut.event = "offedit";
        this._setModelButtonsVisibility(MsgEventBut);

      },

      _onPositivePress: function (oEvent) {
        //var butText = oEvent.getSource().getText();
        //  var byFunc = this.getView().getModel('detailView').getProperty('/funcPositiveButton');
        //  switch(byFunc.toString()) {
        //    case 'OkEdit':
        this.onPressAcceptEdit(oEvent);
        //      break;
        //    default:
        //      break;
        //  }
      },

      _onNegativePress: function (oEvent) {
        //  var byFunc = this.getView().getModel('detailView').getProperty('/funcNegativeButton');
        //  switch(byFunc.toString()) {
        //    case 'CancelEdit':
        this.onPressRejectEdit(oEvent);
        //      break;
        //    default:
        //      break;
        //  }
      },

      /*
    , _buttonLine4EditText: function(onOff){


      var oViewModel = this.getModel("detailView");
      if(onOff){
        oViewModel.setProperty("/showPositiveButton", true);
        oViewModel.setProperty("/funcPositiveButton", "OkEdit");
        oViewModel.setProperty("/showNegativeButton", true);
        oViewModel.setProperty("/funcNegativeButton", "CancelEdit");
        oViewModel.setProperty("/showEditButton", false);
      }
      else{
        oViewModel.setProperty("/showPositiveButton", false);
        oViewModel.setProperty("/funcPositiveButton", "OkGeneral");
        oViewModel.setProperty("/showNegativeButton", false);
        oViewModel.setProperty("/funcNegativeButton", "CancelGeneral");
        oViewModel.setProperty("/showEditButton", true);
      }
    }
    */

      onMsgClose: function (oEvent) {
        sap.m.MessageToast.show("Закрываем обращение " + this._MsgId + ".");
        this._busyDialog(true);
        var ObjMeta = {};
        ObjMeta.NewStatus = "7";
        ObjMeta.RefreshMode = "2";
        this._messageUpdate(oEvent, ObjMeta);
        // this._messageUpdate(oEvent, ObjMeta);
      },

      onDropMsg: function (oEvent) {
        sap.m.MessageToast.show(
          "Снимаем с обработки обращение " + this._MsgId + "."
        );
        this._busyDialog(true);
        var ObjMeta = {};
        if (oEvent.getSource().getModel("DetailData").getProperty("/d/Msgty") === 'R') {
          ObjMeta.NewStatus = "2";
          ObjMeta.RefreshMode = "1";
        } else {
          ObjMeta.NewStatus = "D"; // dummy short status
          ObjMeta.RefreshMode = "2";
        }

        this._messageUpdate(oEvent, ObjMeta);
        // this._messageUpdate(oEvent, ObjMeta);
      },

      onCreateBasedOn: function (oEvent) {
        //This code was generated by the layout editor.
        //var bReplace = !Device.system.phone;
//        vMsgId = oEvent.getSource("MsgId");        
        this.getRouter().navTo("newmsg", {
          MsgId: oEvent.getSource().getModel("DetailData").getProperty("/d/MessageId")
        });
      },

      onTakeMsg2Proceed: function (oEvent) {
        sap.m.MessageToast.show(
          "Берем сообщение в работу " + this._MsgId + "."
        );
        this._busyDialog(true);
        this._putfragment2info("DetailsFragInfo");
        var ObjMeta = {};
        ObjMeta.NewStatus = "3";
        ObjMeta.RefreshMode = "1";
        this._messageUpdate(oEvent, ObjMeta);
      },

      onSendAnswerForMessage: function (oEvent) {
        sap.m.MessageToast.show(
          "Отправляем ответ по сообщению " + this._MsgId + "."
        );
        this._busyDialog(true);
        var ObjMeta = {};
        ObjMeta.NewStatus = "4";
        this._messageUpdate(oEvent, ObjMeta);
      },

      onAskForProlongation: function (oEvent) {
        sap.m.MessageToast.show(
          "Запрашиваем продление сроков " + this._MsgId + "."
        );
        this._ask4NewAnswerData();
      },

      _ask4NewAnswerData: function (oEvent) {
        if (this.Ask4DateDialog) {
          this.Ask4DateDialog.destroy();
        }

        this.Ask4DateDialog = sap.ui.xmlfragment(
          "z_tech_appeal.view.DetailsAsk4NewDate",
          this
        );
        this.Ask4DateDialog.setModel(this.oViewModelAddData, "ModelAddData");
        this.getView().addDependent(this.Ask4DateDialog);
        this.Ask4DateDialog.open();
      },

      onApproveProlongation: function (oEvent) {
        sap.m.MessageToast.show(
          "Подтверждаем продление сроков " + this._MsgId + "."
        );
        this._busyDialog(true);
        var ObjMeta = {};
        ObjMeta.NewStatus = "8"; // dummy short status
        ObjMeta.RefreshMode = "1";
        this._messageUpdate(oEvent, ObjMeta);
      },

      _onDiaCancel: function (oEvent) {
        oEvent.getSource().close();
        oEvent.getSource().destroy();
      },

      _onDiaOk: function (oEvent) {
        this._busyDialog(true);
        var NewDateComment =
          this.oViewModelAddData.getProperty("/NewDateComment");
        var ObjMeta = {};
        ObjMeta.NewStatus = "6";
        ObjMeta.RefreshMode = "1";
        ObjMeta.NewDate = this.ExtensionDate;
        ObjMeta.NewDateComment = NewDateComment;
        this._messageUpdate(oEvent, ObjMeta);
        oEvent.getSource().close();
        oEvent.getSource().destroy();
      },

      onNewDateChange: function (oEvent) {
        var sValue = oEvent.getParameter("value");
        this.ExtensionDate = sValue;
      },

      _doRefreshAll: function (iMode, iThat) {
        // var oList = oMaster.byId("list");
        // var oList = sap.ui.getCore().byId("list");
        // oList.getBinding("items").refresh();
        //var oMasterController = sap.ui.getCore().byId("MasterPage").getController();
        // oMasterController.onRefresh();
        var RefreshParams = {};
        switch (iMode) {
          case "1": // обновляем по сообщению
            RefreshParams.doNav = true;
            RefreshParams.MsgNavigation = iThat._MsgId;
            iThat._setModelViewData(iThat._MsgId);
            break;
          case "2": // обновляем все и читаем первое сообщение
            RefreshParams.doNav = true;
            RefreshParams.MsgNavigation = "";
            break;
          default:
            // обновляем только экран / detail не обновляем
            RefreshParams.doNav = false;
            RefreshParams.MsgNavigation = "";
            break;
        }
        //  sap.ui.getCore().byId("Z_MSG_TECH_V1---master").getController().doRefreshOutside(RefreshParams);
        var oControllerMaster = zodataajax.getMasterController();
        oControllerMaster.doRefreshOutside(RefreshParams);
      },

      _clearFileModel: function () {
        // var oAttachModel = this.getModel("AttachData");
        // oAttachModel.destroy();

        var oUploadCollection = this.byId("UploadCollectionEdit");
        if (!(oUploadCollection === undefined)) {
          oUploadCollection.destroyItems();
        }
        /*
         */
      },

      _busyDialog: function (OnOffDialog) {
        var oViewModel = this.getModel("detailView");
        if (OnOffDialog) {
          // открываем диалог
          oViewModel.setProperty("/busy", true);
        } else {
          oViewModel.setProperty("/busy", false);
        }
      },

      // ЭЦП
      onSelectAttachment: function (oEvent) {


        var oUploadCollectionItem = oEvent.getParameter("selectedItem");
        var oBindingContext = oUploadCollectionItem.getBindingContext("AttachData");
        var oSelectedData = oBindingContext.getProperty();
        var oUploaderModel = this.getModel("Uploader");
        var sFilename = oSelectedData.Filename;
        var aSplitedFilename = sFilename.split('.');
        var sMimeType = aSplitedFilename[aSplitedFilename.length - 1].toUpperCase();
        var oSignTool = this.getOwnerComponent().oAttachmentSignTool;

        oUploaderModel.setProperty("/selectedData", oSelectedData);

        if (!oSignTool.getContentTypes()[sMimeType]) {
          oUploaderModel.setProperty("/sign/visible", false);
          oUploaderModel.setProperty("/verify/visible", false);
          oUploaderModel.setProperty("/download/visible", false);
        } else {
          oUploaderModel.setProperty("/sign/visible", true);
          oUploaderModel.setProperty("/verify/visible", true);
          oUploaderModel.setProperty("/download/visible", true);
        }

        oUploaderModel.setProperty("/sign/enabled", !oSelectedData.SignDoc_ac);
        oUploaderModel.setProperty("/verify/enabled", oSelectedData.SignDoc_ac && !oSelectedData.VerifyDsig_ac);
        oUploaderModel.setProperty("/download/enabled", oSelectedData.SignDoc_ac);
      },

      onOpenSignDialog: async function(oEvent) {
        var oSelectedData = this.getModel("Uploader").getProperty("/selectedData");

        if (oSelectedData) {
          this.getOwnerComponent().oAttachmentSignTool.openSignDialog(oSelectedData);   
        } else {
          sap.m.MessageToast('Выберете вложение');
        }
      },
      
      onOpenSignMainDocument: function(oEvent) {
      	var sBukrs = this.oModelView.oData.d.Bukrs;
      	var sId = this.oModelView.oData.d.FileId;
      	var sMandt = jQuery.sap.getUriParameters().get("sap-client") || "100";
      	var sFileName = this.oModelView.oData.d.FileName;
      	var sFileUrl = '/sap/public/zfnsxml/' + this.oModelView.oData.d.FileName;
      	var oSelectedData = { Filename: sFileName, FileUrl: sFileUrl, Burks: sBukrs, Mandt: sMandt, Id: sId };

        if (oSelectedData) {
          this.getOwnerComponent().oDocumentSignTool.openSignDialog(oSelectedData);   
        } else {
          sap.m.MessageToast('Выберете вложение');
        }
      },
      
      onDeleteSignMainDocument: function(oEvent) {
      		var oBindingContext = oEvent.getSource().getBindingContext('documents');
      		
      		if(oBindingContext) {
      			var oProperty = oBindingContext.getProperty();
      			var oModel = this.getModel('documents');
      			
      			oModel.callFunction('/DeleteDsig', {
      				method: 'POST',
      				urlParameters: {
      					Mandt: oProperty.Mandt,
      					Id: oProperty.Id,
      					Bukrs: oProperty.Bukrs
      				},
      				success: function(res) {
      					sap.m.MessageToast.show(res.Message);
      					oModel.refresh(true);
      				}.bind(this),
      				error: function(res) {
      					sap.m.MessageToast.show(res.Message);
      				}.bind(this)
      			});
      		}
      },
      
      onDownloadSignMainDocument: function(oEvent) {
      	var element = document.createElement('a');
      	var sFilename = this.oModelView.oData.d.FileName.split('.').shift() + '.sig';
        element.setAttribute('href', '/sap/public/zfnsxml/' + sFilename);
        element.setAttribute('download', sFilename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      },
      
      _pushDocumentSign: function(sId, sBukrs, sSignedMessage) {
	    return new Promise(function(resolve, reject) {
	      this.getModel('documents').create(
	        `/ItemDsigSaveSet`,
	        { DsigData: sSignedMessage, Bukrs: sBukrs, DocId: sId  },
	        {
	          success: function(oResponce) {
	            resolve(oResponce);
	          },
	          error: function(err) {
	            reject(err);
	          }
	        }
	      );
	    }.bind(this));
	  },

      onVerifyAttachment: function (oEvent) {

      },

    _pushAttachmentSign: function(sMsgId, sDocumentId, sSignedMessage) {
      return new Promise(function(resolve, reject) {
        this.getModel().create(
          `/ItemDsigSaveSet`,
          { DsigData: sSignedMessage, DocId: sDocumentId, MsgId: sMsgId },
          {
            success: function(oResponce) {
              resolve(oResponce);
            },
            error: function(oResponce) {
              reject(oResponce)
            }
          }
        );
      }.bind(this));
    },

    onSignDownload: function(oEvent) {
      var oUploaderModel = this.getModel('Uploader');
      var oFileData = oUploaderModel.getProperty('/selectedData');
      var sMsgId = oFileData.MsgId;
      var sDocumentId = oFileData.documentId;

      if(oFileData) {
        window.open(window.location.origin + `/sap/opu/odata/sap/ZTC_MSGTECH_GTW_SRV/ItemDsigSet(MsgId='${sMsgId}',DocId='${sDocumentId}')/$value`, "_blank");
      }
    },

    onDeleteAttachment: function(oEvent) {
      var oSource = oEvent.getSource();
      var oBindingContext = oSource.getBindingContext('AttachData');
      var sDocumentId = oBindingContext.getProperty('documentId');
      var sMsgId = oBindingContext.getProperty('MsgId');

      sap.m.MessageBox.confirm("Вы действительно хотите удалить файл?", {
        title: 'Подтвердите действие',
        actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
        onClose: function(oAction) {
          if(oAction === "YES") {
            this.getModel().remove(`/TechMsgAttachmentSet(MsgId='${sMsgId}',documentId='${sDocumentId}')`, {
              success: function(e) {
                this._setModelAttach(sMsgId);
                sap.m.MessageToast.show("Файл успешно удален");
              }.bind(this)
            });
          }
        }.bind(this)
      });
    },

    onDownTempPressed: function () {

      var oTemplateModel = new JSONModel({
        "Data": [
          {
            DocID: '',
            DocCode: '',
            DocName: '',
            DocNum: '',
            DocDate: ''
          }
        ]
      });

      this.setModel(oTemplateModel, "Template");

      var aCols, oBinding, oSettings, oSheet, oTable;
      var that = this;
      aCols = this._createColumnConfig();
      oTable = this.getModel('Template');

      oSettings = {
        workbook: { columns: aCols },
        dataSource: oTable.getData().Data,
        fileName: "Template.xlsx",
      };

      oSheet = new Spreadsheet(oSettings);
      oSheet.build()
        .then(function () {
          sap.m.MessageToast.show("Шаблон выгружен");
        }).finally(function () {
          oSheet.destroy();
        });
    },

    _createColumnConfig: function () {
      return [
        {
          label: 'Идентификатор документа в системе',
          property: 'DocID',
          scale: 0
        },
        {
          label: 'Вид документа',
          property: 'DocCode',
        },
        {
          label: 'Наименование документа',
          property: 'DocName',
        },
        {
          label: 'Номер документа',
          property: 'DocNum',
        },
        {
          label: 'Дата документа',
          property: 'DocDate',
          type: sap.ui.export.EdmType.Date
        }];
    },

    onUpload: function(oEvent){
      var that = this;
      var file = oEvent.getParameter("files")[0];
      var reader = new FileReader();
      reader.onload = function (e) {
      var data = new Uint8Array(e.target.result);
      var workbook = XLSX.read(data, {
        type: 'array'
      });
      
      var woorksheet = workbook.Sheets[workbook.SheetNames[0]];
      var jsonData = XLSX.utils.sheet_to_json(woorksheet);
      

      var tableData = [];
      jsonData.map((item, index) => {
        tableData.push({
          DocID: item['Идентификатор документа в системе'],
          DocCode: item['Вид документа'],
          DocName: item['Наименование документа'],
          DocNum: item['Номер документа'],
          DocDate: formatter.formatXlsxDate(item['Дата документа'].toString()),
          MessageId: '10000000001'
        })
      })
      var itemModel = {
        d: {
          results: 
            [...tableData]
        }
      }
      var oModelItems = that.getView().getModel('ItemsData');
      oModelItems.setData(itemModel);
      // that.byId("TableEditInfo").getItems().setValue(tableData);
    };
    reader.readAsArrayBuffer(file);

    },
    
    onUploadComplete: function(oEvent){
      sap.m.MessageToast.show("File Uploaded");
      var oFilerefresh = this.getView().byId("TableEditInfo");
      oFilerefresh.getModel("ItemsData").refresh(true);
      sap.m.MessageToast.show("File refreshed");
    },

    configureValueHelp: function() {
      //this._oBasicSearchField = new sap.m.SearchField();
    var json = {
      "cols": [
        {
          "label": "Код",
          "template": "Code",
          "width": "15%"
        },
        {
          "label": "КНД",
          "template": "Knd",
          "width": "15%"
        },
        {
          "label": "Наименование",
          "template": "NameLong"
        }
      ]
    };
    this.oColModel = new JSONModel(json);
    var globPath = "z_tech_appeal.view.";
    var oFragment = sap.ui.xmlfragment(
            this.getView().getId(),
            (globPath + "ValueHelpDialogSingleSelect").toString(),
            this
        );
    this._oValueHelpDialog = oFragment;
    this.getView().addDependent(this._oValueHelpDialog);

    // var oFilterBar = this._oValueHelpDialog.getFilterBar();
    // oFilterBar.setFilterBarExpanded(false);
    // oFilterBar.setBasicSearch(this._oBasicSearchField);


        var oTable = this._oValueHelpDialog.getTable();
    oTable.setModel(this.getModel());
    oTable.setModel(this.oColModel, "columns");
        if (oTable.bindRows) {
      oTable.bindAggregation("rows", "/DocumentCodeCatalogSet");
    }

    if (oTable.bindItems) {
      oTable.bindAggregation("items", "/DocumentCodeCatalogSet", function () {
        return new ColumnListItem({
          cells: aCols.map(function (column) {
            return new Label({ text: "{" + column.template + "}" });
          })
        });
      });
    }
    this._oValueHelpDialog.update();
    },

    onValueHelpRequested: function(oEvent) {
      this._oValueInput = oEvent.getSource();
      this.configureValueHelp();
    // var oToken = new sap.m.Token();
    // oToken.setKey(this._oValueInput.getSelectedKey());
    // oToken.setText(this._oValueInput.getValue());
    // this._oValueHelpDialog.setTokens([oToken]);      
      this._oValueHelpDialog.open();
    },

//F4 для поля 'Причина отклонения'
  configureReasonValueHelp: function() {
    var json = {
      "cols": [
        {
          "label": "Код причины",
          "template": "RejectReason",
          "width": "10%"
        },
        {
          "label": "Текст причины",
          "template": "Text"
        }
      ]
    };
    this.oColModel = new JSONModel(json);
    var globPath = "z_tech_appeal.view.";
    var oFragment = sap.ui.xmlfragment(
      this.getView().getId(),
      (globPath + "ValueHelpDialogRejectReason").toString(),
      this
    );
    this._oValueHelpDialog = oFragment;
    this.getView().addDependent(this._oValueHelpDialog);

    var oTable = this._oValueHelpDialog.getTable();
    oTable.setModel(this.getModel());
    oTable.setModel(this.oColModel, "columns");
    if (oTable.bindRows) {
      oTable.bindAggregation("rows", "/RejectReasonCatalogSet");
    }

    if (oTable.bindItems) {
      oTable.bindAggregation("items", "/RejectReasonCatalogSet", function () {
        return new ColumnListItem({
          cells: aCols.map(function (column) {
            return new Label({ text: "{" + column.template + "}" });
          })
        });
      });
    }
    this._oValueHelpDialog.update();
  },

  onValueHelpRejectReason: function() {
    this._oValueInput = this.getView().byId("EditRejectReason");
    this.configureReasonValueHelp();
    this._oValueHelpDialog.open();
  },

  onFilterBarSearch: function (oEvent) {
    var aSelectionSet = oEvent.getParameter("selectionSet");
    var aFilters = aSelectionSet.reduce(function (aResult, oControl) {
      if (oControl.getValue()) {
        aResult.push(new sap.ui.model.Filter({
          path: oControl.getName(),
          operator: sap.ui.model.FilterOperator.Contains,
          value1: oControl.getValue()
        }));
      }
      return aResult;
    }, []);

    this._filterTable(new sap.ui.model.Filter({
      filters: aFilters,
      and: true
    }));
  },

  _filterTable: function (oFilter) {
    var oValueHelpDialog = this._oValueHelpDialog;

    var oTable = oValueHelpDialog.getTable();
    if (oTable.bindRows) {
      oTable.getBinding("rows").filter(oFilter);
    }

    if (oTable.bindItems) {
      oTable.getBinding("items").filter(oFilter);
    }

    oValueHelpDialog.update();
  },

  onValueHelpOkPress: function (oEvent) {
    var aTokens = oEvent.getParameter("tokens");
    if (aTokens.length > 0) {
      var sKey = aTokens[0].getKey();
      var sValue = aTokens[0].getCustomData()[0].mProperties.value.NameLong;
      this._oValueInput.getCustomData()[0].setValue(sKey);
      this._oValueInput.setValue(sKey + ' - ' + sValue);
    }
    this._oValueHelpDialog.close();
  },



  onSelectTypeChange: function(oEvent) {
    var input = this.byId("EditAisStatus");
    if (input) {
      var visible = ( input.getSelectedKey() === '2' || input.getSelectedKey() === '3' );
      this.byId("EditRejectReason").setVisible(visible);
      this.byId("EditRejectReasonLbl").setVisible(visible);
    }

    var tableItems = this.byId("TableEditInfo").getItems();
    tableItems.forEach(item => {
      this.setValidation(item.getCells()[0],false);
      this.setValidation(item.getCells()[1],false);
      this.setValidation(item.getCells()[2],false);
      this.setValidation(item.getCells()[3],false);
      this.setValidation(item.getCells()[4],false);
    })

    this.getModel("DetailData").setProperty("/d/AisStatus",input.getSelectedKey());

    [
      "labelId",
      "labelCode",
      "labelName",
      "labelDate"
    ].forEach(function (namefield) {
      if (input.getSelectedKey() === '1' || input.getSelectedKey() === '3') {
        this.byId(namefield).setRequired(true);
      } else {
        this.byId(namefield).setRequired(false);
      }
    }.bind(this))
  },

  onClearField: function(oEvent) {
//    this.getModel("DetailData").setProperty("/d/DocCode",undefined);
//    this.getModel("DetailDocData").setProperty("/d/NameLong",undefined);
//    this.byId("EditDocCode").setValue(undefined);

    var oSelected = this.byId("TableEditInfo").getSelectedItems();
    if (oSelected) {
      oSelected.map(item => {
        item.getCells()[1].setValue('');
      })
    }   
  },

  handleSearch: function (oEvent) {
    var sValue = oEvent.getParameter("value");
    var oFilter = new Filter("NameLong", sap.ui.model.FilterOperator.Contains, sValue);
    var oBinding = oEvent.getSource().getBinding("items");
    oBinding.filter([oFilter]);
  },

  onValueHelpCancelPress: function () {
    this._oValueHelpDialog.close();
  },

  onValueHelpAfterClose: function () {
    this._oValueHelpDialog.destroy();
  },

  onUploaCollectionChange: function(oEvent) {
    if (this.oModelView.oData.d.Msgty === 'R') {
      oEvent.getSource().removeAllItems();
      // this.byId("EditDocUrl").setValue("")
    }
  },

  onDocUrlChange: function(oEvent) {
    // if (oEvent.mParameters.newValue) {
    //  this.byId("UploadCollectionEdit").removeAllItems();
    // }
  },

  
  //RejectReson  
  onRejectReasonValueHelpOkPress: function (oEvent) {
    var aTokens = oEvent.getParameter("tokens");
    if (aTokens.length > 0) {
      var sKey = aTokens[0].getKey();
      this._oValueInput.setValue(sKey);
    }
    this._oValueHelpDialog.close();
  },

  onRejectReasonValueHelpCancelPress: function () {
    this._oValueHelpDialog.close();
  },

  onRejectReasonValueHelpAfterClose: function () {
    this._oValueHelpDialog.destroy();
  },

    });
  }
);
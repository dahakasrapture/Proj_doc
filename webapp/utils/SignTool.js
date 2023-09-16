sap.ui.define([
    'sap/ui/base/EventProvider',
    "sap/ui/model/json/JSONModel",
    "./Cache",
    "sap/ui/base/Event"
], function(EventProvider, JSONModel, Cache, Event) {
    'use strict';
    
    var bIsPluginLoaded = false;
    var bIsPuginLoadingError = false;

    var SignTool = EventProvider.extend('sap.nalmon.utils.SignTool', {
        _mContentTypes: {
            "PDF": "application/pdf",
            "XML": "text/plain",
            "XLS": "application/vnd.ms-excel",
            "XLSX": "application/vnd.openxmlformats",
            "ZIP": "application/zip",
        },
        _mContentHandlers: {
            "PDF": "_getPDFFrame",
            "XML": "_getXMLFrame",
            "XLS": "_getDummyFrame",
            "XLSX": "_getDummyFrame",
            "ZIP": "_getDummyFrame",
        },

        _metadata: {
            events: {
                afterDialogClose: { name: 'afterDialogClose' },
                afterDialogOpen: { name: 'afterDialogOpen' },
                afterDialogOpen: { name: 'afterDialogOpen' },
                beforeDialogOpen: { name: 'beforeDialogOpen' },
                signed: { name: 'signed' }
            }
        },

        constructor: function(sPathToPlugin, oOptions) {
            EventProvider.call(this);

            this._oComponent = oOptions.component || null;
            this._bCache = oOptions.cache || true;
            this._oAdditionalControls = {};
            this._oCertificates = null;
            this._sSignData = null;
            this._sFileData = null;
            this._oFileDecoder = new TextDecoder(oOptions.decoding || 'utf-8');
            this._oSelectedData = null;
        	
        	if(!bIsPluginLoaded && !bIsPuginLoadingError) {
        		sap.ui.require([sPathToPlugin], function() {
	        		if(cadesplugin) {
		        		cadesplugin.then(function() {
			    			bIsPluginLoaded = true;
			    			bIsPuginLoadingError = false;
			    			console.log('Криптоплагин загружен успешно')
			    		}.bind(this)).catch(function(err) {
			    			bIsPluginLoaded = false;
			    			bIsPuginLoadingError = true;
			    			console.error('При загрузке криптоплагина произошла ошибка', err.message || err.toString());
			    		}.bind(this));
		        	} else {
		        		bIsPluginLoaded = false;
			    		bIsPuginLoadingError = false;
		        		console.error('Криптоплагин не найден');
		        	}
	        	}.bind(this));
        	}
        	
        },
        
        setDecoding: function(sName) {
        	this._oFileDecoder =  new TextDecoder(sName || 'utf-8');
        	
        	return this;
        },
        
        getContentTypes: function() {
        	return this._mContentTypes;
        },
        
        _isPluginLoaded: function() {
        	return bIsPluginLoaded && !bIsPuginLoadingError;
        },

        _getPDFFrame: function(base64, buffer) {
            return new Promise(function(resolve) {
                sap.ui.require([
                    "sap/ui/core/HTML"
                ], function(HTML) {
                    if(this._oAdditionalControls.oHTML) {
                        this._oAdditionalControls.oHTML.setContent(`<iframe id="frame" src="${base64}" width="100%" height="500"></iframe>`);
                    } else {
                        this._oAdditionalControls.oHTML = new HTML({ content: `<iframe id="frame" src="${base64}" width="100%" height="500"></iframe>` });
                    }
                    resolve(this._oAdditionalControls.oHTML);
                }.bind(this));
            }.bind(this));
        },

        _getXMLFrame: function(base64, buffer) {
            return new Promise(function(resolve) {
                sap.ui.require([
                    "sap/ui/codeeditor/CodeEditor"
                ], function(CodeEditor) {
                    var sValue = this._bufferToString(buffer);

                    if(this._oAdditionalControls.oCodeEditor) {
                        this._oAdditionalControls.oCodeEditor.setValue(sValue);
                    } else {
                        this._oAdditionalControls.oCodeEditor = new CodeEditor({
                            editable: false,
                            height: "500px",
                            type: 'xml',
                            value: sValue
                        });
                    }
                    resolve(this._oAdditionalControls.oCodeEditor);
                }.bind(this)); 
            }.bind(this));
        },

        _getDummyFrame: function(base64) {
            return new Promise(function(resolve) {
                sap.ui.require([
                    "sap/m/VBox",
                    "sap/m/Title", 
                    "sap/m/Button"
                ], function(VBox, Title, Button) {
                    if(!this._oAdditionalControls.oDammyView) {
                        this._oAdditionalControls.oDammyView = new VBox({
                            justifyContent: "Center",
                            alignItems: "Center",
                            visible: true,
                            width: "100%",
                            height: "500px",
                            items: [
                                new Title({
                                    textAlign: "Center",
                                    titleStyle: "H2",
                                    styleClass: "sapUiSmallMargin",
                                    wrapping: true,
                                    text: "Документ данного типа невозможно отобразить, он автоматически скачаться на Ваш компьютер"
                                }),
                                new Button({
                                    text: "Скачать",
                                    icon: "sap-icon://download",
                                    press: this._onSignDownload.bind(this),
                                    type: "Emphasized"
                                })
                            ]
                        });
                    }
                    
                    this._onSignDownload();
                    resolve(this._oAdditionalControls.oDammyView);
                }.bind(this)); 
            }.bind(this));
        },

        _onSignDownload: function(oEvent) {
        	if(this._oSelectedData) {
				var element = document.createElement('a');
	            element.setAttribute('href', this._oSelectedData.FileUrl);
	            element.setAttribute('download', this._oSelectedData.Filename);
	            element.style.display = 'none';
	            document.body.appendChild(element);
	            element.click();
	            document.body.removeChild(element);	
        	}
        },

        openSignDialog: function(oSelectedData) {
            sap.ui.require([
                "sap/m/VBox",
                "sap/m/List",
                "sap/m/Dialog",
                "sap/m/Button",
                "sap/m/StandardListItem",
                "sap/m/MessageToast",
                "sap/ui/core/BusyIndicator",
                "sap/m/MessageBox",
                "sap/ui/core/CustomData"
            ], async function(VBox, List, Dialog, Button, StandardListItem, MessageToast, BusyIndicator, MessageBox, CustomData) {
                try {
                    BusyIndicator.show(500);

                    if (oSelectedData && this._isPluginLoaded()) {
                        this._oSelectedData = oSelectedData;
                        
                        var mEvents = this._metadata.events;
                        var fnInvokeDialogEvent = function(sId, oEvent) {
                            var mParameters = Object.assign({ dialog: oEvent.getSource() }, oEvent.getParameters());
                                    
                            this.fireEvent(sId, mParameters);
                        };
                        var aCertificatesList = (await this._getCertificatesList()).map(function(oItem) {
                            return new StandardListItem({ 
                                title: oItem.name,
                                customData: [
                                    new CustomData({ key: 'index', value: oItem.index })
                                ]
                            });
                        });
                        var oFileViewer = await this._getFileViewer(oSelectedData);

                        if(this._oAdditionalControls.oCertificatesList) {
                            this._oAdditionalControls.oCertificatesList.removeAllItems();
                            aCertificatesList.forEach(function(oItem) {
                                this._oAdditionalControls.oCertificatesList.insertItem(oItem);
                            }.bind(this));
                        } else {
                            this._oAdditionalControls.oCertificatesList = new List({
                                mode: 'SingleSelectMaster',
                                items: aCertificatesList
                            });
                        }

                        if(this._oAdditionalControls.oSingDialog) {
                            this._oAdditionalControls.oSingDialog.removeContent(0);
                            this._oAdditionalControls.oSingDialog.addContent(new VBox({
                                // styleClass: 'dummyView',
                                width: "100%",
                                height: "100%",
                                items: [
                                    oFileViewer,
                                    this._oAdditionalControls.oCertificatesList
                                ]
                            }));
                        } else {
                            this._oAdditionalControls.oSingDialog = new Dialog({
                                busy: false,
                                title: 'Подписать документ',
                                content: [
                                    new VBox({
                                        // styleClass: 'dummyView',
                                        width: "100%",
                                        height: "100%",
                                        items: [
                                            oFileViewer,
                                            this._oAdditionalControls.oCertificatesList
                                        ]
                                    })
                                ],
                                buttons: [
                                    new Button({ type: "Emphasized", text: "Подписать", press: this._signDocument.bind(this) }),
                                    new Button({  type: "Emphasized", text: "Отмена", press: this.closeSignDialog.bind(this) }),
                                ],
                                afterClose: function(oEvent) { fnInvokeDialogEvent.call(this, mEvents.afterDialogClose.name, oEvent); }.bind(this),
                                afterOpen: function(oEvent) { fnInvokeDialogEvent.call(this, mEvents.afterDialogOpen.name, oEvent); }.bind(this),
                                beforeClose: function(oEvent) { fnInvokeDialogEvent.call(this, mEvents.afterDialogOpen.name, oEvent); }.bind(this),
                                beforeOpen: function(oEvent) { fnInvokeDialogEvent.call(this, mEvents.beforeDialogOpen.name, oEvent); }.bind(this)
                            });
                            
                            this._oAdditionalControls.oSingDialog.addStyleClass('sapUiSizeCompact');
                        }

                        this._oAdditionalControls.oSingDialog.open();
                    } else {
                        MessageToast.show('Выберете вложение');
                    }

                    BusyIndicator.hide();
                } catch(err) {
                    MessageBox.error(err.message || err.toString());
                    BusyIndicator.hide();
                }
            }.bind(this));
        },

        closeSignDialog: function(oEvent) {
        	if(!this._isPluginLoaded()) {
        		return;
        	}
        	
            if(this._oAdditionalControls.oCertificatesList) {
                this._oAdditionalControls.oCertificatesList.removeSelections();
            }

            if(this._oAdditionalControls.oSingDialog) {
                this._oAdditionalControls.oSingDialog.close();
            }

            this._sFileData = null;
            this._sSignData = null;
			this._oSelectedData = null;
        },

        _signDocument: async function() {
            sap.ui.require([
                "sap/m/MessageBox",
                "sap/m/MessageToast"
            ], async function(MessageBox, MessageToast) {
                try {
                    if(this._oAdditionalControls.oCertificatesList && this._oCertificates && this._sFileData) {
                        var mEvents = this._metadata.events;
                        var oSelectedItem = this._oAdditionalControls.oCertificatesList.getSelectedItem();

                        if(!oSelectedItem) {
                            MessageToast.show('Выберете сертификат');
                            return;
                        }

                        var sSertificateIndex = oSelectedItem.data('index');
                        var oCertificate = await this._oCertificates.Item(Number(sSertificateIndex));
                        var sSignature = await this._getSignature(this._sFileData, oCertificate);
        
                        this.fireEvent(mEvents.signed.name, { signature: sSignature, selectedData: this._oSelectedData });
                        this.closeSignDialog();
                    }
                } catch(err) {
                    MessageBox.error(err.message || err.toString());
                }
            }.bind(this));
        },

        _getCertificatesList: async function () {
            return cadesplugin.CreateObjectAsync("CAdESCOM.Store").then(
              async function (oStore) {
                oStore.Open();
                this._oCertificates = await oStore.Certificates;
                var sCertCount = await this._oCertificates.Count;
                var aCerts = [];
                for (var i = 1; i <= sCertCount; i++) {
                  var oCert = await this._oCertificates.Item(i);
                  var sCertName = await oCert.SubjectName;
                  aCerts.push({
                    name: sCertName,
                    index: i,
                  });
                }
    
                return aCerts;
              }.bind(this)
            );
          },
    
        _getFileViewer: async function(oSelectedData) {
            if(oSelectedData) {
                var sFilename = oSelectedData.Filename;
                var aSplitedFilename = sFilename.split('.');
                var sMimeType = aSplitedFilename[aSplitedFilename.length - 1].toUpperCase();
                var sContentType = this._mContentTypes[sMimeType];
                var sHandlerName = this._mContentHandlers[sMimeType];

                if(this._bCache && Cache.has(oSelectedData)) {
                    var oCache = Cache.get(oSelectedData);
                    var oViewer = await this[sHandlerName].call(this, oCache.base64, oCache.buffer);
                    this._sFileData = oCache.base64.split(',').pop();

                    return oViewer;
                }

                var buffer = await this._getFileData(oSelectedData.FileUrl);
                var base64 = await this._bufferToBase64(buffer, sContentType);
                var oViewer = await this[sHandlerName].call(this, base64, buffer);

                this._sFileData = base64.split(',').pop();

                if(this._bCache) {
                    Cache.set(oSelectedData, { base64: base64, buffer: buffer });
                }

                return oViewer;
            }
        },

        _bufferToString: function(buffer) {
            return this._oFileDecoder.decode(buffer);
        },

        _bufferToBase64: function(buffer, sContentType) {
            return new Promise(function(resolve, reject) {
                var blob = new Blob([buffer], { type: sContentType });
                var reader = new FileReader();
        
                reader.onload = function() { resolve(reader.result) };
                reader.readAsDataURL(blob);
              });
        },

        _getFileData: function(sPath) {
            return new Promise(function(resolve, reject) {
                var xhrOverride = new XMLHttpRequest();
                xhrOverride.responseType = 'arraybuffer';
        
                jQuery.ajax({
                    url: sPath,
                    method: "GET",
                    xhr: function() {
                    return xhrOverride;
                    },
                    dataType: "x-binary",
                    converters: {'* x-binary'(value) {return value}},
                    success: function(oResponce) { resolve(oResponce); },
                    error: function(oResponce) { reject(oResponce); }
                });
            });
        },

        _getSignature: async function (sFileData, oCertificate) {
            return new Promise(async function(resolve, reject) {
              try {
                  var oSigner = await cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
                  var oSignedData = await cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
      
                  await oSignedData.propset_ContentEncoding(1);
                  await oSignedData.propset_ContentEncoding(cadesplugin.CADESCOM_BASE64_TO_BINARY);
                  await oSigner.propset_Certificate(oCertificate);
                  await oSigner.propset_TSAAddress("http://cryptopro.ru/tsp/");
                  await oSignedData.propset_Content(sFileData);
      
                  var sSignedMessage = await oSignedData.SignCades(oSigner, 1);
                  resolve(sSignedMessage);
              } catch (err) {
                  reject(cadesplugin.getLastError(err))
              }
            }.bind(this));
        },

        destroy: function() {
            Object.keys(this._oAdditionalControls).forEach(function(sKey) {
                this._oAdditionalControls[sKey] = this._oAdditionalControls[sKey].destroy();
            });

            this._oCertificates = null;
            this._oComponent = null;
            this._sSignData = null;
            this._sFileData = null;
            this._oFileDecoder = null;
            this._oSelectedData = null;
            
            bIsPluginLoaded = false;
			bIsPuginLoadingError = false;

            EventProvider.prototype.destroy.call(this);
        }
    });

    return SignTool;
});
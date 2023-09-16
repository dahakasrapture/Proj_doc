jQuery.sap.declare("webide.mock.ext.mockRequests");

//========================================================

jQuery.sap.declare("sap.m.MessageToast");
sap.m.MessageToast = {};
sap.m.MessageToast.show = function(obj) {
  console.log(obj.toString());
//  return alert(obj);
};

//========================================================

webide.mock.ext.mockRequests = {};
webide.mock.ext.mockRequests.getRequests = function() {
  return [webide.mock.ext.mockRequests.mockAddFunctionImport()];
};
webide.mock.ext.mockRequests.mockAddFunctionImport = function() {
  return {
    method: "GET",
    path: new RegExp("SomeAction"),
    response: function(oXhr) {
      oXhr.respondJSON(204);
    }
  };
};
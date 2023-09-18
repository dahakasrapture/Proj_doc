sap.ui.define([], function () {
    "use strict";
  
    return {
      /**
       * Rounds the currency value to 2 digits
       *
       * @public
       * @param {string} sValue value to be formatted
       * @returns {string} formatted currency value with 2 digits
       */
      currencyValue: function (sValue) {
        if (!sValue) {
          return "";
        }
  
        return parseFloat(sValue).toFixed(2);
      },
  
      statusText: function (MsgStatusId) {
        //if(!(MsgStatusId)){ return; }
        if (MsgStatusId.toString() === "1") {
          return "Новое сообщение";
        } else if (MsgStatusId.toString() === "2") {
          return "В работе";
        } else if (MsgStatusId.toString() === "3") {
          return "Ответ направлен";
        } else {
          return "None";
        }
      },
  
      statusState: function (MsgStatusId) {
        if (MsgStatusId === "1") {
          return "None";
        } else if (MsgStatusId === "2") {
          return "Warning";
        } else if (MsgStatusId === "3") {
          return "Success";
        } else {
          return "Error";
        }
      },
  
      Date2ABAP: function (sJSDate) {
        var Year = sJSDate.getFullYear();
        var Month = parseInt(sJSDate.getMonth(), 10) + 1;
        if (Month.toString().length < 2) {
          Month = "0" + Month.toString();
        }
        var MonthDate = sJSDate.getDate();
        if (MonthDate.toString().length < 2) {
          MonthDate = "0" + MonthDate.toString();
        }
        return [Year.toString(), Month.toString(), MonthDate.toString()].join(
          "-"
        );
      },
  
      formatDate: function (sDate) {
        var oDate;
  
        if (typeof sDate === "object") {
          oDate = sDate;
        } else {
          var sReplaceDate = sDate.replace(/^\D+/, "").replace(/\D+$/, "");
          oDate = new Date(Number(sReplaceDate));
        }
  
        var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
//          pattern: "dd.MM.yyyy",
          pattern: "yyyy-MM-dd",
        });
  
        return oDateFormat.format(oDate);
      },
  
      formatDateObject: function (sDate) {
        var oDate;
  
        if (typeof sDate === "object") {
          oDate = sDate;
        } else {
          var sReplaceDate = sDate.replace(/^\D+/, "").replace(/\D+$/, "");
          oDate = new Date(Number(sReplaceDate));
        }
  
        return oDate;
      },
  
      formatAisStatus: function(status, catalog) {
          //if (status === '2') {
          //    return "Запрос не исполнен";
          //}
          //if (status === '1') {
          //    return "Запрос исполнен";
          //}
          //return "";
          
           var entry = catalog.find(function(item) {
          	return item.Code === status;
          });
          
          if(entry) {
          	return entry.Text;
          }
          
          return "";
      },
  
      formatRequestBase: function(status, catalog) {
          //if (status === '3') {
          //    return "пункт 3 ст. 105.29 НК РФ (документы)";
          //}
          //if (status === '6') {
          //    return "иное основание (документы)";
          //}
          //return "";
          
          var entry = catalog.find(function(item) {
          	return item.Code === status;
          });
          
          if(entry) {
          	return entry.Text;
          }
          
          return "";
      }
    };
  
  
  });
/*global AJAXPOST, FILLIN, HELPTOPICS, TIMEPICKER, CAL, window, URLTOPDF, ADMIN, COMMON, DISPLAYGRID, EMBED, CANVAS, CKEDITOR, CANV2, MAIN, CARDS, PFLOGOS*/
/*jslint node:true, white:true, browser:true, this:true, maxlen: 1000000*/
var INVREPORT = {};
INVREPORT.controlDivId = "divControls";
INVREPORT.displayDivId = "divMain";

INVREPORT.initPage = function () {
    //var reportData = AJAXPOST.callQuery("WMS_GetStockReport", null).pay;

    var allLocations = AJAXPOST.callQuery("WMS_GetAllLocations").payload;

    var keys = Object.keys(allLocations.rows);
    var ddl = [{"text" : "--select an option--", "value" : ""}];
    keys.forEach(function (item) {
        ddl.push({ "text": allLocations.rows[item], "value": allLocations.rows[item] });
    });

    var formIndex = FILLIN.createForm(INVREPORT.controlDivId, "Inventory Report", "Use the controls below");
    FILLIN.addButton(formIndex, null, "butSearch", "Search", true);
    FILLIN.addDDL(formIndex, "ddlFrom", "", "From", null, ddl);
    FILLIN.addDDL(formIndex, "ddlTo", "", "To", null, ddl);
    //FILLIN.addDDL(formIndex, "ddlTo", "", "To", null);
    FILLIN.displayForm(formIndex);


    var gridIndex = DISPLAYGRID.addGrid(INVREPORT.displayDivId, "divInvReportGrid", "WMS_GetPhysInvReport", null, 15);
    DISPLAYGRID.alternateColors(gridIndex);
    DISPLAYGRID.display(gridIndex);
}
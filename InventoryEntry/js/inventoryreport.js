/*global AJAXPOST, FILLIN, HELPTOPICS, TIMEPICKER, CAL, window, URLTOPDF, ADMIN, COMMON, DISPLAYGRID, EMBED, CANVAS, CKEDITOR, CANV2, MAIN, CARDS, PFLOGOS*/
/*jslint node:true, white:true, browser:true, this:true, maxlen: 1000000*/
var INVREPORT = {};
INVREPORT.controlDivId = "divContols";
INVREPORT.displayDivId = "divMain";

INVREPORT.initPage = function () {
    var reportData = AJAXPOST.callQuery("WMS_GetStockReport", null);

    var gridIndex = DISPLAYGRID.addGrid(INVREPORT.displayDivId, "divInvReportGrid", "WMS_GetStockReport", null, 15);
    DISPLAYGRID.alternateColors(gridIndex);
    DISPLAYGRID.display(gridIndex, reportData);
}
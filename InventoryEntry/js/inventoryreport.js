/*global AJAXPOST, FILLIN, HELPTOPICS, TIMEPICKER, CAL, window, URLTOPDF, ADMIN, COMMON, DISPLAYGRID, EMBED, CANVAS, CKEDITOR, CANV2, MAIN, CARDS, PFLOGOS*/
/*jslint node:true, white:true, browser:true, this:true, maxlen: 1000000*/
var INVREPORT = {};
INVREPORT.displayDivId = "divDispMain";
INVREPORT.dialogDiv = "divDialog";
INVREPORT.site = "SD&L";
INVREPORT.isTest = false;
INVREPORT.currentUser = "";
INVREPORT.login = function () {
    "use strict";
    INVREPORT.hasPermissions = false;
    var creds = AJAXPOST.getWindowsCredentials();
    var params = [
        creds.username
    ];
    INVREPORT.currentUser = creds.username;
    var apps = AJAXPOST.callQuery2("WMS_GetUserAppsByUsername", params).payload;
    var keys = Object.keys(apps.rows);
    keys.forEach(function (item) {
        if (apps.rows[item][2] === "Physical Inventory Report") {
            INVREPORT.hasPermissions = true;
        }
    });
    document.getElementById("divTitleRight").innerHTML = "Logged in as " + (INVREPORT.currentUser === "" ? "(Login Failed)" : INVREPORT.currentUser);
};
INVREPORT.utilities = {
};
INVREPORT.init = function () {
    "use strict";
    INVREPORT.currentUser = "";
    INVREPORT.login();
    if (!INVREPORT.hasPermissions)
    {
        document.getElementById(INVREPORT.displayDivId).innerHTML = "<h2>You do not have permission to use this app.  Please contact the help desk</h2>";
        return;
    }
    INVREPORT.jobGrid();
};
INVREPORT.createNewJob = {
    currentJob: {
        name: "",
        usewmslocations: false,
        uselxlocations: false,
        wmssite: "",
        wmssitename: "",
        istest: false,
        warehouse: "",
        company: "",
        warehousename: "",
        username: "",
        jobid: "",
        lxlocs: []
    },
    addJobProperties: function (formIndex, stepNumber) {
        "use strict";
        var stepCount = 1;
        var job = INVREPORT.createNewJob.currentJob;
        while (stepCount <= stepNumber) {


            switch (stepCount) {
                case 1:
                    FILLIN.addSpan(formIndex, null, (job.istest ? "Test" : "Production"), "System Used", null, true);
                    break;
                case 2:
                    FILLIN.addSpan(formIndex, null, job.name, "Inventory Job Name");
                    break;
                case 3:
                    FILLIN.addSpan(formIndex, null, (job.usewmslocations ? "Yes" : "No"), "Use WMS Locations");
                    break;
                case 4:
                    if (job.usewmslocations) {                        
                        FILLIN.addSpan(formIndex, null, job.wmssitename, "WMS Site");
                    }
                    break;
                case 5:
                    if (job.usewmslocations) {
                        FILLIN.addSpan(formIndex, null, job.company, "Company");
                    }
                    break;
                case 6:
                    FILLIN.addSpan(formIndex, null, (job.uselxlocations ? "Yes" : "No"), "Use LX Locations");
                    break;
                case 7:
                    FILLIN.addSpan(formIndex, null, job.warehousename, "Warehouse");
                    break;
            }
            stepCount += 1;
        }
    },
    resetCurrentJob: function () {
        "use strict";
        INVREPORT.createNewJob.currentJob = {
            name: "",
            usewmslocations: false,
            uselxlocations: false,
            wmssite: "",
            wmssitename: "",
            istest: false,
            warehouse: "",
            company: "",
            warehousename: "",
            username: INVREPORT.currentUser,
            jobid: "",
            lxlocs:[]
        };
    },
    page1: function (jobId) {
        "use strict";
        if (!COMMON.exists(jobId)) {
            INVREPORT.createNewJob.resetCurrentJob();
        } else {
            var res = AJAXPOST.callQuery2("WMS_PhysInv_GetJobInfo", [jobId]);
            if (!res.payload.rows || res.payload.rows.length === 0) {
                INVREPORT.createNewJob.resetCurrentJob();
            } else {
                var row = res.payload.rows[0];
                var locs = AJAXPOST.callQuery2("WMS_PhysInv_GetJobLocations", [jobId]);
                var aLocs = [];
                locs.payload.rows.forEach(function (oneRow) {
                    aLocs.push({
                        loc: oneRow[0],
                        locdescript: oneRow[1]
                    });
                });
                INVREPORT.createNewJob.currentJob = {
                    name: row[0],
                    usewmslocations: (row[1] === "1"),
                    uselxlocations: (locs.payload.rows && locs.payload.rows.length > 0),
                    wmssite: row[2],
                    wmssitename: row[2],
                    istest: (row[4] === "1"),
                    warehouse: row[3],
                    warehousename: row[6],
                    username: INVREPORT.currentUser,
                    jobid: jobId,
                    lxlocs: aLocs,
                    company: row[5]
                };
            }
        }
        var formIndex = FILLIN.createDialog(INVREPORT.dialogDiv, "Create New Inventory Job", "Is this Job for Test or Production?", INVREPORT.createNewJob.page1actions, null, "500px");
        FILLIN.addGenericControl(formIndex, FILLIN.addFreeButton(formIndex, "test", null, "Test", false, false, "inventoryEntryLargeButton"), "", true, null, { "margin-left": "90px" });
        FILLIN.addGenericControl(formIndex, FILLIN.addFreeButton(formIndex, "prod", null, "Production", false, false, "inventoryEntryLargeButton"), "");
        FILLIN.addButton(formIndex, "cancel", null, "Cancel", true);
        FILLIN.displayForm(formIndex);
    },
    page1actions: function (dialogResults) {
        "use strict";
        if (dialogResults === "cancel") { return; }
        INVREPORT.createNewJob.currentJob.istest = (dialogResults === "test");
        INVREPORT.createNewJob.page2();
    },
    page2: function () {
        "use strict";
        var formIndex = FILLIN.createDialog(INVREPORT.dialogDiv, "Job Name", "Enter a unique name for the job.  Inventory workers will sign in to this job name so make it as discriptive as possible. Ex. &quot;2018 March Inventory Warehouse 40&quot;.  The job name needs to be unique so if the name has been used before you will be asked to change it.", INVREPORT.createNewJob.page2actions, null, "500px", INVREPORT.createNewJob.page2validation);
        INVREPORT.createNewJob.addJobProperties(formIndex, 1);
        FILLIN.addTextBox(formIndex, "txtJobName", INVREPORT.createNewJob.currentJob.name, "Inventory Job Name", true, null, null, { "width": "250px" }, true, "Job Name: ex. 2018 March Inventory Warehouse 40", false, null, "butContinue");
        FILLIN.addButton(formIndex, "continue", "butContinue", "Continue", true, true);
        FILLIN.addButton(formIndex, "back", null, "Return to Select System", false, false, true);
        FILLIN.addButton(formIndex, "cancel", null, "Cancel", false, false, true);
        FILLIN.displayForm(formIndex);
    },
    page2validation: function (dataValues, formIndex) {
        "use strict";
        var res = AJAXPOST.callQuery2("WMS_PhysInv_CheckJobName", [dataValues.txtJobName.value]);
        if (res.payload.rows[0][0] === "1") {
            FILLIN.errorMessage(formIndex, dataValues.txtJobName.value + " is already being used. Please enter a new Job name");
            return false;
        }
        return true;
    },
    page2actions: function (dialogResults, dataValues) {
        "use strict";
        if (dialogResults === "cancel") { return; }
        if (dialogResults === "back") {
            INVREPORT.createNewJob.page1();
            return;
        }
        INVREPORT.createNewJob.currentJob.name = dataValues.txtJobName.value;
        INVREPORT.createNewJob.page3();
    },
    page3: function () {
        "use strict";
        var formIndex = FILLIN.createDialog(INVREPORT.dialogDiv, "WMS Locations", null, INVREPORT.createNewJob.page3actions, null, "500px");
        INVREPORT.createNewJob.addJobProperties(formIndex, 2);
        FILLIN.addSpan(formIndex, null, "Will this job use locations found in WMS?", null, { "width": "90%" }, true);
        FILLIN.addGenericControl(formIndex, FILLIN.addFreeButton(formIndex, "yes", null, "Yes", false, false, "inventoryEntryLargeButton"), "", true, null, { "margin-left": "90px" });
        FILLIN.addGenericControl(formIndex, FILLIN.addFreeButton(formIndex, "no", null, "No", false, false, "inventoryEntryLargeButton"), "");
        FILLIN.addButton(formIndex, "back", null, "Change Job Name", true);
        FILLIN.addButton(formIndex, "cancel", null, "Cancel");
        FILLIN.displayForm(formIndex);
    },
    page3actions: function (dialogResults) {
        "use strict";
        if (dialogResults === "cancel") { return; }
        if (dialogResults === "back") {
            INVREPORT.createNewJob.page2();
            return;
        }
        INVREPORT.createNewJob.currentJob.usewmslocations = (dialogResults === "yes");
        if (dialogResults === "yes") {
            INVREPORT.createNewJob.page4();
        } else {
            INVREPORT.createNewJob.currentJob.uselxlocations = true;
            INVREPORT.createNewJob.page7();
        }
    },
    page4: function () {
        "use strict";
        var formIndex = FILLIN.createDialog(INVREPORT.dialogDiv, "WMS Site", "Select the WMS site from the dropdown to continue.", INVREPORT.createNewJob.page4actions, null, "500px");
        INVREPORT.createNewJob.addJobProperties(formIndex, 3);
        var li = [
            {
                text: "Select a Site",
                value: "-1"
            },
            {
                text: "SD&L Strongsville",
                value: "SD&L"
            },
            {
                text: "NSW Elyria",
                value: "NSW08"
            }
        ];
        FILLIN.addDDL(formIndex, "ddlSite", "", "Select Site", true, li, null, null, { "onchange": "INVREPORT.createNewJob.page4DDLChanged(this, " + String(formIndex) + ");" }, true);
        FILLIN.addButton(formIndex, "back", null, "Change WMS Location Selection", true, false, true);
        FILLIN.addButton(formIndex, "cancel", null, "Cancel", false, false, true);
        FILLIN.displayForm(formIndex);
    },
    page4DDLChanged: function (ddlObj, formIndex) {
        "use strict";
        var val = COMMON.getDDLValue(ddlObj);
        if (val === "") {
            FILLIN.errorMessage(formIndex, "Please select a site");
            return;
        }
        INVREPORT.createNewJob.currentJob.wmssite = val;
        INVREPORT.createNewJob.currentJob.wmssitename = COMMON.getDDLText(ddlObj);
        FILLIN.closeDialog(formIndex);
        INVREPORT.createNewJob.page5();
    },
    page4actions: function (dialogResults) {
        "use strict";
        if (dialogResults === "cancel") { return; }
        if (dialogResults === "back") {
            INVREPORT.createNewJob.page3();
        }
    },
    page5: function(){
        "use strict";
        var formIndex = FILLIN.createDialog(INVREPORT.dialogDiv, "Company", "Select The company whose locations you will inventory.", INVREPORT.createNewJob.page5actions, null, "500px");
        INVREPORT.createNewJob.addJobProperties(formIndex, 4);
        var job = INVREPORT.createNewJob.currentJob;
        var res = AJAXPOST.callQuery2("WMS_PhysInv_GetCompanyListDDL", [job.wmssite, (job.istest ? "1" : "0")]);
        var li = [{
            text: "Select Company",
            value: "-1"
        }];
        res.payload.rows.forEach(function (row) {
            li.push({
                text: row[1],
                value: row[0]
            });
        });
        FILLIN.addDDL(formIndex, "ddlCompany", "", "Select Company", true, li, null, null, { "onchange": "INVREPORT.createNewJob.page5DDLChanged(this, " + formIndex + ");" }, true);
        FILLIN.addButton(formIndex, "back", null, "Change WMS Site", true);
        FILLIN.addButton(formIndex, "cancel", null, "Cancel");
        FILLIN.displayForm(formIndex);
    },
    page5DDLChanged: function(ddlObj, formIndex){
        "use strict";
        var val = COMMON.getDDLValue(ddlObj);
        if (val === "") {
            FILLIN.errorMessage(formIndex, "Please select Company");
            return;
        }
        INVREPORT.createNewJob.currentJob.company = val;
        FILLIN.closeDialog(formIndex);
        INVREPORT.createNewJob.page6();
    },
    page5actions: function(dialogResults){
        "use strict";
        switch (dialogResults) {
            case "cancel":
                return;
            case "back":
                INVREPORT.createNewJob.page4();
                return;
        }
    },
    page6: function () {
        "use strict";
        var formIndex = FILLIN.createDialog(INVREPORT.dialogDiv, "LX Locations", "Some inventory locations do not exist in WMS or the site does not use WMS.  If you want to include Inventory locations that are in LX, please answer yes to this question and you will get an opportunity to add them.  Please note that if you selected WMS locations, you will not be able to select the same location in LX", INVREPORT.createNewJob.page6actions, null, "500px");
        INVREPORT.createNewJob.addJobProperties(formIndex, 5);
        FILLIN.addSpan(formIndex, null, "Will this job use locations found only in LX?", "", { "width": "90%" }, true);
        FILLIN.addGenericControl(formIndex, FILLIN.addFreeButton(formIndex, "yes", null, "Yes", false, false, "inventoryEntryLargeButton"), "", true, null, { "margin-left": "90px" });
        FILLIN.addGenericControl(formIndex, FILLIN.addFreeButton(formIndex, "no", null, "No", false, false, "inventoryEntryLargeButton"), "");
        FILLIN.addButton(formIndex, "back", null, "Change Warehouse", true);
        FILLIN.addButton(formIndex, "cancel", null, "Cancel");
        FILLIN.displayForm(formIndex);
    },
    page6actions: function (dialogResults) {
        "use strict";
        switch (dialogResults) {
            case "cancel":
                return;
            case "back":
                INVREPORT.createNewJob.page3();
                return;
            case "yes":
                INVREPORT.createNewJob.currentJob.uselxlocations = true;
                INVREPORT.createNewJob.page7();
                return;
            case "no":
                INVREPORT.createNewJob.currentJob.uselxlocations = false;
                INVREPORT.createNewJob.page9();
                return;
        }
    },
    page7: function () {
        "use strict";
        var formIndex = FILLIN.createDialog(INVREPORT.dialogDiv, "Select Warehouse", "Select the warehouse for that this inventory is for,", INVREPORT.createNewJob.page7actions, null, "500px");
        INVREPORT.createNewJob.addJobProperties(formIndex, 6);
        var res = AJAXPOST.callQuery2("WMS_PhysInv_GetWarehouseDDL", [(INVREPORT.createNewJob.currentJob.istest ? "1" : "0")]);
        var li = [
            {
                text: "Select Warehouse",
                value: "-1"
            }
        ];
        res.payload.rows.forEach(function (row) {
            li.push({
                text: row[1],
                value: row[0]
            });
        });
        FILLIN.addDDL(formIndex, "ddlWarehouse", "", "Select Warehouse", true, li, null, null, { "onchange": "INVREPORT.createNewJob.page7DDLChanged(this, " + String(formIndex) + ");" }, true);
        FILLIN.addButton(formIndex, "back", null, "Change WMS Location Selection", true, false, true);
        FILLIN.addButton(formIndex, "cancel", null, "Cancel", false, false, true);
        FILLIN.displayForm(formIndex);
    },
    page7DDLChanged: function (obj, formIndex) {
        "use strict";
        var val = COMMON.getDDLValue(obj);
        if (val === "") {
            FILLIN.errorMessage(formIndex, "Please select a Warehouse");
            return;
        }
        //delete selected locations if the warehouse was changed
        if (val !== INVREPORT.createNewJob.currentJob.warehouse) {
            INVREPORT.createNewJob.currentJob.lxlocs = [];
        }
        INVREPORT.createNewJob.currentJob.warehouse = val;
        INVREPORT.createNewJob.currentJob.warehousename = COMMON.getDDLText(obj);
        FILLIN.closeDialog(formIndex);
        INVREPORT.createNewJob.page8();
    },
    page7actions: function (dialogresults) {
        "use strict";
        if (dialogresults === "cancel") { return; }
        if (dialogresults === "back") {
            INVREPORT.createNewJob.page3();
            return;
        }
    },
    page8Locs: [],
    page8typefilter: [],
    page8: function () {
        "use strict";
        COMMON.clearParent(INVREPORT.displayDivId);
        INVREPORT.createNewJob.page8FillLocs();
        if (INVREPORT.createNewJob.page8Locs.length === 0) {
            INVREPORT.createNewJob.page7();
            FILLIN.okDialog(INVREPORT.dialogDiv, "No LX Locations", "There are no LX Locations for this warehouse available", "50%");
            return;
        }
        var formIndex = FILLIN.createForm(INVREPORT.displayDivId, "Select Locations", "Select the location to add to this job and click Continue to create the job", INVREPORT.createNewJob.page8actions, null, "90%");
        INVREPORT.createNewJob.addJobProperties(formIndex, 7);
        FILLIN.addSpan(formIndex, null, "Filter LX Locations by type or enter part of the location name. Click once to select (Green), click again to deselect (Grey). Use the &quot;Select/Deselect All&quot; button to select all items currently displayed. Click again to remove selection", "", { "width": "90%" }, true);
        var li = [{
            value: "-1",
            text: "All Location Types"
        }];
        INVREPORT.createNewJob.page8typefilter.forEach(function (item) {
            li.push({
                value: item,
                text: item
            });
        });
        FILLIN.addDDL(formIndex, "ddlTypeFilter", "", "Filter by Type", false, li, null, null, { "onchange": "INVREPORT.createNewJob.page8FilterChange();" }, true);
        li = [{
            value: "-1",
            text: "All Locations"
        },
        {
            value: "1",
            text: "Selected Locations"
        },
        {
            value: "0",
            text: "Locations not Selected"
        }];
        FILLIN.addDDL(formIndex, "ddlSelectFilter", "", "Filter by Selection", false, li, null, null, { "onchange": "INVREPORT.createNewJob.page8FilterChange();" });
        FILLIN.addTextBox(formIndex, "txtSearchFilter", "", "Search for location", false, null, null, null, false, "Enter at least 3 characters", false, null, "butSearch", { "onkeyup": "INVREPORT.createNewJob.page8FilterChange(event);" });
        FILLIN.addFormButton(formIndex, "butSearch", "Apply Filter", "&nbsp;", "INVREPORT.createNewJob.page8FilterChange();");
        FILLIN.addButton(formIndex, "continue", "butContinue", "Continue", true);
        FILLIN.addButton(formIndex, "back", null, "Change LX Location Selection", false);
        FILLIN.addButton(formIndex, "cancel", null, "Cancel", false);
        FILLIN.displayForm(formIndex);
        document.getElementById(INVREPORT.displayDivId).appendChild(COMMON.getBasicElement("div", "divLocationSelect"));
        INVREPORT.createNewJob.page8FilterChange();
    },
    page8SelectAllToggle: false,
    page8FilterChange: function(e, toggle){
        "use strict";
        var searchVal = document.getElementById("txtSearchFilter").value;
        if (COMMON.exists(e) && searchVal.length < 3) { return; }//do not do anything if user is typing in search box and it is less than 3 chars
        var typeVal = COMMON.getDDLValue("ddlTypeFilter");
        var selVal = COMMON.getDDLValue("ddlSelectFilter");
        var iHtml = "<div><button onclick=\"INVREPORT.createNewJob.page8SelectAll();\">Select/Deselect All</button></div>";
        var oneSelected = false;
        var displayOneItem = function (item, index) {
            var envColor = (item.selected ? "#80ff80" : "#D0D0D0");
            oneSelected = (oneSelected || item.selected);
            iHtml += "<div id=\"divSelItem" + String(index) + "\" class=\"locselectenv\" style=\"background-color:" + envColor + ";\" onclick=\"INVREPORT.createNewJob.page8ItemSelected(" + String(index) + ");\" >" +
                "<div class=\"locname\">" + item.loc + "</div>" +
                "<div class=\"locdescript\">" + item.descript + "</div>" +
                "</div>";
        };
        iHtml += "<div style=\"clear:both;\"></div>";
        if (toggle === true) {
            INVREPORT.createNewJob.page8SelectAllToggle = !INVREPORT.createNewJob.page8SelectAllToggle;
        } else {
            INVREPORT.createNewJob.page8SelectAllToggle = false;
        }
        INVREPORT.createNewJob.page8Locs.forEach(function (item, index) {
            var isType = (typeVal === "" || typeVal === item.descript);
            var isSelVal = (selVal === "1");
            var isSel = (selVal === "" || item.selected === isSelVal);
            var isSearch = true;
            if (searchVal.length >= 3) {
                var patt = new RegExp(searchVal);
                isSearch = patt.test(item.loc);
            }
            if (isType && isSel && isSearch) {
                if (toggle === true) {
                    item.selected = INVREPORT.createNewJob.page8SelectAllToggle;
                    INVREPORT.createNewJob.page8Locs[index] = item;
                }
                displayOneItem(item, index);
            }
        });
        document.getElementById("butContinue").disabled = !oneSelected;
        document.getElementById("divLocationSelect").innerHTML = iHtml;
    },
    page8SelectAll: function(){
        "use strict";
        INVREPORT.createNewJob.page8FilterChange(null, true);
    },
    page8ItemSelected: function (index) {
        "use strict";
        var obj = INVREPORT.createNewJob.page8Locs[index];
        obj.selected = !obj.selected;
        var divObj = document.getElementById("divSelItem" + String(index));
        divObj.style.backgroundColor = (obj.selected ? "#80ff80" : "#D0D0D0");
        INVREPORT.createNewJob.page8Locs[index] = obj;
        var oneSelected = obj.selected;
        if (!oneSelected) {
            oneSelected = INVREPORT.createNewJob.page8Locs.some(function (item) {
                if (item.selected) { return true; }
            });
        }
        document.getElementById("butContinue").disabled = !oneSelected;
    },
    page8FillLocs: function () {
        "use strict";
        var job = INVREPORT.createNewJob.currentJob;
        var res = AJAXPOST.callQuery2("WMS_PhysInv_GetLXLocations", [job.wmssite, job.warehouse, (job.istest ? "1" : "0")]);
        var oneObj = function (row) {
            return {
                loc: row[0],
                descript: row[1],
                selected: false
            };
        };
        var allLocs = [];
        var descriptFilter = {};
        var aDescriptFilter = [];
        var locDictionary = {};
        res.payload.rows.forEach(function (row, index) {
            allLocs.push(oneObj(row));
            locDictionary[row[0]] = index;
            if (!descriptFilter.hasOwnProperty(row[1])) {
                descriptFilter[row[1]] = "";
                aDescriptFilter.push(row[1]);
            }
        });
        //what was selected in database
        INVREPORT.createNewJob.currentJob.lxlocs.forEach(function (item) {
            if (locDictionary.hasOwnProperty(item.loc)) {
                allLocs[locDictionary[item.loc]].selected = true;
            }
        });
        INVREPORT.createNewJob.page8Locs = allLocs;
        INVREPORT.createNewJob.page8typefilter = aDescriptFilter;
    },
    page8actions: function (dialogresults) {
        "use strict";
        switch (dialogresults) {
            case "cancel":
                return;
            case "back":
                INVREPORT.createNewJob.page6();
                return;
            case "continue":
                INVREPORT.createNewJob.page9();
                return;
        }
    },
    page9: function () {
        "use strict";
        var job = INVREPORT.createNewJob.currentJob;
        //if there are no wmslocations and no lx locations selected do not save
        var hasLXLocations = false;
        if (job.uselxlocations) {
            hasLXLocations = INVREPORT.createNewJob.page8Locs.some(function (item) {
                if (item.selected) { return true; }
            });
        }
        if (!job.usewmslocations && !job.uselxlocations) {
            INVREPORT.createNewJob.page3();
            FILLIN.okDialog(INVREPORT.dialogDiv, "Error", "This job will not have any eligible locations, please check your entries.", "400px");
            return;
        }
        if (job.uselxlocations && !hasLXLocations) {
            INVREPORT.createNewJob.page8();
            FILLIN.okDialog(INVREPORT.dialogDiv, "Error", "You selected to add LX Only Locations.  Please select at least one location", "400px");
            return;
        }
        var params = [
            job.jobid,
            job.username,
            job.name,
            (job.usewmslocations ? "1" : "0"),
            job.wmssite,
            job.warehouse,
            job.company,
            (job.istest ? "1" : "0")
        ];
        var res = AJAXPOST.callQuery2("WMS_PhysInv_CreateEditJob", params);
        job.jobid = res.payload.rows[0][0];
        var addLocs = function (locs) {
            params = [
                job.jobid,
                locs,
                job.warehouse
            ];
            AJAXPOST.callQuery2("WMS_PhysInv_AddLocations", params, true);
        };
        if (job.uselxlocations) {
            var strLocs = "";
            INVREPORT.createNewJob.page8Locs.forEach(function (item) {
                if (strLocs.length > 2000) {
                    addLocs(strLocs);
                    strLocs = "";
                }
                if (item.selected) {
                    strLocs += (strLocs === "" ? "" : ",") + item.loc;
                }
            });
            if (strLocs.length > 0) {
                addLocs(strLocs);
            }
        }
        FILLIN.okDialog(INVREPORT.dialogDiv, "Completed", job.name + " successfully added/changed.", "500px");
        INVREPORT.jobGrid();
    }
};

INVREPORT.jobGrid = function () {
    "use strict";
    COMMON.clearParent(INVREPORT.displayDivId);
    var gridIndex = DISPLAYGRID.addGrid(INVREPORT.displayDivId, "divGrid0", "WMS_PhysInv_GetJobGrid", null, 15, 8, true);
    DISPLAYGRID.changeDefaultListener(gridIndex, window.location.protocol + "//" + window.location.host + "/ajaxpost.aspx");
    DISPLAYGRID.addRowButton(gridIndex, "btngrid", "Manage", "INVREPORT.manageJob(this.getAttribute('pkey'));");
    DISPLAYGRID.alternateColors(gridIndex);
    DISPLAYGRID.display2(gridIndex);
    var allBtns = document.getElementsByTagName("input");
    var keys = Object.keys(allBtns);
    keys.forEach(function (key) {
        var obj = allBtns[key];
        if (obj.id && obj.id.length > 7 && obj.id.substring(0, 7) === "btngrid") {
            obj.style.height = "50px";
        }
    });
};
INVREPORT.manageJob = function (jobId) {
    "use strict";
    COMMON.blockInput(INVREPORT.displayDivId, false, INVREPORT.waitingAnimation);
    var cont = document.getElementById("divdivDispMainhide");
    var img = cont.getElementsByTagName("img")[0];
    img.style.top = "150px";
    img.style.left = "100px";
    window.setTimeout(function () { INVREPORT.manageJobcontinue(jobId); }, 100);
};
INVREPORT.reportData = null;
INVREPORT.JobName = null;
INVREPORT.manageJobcontinue = function (jobid) {
    "use strict";
    COMMON.blockInput(INVREPORT.displayDivId, true);
    var isValid = (AJAXPOST.callQuery2("WMS_PhysInv_GetReport", [jobid, "1"]).payload.rows[0][0] === "1");
    var jobinfo = AJAXPOST.callQuery2("WMS_PhysInv_GetJobInfo", [jobid]).payload;
    var jobrow = jobinfo.rows[0];
    INVREPORT.JobName = jobrow[0];
    var locs = AJAXPOST.callQuery2("WMS_PhysInv_GetJobLocations", [jobid]);
    COMMON.clearParent(INVREPORT.displayDivId);
    var formIndex = FILLIN.createForm(INVREPORT.displayDivId, jobrow[0], "Details for " + jobrow[0] + " All inventory must be complete for " + jobrow[0] + " before you can update inventory", INVREPORT.manageJobactions, jobid, "95%");
    var cnt = 12;
    while (cnt < jobrow.length) {
        FILLIN.addSpan(formIndex, null, jobrow[cnt], jobinfo.columns[cnt], null, (cnt === 12));
        cnt += 1;
    }
    if (locs.payload.rows && locs.payload.rows.length > 0) {
        var strLoc = "";
        locs.payload.rows.forEach(function (row) {
            strLoc += (strLoc === "" ? "" : ", ") + row[0];
        });
        FILLIN.addSpan(formIndex, null, strLoc, "LX Locations", { "width": "90%" }, true);
    }
    if (jobrow[8] === "1") {
        FILLIN.addButton(formIndex, "edit", null, "Edit", true);
        FILLIN.addButton(formIndex, "delete", null, "Delete", true);
    }
    
    if (jobrow[8] === "0") {
        FILLIN.addButton(formIndex, "excel", null, "Create Excel", true);
    }
    if (jobrow[10] === "1" && jobrow[11] === "0" && INVREPORT.hasPermissions) {
        FILLIN.addButton(formIndex, "adjust", null, "Update Inventory", true);
        FILLIN.addButton(formIndex, "csv", null, "Create CSV", true);
    }
    FILLIN.addButton(formIndex, "close", null, "Close");
    FILLIN.displayForm(formIndex);
    if (jobrow[8] === "1") { return; }
    INVREPORT.reportData = AJAXPOST.callQuery2("WMS_PhysInv_GetReport", [jobid, "0"]).payload;
    var gridIndex = DISPLAYGRID.addGrid(INVREPORT.displayDivId, "divInvReportGrid", null, null, 20, 3);
    DISPLAYGRID.addNumberFormating(gridIndex, 6, 0);
    DISPLAYGRID.addNumberFormating(gridIndex, 7, 0);
    DISPLAYGRID.addNumberFormating(gridIndex, 8, 0);

    DISPLAYGRID.addColorDefinition(gridIndex, 2, 13, function (val) {
        return val === "No" ? "#ff9999" : "#80ff80";
    });
    DISPLAYGRID.addColorDefinition(gridIndex, 3, 13, function (val) {
        return val === "No" ? "#ff9999" : "#80ff80";
    });
    DISPLAYGRID.addColorDefinition(gridIndex, 4, 13, function (val) {
        return val === "No" ? "#ff9999" : "#80ff80";
    });
    DISPLAYGRID.addColorDefinition(gridIndex, 5, 13, function (val) {
        return val === "No" ? "#ff9999" : "#80ff80";
    });
    DISPLAYGRID.addColorDefinition(gridIndex, 6, 13, function (val) {
        return val === "No" ? "#ff9999" : "#80ff80";
    });
    DISPLAYGRID.addColorDefinition(gridIndex, 13, 13, function (val) {
        return val === "No" ? "#ff9999" : "#80ff80";
    });
    DISPLAYGRID.addTitles(gridIndex, jobrow[0]);
    DISPLAYGRID.useEnhanceFilterRow(gridIndex);
    DISPLAYGRID.alternateColors(gridIndex);
    DISPLAYGRID.display2(gridIndex, INVREPORT.reportData);
    
};
INVREPORT.manageJobactions = function (dialogResults) {
    "use strict";
    var jobid = arguments[2];
    switch (dialogResults) {
        case "close":
            INVREPORT.jobGrid();
            return;
        case "excel":
            INVREPORT.createExcel();
            return;
        case "edit":
            INVREPORT.createNewJob.page1(jobid);
            return;
        case "delete":
            FILLIN.yesNoDialog(INVREPORT.dialogDiv, "Delete Job", "You are about to delete this job. This action cannot be undone.  Are you sure you want to delete this job?", "50%", INVREPORT.manageDeleteJob, jobid);
            return;
    }
};
INVREPORT.manageDeleteJob = function (dialogResult, JobId) {
    "use strict";
    if (!dialogResult) { return; }
    var res = AJAXPOST.callQuery2("WMS_PhysInv_DeleteJob", [JobId]);
    FILLIN.okDialog(INVREPORT.dialogDiv, "Deleted Job", "Successfully Deleted " + res.payload.rows[0][0]);
    INVREPORT.jobGrid();
}
//INVREPORT.initControls = function () {
//    //var validUser = AJAXPOST.callQuery2("wms_GetUserPermissions");
//    //var allLocations = AJAXPOST.callQuery2("WMS_GetAllLocations", [INVREPORT.site, (INVREPORT.isTest ? "1" : "0")]).payload;
//    //var keys = Object.keys(allLocations.rows);
//    //var ddl = [{ "text": "--select an option--", "value": "" }];
//    //keys.forEach(function (item) {
//    //    ddl.push({ "text": allLocations.rows[item], "value": allLocations.rows[item] });
//    //});

//    //var formIndex = FILLIN.createForm(INVREPORT.controlDivId, "Inventory Report", "Select a company below to display a report");
//    //FILLIN.addFormButton(formIndex, "butNelson", "Nelson", null, "INVREPORT.initGrid('Nelson')", null, null, { "class": "butCompany" });
//    //FILLIN.addFormButton(formIndex, "butSwa", "SWA", null, "INVREPORT.initGrid('SWA')", null, null, { "class": "butCompany" });
//    //FILLIN.addFormButton(formIndex, "butFerry", "Ferry Cap", null, "INVREPORT.initGrid('Ferry Cap')", null, null, { "class": "butCompany" });
//    //FILLIN.addFormButton(formIndex, "butSkn", "SKN", null, "INVREPORT.initGrid('SKN')", null, null, {"class" : "butCompany"});
//    //FILLIN.displayForm(formIndex);
//};
//INVREPORT.reportData = null;
//INVREPORT.initGrid = function (jobid, mess) {
//    "use strict";
//    var isComplete = true;
//    COMMON.clearParent(INVREPORT.displayDivId);
//    var params = [
//       jobid
//    ];
//    var jobinfo = AJAXPOST.callQuery("WMS_PhysInv_GetJobInfo", params).payload;
//    var jobname = jobinfo.rows[0][0];
//    INVREPORT.reportData = AJAXPOST.callQuery2("WMS_PhysInv_GetReport", params).payload;

//    var keys = Object.keys(INVREPORT.reportData.rows);
//    keys.forEach(function (item) {
//        if (INVREPORT.reportData.rows[item][13] === "No") {
//            isComplete = false;
//        }
//    });
//    if (COMMON.exists(mess)) {
//        document.getElementById(INVREPORT.displayDivId).appendChild(COMMON.getBasicElement("div", null, "<strong style=\"color: red\">" + mess + "</strong>"));
//    }
//    var gridIndex = DISPLAYGRID.addGrid(INVREPORT.displayDivId, "divInvReportGrid", null, null, 20, 3);
//    DISPLAYGRID.addNumberFormating(gridIndex, 6, 0);
//    DISPLAYGRID.addNumberFormating(gridIndex, 7, 0);
//    DISPLAYGRID.addNumberFormating(gridIndex, 8, 0);

//    DISPLAYGRID.addColorDefinition(gridIndex, 2, 13, function (val) {
//        return val === "No" ? "#ff9999" : "#80ff80";
//    });
//    DISPLAYGRID.addColorDefinition(gridIndex, 3, 13, function (val) {
//        return val === "No" ? "#ff9999" : "#80ff80";
//    });
//    DISPLAYGRID.addColorDefinition(gridIndex, 4, 13, function (val) {
//        return val === "No" ? "#ff9999" : "#80ff80";
//    });
//    DISPLAYGRID.addColorDefinition(gridIndex, 5, 13, function (val) {
//        return val === "No" ? "#ff9999" : "#80ff80";
//    });
//    DISPLAYGRID.addColorDefinition(gridIndex, 6, 13, function (val) {
//        return val === "No" ? "#ff9999" : "#80ff80";
//    });
//    DISPLAYGRID.addColorDefinition(gridIndex, 13, 13, function (val) {
//        return val === "No" ? "#ff9999" : "#80ff80";
//    });
//    DISPLAYGRID.addTitles(gridIndex, jobname + " Report <div class=\"reportbuttons\">" + 
//        "<button id=\"butExcel\" onclick=\"INVREPORT.createExcel('" + jobid + "');\">Create Excel</button>" + 
//        "<button id=\"butCsv\" onclick=\"INVREPORT.createCsv('" + jobid + "');\">Create CSV</button>" + 
//        "<button id=\"butUpdate\" onclick=\"INVREPORT.updateConfirm('" + jobid + "');\">Update Inventory</button>" +
//        "</div><div>" +
//        (isComplete ? "<span style=\"color:green\">All inventory for " + jobname + " is complete</span>" : "<span style=\"color:red\">All inventory must be complete for " + jobname + " before you can create a report and update inventory</span>" +
//        "</div>"));
//    //DISPLAYGRID.ignoreFilterRow(gridIndex);
//    DISPLAYGRID.useEnhanceFilterRow(gridIndex);
//    DISPLAYGRID.alternateColors(gridIndex);
//    DISPLAYGRID.display2(gridIndex, INVREPORT.reportData);
//    if (isComplete && INVREPORT.hasPermissions) {
//        document.getElementById("butCsv").disabled = false;
//        document.getElementById("butUpdate").disabled = false;
//    }
//    else {
//        document.getElementById("butCsv").disabled = true;
//        document.getElementById("butUpdate").disabled = true;
//    }
//};

INVREPORT.createExcel = function () {
    "use strict";
    var title = INVREPORT.JobName;
    var numbercolumns = [
        6, 7, 8
    ];
    AJAXPOST.protectedFunctions.gridExcel(INVREPORT.reportData.rows, title, INVREPORT.reportData.columns, numbercolumns, "gridexcel2");
};

INVREPORT.createCsv = function () {
    "use strict";
    var title = INVREPORT.JobName;
    var csvColumns;
    var newcolumns = [];

    var keys = Object.keys(INVREPORT.reportData.columns);

    keys.forEach(function (item) {
        switch (INVREPORT.reportData.columns[item]) {
            case "invid":
                newcolumns.push("Tag #");
                break;
            case "Whse":
                newcolumns.push("Whse");
                break;
            case "Location":
                newcolumns.push("Location");
                break;
            case "Item Number":
                newcolumns.push("Part #");
                break;
            case "Updated QTY":
                newcolumns.push("Count");
                break;
            case "Username":
                newcolumns.push("Initials");
                break;
            case "Lot":
                newcolumns.push("Lot/heat");
                break;
        }

    });

    csvColumns = newcolumns.join(",");
    var strRows = "";
    INVREPORT.reportData.rows.forEach(function (row) {
        strRows += (strRows === "" ? "" : "\r\n") + row[0] + ",\"" + row[1].substring(0, 4) + "\",\"" + row[2] + "\",\"" + row[3] + "\",\"" + row[5] + "\"," + row[6] + ",\"" + row[9] + "\"\r\n";
    });
    var csvString = (csvColumns + "\r\n") + strRows;

    if (window.navigator.msSaveOrOpenBlob) {
        var blob = new window.Blob([decodeURIComponent(encodeURIComponent(csvString))], {
            type: "text/csv;charset=utf-8;"
        });
        navigator.msSaveBlob(blob, title + ".csv");
    }
    else {
        var a = document.createElement("a");
        a.href = "data:attachment/csv," + encodeURIComponent(csvString);
        a.target = "_blank";
        a.download = title + ".csv";

        document.body.appendChild(a);
        a.click();
    }
};

INVREPORT.updateConfirm = function (company) {
    "use strict";
    FILLIN.yesNoDialog(INVREPORT.displayDivId, "You are about to overwrite current inventory. Do you wish to proceed?", "This action cannot be undone", null, INVREPORT.updateInventory, company);
};

INVREPORT.updateInventory = function (result, company) {
    "use strict";
    if (result) {
        var isComplete = true;
        var checkReport;
        var params = [
            company,
            INVREPORT.site,
            (INVREPORT.isTest ? "1" : "0")
        ];
        //double check and make sure all inventory is complete
        checkReport = AJAXPOST.callQuery2("WMS_GetPhysInvReport", params).payload;
        var keys = Object.keys(checkReport.rows);
        keys.forEach(function (item) {
            if (checkReport.rows[item][12] === "No") {
                isComplete = false;
            }
        });
        if (isComplete) {
            //do the update
            AJAXPOST.callQuery2("WMS_Update_PhysInvToCurrentInv", params, true);
            FILLIN.okDialog(INVREPORT.displayDivId, "Success", "The inventory for " + company + " has been updated.");
        }
        else {
            //exit operation
            FILLIN.okDialog(INVREPORT.displayDivId, "Operation Aborted", "The inventory is not complete and could not be updated");

        }
    }
};

INVREPORT.waitingAnimation = "data:image/gif;base64,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";
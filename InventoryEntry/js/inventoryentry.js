/*global AJAXPOST, FILLIN, HELPTOPICS, TIMEPICKER, CAL, window, URLTOPDF, ADMIN, COMMON, DISPLAYGRID, EMBED, CANVAS, CKEDITOR, CANV2, MAIN, CARDS, PFLOGOS*/
/*jslint node:true, white:true, browser:true, this:true, maxlen: 1000000*/
///<reference path="http://fasweblib/common.js"/>
///<reference path="http://fasweblib/fillinform.js"/>
///<reference path="http://fasweblib/ajaxpost.js"/>
var INVE = {};
INVE.displayDivId = "divDispMain";
INVE.divDialog = "divDialog";
INVE.currentUser = {
    username: "",
    jobid: "",
    jobname: "",
    printer: "",
    printername: "",
    eligibleforaudit: false,
    asauditor: false,
    auditpercent: 50
};
INVE.eligibleJobs = [];
INVE.orientationTO = null;
INVE.userPreference = {
    descriptionfilter: null,
    companyfilter: null
};
INVE.landscape = "landscape";
INVE.portrait = "portrait";
INVE.displayProperties = {
    orientation: "",
    wd: 0,
    ht: 0,
    portraitdisplayfunction: null,
    landscapedisplayfunction: null
};
INVE.currentJob = null;
INVE.Job = function (row, allLocs, jobId) {
    "use strict";
    this.name = row[0];
    this.usewmslocations = (row[1] === "1");
    this.uselxlocations = (row[7] === "1");
    this.wmssite = row[2];
    this.wmssitename = row[2];
    this.istest = (row[4] === "1");
    this.warehouse = row[3];
    this.warehousename = row[6];
    this.username = INVE.currentUser.username;
    this.jobid = jobId;
    this.locs = allLocs;
    this.company = row[5];
    this.canbedeleted = (row[8] === "1");
};
INVE.LocationObject = function (row, iswms, index) {
    "use strict";
    this.loc= row[0];
    this.locdescript= row[1];
    this.warehouse= row[2];
    this.company= row[2];
    this.stat = parseFloat(row[3]);
    this.audited = (row[4] === "1");
    this.iswms = iswms;
    this.items = [];
    this.index = index;
};
INVE.InventoryItemObject = function (row, index) {
    "use strict";
    var isNew = (typeof row === "string");
    this.itemnumber = (isNew ? row : row[0]);
    this.lot = (isNew ? "" : row[1]);
    this.description = (isNew ? "" : row[2]);
    this.onhand = (isNew ? 0 : parseFloat(row[3]));
    this.qtyentered = (isNew ? 0 : parseFloat(row[7]));
    this.hasrecord = (isNew ? false : (row[4] === "1"));
    this.itemadded = (isNew ? true : (row[5] === "1"));
    this.inventoryrecordid = (isNew ? -1 : parseFloat(row[6]));
    this.labelprinted = (isNew ? false : (row[8] === "1"));
    this.existingitemcount = parseFloat(row[9]);
    this.audited = (isNew ? index : (row[10] === "1"));//index is used as the boolean because if the item is new, then row is the part number and index is if the user is in auditor mode
    this.uom = row[11];
    this.index = index;
};
INVE.utility = {
    init: function () {
        "use strict";
        INVE.login.page1();
    },
    geteligibleJobs: function () {
        "use strict";
        var res = AJAXPOST.callQuery2("WMS_PhysInv_GetEligibleJobs");
        INVE.eligibleJobs = [];
        res.payload.rows.forEach(function (row) {
            INVE.eligibleJobs.push({
                name: row[1],
                id: row[0],
                canbeaudited: (row[2] === "1")
            });
        });
    },
    locDictionary: null,
    getJobInfo: function () {
        "use strict";
        var jobId = INVE.currentUser.jobid;
        var res = AJAXPOST.callQuery2("WMS_PhysInv_GetJobInfo", [jobId]);
        var row = res.payload.rows[0];
        var reslocs = AJAXPOST.callQuery2("WMS_PhysInv_GetJobLocations", [jobId]);
        var allLocs = [];
        INVE.utility.locDictionary = {};
        var locObj;
        reslocs.payload.rows.forEach(function (oneRow) {
            locObj = new INVE.LocationObject(oneRow, false, allLocs.length);
            INVE.utility.locDictionary["L" + locObj.loc] = locObj.index;
            allLocs.push(locObj);
        });
        reslocs = AJAXPOST.callQuery2("WMS_PhysInv_GetWMSLocations", [jobId]);
        reslocs.payload.rows.forEach(function (oneRow) {
            locObj = new INVE.LocationObject(oneRow, true, allLocs.length);
            INVE.utility.locDictionary["W" + locObj.loc] = locObj.index;
            allLocs.push(locObj);
        });
        INVE.currentJob = new INVE.Job(row, allLocs, jobId);
    },
    refreshlocations: function () {
        "use strict";
        var allLocs = [];
        var jobId = INVE.currentJob.jobid;
        var reslocs = AJAXPOST.callQuery2("WMS_PhysInv_GetJobLocations", [jobId]);
        reslocs.payload.rows.forEach(function (oneRow) {
            allLocs.push(new INVE.LocationObject(oneRow, false, allLocs.length));
        });
        reslocs = AJAXPOST.callQuery2("WMS_PhysInv_GetWMSLocations", [jobId]);
        reslocs.payload.rows.forEach(function (oneRow) {
            allLocs.push(new INVE.LocationObject(oneRow, true, allLocs.length));
        });
        allLocs.forEach(function (oneloc) {
            var exIndex = INVE.utility.locDictionary[(oneloc.iswms ? "W" : "L") + oneloc.loc];
            if (COMMON.exists(exIndex)) {
                var exObj = INVE.currentJob.locs[exIndex];
                if (exObj.stat !== oneloc.stat) {
                    exObj.stat = oneloc.stat;
                    var elem = document.getElementById("butLocSelect" + exIndex);
                    INVE.currentJob.locs[exIndex] = exObj;
                    if (elem) {
                        switch (exObj.stat) {
                            case 1:
                                elem.style.backgroundColor = "#646F45";
                                break;
                            case 2:
                                elem.style.backgroundColor = "#F15A60";
                                break;
                            default:
                                elem.style.backgroundColor = "#E4E4E4";
                        }
                    }
                }
            }
        });
    },
    title: function (title) {
        "use strict";
        var obj = document.getElementById("divTitle");
        obj.innerHTML = "<div class=\"inventoryEntryLeftTitle\">" + ((title && title !== "") ? title : "") + "</div>" +
            "<div class=\"inventoryEntryRightTitle\"><a href=\"#\" onclick=\"INVE.utility.titleMenus(); return false;\"><img src=\"data:image/gif;base64,R0lGODlhHgAeAJEAAP///////////wAAACH5BAEHAAIALAAAAAAeAB4AAAI8lI+py+0Po5wH2Iuzvmr7330iFo5jaYJJelLuC8crqyJ0Xd0bqnNzT5IJh8Qf0MIDJntLXfP2pBWn1EkBADs=\" /></a></div>" +
            "<div style=\"clear:both;\"></div>";
    },
    titleMenus: function(){
        "use strict";
        window.scrollTo(0, 0);
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Settings", "", INVE.utility.titleMenusActions, null, "97%");
        var iHTML = ((INVE.currentUser.username && INVE.currentUser.username !== "") ? "Logged in as: " + INVE.currentUser.username + (INVE.currentUser.asauditor ? " (Audit)" : "") + "<br />" : "") +
               (INVE.currentUser.printer !== "" ? "Printer: " + INVE.currentUser.printername + "<br />" : "") +
               (INVE.currentUser.jobname !== "" ? "Job: " + INVE.currentUser.jobname : "");
        if (!iHTML || iHTML === "") {
            iHTML = "Select a job and log in.";
        }
        FILLIN.addBasicControl(formIndex, "div", null, iHTML);
        if (INVE.currentUser.username && INVE.currentUser.username !== "") { 
            FILLIN.addButton(formIndex, "list", null, "My Counts", true);
            FILLIN.addButton(formIndex, "reset", null, "Change Job", true);
            FILLIN.addButton(formIndex, "audit", null, "Auditor", true);
        }
        FILLIN.addButton(formIndex, "exit", null, "Close", true);
        FILLIN.displayForm(formIndex);
    },
    titleMenusActions: function(dialogResults){
        "use strict";
        switch(dialogResults){
            case "exit":
                return;
            case "list":
                INVE.utility.displaymyentries();
                return;
            case "reset":
                window.location = window.location.protocol + "//" + window.location.host + "/inventoryentry.html";
                return;
            case "audit":  
                INVE.currentUser.asauditor = !INVE.currentUser.asauditor;
                document.getElementById("divTitle").style.backgroundColor = (INVE.currentUser.asauditor ? "#3393DF" : "#222222");
                return;
        }
    },
    displaymyentries: function () {
        "use strict";
        var username = INVE.currentUser.username;
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Entries for " + username, "", null, null, "97%");
        FILLIN.addGenericControl(formIndex, COMMON.getBasicElement("div", "divMyEntries"), "", true);
        FILLIN.addButton(formIndex, false, null, "OK");
        FILLIN.displayForm(formIndex);
        var res = AJAXPOST.callQuery2("WMS_PhysInv_GetUserEntries", [username, INVE.currentUser.jobid]);
        if (res.payload.rows.length === 0) {
            document.getElementById("divMyEntries").innerHTML = "<h2>No Entries Yet</h2>";
            return;
        }
        var gridIndex = DISPLAYGRID.addGrid("divMyEntries", "divGrid0", null, null, 50, 7, true, false, "No Entries Yet");
        DISPLAYGRID.display(gridIndex, res.payload);
    },
    info: function (infoObj, returnHtml) {
        "use strict";
        var ihtml = "";
        if (infoObj) {
            if (typeof infoObj === "string") {
                ihtml = infoObj;
            } else {
                var keys = Object.keys(infoObj);
                keys.forEach(function (item) {
                    var val = infoObj[item];
                    if (!COMMON.exists(val) || val === "") {
                        val = "&nbsp;";
                    }
                    ihtml += "<div class=\"inventoryEntryInfoCell\"><div class=\"inventoryEntryInfoCellTitle\">" + item.replace("_", " ") + "</div><div class=\"inventoryEntryCellValue\">" + val + "</div></div>";
                });
                ihtml += "<div style=\"clear:both\"></div>";
            }
        }
        if (returnHtml) { return ihtml; }
        document.getElementById("divData").innerHTML = ihtml;
    },
    clearDisplay: function () {
        "use strict";
        COMMON.clearParent(INVE.displayDivId);
        if (INVE.orientationTO) {
            clearTimeout(INVE.orientationTO);
            INVE.orientationTO = null;
        }
        INVE.displayProperties.orientation = "";
        INVE.displayProperties.portraitdisplayfunction = null;
        INVE.displayProperties.landscapedisplayfunction = null;

    },
    orientationCheck: function () {
        "use strict";
        if (INVE.orientationTO) {
            clearTimeout(INVE.orientationTO);
            INVE.orientationTO = null;
        }
        INVE.displayProperties.wd = window.innerWidth;
        INVE.displayProperties.ht = window.innerHeight;
        var lastOrientation = INVE.displayProperties.orientation;
        INVE.displayProperties.orientation = (INVE.displayProperties.wd > INVE.displayProperties.ht ? INVE.landscape : INVE.portrait);
        if (lastOrientation !== INVE.displayProperties.orientation) {
            if (INVE.displayProperties.orientation === INVE.landscape && INVE.displayProperties.landscapedisplayfunction !== null) {
                // INVE.displayProperties.landscapedisplayfunction();
                INVE.displayProperties.portraitdisplayfunction();
            }
            if (INVE.displayProperties.orientation === INVE.portrait && INVE.displayProperties.portraitdisplayfunction !== null) {
                INVE.displayProperties.portraitdisplayfunction();
            }
        }
        INVE.orientationTO = window.setTimeout(function () { INVE.utility.orientationCheck(); }, 100);
    }
};
INVE.login = {
    page1: function () {
        "use strict";
        INVE.currentUser = {
            username: "",
            jobid: "",
            jobname: "",
            printer: "",
            printername: "",
            asauditor: false
        };
        window.scrollTo(0, 0);
        INVE.utility.clearDisplay();
        INVE.utility.title();
        INVE.utility.info();

        INVE.utility.geteligibleJobs();
        if (INVE.eligibleJobs.length === 0) {
            //no eligible jobs
            document.getElementById(INVE.displayDivId).innerHTML = "<h2>There are no eligible Inventory Jobs available. Please contact the inventory supervisor to create Inventory Jobs";
            return;
        }
        var formIndex = FILLIN.createForm(INVE.displayDivId, "Select Job", "Select the Inventory Job you will be using.", null, null, "97%");
        var li = [{
            value: "-1",
            text: "Select Job"
        }];
        INVE.eligibleJobs.forEach(function (item) {
            li.push({
                value: item.id,
                text: item.name
            });
        });
        FILLIN.addDDL(formIndex, "ddlJob", null, "Select Job", true, li, null, null, { "onchange": "INVE.login.page1DDLChanged(this, " + String(formIndex) + ");" }, true);
        FILLIN.displayForm(formIndex);
        //document.getElementById(INVE.displayDivId).appendChild(COMMON.getBasicElement("div", null, String(window.innerWidth)));
    },
    page1DDLChanged: function (ddlObj, formIndex) {
        "use strict";
        var val = COMMON.getDDLValue(ddlObj);
        if (val === "") {
            FILLIN.errorMessage(formIndex, "Please select a job");
            return;
        }
        INVE.currentUser.jobid = val;
        INVE.currentUser.jobname = COMMON.getDDLText(ddlObj);
        INVE.eligibleJobs.some(function (item) {
            if (item.jobid === val) {
                INVE.currentUser.eligibleforaudit = item.canbeaudited;
                return true;
            }
        });
        INVE.utility.getJobInfo();
        FILLIN.closeDialog(formIndex);
        INVE.login.page2();
    },
    page2: function () {
        "use strict";
        //get username
        window.scrollTo(0, 0);
        INVE.utility.clearDisplay();
        INVE.utility.title();
        INVE.utility.info();
        var formIndex = FILLIN.createForm(INVE.displayDivId, "Enter Name or Employee Number", "Enter your name or employee number in the textbox and click continue", INVE.login.page2actions, null, "97%");
        FILLIN.addTextBox(formIndex, "txtName", "", "Name or Employee Number", true, null, null, { width: "98%" }, true, "Name or Employee #", null, null, "butContinue");
        //if (!INVE.currentJob.canbedeleted) {
        //    FILLIN.addCheckBox(formIndex, "chkAuditor", null, "I am Performing a Count Audit", null, true);
        //}
        FILLIN.addButton(formIndex, "continue", "butContinue", "Continue", true, true, false);
        FILLIN.addButton(formIndex, "back", null, "Select Different Job");
        FILLIN.displayForm(formIndex);
    },
    page2actions: function (dialogResult, dataValues) {
        "use strict";
        if (dialogResult === "back") {
            INVE.login.page1();
            return;
        }
        if (dialogResult === "continue") {
            INVE.currentUser.username = dataValues.txtName.value;
            //INVE.currentUser.asauditor = (dataValues.chkAuditor && dataValues.chkAuditor.value === "1");
            INVE.login.page3();
        }
    },
    page3: function () {
        "use strict";
        //get the printer
        INVE.utility.clearDisplay();
        INVE.utility.title();
        var formIndex = FILLIN.createForm(INVE.displayDivId, "Select your Default Printer", "Select the printer where you will print &quot;Inventory Completed&quot; tags.", INVE.login.page3actions, null, "97%");
        var li = [{
            text: "Select Printer",
            value: "-1"
        }];
        var res = AJAXPOST.callQuery2("WMS_PhysInv_GetPrinterDDL");
        res.payload.rows.forEach(function (row) {
            li.push({
                text: row[1],
                value: row[0]
            });
        });
        FILLIN.addDDL(formIndex, "ddlPrinters", null, "Select a Printer", true, li, null, null, { "onchange": "INVE.login.page3DDLChanged(this, " + String(formIndex) + ");" }, true);
        FILLIN.addButton(formIndex, "back", null, "Change Your User Name", true);
        FILLIN.displayForm(formIndex);
    },
    page3DDLChanged: function (ddlObj, formIndex) {
        "use strict";
        var val = COMMON.getDDLValue(ddlObj);
        if (val === "") {
            FILLIN.errorMessage(formIndex, "Please Select a printer");
            return;
        }
        INVE.currentUser.printer = val;
        INVE.currentUser.printername = COMMON.getDDLText(ddlObj);
        FILLIN.closeDialog(formIndex);
        INVE.login.page4();
    },
    page3actions: function (dialogResults) {
        "use strict";
        if (dialogResults === "back") {
            INVE.login.page2();
            return;
        }
    },
    page4: function () {
        "use strict";
        INVE.utility.clearDisplay();
        INVE.utility.title();
        var formIndex = FILLIN.createForm(INVE.displayDivId, "Verify information", "Verify you information and click continue", INVE.login.page4actions, null, "97%");
        FILLIN.addSpan(formIndex, null, INVE.currentUser.username, "You User Name", null, true);
        FILLIN.addSpan(formIndex, null, INVE.currentUser.printername, "Selected Printer", null, true);
        FILLIN.addSpan(formIndex, null, INVE.currentUser.jobname, "Selected Inventory Job", null, true);
        FILLIN.addButton(formIndex, "continue", null, "Continue", true);
        FILLIN.addButton(formIndex, "back", null, "Select Different Printer");
        FILLIN.displayForm(formIndex);
    },
    page4actions: function (dialogResults) {
        "use strict";
        if (dialogResults === "back") {
            INVE.login.page3();
            return;
        }
        COMMON.blockInput(INVE.displayDivId, false, INVE.waitingAnimation);
        var cont = document.getElementById("divdivDispMainhide");
        var img = cont.getElementsByTagName("img")[0];
        img.style.top = "250px";
        img.style.left = "100px";
        window.setTimeout(function () { INVE.login.page4continues(); }, 100);
    },
    page4continues: function () {
        "use strict";
        INVE.page1.display();
        COMMON.blockInput(INVE.displayDivId, true);
    }
};
INVE.page1 = {
    lastloc: null,
    filterSettings: {
        pagenumber: 1,
        filterbutton: -1
    },
    hasSearch: false,
    search: function(){
        "use strict";
        INVE.page1.hasSearch = false;
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Search", "Enter the location to search and press enter", INVE.page1.searchaction, null, "97%");
        FILLIN.addTextBox(formIndex, "txtSearch", "", "Search Locations", true, null, null, { width: "98%" }, true, null, null, null, "butSearch");
        FILLIN.addButton(formIndex, true, "butSearch", "Search", true, true);
        FILLIN.addButton(formIndex, false, null, "Cancel", false, false, true);
        FILLIN.displayForm(formIndex);
    },
    searchaction: function(dialogResult, dataValues){
        "use strict";
        if (!dialogResult) { return; }
        INVE.page1.hasSearch = true;
        INVE.page1.filter(1, true, dataValues.txtSearch.value);
    },
    clearSearch: function(){
        "use strict";
        INVE.page1.hasSearch = false;
        INVE.page1.filter(1, true);
    },
    getSearchIcon: function(){
        "use strict";
        if (INVE.page1.hasSearch) {
            return "<button id=\"butClearSearch\" onclick=\"INVE.page1.clearSearch();\">Clr Search</button>";
        } else {
            return "<a href=\"#\" onclick=\"INVE.page1.search(); return false\"><img src=\"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wgARCAAeAB4DASIAAhEBAxEB/8QAGAABAQEBAQAAAAAAAAAAAAAACQcIBAb/xAAWAQEBAQAAAAAAAAAAAAAAAAAAAQL/2gAMAwEAAhADEAAAAWtNei6bJlt4fFsWRHugfZrBGI5X/Ly//8QAHhAAAAcBAQEBAAAAAAAAAAAAAQIDBAUGBwAIERL/2gAIAQEAAQUCn7FHVmHS2DXLWOYa+nc3gD970UV2tQM8eRDqlzizSQ9GlU5+zZyzFbBpJi4suYWXLjZrozLQIYD8Uwj339FhK/B14n//xAAaEQEAAgMBAAAAAAAAAAAAAAABABECITHR/9oACAEDAQE/AR0KXb5GGSclr2f/xAAcEQACAAcAAAAAAAAAAAAAAAAAERASMUFhkaH/2gAIAQIBAT8BusPcE0SqnT//xAAqEAACAgEDAgYABwAAAAAAAAACAwEEBQYREhMhABAUIjFBFSMkMjNCUf/aAAgBAQAGPwK9m8q7o0cemWtmO5mUzAKSoe3Nz2kClDvESZxvIjuUPyOidDpPBoYwAY+s+2benOxR6k72PTYbH9049LCSe6iIyHebOnc7jfwHVVIWEymXVBNsUTxsdFVmIs1rNaf56TpYYq/NFpwLhT4VNbnKVZ7Hsvce/wCnmvdUuTiI/bFttaP85SH3402WDJM48MPSQAJIZ6Lk1wC0hvH4srsQ31HL3S3kRfO/jTRadkGWaiq4Zx1aYIPU1q2UnI9Y17xJBiSrU2777OgaxxDRkfK1jcjXXbo3UHXtV27yDVHG0x22IZjsQmEwazgTAhMYmLA6U13kcNjbZTLaZxahnGe3BraF6qq5ED7RlldJcfaRHO5lQ1jpPL2clONHqZSwNaEvrHJT1XHUFjosYhwSK7YMJpJ7seUpKWIO0C/R5ShKU5el7umpzYZKnVmTvzq2YUwlQU9VRAam78Ra3ykTGCEokSEu8EJRtIlE/Iz9x9+LK8Hi6mMC6/1NoaioX1m7bRJfPtCJmFLjZaYkoUIQRb//xAAcEAEAAwEBAAMAAAAAAAAAAAABABEhMUFRYaH/2gAIAQEAAT8hoDAPcRwscWzIb877/AYhhWRJVFFrQLQtjNFwEAIWhaq+LaFHi4lIwUU2eEhTZrK/wlpmWk7Sii2Nj3788/IewQ7CNSKG5YYuJgfekAVKJREj+rUm3kBUyFAus4ONugSZKLnedvZSV5KBmoFaIIXHwYxv+CANrLYQlKE//9oADAMBAAIAAwAAABCgQCn/xAAfEQEBAAIBBAMAAAAAAAAAAAABESFBADFRYXGh0fH/2gAIAQMBAT8QAYtCikm0hv48ZAJMY++VxEWxMddDT8PfAtimMAdnQbXn/8QAIBEBAAIABQUAAAAAAAAAAAAAAREhABAxQWFRgZGx0f/aAAgBAgEBPxBrqQ7NGSQqGAWLSqnWtj1hAZKcldjnx9jH/8QAHRABAQADAQADAQAAAAAAAAAAAREAITFBUWGBsf/aAAgBAQABPxBVRJLRNkICKwsf5bqRa4zpBbUz7CUuByWme2n9eS/2c5h3FmRGGNALqFVObmXkUqVWhhzPyWBCHnMEiIldMRpK9I7hvtsBDIVsCmjZOGYIIdd6cegtSDHwNk7xWhTVwc86p54ClQNxWvOqEdlUq5bHddrfz4OWmw1bsEjuye5Nhrtit0zV6E2Xm9gydICjAl1//9k=\" ></a>";
        }
    },
    display: function (mess) {
        "use strict";
        if (INVE.page2.refreshTO) {
            window.clearInterval(INVE.page2.refreshTO);
            INVE.page2.refreshTO = null;
        }
        INVE.utility.getJobInfo(); //refresh location incase they have been changed
        INVE.utility.clearDisplay();
        INVE.utility.title("Location");
        INVE.utility.info(((mess && mess !== "") ? "<span style=\"color:red;\">" + mess + "</span><br />" : "") + "Select location. Filter by type, search or use status buttons");        
        //location type
        var loctype = {};
        INVE.currentJob.locs.forEach(function (item) {
            loctype[item.locdescript + (item.iswms ? " (WMS)" : " (LX)")] = "";
            loctype[item.company.toUpperCase()] = "";
        });
        var li = [{ value: "", text: "Any" }];
        var keys = Object.keys(loctype);
        keys.forEach(function (oneKey) {
            li.push({ value: oneKey, text: oneKey });
        });
        var div = COMMON.getBasicElement("div", "divDescFilter");
        div.appendChild(COMMON.getDDL("ddlLocType", INVE.userPreference.descriptionfilter, false, null, li, null, { onchange: "INVE.page1.filter(1, true);", "style": "display: block" }));
        var iHTML;
        div.appendChild(COMMON.getBasicElement("div", "divSearchIcon"));

        var dispObj = document.getElementById(INVE.displayDivId);
        dispObj.appendChild(div);
        iHTML = "<button onclick=\"INVE.page1.buttonFilter(-1);\" style=\"color:white; background-color:#202020; margin-bottom:2px;padding:0 2px;\">Show All</button>" +
            "<button onclick=\"INVE.page1.buttonFilter(0);\" style=\"margin-bottom:2px;padding:0 2px;\">Not Finished</button>" +
            "<button onclick=\"INVE.page1.buttonFilter(1);\" style=\"background-color:#646F45;margin-bottom:2px;padding:0 2px;\">Location Complete</button>" +
            "<button onclick=\"INVE.page1.buttonFilter(2);\" style=\"background-color:#F15A60;padding:0 2px;\">Unverified Empty Location</button>";

       dispObj.appendChild(COMMON.getBasicElement("div", null, iHTML, "locFilter"));

        dispObj.appendChild(COMMON.getBasicElement("div", null, null, "clearFloat"));

        

        
        dispObj.appendChild(COMMON.getBasicElement("div", "divpage1Div"));
        COMMON.setDDLvalue("ddlLocType", "Finished Goods");
       
        INVE.displayProperties.landscapedisplayfunction = INVE.page1.landscape;
        INVE.displayProperties.portraitdisplayfunction = INVE.page1.portrait;
        INVE.utility.orientationCheck();
        INVE.page1.filter(INVE.page1.filterSettings.pagenumber, true);
    },
    buttonfilterValue: -1,
    buttonFilter: function(val){
        "use strict";
        INVE.page1.filterSettings.filterbutton = val;
        INVE.page1.filter(INVE.page1.filterSettings.pagenumber, true);
    },
    landscape: function () {
        "use strict";
        document.getElementById("divpage1Div").className = "inventoryEntrypage1DivL";
    },
    portrait: function () {
        "use strict";
        document.getElementById("divpage1Div").className = "inventoryEntrypage1DivP";
    },
    pages: [],
    refreshTO: null,
    filter: function (pageNumber, init, val) {
        "use strict";
        if (!COMMON.exists(val)) { val = ""; }
        document.getElementById("divSearchIcon").innerHTML = INVE.page1.getSearchIcon();
        INVE.userPreference.descriptionfilter = COMMON.getDDLValue("ddlLocType");
        var iHTML = "";
        var scrollMonitor = null;
        var paginate = function () {
            INVE.page1.pages = [];
            var cnt = 1;
            var itemsPerPage = 300;
            var thisPage = [];
            INVE.currentJob.locs.forEach(function (item, index) {
                var exp = new RegExp(val.toUpperCase());
                var filtertest = (exp.test(item.loc.toUpperCase()) && ((INVE.userPreference.descriptionfilter === "" || (item.locdescript.toUpperCase() + (item.iswms ? " (WMS)" : " (LX)") === INVE.userPreference.descriptionfilter.toUpperCase())) || (item.company.toUpperCase() === INVE.userPreference.descriptionfilter.toUpperCase())));
                if (INVE.page1.filterSettings.filterbutton > -1) {
                    filtertest = (filtertest && (item.stat === INVE.page1.filterSettings.filterbutton));
                }
                if (filtertest) {
                    if (cnt > itemsPerPage) {
                        INVE.page1.pages.push(thisPage);
                        thisPage = [];
                        cnt = 1;
                    }
                    thisPage.push(index);
                    cnt += 1;
                }
            });
            INVE.page1.pages.push(thisPage);
        };
        if (init === true) {
            paginate();
        }
        if (pageNumber < 1) { pageNumber = 1; }
        if (pageNumber > INVE.page1.pages.length) { pageNumber = INVE.page1.pages.length; }
        INVE.page1.filterSettings.pagenumber = pageNumber;
        if (INVE.currentJob.usewmslocations) {
            iHTML += "<button onclick=\"INVE.page1.addwmslocation();\">Add Location Not Listed</button>";
        }
        iHTML += "<div id=\"divPagerSelector\" style=\"clear:both\">";
        var buttonmessage = "";
        switch (INVE.page1.filterSettings.filterbutton) {
            case -1:
                buttonmessage = "All";
                break;
            case 0:
                buttonmessage = "Incomplete ";
                break;
            case 1:
                buttonmessage = "Completed ";
                break;
            case 2:
                buttonmessage = "Unverified Empty ";
                break;
        }
        iHTML += "<div class=\"divPagerMessage\">Displaying " + buttonmessage + " Locations.</div>";
        if (INVE.page1.pages.length > 1) {
            iHTML += "<div class=\"divPagerMessage\">Click on the page button to select the page to view</div><div style=\"clear:both;\"></div>";
            iHTML += "<div id=\"divPagerPages\">";
            INVE.page1.pages.forEach(function () {
                var thisPageNumber = parseFloat(arguments[1]) + 1;
                iHTML += "<button" + (pageNumber === thisPageNumber ? " style=\"background-color:#202020; color:white;\"" : "") + " onclick=\"INVE.page1.filter(" + String(thisPageNumber) + ");\">" + String(thisPageNumber) + "</button>";
            });
            if (pageNumber > 1) {
                iHTML += "<button style=\"width:auto;\" onclick=\"INVE.page1.filter(" + String(pageNumber - 1) + ");\">Previous Page</button>";
            }
            if (pageNumber < INVE.page1.pages.length) {
                iHTML += "<button style=\"width:auto;\" onclick=\"INVE.page1.filter(" + String(pageNumber + 1) + ");\">Nex Page</button>";
            }
            iHTML += "</div>";
        }
        iHTML += "<div style=\"clear:both;\"></div></div>";
        var selectedPage = INVE.page1.pages[pageNumber - 1];
        selectedPage.forEach(function (itemindex) {
            var item = INVE.currentJob.locs[itemindex];
            var exp = new RegExp(val.toUpperCase());
            var comp = (item.iswms ? item.company : item.warehouse);
            if (comp === "") { comp = "[Blank]"; }
            var btnStyle = "";
            switch (item.stat) {
                case 1:
                    btnStyle = " style=\"background-color:#646F45;\"";
                    break;
                case 2:
                    btnStyle = " style=\"background-color:#F15A60;\"";
                    break;
            }
            if (INVE.currentUser.asauditor && item.audited) {
                btnStyle = " style=\"background-color:#3393DF;\"";
            }
            
            iHTML += "<button id=\"butLocSelect" + String(item.index) + "\"" + btnStyle + " data-loc=\"" + String(item.index) + "\" onclick=\"INVE.page2.display(" + String(item.index) + ");\">" + 
                "<div style=\"font-size: 1.3em; font-weight:600;\">" + item.loc + "</div>" +
                "<div style=\"font-size:1em;\">" + item.locdescript + (item.iswms ? " (WMS)" : " (LX)") + "</div>" +
                "<div style=\"font-size:1em;\">Company: " + comp + "</div>" +
                "</button>";
            if (INVE.page1.lastloc === item.index) {
                scrollMonitor = item.index;
            }

        });
        iHTML += "<div style=\"clear:both\"></div>";
        COMMON.clearParent("divpage1Div");
        var elem = document.getElementById("divpage1Div");
        var newElem = elem.cloneNode(false);
        newElem.innerHTML = iHTML;
        elem.parentNode.replaceChild(newElem, elem);
                
     
        if (scrollMonitor !== null) {
            window.setTimeout(function () { INVE.page1.doScroll(scrollMonitor); }, 500);
        }
        if (INVE.page1.refreshTO) {
            window.clearInterval(INVE.page1.refreshTO);
            INVE.page1.refreshTO = null;
        }
        INVE.page1.refreshTO = window.setInterval(function () { INVE.utility.refreshlocations(); }, 5000);
    },
    doScroll: function (scrollMonitor) {
        "use strict";
        var scrollTop = document.getElementById("butLocSelect" + String(scrollMonitor));
        scrollTop = scrollTop.offsetTop;
        window.scrollTo(0, scrollTop);
    },
    addwmslocation: function () {
        "use strict";
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Adding Location", "Enter the location in the text box and click continue", INVE.page1.addwmslocationactions, null, "98%", INVE.page1.addwmslocationvalidate);
        FILLIN.addTextBox(formIndex, "txtLoc", "", "Location", true, null, null, null, true, null, null, null, "butcontinue");
        FILLIN.addButton(formIndex, true, "butcontinue", "Continue", true, true);
        FILLIN.setHelperDialogParent(formIndex, INVE.divDialog);
        FILLIN.addButton(formIndex, false, null, "Cancel", false, false, true);
        FILLIN.displayForm(formIndex);
    },
    addwmslocationvalidate: function(dataValues, formIndex){
        "use strict";
        var res = AJAXPOST.callQuery2("WMS_PhysInv_ValidateAddedWMSLocation", [INVE.currentJob.jobid, dataValues.txtLoc.value]);
        if (res.payload.rows[0][0] !== "0") {
            FILLIN.errorMessage(formIndex, res.payload.rows[0][1]);
            return false;
        }
        return true;
    },
    addwmslocationactions: function (dialogResults, dataValues) {
        "use strict";
        if (!dialogResults) { return; }
        var locIndex = 0;
        var foundLoc = INVE.currentJob.locs.some(function (oneLocation, index) {
            if (oneLocation.loc.toUpperCase() === dataValues.txtLoc.value.toUpperCase()) {
                locIndex = index;
                return true;
            }
        });
        if (foundLoc) {
            INVE.page2.display(locIndex, "Location Already Exists");
            return;
        }
        AJAXPOST.callQuery2("WMS_PhysInv_AddWMSLocation", [INVE.currentJob.jobid, dataValues.txtLoc.value], true);
        INVE.utility.getJobInfo();
        INVE.currentJob.locs.some(function (oneLocation, index) {
            if (oneLocation.loc.toUpperCase() === dataValues.txtLoc.value.toUpperCase()) {
                locIndex = index;
                return true;
            }
        });
        INVE.page2.display(locIndex);
    }
};
INVE.page2 = {
    selectedLocation: null,
    lastPos: "",
    gotohash: function(hashName){
        "use strict";
        window.location.hash = "#" + hashName;
    },
    dict: [],
    unauditchecked: true,
    auditedchecked: true,
    refreshTO: null,
    itemdictionary: null,
    refreshItems: function(){
        "use strict";
        var locIndex = parseFloat(INVE.page1.lastloc);
        var selectedLocation = INVE.currentJob.locs[locIndex];
        var params = [selectedLocation.loc, (selectedLocation.iswms ? "1" : "0"), INVE.currentJob.jobid];
        var res = AJAXPOST.callQuery2("WMS_PhysInv_GetAllItems", params);
        res.payload.rows.forEach(function (row, index) {
            var newItem = new INVE.InventoryItemObject(row, index);
            var exIndex = INVE.page2.itemdictionary[newItem.itemnumber + newItem.lot];
            if (COMMON.exists(exIndex)) {
                var exObj = selectedLocation.items[exIndex];
                if (exObj.hasrecord !== newItem.hasrecord) {
                    exObj.hasrecord = newItem.hasrecord;
                    selectedLocation.items[exIndex] = exObj;
                    INVE.currentJob.locs[locIndex] = selectedLocation;
                    var elem = document.getElementById("butPart" + String(exObj.index));
                    if (elem) {
                        elem.style.backgroundColor = (exObj.hasrecord ? "#646F45" : "#E4E4E4");
                    }
                }
            }
        });
    },
    display: function (locIndex, mess) {
        "use strict";
        if (INVE.page1.refreshTO) {
            window.clearInterval(INVE.page1.refreshTO);
            INVE.page1.refreshTO = null;
        }
        INVE.page1.lastloc = locIndex;
        locIndex = parseFloat(locIndex);
        var selectedLocation = INVE.currentJob.locs[locIndex];
        INVE.page2.selectedLocation = selectedLocation;
        window.scrollTo(0, 0);
        INVE.utility.clearDisplay();
        //display the info on the header
        INVE.utility.title("Loc: " + selectedLocation.loc + (selectedLocation.iswms ? " (WMS)" : " (LX)") + "<button class=\"topbutton\" onclick=\"INVE.page2.gotohash('');\">Top</button>");
        var infoObj = {};
        if (mess && mess !== "") {
            infoObj.Message = "<span style=\"color:red;\">" + mess + "</span>";
            INVE.utility.info(infoObj);
        }
        //infoObj.Location = selectedLocation.loc + (selectedLocation.iswms ? " (WMS)" : " (LX)");
        //infoObj.Instructions = "Select the Item to inventory or click &quot;Add Part&quot; if the item is not listed";
        //if there is no items in this locationm you can verify that this location is indeed empty
        var dispObj = document.getElementById(INVE.displayDivId);
        var topObj = COMMON.getBasicElement("div", "divAddItem", COMMON.getHTMLButton(null, "Add Item Not Listed", "INVE.page2.newItem();"));
        topObj.appendChild(COMMON.getHTMLButton(null, "Return to \"Select Location\"", "INVE.page1.display();"));

        //get the items in inventory at this location by lot and item number and display a button for each to be inventoried
        var itemButtonContainer = COMMON.getBasicElement("div", "divItemButtons");
        var iHTMLaddedItems = "";
        var iHTMLbuttons = "";
        var params = [selectedLocation.loc, (selectedLocation.iswms ? "1" : "0"), INVE.currentJob.jobid];
        var res = AJAXPOST.callQuery2("WMS_PhysInv_GetAllItems", params);
        if (res.payload.rows.length === 0) {
            topObj.appendChild(COMMON.getHTMLButton(null, "Verify that this location<br/>is empty", "INVE.page2.emptyverify();"));
        }
        selectedLocation.items = [];
        var anyUnchecked = false;
        var printAny = false;
        var iHTMLTOC = "";
        var itemsPerShortCut = 10;
        var showTOC = (res.payload.rows.length > 0 &&  parseFloat(res.payload.rows[0][9]) >= (itemsPerShortCut * 2));
        
        INVE.page2.dict = [];
        INVE.page2.itemdictionary = {};
        res.payload.rows.forEach(function (row, index) {
            //0 = itemnumber, 1 = lot, 2 = description, 3 = on hand, 4 = has inventory record, 5 = has been added, 6 = inventory record id
            var thisItem = new INVE.InventoryItemObject(row, selectedLocation.items.length);
            INVE.page2.itemdictionary[thisItem.itemnumber + thisItem.lot] = index;
            selectedLocation.items.push(thisItem);
            var id = "butPart" + String(index);
            printAny = (thisItem.hasrecord && !thisItem.labelprinted) || printAny;
            var title = "<div><h3>" + thisItem.itemnumber + "</h3><div>Lot: " + thisItem.lot + " UOM:" + thisItem.uom + "</div><div>";
            var onclick = " onclick=\"INVE.page3.init(" + String(locIndex) + ", " + String(index) + ", '" + id + "');\"";
            if (INVE.currentUser.asauditor) {
                title += "QTY: <strong>" + String(thisItem.hasrecord ? thisItem.qtyentered : "Uncounted") + "</strong><br />";
                onclick = " onclick=\"INVE.page2.auditchoice(" + String(locIndex) + ", " + String(index) + ", '" + id + "');\"";
            }
            title += thisItem.description + "</div></div>";
            var color = "";
            if (thisItem.hasrecord) {
                color = " style=\"background-color:#646F45\"";
            }
            if (INVE.currentUser.asauditor && thisItem.audited) {
                color = " style=\"background-color:#3393DF\"";
            }
            var buttonIHTML = "<button data-audited=\"" + (thisItem.audited ? "1" : "0") + "\" id=\"" + id + "\"" + color + onclick + " class=\"inventoryEntryPage2ItemAdded\" >" + title + "</button>";
            if (thisItem.itemadded) {
                iHTMLaddedItems += (iHTMLaddedItems === "" ? "<div><h3 style=\"margin:0;\">Items Added</h3>" : "") + buttonIHTML;
            } else {
                iHTMLbuttons += (iHTMLbuttons === "" ? "<h3 style=\"margin:0;\">Existing Inventory</h3>" : "") + buttonIHTML;
                anyUnchecked = !thisItem.hasrecord || anyUnchecked;
            }
            INVE.page2.dict.push({ part: thisItem.itemnumber, id: id });
           
        });
        if (showTOC) {
            iHTMLTOC = "<div><label for=\"txtSearchItem\">Item Number Search</label><input type=\"text\" onkeyup=\"INVE.page2.search();\" id=\"txtSearchItem\" style=\"height:25px\"/><a href=\"#\" onclick=\"INVE.page2.search(); return false;\"><img style=\"vertical-align:middle;border:0;margin:0;padding:0;\" src=\"" + INVE.search + "\"/></a></div>";
            if (INVE.currentUser.asauditor) {
                iHTMLTOC += "<div><label for=\"chkunaudited\">Show Un-Audited</label><input type=\"checkbox\" id=\"chkunaudited\" " + (INVE.page2.unauditchecked?"checked=\"checked\" ":"") + "onchange=\"INVE.page2.filteraudit();\" />" +
                "<label style=\"margin-left:10px;\" for=\"chkaudited\">Show Audited</label><input type=\"checkbox\" id=\"chkaudited\" " + (INVE.page2.auditedchecked ? "checked=\"checked\" " : "") + "onchange=\"INVE.page2.filteraudit();\" /></div>";
            }
        }
        if (iHTMLaddedItems !== "") { iHTMLaddedItems += "</div><div style=\"clear:both\"></div><hr />"; }
        if (!anyUnchecked && mess) {
            INVE.page1.display(mess);
            return;
        }
        if (printAny) {
            topObj.appendChild(COMMON.getHTMLButton(null, "Print Counted Tag", "INVE.page2.countTag();"));
        }
        INVE.currentJob.locs[locIndex] = selectedLocation;
        iHTMLbuttons = iHTMLaddedItems + iHTMLTOC + iHTMLbuttons + "<div style=\"clear:both\"></div>";
        itemButtonContainer.innerHTML = iHTMLbuttons;
        dispObj.appendChild(topObj);
        dispObj.appendChild(itemButtonContainer);
        INVE.displayProperties.landscapedisplayfunction = INVE.page2.landscape;
        INVE.displayProperties.portraitdisplayfunction = INVE.page2.portrait;
        INVE.utility.orientationCheck();
        INVE.page2.gotohash(INVE.page2.lastPos);
        if (INVE.page2.refreshTO) {
            window.clearInterval(INVE.page2.refreshTO);
            INVE.page2.refreshTO = null;
        }
        INVE.page2.refreshTO = window.setInterval(function () { INVE.page2.refreshItems(); }, 5000);
    },
    filteraudit: function(){
        "use strict";
        var showunaudited = document.getElementById("chkunaudited").checked;
        var showaudited = document.getElementById("chkaudited").checked;
        INVE.page2.unauditchecked = showunaudited;
        INVE.page2.auditedchecked = showaudited;
        INVE.page2.dict.forEach(function (item) {
            var obj = document.getElementById(item.id);
            var isaudited = (obj.getAttribute("data-audited") === "1");
            var showItem = ((showaudited && isaudited) || (showunaudited && !isaudited));
            obj.style.display = (showItem ? "inline-block" : "none");
        });
    },
    auditchoice: function (locIndex, itemIndex) {
        "use strict";
        var selectedLocation = INVE.currentJob.locs[locIndex];
        var selectedItem = selectedLocation.items[itemIndex];
        INVE.page2.lastPos = "butPart" + String(selectedItem.index);
        var obj = { locindex: locIndex, itemindex: itemIndex };
        window.scrollTo(0, 0);
        INVE.utility.clearDisplay();
        var formIndex = FILLIN.createForm(INVE.displayDivId, "Audit", selectedItem.itemnumber + (selectedItem.lot === "" ? "" : " Lot: " + selectedItem.lot + ",") + " has a count of " + String(selectedItem.qtyentered) + ". You can change the qty" + (selectedItem.itemadded ? "/Lot Number" : "") + " or accept the entries", INVE.page2.auditchoiceactions, obj, "98%");
        FILLIN.addButton(formIndex, "accept", null, "Accept", true);
        FILLIN.addButton(formIndex, "exit", null, "Exit", true);
        FILLIN.addButton(formIndex, "change", null, "Change Entry");
        FILLIN.displayForm(formIndex);
    },
    auditchoiceactions: function(dialogResult, obj){
        "use strict";
        var selectedLocation = INVE.currentJob.locs[obj.locindex];
        var selectedItem = selectedLocation.items[obj.itemindex];
        if (dialogResult === "exit") {
            INVE.page2.display(obj.locindex, "Audit done");
            return;
        }
        if (dialogResult === "accept") {
            AJAXPOST.callQuery2("WMS_PhysInv_ValidAudit", [selectedItem.inventoryrecordid], true);
            INVE.page2.display(obj.locindex, "Audit done");
            return;
        }
        if (selectedItem.itemadded) {
            INVE.page2.auditchoiceGetLot(obj);
            return;
        }
        INVE.page3.init(obj.locindex, obj.itemindex, "butPart" + String(obj.itemindex));
    },
    auditchoiceObj: null,
    auditchoiceGetLot: function (obj) {
        "use strict";
        INVE.page2.auditchoiceObj = obj;
        var selectedLocation = INVE.currentJob.locs[obj.locindex];
        var selectedItem = selectedLocation.items[obj.itemindex];
        if (!selectedLocation.iswms) {
            INVE.page3.init(obj.locindex, obj.itemindex, "butPart" + String(obj.itemindex));
            return;
        }
        var params = [
            selectedItem.itemnumber,
            selectedLocation.loc,
            INVE.currentJob.jobid
        ];
        INVE.page2.newItemLotList = AJAXPOST.callQuery2("WMS_PhysInv_GetLots", params);
        var instructions = "Click on the LOT number button to continue. Use the textbox to filter the list or enter a LOT not in the list. Click continue to add the LOT number that was entered.";
        if (INVE.page2.newItemLotList.payload.rows.length === 0) {
            instructions = "Could not find any Lot Numbers for " + selectedItem.itemnumber + ". Enter a Lot Number and click Continue";
        }
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Select Lot for Item Number " + selectedItem.itemnumber, instructions, INVE.page2.auditchoiceGetLotActions, obj, "97%", INVE.page2.auditLotValidate); 
        var buttons = COMMON.getBasicElement("div", "divAllLots");
        FILLIN.addTextBox(formIndex, "txtLot", "", "Lot Number", (INVE.currentJob.usewmslocations), null, null, { "width": "98%" }, true, "Filter Lots", null, null, "butContinueLot", { "onkeypress": "INVE.page2.auditchoiceLotFilter(" + formIndex + "," + String(obj.locindex) + "," + String(obj.itemindex) + ");" });
        FILLIN.addGenericControl(formIndex, buttons, "", true);
        FILLIN.setHelperDialogParent(formIndex, INVE.divDialog);
        FILLIN.addButton(formIndex, true, "butContinueLot", "Continue", false, true, false);
        FILLIN.addButton(formIndex, false, null, "Cancel", true, false, false);
        FILLIN.displayForm(formIndex);
        INVE.page2.auditchoiceLotFilter(formIndex, obj.locindex, obj.itemindex);

    },
    auditchoiceLotValidate: function (dataValues, formIndex) {
        "use strict";
        var obj = INVE.page2.auditchoiceObj;
        var selectedLocation = INVE.currentJob.locs[obj.locindex];
        var selectedItem = selectedLocation.items[obj.itemindex];
        var params = [
            selectedItem.itemnumber,
            dataValues.txtLot.value,
            selectedLocation.loc,
            (selectedLocation.iswms ? "1" : "0"),
            INVE.currentJob.jobid
        ];
        var res = AJAXPOST.callQuery2("WMS_PhysInv_CheckLotItem", params);
        if (res.payload.rows[0][0] === "0") { return true; }
        FILLIN.errorMessage(formIndex, res.payload.rows[0][1]);
        return false;
    },
    auditchoiceGetLotActions: function(dialogresults, dataValues, obj){
        "use strict";
        if (!dialogresults) {
            return;
        }
        var selectedLocation = INVE.currentJob.locs[obj.locindex];
        var selectedItem = selectedLocation.items[obj.itemindex];
        selectedItem.lot = dataValues.txtLot.value;
        selectedLocation.items[obj.itemindex] = selectedItem;
        INVE.currentJob.locs[obj.locindex] = selectedLocation;
        INVE.page3.init(obj.locindex, obj.itemindex, "butPart" + String(obj.itemindex));
    },
    auditchoiceLotFilter: function (formIndex, locIndex, itemIndex) {
        "use strict";
        var exp = new RegExp(document.getElementById("txtLot").value.toUpperCase());
        var iHTML = "";
        INVE.page2.newItemLotList.payload.rows.forEach(function (row) {
            if (row[0] !== "" && exp.test(row[0].toUpperCase())) {
                iHTML += "<button onclick=\"INVE.page2.auditchoiceLot('" + row[0] + "', " + String(formIndex) + "," + String(locIndex) + "," + String(itemIndex) + ");\">" + row[0] + "</button>";
            }
        });
        document.getElementById("divAllLots").innerHTML = iHTML;
    },
    auditchoiceLot: function (lot, formIndex, locIndex, itemIndex) {
        "use strict";
        var selectedLocation = INVE.currentJob.locs[locIndex];
        var selectedItem = selectedLocation.items[itemIndex];
        selectedItem.lot = lot;
        selectedLocation.items[itemIndex] = selectedItem;
        INVE.currentJob.locs[locIndex] = selectedLocation;
        if (COMMON.exists(formIndex)) {
            FILLIN.closeDialog(formIndex);
        }
        INVE.page3.init(locIndex, itemIndex, "butPart" + String(itemIndex));
    },
    search: function(){
        "use strict";
        var val = document.getElementById("txtSearchItem").value;
        INVE.page2.dict.forEach(function (item) {
            var patt = new RegExp(val);
            var obj = document.getElementById(item.id);
            var showItem = (val === "" || patt.test(item.part));
            obj.style.display = (showItem ? "inline-block" : "none");
        });
    },
    countTag: function(){
        "use strict";
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Print Tag", "Buttons appear only for items that have a count record. Print All will only print items with count record", INVE.page2.countTagActions, null, "97%");
        var selectedLocation = INVE.page2.selectedLocation;
        var oneButton = function (thisItem) {
            if (!COMMON.exists(thisItem)) {
                return "<button onclick=\"INVE.page2.countTagPrint(null, " + String(formIndex) + ");\" class=\"inventoryEntryPage2ItemAdded\"><div><h3>Print All</h3><div>&nbsp;</div><div>&nbsp;</div</div></button>";
            } else {
                return "<button onclick=\"INVE.page2.countTagPrint(" + String(thisItem.inventoryrecordid) + ", " + String(formIndex) + ");\" class=\"inventoryEntryPage2ItemAdded\"><div><h3>" + thisItem.itemnumber + "</h3><div>Lot: " + thisItem.lot + "</div><div>" + thisItem.description + "</div></div></button>";
            }
        };
        var iHTML = oneButton();
        selectedLocation.items.forEach(function (thisItem) {
            if (thisItem.hasrecord && !thisItem.labelprinted) {
                iHTML += oneButton(thisItem);
            }
        });
        FILLIN.addGenericControl(formIndex, COMMON.getBasicElement("div", null, iHTML));
        FILLIN.addButton(formIndex, "false", null, "Exit", true);
        FILLIN.displayForm(formIndex);
    },
    countTagActions: function(){
        "use strict";
        return;
    },
    printitemtag: function(invid){
        "use strict";
        var printerId = INVE.currentUser.printer.substring(1);
        var printZebra = (INVE.currentUser.printer.substring(0, 1) === "B");
        if (printZebra) {
            AJAXPOST.callQuery2("WMS_PhysInv_CreateZebraTag", [String(invid), printerId], true);
        } else {
            var res = AJAXPOST.callQuery2("WMS_PhysInv_CreatePlainPaperTag", [String(invid), printerId]).payload.rows;
            var params = [res[0][3], "1"];
            res.forEach(function (row) {
                var item = [];
                item.push(row[0]);
                item.push(row[1]);
                item.push(row[2]);
                item = { "data": item };
                params.push(JSON.stringify(item));
            });
            AJAXPOST.customRequest("printtag", params);
        }
    },
    countTagPrint: function(invid, formIndex){
        "use strict";
        var printList = [];
        if (COMMON.exists(invid)) {
            printList.push(invid);
        } else {
            INVE.page2.selectedLocation.items.forEach(function (thisItem) {
                if (thisItem.hasrecord) {
                    printList.push(thisItem.inventoryrecordid);
                }
            });
        }
        printList.forEach(function (oneItem) {
            INVE.page2.printitemtag(oneItem);
        });
        FILLIN.closeDialog(formIndex);
        FILLIN.okDialog(INVE.divDialog, "Completed", "Invetory Tags Printed", "50%");
    },
    emptyverify: function () {
        "use strict";
        var selectedLocation = INVE.page2.selectedLocation;
        AJAXPOST.callQuery2("WMS_PhysInv_VerifyEmptyLocation", [selectedLocation.loc, (selectedLocation.iswms? "1":"0"), INVE.currentJob.jobid], true);
        INVE.page1.display("Empty Location Verified");
    },
    landscape: function () {
        "use strict";
        document.getElementById("divAddItem").className = "inventoryEntrypage2TopL";
        document.getElementById("divItemButtons").className = "inventoryEntrypage2ButtonsL";
    },
    portrait: function () {
        "use strict";
        document.getElementById("divAddItem").className = "inventoryEntrypage2TopP";
        document.getElementById("divItemButtons").className = "inventoryEntrypage2ButtonsP";
    },
    newItemObj: null,
    newItem: function () {
        "use strict";
        var formindex = FILLIN.createDialog(INVE.divDialog, "Item Not Listed", "Enter the Item Number, then click Continue", INVE.page2.newItemActions, null, "97%", INVE.page2.newItemValidate);
        FILLIN.addTextBox(formindex, "txtItem", "", "Item Number", true, null, null, { "width": "98%" }, true, null, null, null, "butContinue");
        FILLIN.addButton(formindex, false, null, "Cancel", true, false, true);
        FILLIN.addButton(formindex, true, "butContinue", "Continue", false, true);
        FILLIN.setHelperDialogParent(formindex, INVE.divDialog);
        FILLIN.displayForm(formindex);
    },
    newItemValidate: function(dataValues, formIndex){
        "use strict";           
        var params = [
            dataValues.txtItem.value,
            INVE.currentJob.jobid
        ];
        var res = AJAXPOST.callQuery2("WMS_PhysInv_GetValidItemLx", params);
        if (res.payload.rows[0][0] === "1") {
            FILLIN.errorMessage(formIndex, res.payload.rows[0][1]);
            return false;
        }
        return true;
    },
    newItemActions: function (dialogResults, dataValues) {
        "use strict";
        if (!dialogResults) { return; }
        var items = INVE.page2.selectedLocation.items;
        var partnumber = dataValues.txtItem.value.toUpperCase();
        var foundIndex = -1;
        var found = items.some(function (oneItem, index) {
            if (oneItem.itemnumber === partnumber) {
                foundIndex = index;
                return true;
            }
        });
        if (found) {
            var obj = {
                foundindex: foundIndex,
                partnumber: partnumber
            };
            var formIndex = FILLIN.createDialog(INVE.divDialog, partnumber + " Already Exists", "This part is already at this location.  You can re-enter the part number if you made a mistake, enter the count for " + partnumber, INVE.page2.newItemActionsActions, obj, "90%");
            FILLIN.addButton(formIndex, "existing", null, "Enter Count", true);
            FILLIN.addButton(formIndex, "lot", null, "Other Lot", true);
            FILLIN.addButton(formIndex, "exit", null, "Re-enter Item");
            FILLIN.displayForm(formIndex);
            return;
        }
        
        INVE.page2.newItemObj = new INVE.InventoryItemObject(partnumber, INVE.currentUser.asauditor);
        var res = AJAXPOST.callQuery2("WMS_PhysInv_GetItemDescription", [partnumber, INVE.currentJob.jobid]);
        INVE.page2.newItemObj.description = res.payload.rows[0][0];
        INVE.page2.newItemObj.uom = res.payload.rows[0][1];
        INVE.page2.newItemGetLot();
    },
    newItemActionsActions: function(dialogResults, obj){
        "use strict";
        if (dialogResults === "exit") {
            INVE.page2.newItem();
            return;
        }
        if (dialogResults === "existing") {
            INVE.page3.init(INVE.page1.lastloc, obj.foundindex, "butPart" + String(obj.foundindex));
            return;
        }
        if (dialogResults === "lot") {
            INVE.page2.newItemObj = new INVE.InventoryItemObject(obj.partnumber, INVE.currentUser.asauditor);
            var res = AJAXPOST.callQuery2("WMS_PhysInv_GetItemDescription", [obj.partnumber, INVE.currentJob.jobid]);
            INVE.page2.newItemObj.description = res.payload.rows[0][0];
            INVE.page2.newItemGetLot();
        }
    },
    newItemLotList: null,
    newItemGetLot: function () {
        "use strict";
        var loc = INVE.page2.selectedLocation.loc;
        if (!loc.iswms) {
            INVE.page2.newItemLot("");
            return;
        }
        var params = [
            INVE.page2.newItemObj.itemnumber,
            INVE.page2.selectedLocation.loc,
            INVE.currentJob.jobid
        ];
        INVE.page2.newItemLotList = AJAXPOST.callQuery2("WMS_PhysInv_GetLots", params);
        var instructions = "Click on the LOT number button to continue. Use the textbox to filter the list or enter a LOT not in the list. Click continue to add the LOT number that was entered.";
        if (INVE.page2.newItemLotList.payload.rows.length === 0) {
            instructions = "Could not find any Lot Numbers for " + INVE.page2.newItemObj.itemnumber + ". Enter a Lot Number and click Continue";
        }
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Select Lot for Item Number " + INVE.page2.newItemObj.itemnumber, instructions, INVE.page2.newItemGetLotActions, null, "97%", INVE.page2.newItemLotValidate);
        var buttons = COMMON.getBasicElement("div", "divAllLots");
        FILLIN.addTextBox(formIndex, "txtLot", "", "Lot Number", (INVE.currentJob.usewmslocations), null, null, { "width": "98%" }, true, "Filter Lots", null, null, "butContinueLot", { "onkeypress": "INVE.page2.newItemLotFilter(" + formIndex + ");" });
        FILLIN.addGenericControl(formIndex, buttons, "", true);
        FILLIN.setHelperDialogParent(formIndex, INVE.divDialog);
        FILLIN.addButton(formIndex, true, "butContinueLot", "Continue", false, true, false);
        FILLIN.addButton(formIndex, false, null, "Cancel", true, false, false);
        FILLIN.displayForm(formIndex);
        INVE.page2.newItemLotFilter(formIndex);

    },
    newItemLotValidate: function (dataValues, formIndex) {
        "use strict";
        var params = [
            INVE.page2.newItemObj.itemnumber,
            dataValues.txtLot.value,
            INVE.page2.selectedLocation.loc, 
            (INVE.page2.selectedLocation.iswms?"1":"0"),
            INVE.currentJob.jobid
        ];
        var res = AJAXPOST.callQuery2("WMS_PhysInv_CheckLotItem", params);
        if (res.payload.rows[0][0] === "0") { return true; }
        FILLIN.errorMessage(formIndex, res.payload.rows[0][1]);
        return false;
    },
    newItemGetLotActions: function (dialogResults, dataValues) {
        "use strict";
        if (!dialogResults) { return; }
        INVE.page2.newItemLot(dataValues.txtLot.value);
    },
    newItemLotFilter: function (formIndex) {
        "use strict";
        var exp = new RegExp(document.getElementById("txtLot").value.toUpperCase());
        var iHTML = "";
        INVE.page2.newItemLotList.payload.rows.forEach(function (row) {
            if (row[0] !== "" && exp.test(row[0].toUpperCase())) {
                iHTML += "<button onclick=\"INVE.page2.newItemLot('" + row[0] + "', " + String(formIndex) + ");\">" + row[0] + "</button>";
            }
        });
        document.getElementById("divAllLots").innerHTML = iHTML;
    },
    newItemLot: function (lot, formIndex) {
        "use strict";
        INVE.page2.newItemObj.lot = lot;
        var itemIndex = INVE.page2.selectedLocation.items.length;
        INVE.page2.newItemObj.index = itemIndex;
        INVE.page2.selectedLocation.items.push(INVE.page2.newItemObj);
        var locIndex = INVE.page2.selectedLocation.index;
        INVE.currentJob.locs[locIndex] = INVE.page2.selectedLocation;
        if (COMMON.exists(formIndex)) {
            FILLIN.closeDialog(formIndex);
        }
        INVE.page3.init(locIndex, itemIndex, "butPart" + String(itemIndex));
    }
};
INVE.page3 = {
    formindex: null,
    selectedLocation: null,
    selectedItem: null,
    init: function(locIndex, itemIndex, lastPos){
        "use strict";
        if (INVE.page2.refreshTO) {
            window.clearInterval(INVE.page2.refreshTO);
            INVE.page2.refreshTO = null;
        }
        if (INVE.page1.refreshTO) {
            window.clearInterval(INVE.page1.refreshTO);
            INVE.page1.refreshTO = null;
        }
        INVE.page2.lastPos = lastPos;
        window.scrollTo(0, 0);
        INVE.page3.selectedLocation = INVE.currentJob.locs[locIndex];
        INVE.page3.selectedItem = INVE.page3.selectedLocation.items[itemIndex];
        if (INVE.page3.selectedItem.hasrecord) {
            INVE.page3.inventoryRedo();
            return;
        }
        INVE.page3.display();
    },
    inventoryRedo: function () {
        "use strict";             
        var selectedItem = INVE.page3.selectedItem;
        var selectedLoc = INVE.page3.selectedLocation;
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Existing Record", "There is already a count for this Item/Location/Lot.  Click the appropriate button for the action you wish to do.", INVE.page3.inventoryRedoActions, null, "97%");
        FILLIN.addSpan(formIndex, null, selectedLoc.loc, "Location", null, true);
        FILLIN.addSpan(formIndex, null, selectedItem.itemnumber, "Item Number");
        FILLIN.addSpan(formIndex, null, selectedItem.itemdescription, "Description");
        FILLIN.addSpan(formIndex, null, selectedItem.lot, "Lot");
        FILLIN.addSpan(formIndex, null, INVE.currentJob.warehouse, "Warehouse");
        FILLIN.addSpan(formIndex, null, COMMON.formatCurrency(String(selectedItem.qtyentered), null, 0, false), "Count");
        FILLIN.addSpan(formIndex, null, INVE.currentJob.company, "Company");
        FILLIN.addSpan(formIndex, null, (selectedLoc.iswms ? "WMS Location" : "LX Location"));
        FILLIN.addButton(formIndex, "modify", null, "Additional Counts", true);
        if (!selectedItem.itemadded) {
            FILLIN.addButton(formIndex, "overwrite", null, "OverWrite", true);
        } else {
            FILLIN.addButton(formIndex, "delete", null, "Delete", true);
            if (INVE.currentUser.asauditor) {
                FILLIN.addButton(formIndex, "overwrite", null, "OverWrite", true);
            }
        }
        FILLIN.addButton(formIndex, "printtag", null, "Print Tag", true);
        FILLIN.addButton(formIndex, "cancel", null, "Cancel", true);
        FILLIN.displayForm(formIndex);
    },
    inventoryRedoActions: function (dialogResult) {
        "use strict";
        if (dialogResult === "cancel") { return; }
        if (dialogResult === "overwrite") {
            INVE.page3.display("overwrite");
            return;
        }
        if (dialogResult === "delete") {
            INVE.page3.inventoryRedoVerifyDelete();
            return;
        }
        if (dialogResult === "printtag") {            
            INVE.page2.printitemtag(INVE.page3.selectedItem.inventoryrecordid);
            return;
        }
        INVE.page3.countsentered = [INVE.page3.getCountObj(INVE.page3.selectedItem.qtyentered, 0)];
        INVE.page3.display("additionalcount");
    },
    inventoryRedoVerifyDelete: function () {
        "use strict";
        var selectedItem = INVE.page3.selectedItem;
        var selectedLoc = INVE.page3.selectedLocation;
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Delete Item count", "This action cannot be undone. Are you sure you want to delete this record?", INVE.page3.inventoryRedoCompleteDelete, null, "97%");
        FILLIN.addSpan(formIndex, null, selectedLoc.loc, "Location", null, true);
        FILLIN.addSpan(formIndex, null, selectedItem.itemnumber, "Item Number");
        FILLIN.addSpan(formIndex, null, selectedItem.itemdescription, "Description");
        FILLIN.addSpan(formIndex, null, selectedItem.lot, "Lot");
        FILLIN.addSpan(formIndex, null, INVE.currentJob.warehouse, "Warehouse");
        FILLIN.addSpan(formIndex, null, COMMON.formatCurrency(String(selectedItem.qtyentered), null, 0, false), "Count");
        FILLIN.addSpan(formIndex, null, INVE.currentJob.company, "Company");
        FILLIN.addSpan(formIndex, null, (selectedLoc.iswms ? "WMS Location" : "LX Location"));
        FILLIN.addButton(formIndex, true, null, "Yes", true);
        FILLIN.addButton(formIndex, false, null, "No");
        FILLIN.displayForm(formIndex);
    },
    inventoryRedoCompleteDelete: function (dialogResult) {
        "use strict";
        if (!dialogResult) { return; }
        var invId = INVE.page3.selectedItem.inventoryrecordid;
        AJAXPOST.callQuery2("WMS_PhysINV_DeleteItemAdd", [String(invId)], true);
        INVE.page2.display(INVE.page3.selectedLocation.index, "Count Deleted Succesfully");
    },
    countsentered: [],
    display: function (actioncode) {
        "use strict";
        var selectedItem = INVE.page3.selectedItem;
        var selectedLoc = INVE.page3.selectedLocation;
        INVE.utility.clearDisplay();
        INVE.utility.title("Loc: " + selectedLoc.loc + " - " + selectedItem.itemnumber);
        COMMON.clearParent("divData");
        if (!actioncode || actioncode === "overwrite") {
            INVE.page3.countsentered = [];
        }
        INVE.page3.countsentered.push(INVE.page3.getCountObj(null, 0));

        var infoObj = {
            Location: selectedLoc.loc,
            Item_Number: selectedItem.itemnumber,
            Lot: selectedItem.lot,
            Description: selectedItem.description,
            Warehouse: INVE.currentJob.warehouse,
            Company: INVE.currentJob.company
        };
        infoObj.Instructions = "";
        //INVE.utility.info(infoObj);
        var divTxtQty = COMMON.getBasicElement("div", "divTxtQty");
        var dispObj = document.getElementById(INVE.displayDivId);
        dispObj.appendChild(divTxtQty);
        var formIndex = FILLIN.createForm("divTxtQty", null, "Enter Count. If you are counting countainers enter Quantity per container or leave blank or zero for item count", INVE.page3.displayActions, null, "97%");
        FILLIN.addSpan(formIndex, null, selectedItem.description, "Desc", false, true);
        if (selectedItem.lot !== "") {
            FILLIN.addSpan(formIndex, null, selectedItem.lot, "Lot");
        }
        if (INVE.currentJob.warehouse !== "") {
            FILLIN.addSpan(formIndex, null, INVE.currentJob.warehouse, "Warehouse");
        }
        if (INVE.currentJob.company !== "") {
            FILLIN.addSpan(formIndex, null, INVE.currentJob.company, "Company");
        }
        FILLIN.setHelperDialogParent(formIndex, INVE.divDialog);
        FILLIN.addTextBox(formIndex, "txtQty", null, "Count (" + selectedItem.uom + ")", true, "decimal", null, null, true, null, null, null, "butContinue", { "style": "width: 205px; font-size: 1.6em; height:32px;" });
        FILLIN.addFreeButton(formIndex, "Continue", "butContinue", "Continue", true, false);
        var uom = selectedItem.uom;
        FILLIN.addTextBox(formIndex, "txtContainer", "0", "(" + selectedItem.uom + ") Units Per Container (Zero/Blank for individual units)", false, "decimal", null, null, true, null, null, null, "butContinue", { "onkeypress": "INVE.page3.currentCountObj();", "style": "width: 95%; font-size: 1.6em; height:32px;" });
        FILLIN.addGenericControl(formIndex, COMMON.getBasicElement("div", "divTot", null, null, null, { style: "width:214px;" }), "", true);
        FILLIN.addFreeButton(formIndex, "Return", "butReturn", "Cancel", false, true);
        FILLIN.displayForm(formIndex);
        var divBase = document.getElementById("divformBase" + String(formIndex));
        divBase.firstChild.style.display = "none";
        var divButtonParent = document.getElementById("butContinue").parentNode;
        divButtonParent.style.paddingTop = 0;
        divButtonParent = document.getElementById("divTot").parentNode;
        divButtonParent.style.marginTop = 0;
        divButtonParent.style.marginBottom = 0;
        divButtonParent.getElementsByTagName("h5")[0].style.display = "none";
        divButtonParent = document.getElementById("butReturn").parentNode;
        divButtonParent.getElementsByTagName("h5")[0].style.display = "none";
        INVE.page3.formindex = formIndex;
        document.getElementById("txtQty").setAttribute("type", "number");
        document.getElementById("txtQty").setAttribute("pattern", "[0-9]*");
        document.getElementById("txtContainer").setAttribute("type", "number");
        document.getElementById("txtContainer").setAttribute("pattern", "[0-9]*");
        document.getElementById("txtQty").blur();
        document.getElementById("txtQty").focus();
        INVE.page3.currentCountObj();
        INVE.page3.containerCount("divTot");

        window.setTimeout(function () {
            document.getElementById("txtQty").focus();
        }, 100);
        INVE.utility.orientationCheck();
    },
    displayActions: function(dialogResults){
        "use strict";
        switch (dialogResults) {
            case "Continue":
                INVE.page3.additionalCounts();
                return;
            case "Return":
                INVE.page2.display(String(INVE.page3.selectedLocation.index));
                return;
        }
    },
    getCountObj: function (inputcount, inputcontainerpieces) {
        "use strict";
        return {
            count: inputcount,
            containerpieces: inputcontainerpieces
        };
    },
    getCountValue: function () {
        "use strict";
        var val = document.getElementById("txtQty").value;
        if (val === "" || !COMMON.isNumber(val)) { return null; }
        return parseFloat(val);
    },
    getPiecesPerContainer: function () {
        "use strict";
        var val = document.getElementById("txtContainer").value;
        if (val === "" || !COMMON.isNumber(val)) { return 0; }
        return parseFloat(val);
    },
    currentCountObj: function () {
        "use strict";
        var currentIndex = INVE.page3.countsentered.length - 1;
        INVE.page3.countsentered[currentIndex] = INVE.page3.getCountObj(INVE.page3.getCountValue(), INVE.page3.getPiecesPerContainer());
    },
    
    additionalCounts: function () {
        "use strict";
        var selectedItem = INVE.page3.selectedItem;
        var selectedLoc = INVE.page3.selectedLocation;
        var infoObj = {
            Item_Number: selectedItem.itemnumber,
            Description: selectedItem.description,
            Location: selectedLoc.loc,
            Lot: selectedItem.lot,
            Warehouse: INVE.currentJob.warehouse,
            Company: INVE.currentJob.company
        };
        var iHTML = INVE.utility.info(infoObj, true);
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Additional Counts", iHTML + "<br />Do you want to add additional counts to this location or Save?", INVE.page3.additionalCountsActions, null, "97%");
        FILLIN.addFreeButton(formIndex, false, "butSave", "Save");
        FILLIN.setHelperDialogParent(formIndex, INVE.divDialog);
        FILLIN.addFreeButton(formIndex, true, "butMore", "More Counts");
        FILLIN.addGenericControl(formIndex, COMMON.getBasicElement("div", "divAdditionalCount"), null, true); 
        FILLIN.displayForm(formIndex);
        var par = document.getElementById("butSave");
        par.className = "freebutton";
        par = par.parentNode;
        par.getElementsByTagName("h5")[0].style.display = "none";
        par = document.getElementById("butMore");
        par.className = "freebutton";
        par = par.parentNode;
        par.getElementsByTagName("h5")[0].style.display = "none";
        par = document.getElementById("divCDfreebutton1");
        par.getElementsByTagName("h5")[0].style.display = "none";
        par.getElementsByTagName("button")[0].className = "freebutton";
        par = document.getElementById("divAdditionalCount").parentNode;
        par.getElementsByTagName("h5")[0].style.display = "none";
        INVE.page3.currentCountObj();
        INVE.page3.containerCount("divAdditionalCount");
    },
    additionalCountsActions: function (dialogResults) {
        "use strict";
        if (!dialogResults) {
            INVE.page3.saveCount();
            return;
        }
        INVE.page3.display("additionalcount");
    },
    containerCount: function (dispId) {
        "use strict";
        var mess = "";
        var tot = 0;
        var objCount = 0;
        var uom = INVE.page3.selectedItem.uom;
        INVE.page3.countsentered.forEach(function (countObj) {
            if (countObj.count !== null) {
                objCount += 1;
                if (countObj.containerpieces === 0) {
                    mess += "<tr><td style=\"font-weight:600;color:red;text-align:right;padding:0 3px;\">" + String(countObj.count) + "</td><td style=\"font-weight:700;color:red;text-align:left;padding:0 3px;\">units (" + uom + ")</td></tr>";
                    tot += countObj.count;
                } else {
                    mess += "<tr><td style=\"font-weight:600;color:red;text-align:right;padding:0 3px;\">" + String(countObj.count * countObj.containerpieces) + "</td><td style=\"font-weight:700;color:red;text-align:left;padding:0 3px;\">units (" + uom + ") (" + String(countObj.count) + " containers of " + String(countObj.containerpieces) + ")</td></tr>";
                    tot += (countObj.count * countObj.containerpieces);
                }
            }
        });
        if (mess === "") {
            mess = "&nbsp;";
        } else {
            mess = "<table style=\"border-collapse:collapse;\">" + mess;
            if (objCount > 1) {
                mess += "<tr><td style=\"font-weight:600;color:black;padding:0 3px;text-align:right;\">" + String(tot) + "</td><td style=\"text-align:left;font-weight:700;color:black;padding:0 3px;\">Total</td></tr>";
            }
            mess += "</table>";
        }
        document.getElementById(dispId).innerHTML = "<h5 style=\"margin:0;\">Count Entered: (Total: " + String(tot) + ")</h5>" + mess;
    },
    saveCount: function () {
        "use strict";
        if (!COMMON.validateForm("divTxtQty")) {
            document.getElementById("divErrMess" + INVE.page3.formindex).textContent = "Invalid Quantity Entered";
            return false;
        }
        var qty = 0;
        INVE.page3.countsentered.forEach(function (countObj) {
            if (countObj.count !== null) {
                if (countObj.containerpieces === 0) {
                    qty += countObj.count;
                } else {
                    qty += (countObj.containerpieces * countObj.count);
                }
            }
        });
        var selectedItem = INVE.page3.selectedItem;
        var selectedLoc = INVE.page3.selectedLocation;
        var params = [
            INVE.currentUser.username,
            (INVE.currentUser.asauditor ? "1" : "0"),
            selectedLoc.loc,
            selectedItem.itemnumber,
            selectedItem.lot,
            qty,
            (selectedLoc.iswms ? "1" : "0"),
            (selectedItem.itemadded ? "1" : "0"),
            INVE.currentJob.jobid,
            0,
            0
        ];
        AJAXPOST.callQuery2("WMS_PhysInv_UpdateWorkerTable", params, true);
        INVE.page2.display(INVE.page3.selectedLocation.index, "Data Saved");
    },
    displayKeyActions: function (keyNumber) {
        "use strict";
        var txtQty = document.getElementById("txtQty");
        var val = txtQty.value;
        if (typeof keyNumber === "string") {
            if (keyNumber === "backspace" && val.length > 1) {
                val = val.substring(0, val.length - 1);
            } else {
                val = "";
            }
        } else {
            val += String(keyNumber);
        }
        txtQty.value = val;
    },
    landscape: function () {
        "use strict";
        document.getElementById("divTxtQty").className = "inventoryEntrypage3TxtQtyL";
        document.getElementById("divKeyPad").className = "inventoryEntrypage3KeyPadL";
    },
    portrait: function () {
        "use strict";
        document.getElementById("divTxtQty").className = "inventoryEntrypage3TxtQtyP";
        document.getElementById("divKeyPad").className = "inventoryEntrypage3KeyPadP";
    }
};
INVE.search = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wgARCAAeAB4DASIAAhEBAxEB/8QAGAABAQEBAQAAAAAAAAAAAAAACQcIBAb/xAAWAQEBAQAAAAAAAAAAAAAAAAAAAQL/2gAMAwEAAhADEAAAAWtNei6bJlt4fFsWRHugfZrBGI5X/Ly//8QAHhAAAAcBAQEBAAAAAAAAAAAAAQIDBAUGBwAIERL/2gAIAQEAAQUCn7FHVmHS2DXLWOYa+nc3gD970UV2tQM8eRDqlzizSQ9GlU5+zZyzFbBpJi4suYWXLjZrozLQIYD8Uwj339FhK/B14n//xAAaEQEAAgMBAAAAAAAAAAAAAAABABECITHR/9oACAEDAQE/AR0KXb5GGSclr2f/xAAcEQACAAcAAAAAAAAAAAAAAAAAERASMUFhkaH/2gAIAQIBAT8BusPcE0SqnT//xAAqEAACAgEDAgYABwAAAAAAAAACAwEEBQYREhMhABAUIjFBFSMkMjNCUf/aAAgBAQAGPwK9m8q7o0cemWtmO5mUzAKSoe3Nz2kClDvESZxvIjuUPyOidDpPBoYwAY+s+2benOxR6k72PTYbH9049LCSe6iIyHebOnc7jfwHVVIWEymXVBNsUTxsdFVmIs1rNaf56TpYYq/NFpwLhT4VNbnKVZ7Hsvce/wCnmvdUuTiI/bFttaP85SH3402WDJM48MPSQAJIZ6Lk1wC0hvH4srsQ31HL3S3kRfO/jTRadkGWaiq4Zx1aYIPU1q2UnI9Y17xJBiSrU2777OgaxxDRkfK1jcjXXbo3UHXtV27yDVHG0x22IZjsQmEwazgTAhMYmLA6U13kcNjbZTLaZxahnGe3BraF6qq5ED7RlldJcfaRHO5lQ1jpPL2clONHqZSwNaEvrHJT1XHUFjosYhwSK7YMJpJ7seUpKWIO0C/R5ShKU5el7umpzYZKnVmTvzq2YUwlQU9VRAam78Ra3ykTGCEokSEu8EJRtIlE/Iz9x9+LK8Hi6mMC6/1NoaioX1m7bRJfPtCJmFLjZaYkoUIQRb//xAAcEAEAAwEBAAMAAAAAAAAAAAABABEhMUFRYaH/2gAIAQEAAT8hoDAPcRwscWzIb877/AYhhWRJVFFrQLQtjNFwEAIWhaq+LaFHi4lIwUU2eEhTZrK/wlpmWk7Sii2Nj3788/IewQ7CNSKG5YYuJgfekAVKJREj+rUm3kBUyFAus4ONugSZKLnedvZSV5KBmoFaIIXHwYxv+CANrLYQlKE//9oADAMBAAIAAwAAABCgQCn/xAAfEQEBAAIBBAMAAAAAAAAAAAABESFBADFRYXGh0fH/2gAIAQMBAT8QAYtCikm0hv48ZAJMY++VxEWxMddDT8PfAtimMAdnQbXn/8QAIBEBAAIABQUAAAAAAAAAAAAAAREhABAxQWFRgZGx0f/aAAgBAgEBPxBrqQ7NGSQqGAWLSqnWtj1hAZKcldjnx9jH/8QAHRABAQADAQADAQAAAAAAAAAAAREAITFBUWGBsf/aAAgBAQABPxBVRJLRNkICKwsf5bqRa4zpBbUz7CUuByWme2n9eS/2c5h3FmRGGNALqFVObmXkUqVWhhzPyWBCHnMEiIldMRpK9I7hvtsBDIVsCmjZOGYIIdd6cegtSDHwNk7xWhTVwc86p54ClQNxWvOqEdlUq5bHddrfz4OWmw1bsEjuye5Nhrtit0zV6E2Xm9gydICjAl1//9k=";
INVE.waitingAnimation = "data:image/gif;base64,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";
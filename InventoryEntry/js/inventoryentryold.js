/*global AJAXPOST, FILLIN, HELPTOPICS, TIMEPICKER, CAL, window, URLTOPDF, ADMIN, COMMON, DISPLAYGRID, EMBED, CANVAS, CKEDITOR, CANV2, MAIN, CARDS, PFLOGOS*/
/*jslint node:true, white:true, browser:true, this:true, maxlen: 1000000*/
var INVE = {};
INVE.site = "SD&L";
INVE.isTest = false;
INVE.displayDivId = "divDispMain";
INVE.divDialog = "divDialog";
INVE.currentUser = {
    username: "",
    jobid: "",
    jobname: "",
    printer: "",
    printername: "",
    eligibleforaudit: false,
    asauditor: false
};
INVE.eligibleJobs = [];
INVE.orientationTO = null;
INVE.pages = {
    page1: 1,
    page2: 2,
    page3: 3,
    page4: 4
};
INVE.userPreference = {
    descriptionfilter: null,
    companyfilter: null
};
INVE.currentpage = null;
INVE.landscape = "landscape";
INVE.portrait = "portrait";
INVE.locations = null;
INVE.displayProperties = {
    orientation: "",
    wd: 0,
    ht: 0,
    portraitdisplayfunction: null,
    landscapedisplayfunction: null
};
INVE.currentObj = {
    site: "",
    location: "",
    item: "",
    lot: "",
    warehouse: "",
    company: "",
    itemdescription: "",
    qty: -1,
    containercount: 1,
    count: 0,
    countobj: [],
    locindex: -1,
    iswms: false
};
INVE.currentJob = {
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
    locs: []
};
INVE.utility = {
    init: function () {
        "use strict";
        INVE.login.page1();
    },
    geteligibleJobs: function(){
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
    resetCurrentJob: function () {
        "use strict";
        INVE.currentJob = {
            name: "",
            usewmslocations: false,
            uselxlocations: false,
            wmssite: "",
            wmssitename: "",
            istest: false,
            warehouse: "",
            company: "",
            warehousename: "",
            username: INVE.currentUser.username,
            jobid: "",
            locs: []
        };
    },
    getJobInfo: function(){
        "use strict";
        var jobId = INVE.currentUser.jobid;
        var res = AJAXPOST.callQuery2("WMS_PhysInv_GetJobInfo", [jobId]);
        INVE.utility.resetCurrentJob();
        var row = res.payload.rows[0];
        var reslocs = AJAXPOST.callQuery2("WMS_PhysInv_GetJobLocations", [jobId]);
        var allLocs = [];
        reslocs.payload.rows.forEach(function (oneRow) {
            allLocs.push({
                loc: oneRow[0],
                locdescript: oneRow[1],
                warehouse: oneRow[2],
                company: "",
                stat: parseFloat(oneRow[3]),
                iswms: false
            });
        });
        reslocs = AJAXPOST.callQuery2("WMS_PhysInv_GetWMSLocations", [jobId]);
        reslocs.payload.rows.forEach(function (oneRow) {
            allLocs.push({
                loc: oneRow[0],
                locdescript: oneRow[1],
                warehouse: "",
                company: oneRow[2],
                stat: parseFloat(oneRow[3]),
                iswms: true
            });
        });
        INVE.currentJob = {
            name: row[0],
            usewmslocations: (row[1] === "1"),
            uselxlocations: (locs.payload.rows && locs.payload.rows.length > 0),
            wmssite: row[2],
            wmssitename: row[2],
            istest: (row[4] === "1"),
            warehouse: row[3],
            warehousename: row[6],
            username: INVE.currentUser.username,
            jobid: jobId,
            locs: [],
            company: row[5]
        };
    },
    initCurrentObj: function () {
        "use strict";
        INVE.currentObj.locindex = -1;
        INVE.currentObj.location = "";
        INVE.currentObj.item = "";
        INVE.currentObj.lot = "";
        INVE.currentObj.warehouse = "";
        INVE.currentObj.qty = -1;
        INVE.currentObj.company = "";
        INVE.currentObj.itemdescription = "";
        INVE.currentObj.site = "";
        INVE.currentObj.containercount = 1;
        INVE.currentObj.count = 0;
        INVE.currentObj.countobj = [];
        INVE.currentObj.iswms = false;
    },
    title: function (title) {
        "use strict";
        var obj = document.getElementById("divTitle");
        obj.innerHTML = "<div class=\"inventoryEntryLeftTitle\">WMS Inventory Entry" + ((title && title !== "") ? " - " + title : "") + "</div>" +
            "<div class=\"inventoryEntryRightTitle\">" +
                ((INVE.currentUser.username && INVE.currentUser.username !== "") ? INVE.currentUser.username + (INVE.currentUser.asauditor ? " (Audit)" : "") : "") +
                (INVE.currentUser.printer !== "" ? " printer: " + INVE.currentUser.printername : "") +
                (INVE.currentUser.jobname !== "" ? " " + INVE.currentUser.jobname : "") +
            "</div>" +
            ((INVE.currentUser.username && INVE.currentUser.username !== "") ? "<div class=\"inventoryEntryRightTitle\"><button onclick=\"INVE.utility.displaymyentries();\">Show My Counts</button></div>" : "") +
            "<div style=\"clear:both;\"></div>";
    },
    displaymyentries: function () {
        "use strict";
        var username = INVE.currentUser.username;
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Entries for " + username, "", null, null, "80%");
        FILLIN.addGenericControl(formIndex, COMMON.getBasicElement("div", "divMyEntries"), "", true);
        FILLIN.addButton(formIndex, false, null, "OK");
        FILLIN.displayForm(formIndex);
        var res = AJAXPOST.callQuery2("WMS_PhysInv_GetUserEntries", [username, INVE.site, (INVE.isTest ? "1" : "0")]);
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
    },
    getTextBox: function (id, title, required) {
        "use strict";
        var envelope = COMMON.getBasicElement("div", null, null, "divLocFilter");
        envelope.appendChild(COMMON.getBasicElement("div", null, title, "inventoryEntryTextTitle", null, { "style": "display: block; font-size: 1.5em" }));
        envelope.appendChild(COMMON.getFieldObject("txt", id, "", required));
        envelope.appendChild(COMMON.getButton("btnSearch", "Search", "INVE.page2.filter();"));
        return envelope;
    }
    //},
    //enterPress: function(){

    //}
};
INVE.login = {
    page1: function () {
        "use strict";
        window.scrollTo(0, 0);
        INVE.utility.clearDisplay();
        INVE.utility.title();
        INVE.utility.info();

        INVE.currentUser = {
            username: "",
            jobid: "",
            jobname: "",
            printer: "",
            printername: "",
            asauditor: false
        };
        INVE.utility.geteligibleJobs();
        if (INVE.eligibleJobs.length === 0) {
            //no eligible jobs
            document.getElementById(INVE.displayDivId).innerHTML = "<h2>There are no eligible Inventory Jobs available. Please contact the inventory supervisor to create Inventory Jobs";
            return;
        }
        var formIndex = FILLIN.createForm(INVE.displayDivId, "Select Job", "Select the Inventory Job you will be using.", null, null, "90%");
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
        var formIndex = FILLIN.createForm(INVE.displayDivId, "Enter Name or Employee Number", "Enter your name or employee number in the textbox and click continue", INVE.login.page2actions, null, "90%");
        FILLIN.addTextBox(formIndex, "txtName", "", "Name or Employee Number", true, null, null, { width: "400px" }, true, "Name or Employee #", null, null, "butContinue");
        FILLIN.addCheckBox(formIndex, "chkAuditor", null, "I am Performing a Count Audit");
        FILLIN.addButton(formIndex, "continue", "butContinue", "Continue", true, true, false);
        FILLIN.addButton(formIndex, "back", null, "Select Different Job", false, false, true);
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
            INVE.currentUser.asauditor = dataValues.chkAuditor.value === "1";
            INVE.login.page3();
        }
    },
    page3: function () {
        "use strict";
        //get the printer
        INVE.utility.clearDisplay();
        INVE.utility.title();
        var formIndex = FILLIN.createForm(INVE.displayDivId, "Select your Default Printer", "Select the printer where you will print &quot;Inventory Completed&quot; tags.", INVE.login.page3actions, null, "90%");
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
        var formIndex = FILLIN.createForm(INVE.displayDivId, "Verify information", "Verify you information and click continue", INVE.login.page4actions, null, "90%");
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
        INVE.utility.getJobInfo()
        INVE.page2();
    }
};
//Page1 replaces by login logic
//INVE.page1 = {
//    display: function () {
//        "use strict";
//        window.scrollTo(0, 0);
//        if (INVE.currentUser.username) {
//            INVE.page2.display();
//            return;
//        }
//        INVE.utility.clearDisplay();
//        INVE.utility.title();
//        INVE.utility.info();
//        var formIndex = FILLIN.createForm(INVE.displayDivId, "Enter Name or Employee Number", "Enter your name or employee number in the textbox and click continue", INVE.page1.displayactions, null, "90%");
//        FILLIN.addTextBox(formIndex, "txtName", "", "Name or Employee Number", true, null, null, { width: "400px" }, true, "Name or Employee #", null, null, "butContinue");
//        FILLIN.addButton(formIndex, "true", "butContinue", "Continue", false, true, false);
//        FILLIN.displayForm(formIndex);

//    },
//    displayactions: function (dialogResult, dataValues) {
//        "use strict";
//        if (!dialogResult) { return; }
//        INVE.currentUser.username = dataValues.txtName.value;
//        INVE.page2.display();
//    }
//};
INVE.page2 = {
    lastloc: null,
    display: function (mess) {
        "use strict";
        //window.scrollTo(0, 0);
        //if (window.devicePixelRatio) {
        //    //Cody what is this
        //}

        if (INVE.currentObj && INVE.currentObj.location) {
            INVE.page2.lastLoc = INVE.currentObj.location;
        } else {
            INVE.page2.lastloc = null;
        }
        INVE.utility.initCurrentObj();
        INVE.currentObj.site = INVE.site; 
        INVE.utility.clearDisplay();
        INVE.utility.title("Location");
        INVE.utility.info(((mess && mess !== "") ? "<span style=\"color:red;\">" + mess + "</span><br />" : "") + "Select the location whose inventory you are checking. Reduce selection by entering part of the location (i.e. 12, will display location 000120, 000012, etc.)");
        var txtObj = COMMON.getBasicElement("div", "divPage2Txt", INVE.utility.getTextBox("txtLoc", "Location Filter"));
        //location type
        var loctype = {};
        INVE.currentJob.locs.forEach(function (item) {
            loctype[item.locdescript] = "";
        });
        var li = [{ value: "", text: "Any" }];
        var keys = Object.keys(loctype);
        keys.forEach(function (oneKey) {
            li.push({ value: oneKey, text: oneKey });
        });
        var div = COMMON.getBasicElement("div", null, null, null, null, { "style": "margin-left: 10px" });
        div.appendChild(COMMON.getBasicElement("div", null, "Description", null, null, { "style": "font-size: 1.5em" }));
        div.appendChild(COMMON.getDDL("ddlLocType", INVE.userPreference.descriptionfilter, false, null, li, null, { onchange: "INVE.page2.filter();", "style": "display: block" }));
        
        txtObj.appendChild(div);
        
        txtObj.appendChild(COMMON.getBasicElement("div", null, "<div style=\"background-color:#646F45;margin-bottom:2px;padding:0 2px;\">Location Complete</div><div style=\"background-color:#F15A60;padding:0 2px;\">Unverified Empty Location</div>", null, null, { "style": "margin: 15px 0 0 10px;width:200px;font-weight:600;" }));


        //txtObj.appendChild(COMMON.getBasicElement("div", null, "Location Description"));
        //txtObj.appendChild(COMMON.getDDL("ddlLocType", null, false, null, li, null, { onchange: "INVE.page2.filter();" }));
        var dispObj = document.getElementById(INVE.displayDivId);
        dispObj.appendChild(txtObj);
        dispObj.appendChild(COMMON.getBasicElement("div", "divPage2Div"));
        COMMON.setDDLvalue("ddlLocType", "Finished Goods");
        //document.getElementById("txtLoc").setAttribute("onkeyup", "INVE.page2.filter();");
        document.getElementById("txtLoc").focus();
        document.getElementById("txtLoc").onkeyup = function (e) {
            if (e.keyCode === 13) {
                INVE.page2.filter();
                return false;
            }
        };
        INVE.displayProperties.landscapedisplayfunction = INVE.page2.landscape;
        INVE.displayProperties.portraitdisplayfunction = INVE.page2.portrait;
        INVE.utility.orientationCheck();
        INVE.page2.filter();
    },
    landscape: function () {
        "use strict";
        document.getElementById("divPage2Txt").className = "inventoryEntryPage2TxtL";
        document.getElementById("divPage2Div").className = "inventoryEntryPage2DivL";
    },
    portrait: function () {
        "use strict";
        document.getElementById("divPage2Txt").className = "inventoryEntryPage2TxtP";
        document.getElementById("divPage2Div").className = "inventoryEntryPage2DivP";
    },
    filter: function () {
        "use strict";
        var val = document.getElementById("txtLoc").value;
        INVE.userPreference.descriptionfilter = COMMON.getDDLValue("ddlLocType");
        
        var iHTML = "";
        var idCount = 0;
        var scrollMonitor = null;
        INVE.currentJob.locs.forEach(function (item, index) {
            var exp = new RegExp(val.toUpperCase());
            var comp = (item.iswms ? item.company : item.warehouse);
            if (comp === "") { comp = "[Blank]"; }
            var btnStyle = "";
            switch (item.stat) {
                case "1":
                    btnStyle = " style=\"background-color:#646F45;\"";
                    break;
                case "2":
                    btnStyle = " style=\"background-color:#F15A60;\"";
                    break;
            }
            //TODO **********the data-loc attribute, item[0] below, anything that is triggered on INVE.currentObj.location -->Switch over to index and then get the indexed loc from the currentJob object
            if (exp.test(item.loc.toUpperCase()) && (INVE.userPreference.descriptionfilter === "" || item.locdescript === INVE.userPreference.descriptionfilter)) {
                iHTML += "<button id=\"butLocSelect" + String(idCount) + "\"" + btnStyle + " data-loc=\"" + String(index) + "\" onclick=\"INVE.page3.display(this.getAttribute('data-loc'));\"><div style=\"font-size: 2.1em\">" + item.loc + "</div><div style=\"font-size:1.2em;\">" + item.locdescript + (item.iswms ? " (WMS)" : " (LX)") + "</div><div style=\"font-size:1.2em;\">Company: " + comp + "</div></button>";
                if (INVE.page2.lastLoc === item.loc) {
                    scrollMonitor = idCount;
                }

                idCount += 1;
            }
        });
        iHTML += "<div style=\"clear:both\"></div>";
        COMMON.clearParent("divPage2Div");
        document.getElementById("divPage2Div").innerHTML = iHTML;
        if (INVE.page2.lastLoc && scrollMonitor !== null) {
            window.setTimeout(function () { INVE.page2.doScroll(scrollMonitor); }, 100);
        }
    },
    doScroll: function (scrollMonitor) {
        "use strict";
        var scrollTop = document.getElementById("butLocSelect" + String(scrollMonitor));
        scrollTop = scrollTop.offsetTop;
        window.scrollTo(0, scrollTop);
    }
};
INVE.page3 = {
    display: function (locIndex, mess) {
        "use strict";
        window.scrollTo(0, 0);
        INVE.currentObj.locindex = parseFloat(locIndex);
        var selectedLocation = INVE.currentJob.locs[INVE.currentObj.locindex].loc;
        INVE.currentObj.location = selectedLocation;
        INVE.currentObj.item = "";
        INVE.utility.clearDisplay();
        INVE.utility.title("Item");
        var infoObj = {};
        if (mess && mess !== "") {
            infoObj.Message = "<span style=\"color:red;\">" + mess + "</span>";
        }
        infoObj.Location = selectedLocation;
        infoObj.Instructions = "Select the Item to inventory or click &quot;Add Part&quot; if the item is not listed";
        INVE.utility.info(infoObj);
        var params = [selectedLocation, (INVE.currentJob.locs[INVE.currentObj.locindex].iswms ? "1" : "0"), (INVE.isTest ? "1" : "0")];
        var res = AJAXPOST.callQuery2("WMS_PhysInv_GetAllItems", params);
        var dispObj = document.getElementById(INVE.displayDivId);
        var topObj = COMMON.getBasicElement("div", "divAddItem", COMMON.getHTMLButton(null, "Add Item Not Listed", "INVE.page3.newItem(0);"));
        topObj.appendChild(COMMON.getHTMLButton(null, "Return to \"Select Location\"", "INVE.page2.display();"));
        if (res.payload.rows.length === 0) {
            topObj.appendChild(COMMON.getHTMLButton(null, "Verify that this location<br/>is empty", "INVE.page3.emptyverify('" + selectedLocation + "');"));
        }
        var buttons = COMMON.getBasicElement("div", "divItemButtons");
        var addedItems = "";
        var iHTML = "";
        if (res.payload.rows.length > 0) {
            var anyUnchecked = false;
            res.payload.rows.forEach(function (row) {
                var title = "<div><h3>" + row[0] + "</h3><div>Lot: " + row[1] + "</div><div>" + row[2] + "</div></div>";
                if (row[5] === "1") {
                    if (addedItems === "") {
                        addedItems = "<div><h3 style=\"margin:0;\">Items Added</h3>";
                    }
                    addedItems += "<button onclick=\"INVE.page3.inventoryRedo(this, true);\" data-invid=\"" + row[6] + "\" data-locindex=\"" + locIndex + "\" class=\"inventoryEntryPage3ItemAdded\" >" + title + "</button>";
                } else {
                    if (iHTML === "") {
                        iHTML = "<h3 style=\"margin:0;\">Existing Inventory</h3>";
                    }
                    if (row[4] === "1") {
                        iHTML += "<button style=\"background-color:#646F45;\" onclick=\"INVE.page3.inventoryRedo(this, false);\" data-locindex=\"" + locIndex + "\" data-invid=\"" + row[6] + "\" >" + title + "</button>";
                    } else {
                        iHTML += "<button data-item=\"" + row[0] + "\" data-lot=\"" + row[1] + "\" data-locindex=\"" + locIndex + "\" data-qty=\"" + row[3] + "\" onclick=\"INVE.page3.buttonclicked(this);\" >" + title + "</button>";
                    }
                    if (row[4] !== "1") { anyUnchecked = true; }
                }
            });
            if (addedItems !== "") { addedItems += "</div><div style=\"clear:both\"></div><hr />"; }
            if (!anyUnchecked && mess) {
                INVE.page2.display(mess);
                return;
            }
            iHTML = addedItems + iHTML + "<div style=\"clear:both\"></div>";
        }
        buttons.innerHTML = iHTML;
        dispObj.appendChild(topObj);
        dispObj.appendChild(buttons);
        INVE.displayProperties.landscapedisplayfunction = INVE.page3.landscape;
        INVE.displayProperties.portraitdisplayfunction = INVE.page3.portrait;
        INVE.utility.orientationCheck();
    },
    inventoryRedoData: null,
    inventoryRedo:function(btnObj, itemAdded){
        "use strict";
        var invId = btnObj.getAttribute("data-invid");
        var res = AJAXPOST.callQuery2("WMS_PhysINV_GetExistingCount", [invId, INVE.site, (INVE.isTest ? "1" : "0")]).payload.rows[0];
        INVE.page3.inventoryRedoData = {
            location: res[0],
            itemnumber: res[1],
            lot: res[2],
            warehose: res[3],
            quantity: parseFloat(res[4]),
            company: res[5],
            itemdescription: res[6],
            site: res[7],
            iswms: (res[8] === "1"),
            locindex: parseFloat(btnObj.getAttribute("data-locindex"))
        };
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Existing Record", "There is already a count for this Item/Location/Lot.  Click the appropriate button for the action you wish to do.", INVE.page3.inventoryRedoActions, invId, "50%");
        FILLIN.addSpan(formIndex, null, INVE.page3.inventoryRedoData.location, "Location", null, true);
        FILLIN.addSpan(formIndex, null, INVE.page3.inventoryRedoData.itemnumber, "Item Number");
        FILLIN.addSpan(formIndex, null, INVE.page3.inventoryRedoData.itemdescription, "Description");
        FILLIN.addSpan(formIndex, null, INVE.page3.inventoryRedoData.lot, "Lot");
        FILLIN.addSpan(formIndex, null, INVE.page3.inventoryRedoData.warehose, "Warehouse");
        FILLIN.addSpan(formIndex, null, COMMON.formatCurrency(String(INVE.page3.inventoryRedoData.quantity), null, 0, false), "Count");
        FILLIN.addSpan(formIndex, null, INVE.page3.inventoryRedoData.company, "Company");
        FILLIN.addSpan(formIndex, null, (INVE.page3.inventoryRedoData.iswms? "WMS Location": "LX Location"))
        FILLIN.addButton(formIndex, "modify", null, "Modify", true);
        if (!itemAdded) {
            FILLIN.addButton(formIndex, "overwrite", null, "OverWrite", true);
        } else {
            FILLIN.addButton(formIndex, "delete", null, "Delete", true);
        }
        FILLIN.addButton(formIndex, "cancel", null, "Cancel");
        FILLIN.displayForm(formIndex);
    },
    inventoryRedoActions: function(dialogResult, invId){
        "use strict";
        if (dialogResult === "cancel") { return; }
        if (dialogResult === "overwrite") {
            INVE.page4.display(INVE.page3.inventoryRedoData.itemnumber, INVE.page3.inventoryRedoData.lot, true);
            return;
        }
        if (dialogResult === "delete") {
            INVE.page3.inventoryRedoVerifyDelete(invId);
            return;
        }
        INVE.currentObj.location = INVE.page3.inventoryRedoData.location;
        INVE.currentObj.item = INVE.page3.inventoryRedoData.itemnumber;
        INVE.currentObj.itemdescription = INVE.page3.inventoryRedoData.itemdescription;
        INVE.currentObj.lot = INVE.page3.inventoryRedoData.lot;
        INVE.currentObj.warehouse = INVE.page3.inventoryRedoData.warehose;
        INVE.currentObj.count = INVE.page3.inventoryRedoData.quantity;
        INVE.currentObj.company = INVE.page3.inventoryRedoData.company;
        INVE.currentObj.locindex = INVE.page3.inventoryRedoData.locindex;
        INVE.page4.display(null, null, true, true);
    },
    inventoryRedoVerifyDelete:function(invId){
        "use strict";
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Delete Item count", "This action cannot be undone. Are you sure you want to delete this record?", INVE.page3.inventoryRedoCompleteDelete, invId, "60%");
        FILLIN.addSpan(formIndex, null, INVE.page3.inventoryRedoData.location, "Location", null, true);
        FILLIN.addSpan(formIndex, null, INVE.page3.inventoryRedoData.itemnumber, "Item Number");
        FILLIN.addSpan(formIndex, null, INVE.page3.inventoryRedoData.itemdescription, "Description");
        FILLIN.addSpan(formIndex, null, INVE.page3.inventoryRedoData.lot, "Lot");
        FILLIN.addSpan(formIndex, null, INVE.page3.inventoryRedoData.warehose, "Warehouse");
        FILLIN.addSpan(formIndex, null, COMMON.formatCurrency(String(INVE.page3.inventoryRedoData.quantity), null, 0, false), "Count");
        FILLIN.addSpan(formIndex, null, (INVE.page3.inventoryRedoData.iswms ? "WMS Location" : "LX Location"))
        FILLIN.addSpan(formIndex, null, INVE.page3.inventoryRedoData.company, "Company");
        FILLIN.addButton(formIndex, true, null, "Yes", true);
        FILLIN.addButton(formIndex, false, null, "No");
        FILLIN.displayForm(formIndex);
    },
    inventoryRedoCompleteDelete:function(dialogResult, invId){
        "use strict";
        if (!dialogResult) { return; }
        AJAXPOST.callQuery2("WMS_PhysINV_DeleteItemAdd", [String(invId), INVE.site, (INVE.isTest ? "1" : "0")], true);
        INVE.page3.display(INVE.page3.inventoryRedoData.locindex, "Count Deleted Succesfully");
    },
    emptyverify: function(selectedLocation){
        "use strict";
        AJAXPOST.callQuery2("WMS_PhysInv_VerifyEmptyLocation", [selectedLocation, INVE.site, (INVE.isTest ? "1" : "0")], true);
        INVE.page2.display("Empty Location Verified");
    },
    landscape: function () {
        "use strict";
        document.getElementById("divAddItem").className = "inventoryEntryPage3TopL";
        document.getElementById("divItemButtons").className = "inventoryEntryPage3ButtonsL";
    },
    portrait: function () {
        "use strict";
        document.getElementById("divAddItem").className = "inventoryEntryPage3TopP";
        document.getElementById("divItemButtons").className = "inventoryEntryPage3ButtonsP";
    },
    newItem: function (error) {
        "use strict";
        var formindex = FILLIN.createDialog(INVE.divDialog, "Item Not Listed", "Enter the Item Number, then click Continue", INVE.page3.newItemActions, null, "75%");
        FILLIN.addTextBox(formindex, "txtItem", "", "Item Number", true, null, null, { "width": "300px" }, true, null, null, null, "butContinue");
        FILLIN.addButton(formindex, false, null, "Cancel", true, false, true);
        FILLIN.addButton(formindex, true, "butContinue", "Continue", false, true);
        FILLIN.displayForm(formindex);
        if (String(error)==="1") {
            FILLIN.errorMessage(formindex, "This Item does not exist. Please check your entry and try again.");
        }
    },
    newItemActions: function (dialogResults, dataValues) {
        "use strict";
        if (!dialogResults) { return; }
        dataValues.txtItem.value = dataValues.txtItem.value.toUpperCase();
        INVE.page3.newItemGetLot(dataValues.txtItem.value);
    },
    newItemLotList: null,
    newItemItemNumber: null,
    newItemGetLot: function (itemNumber) {
        "use strict";
        var res = AJAXPOST.callQuery2("WMS_GetValidItemLx", [itemNumber, INVE.currentObj.location, INVE.site, (INVE.isTest ? "1" : "0")]);
        INVE.page3.newItemItemNumber = itemNumber;
        if (res.payload.rows[0][0] === "1") {
            INVE.page3.newItem(res.payload.rows[0][0]);
            return;
        }
        var instructions = "Click on the LOT number button to continue. Use the textbox to filter the list or enter a LOT not in the list. Click continue to add the LOT number that was entered.";
        if (res.payload.rows[0][0] === "2") {
            instructions = "Could not find any Lot Numbers for " + itemNumber + ". Enter a Lot Number and click Continue";
        }
        INVE.page3.newItemLotList = res.payload.rows;
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Select Lot for Item Number " + itemNumber, instructions, INVE.page3.newItemGetLotActions, itemNumber, "80%", INVE.page3.newItemLotValidate);
              var buttons = COMMON.getBasicElement("div", "divAllLots");
        FILLIN.addTextBox(formIndex, "txtLot", "", "Lot Number", true, null, null, null, true, "Filter Lots", null, null, "butContinueLot", { "onkeypress": "INVE.page3.newItemLotFilter(" + formIndex + ", '" + itemNumber + "');" });
        FILLIN.addGenericControl(formIndex, buttons, "", true);
        FILLIN.addButton(formIndex, true, "butContinueLot", "Continue", false, true, false);
        FILLIN.addButton(formIndex, false, null, "Cancel", true, false, false);
        FILLIN.displayForm(formIndex);
        INVE.page3.newItemLotFilter(formIndex, itemNumber);

    },
    newItemLotValidate: function(dataValues, formIndex){
        "use strict";
        var params = [
            INVE.page3.newItemItemNumber,
            dataValues.txtLot.value,
            INVE.currentObj.location,
            INVE.site,
            (INVE.isTest ? "1" : "0")
        ];
        var res = AJAXPOST.callQuery2("WMSPhysInv_CheckLotItem", params);
        if (res.payload.rows[0][0] === "0") { return true; }
        FILLIN.errorMessage(formIndex, res.payload.rows[0][1]);
        return false;
    },
    newItemGetLotActions: function(dialogResults, dataValues, itemNumber){
        "use strict";
        if (!dialogResults) { return; }
        INVE.page4.display(itemNumber, dataValues.txtLot.value, true);
    },
    newItemLotFilter: function(formIndex, itemNumber){
        "use strict";
        var exp = new RegExp(document.getElementById("txtLot").value.toUpperCase());
        var iHTML = "";
        INVE.page3.newItemLotList.forEach(function (row) {
            if (row[1] !== "" && exp.test(row[1].toUpperCase())) {
                iHTML += "<button data-lot=\"" + row[1] + "\" onclick=\"INVE.page3.newItemLot('" + row[1] + "', '" + itemNumber + "', " + String(formIndex) + ");\">" + row[1] + "</button>";
            }
        });
        document.getElementById("divAllLots").innerHTML = iHTML;
    },
    newItemLot: function (Lot, ItemNumber, formIndex) {
        "use strict";
        FILLIN.closeDialog(formIndex);
        INVE.page4.display(ItemNumber, Lot, true);
    },
    buttonclicked: function (btnObj) {
        "use strict";
        INVE.page4.display(btnObj.getAttribute("data-item"), btnObj.getAttribute("data-lot"), true);
    }
};
INVE.page4 = {
    formindex: null,
    display: function (itemNumber, lot, init, countRedo) {
        "use strict";
        window.scrollTo(0, 0);
        INVE.utility.clearDisplay();
        if (itemNumber) {
            INVE.currentObj.item = itemNumber;
            var params = [INVE.currentObj.item, INVE.site, (INVE.isTest ? "1" : "0")];
            var res = AJAXPOST.callQuery2("WMS_GetItemDetails", params).payload.rows;
            INVE.utility.title("Enter Quantity");
            INVE.currentObj.itemdescription = res[0][0];
            INVE.currentObj.warehouse = res[0][1];
            INVE.currentObj.company = res[0][2];
        }
        if (lot) {
            INVE.currentObj.lot = lot;
        }
        if (init) {
            INVE.currentObj.countobj = [];
            if (countRedo) {
                INVE.currentObj.countobj.push(INVE.page4.getCountObj(INVE.currentObj.count, 0));
            }
        }
        INVE.currentObj.countobj.push(INVE.page4.getCountObj(null, 0));
        var infoObj = {
            Location: INVE.currentObj.location,
            Item_Number: INVE.currentObj.item,
            Lot: INVE.currentObj.lot,
            Description: INVE.currentObj.itemdescription,
            Warehouse: INVE.currentObj.warehouse,
            Company: INVE.currentObj.company
        };
        if (countRedo) {
            infoObj.Existing_Count = String(INVE.currentObj.count);
        }
        infoObj.Instructions = "Enter the count (Enter 0 for no inventory) and click Continue";
        INVE.utility.info(infoObj);
        var divTxtQty = COMMON.getBasicElement("div", "divTxtQty");
        var dispObj = document.getElementById(INVE.displayDivId);
        dispObj.appendChild(divTxtQty);
        var formIndex = FILLIN.createForm("divTxtQty", "", "Enter Count. If you are counting countainers enter Quantity per container or leave blank or zero for item count", null, null, "80%");
        FILLIN.addTextBox(formIndex, "txtQty", null, "Count", true, "integer", null, null, true, null, null, null, "butContinue", { "style": "font-size: 1.6em; height:32px;" });
        FILLIN.addTextBox(formIndex, "txtContainer", "0", "Pieces Per Container (Zero or Blank if counting individual pieces)", false, "integer", null, null, true, null, null, null, "butContinue", { "onkeypress": "INVE.page4.currentCountObj();", "style": "font-size: 1.6em; height:32px;" });
        FILLIN.addGenericControl(formIndex, COMMON.getBasicElement("div", "divTot"), "", true);
        FILLIN.addFormButton(formIndex, "butReturn", "Return", null, "INVE.page3.display('" + INVE.currentObj.location + "');", true);
        FILLIN.addFormButton(formIndex, "butContinue", "Continue", null, "INVE.page4.additionalCounts();", false);
        //FILLIN.addButton(formIndex, true, "butContinue", "Continue", false, true, false);
        FILLIN.displayForm(formIndex);
        INVE.page4.formindex = formIndex;
        document.getElementById("txtQty").setAttribute("type", "number");
        document.getElementById("txtQty").setAttribute("pattern", "[0-9]*");
        document.getElementById("txtContainer").setAttribute("type", "number");
        document.getElementById("txtContainer").setAttribute("pattern", "[0-9]*");
        document.getElementById("txtQty").blur();
        document.getElementById("txtQty").focus();
        INVE.page4.currentCountObj();
        INVE.page4.containerCount("divTot");
        
        window.setTimeout(function () {
            document.getElementById("txtQty").focus();
        }, 100);
        INVE.utility.orientationCheck();
    },
    getCountObj: function(inputcount, inputcontainerpieces){
        "use strict";
        return {
            count: inputcount,
            containerpieces: inputcontainerpieces
        };
    },
    getCountValue: function(){
        "use strict";
        var val = document.getElementById("txtQty").value;
        if (val === "" || !COMMON.isNumber(val)) { return null; }
        return parseFloat(val);
    },
    getPiecesPerContainer: function(){
        "use strict";
        var val = document.getElementById("txtContainer").value;
        if (val === "" || !COMMON.isNumber(val)) { return 0; }
        return parseFloat(val);
    },
    currentCountObj: function(){
        "use strict";
        var currentIndex = INVE.currentObj.countobj.length - 1;
        INVE.currentObj.countobj[currentIndex] = INVE.page4.getCountObj(INVE.page4.getCountValue(), INVE.page4.getPiecesPerContainer());

    },
    additionalCounts: function(){
        "use strict";
        var infoObj = {
            Location: INVE.currentObj.location,
            Item_Number: INVE.currentObj.item,
            Lot: INVE.currentObj.lot,
            Description: INVE.currentObj.itemdescription,
            Warehouse: INVE.currentObj.warehouse,
            Company: INVE.currentObj.company
        };
        var iHTML = INVE.utility.info(infoObj, true);
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Additional Counts", iHTML + "<br />Do you want to add additional counts to this location?", INVE.page4.additionalCountsActions, null, "60%");
        FILLIN.addGenericControl(formIndex, COMMON.getBasicElement("div", "divAdditionalCount"));
        FILLIN.addButton(formIndex, false, null, "No", false);
        FILLIN.addButton(formIndex, true, null, "Yes", true);
        FILLIN.displayForm(formIndex);
        INVE.page4.currentCountObj();
        INVE.page4.containerCount("divAdditionalCount");
    },
    additionalCountsActions: function(dialogResults){
        "use strict";
        if (!dialogResults) {
            INVE.page4.displayActions();
            return;
        }
        INVE.page4.display();
    },
    containerCount: function(dispId){
        "use strict";
        var mess = "";
        var tot = 0;
        var objCount = 0;
        INVE.currentObj.countobj.forEach(function (countObj) {
            if (countObj.count !== null) {
                objCount += 1;
                if (countObj.containerpieces === 0) {
                    mess += "<tr><td style=\"font-weight:700;color:red;text-align:right;padding:0 3px;\">" + String(countObj.count) + "</td><td style=\"font-weight:700;color:red;text-align:left;padding:0 3px;\">pieces</td></tr>";
                    tot += countObj.count;
                } else {
                    mess += "<tr><td style=\"font-weight:700;color:red;text-align:right;padding:0 3px;\">" + String(countObj.count * countObj.containerpieces) + "</td><td style=\"font-weight:700;color:red;text-align:left;padding:0 3px;\">pieces (" + String(countObj.count) + " containers of " + String(countObj.containerpieces) + ")</td></tr>";
                    tot += (countObj.count * countObj.containerpieces);
                }
            }
        });
        if (mess === "") {
            mess = "&nbsp;";
        } else {
            mess = "<table style=\"border-collapse:collapse;\"><tr><th colspan=\"2\">Count Entered:</th></tr>" + mess;
            if (objCount > 1) {
                mess += "<tr><td style=\"font-weight:700;color:black;padding:0 3px;text-align:right;\">" + String(tot) + "</td><td style=\"text-align:left;font-weight:700;color:black;padding:0 3px;\">Total</td></tr>";
            }
            mess += "</table>";
        }
        document.getElementById(dispId).innerHTML = "<h2 style=\"margin:0;\">Count Entered:</h2>" + mess;
    },
    displayActions: function () {
        "use strict";
        if (!COMMON.validateForm("divTxtQty")) {
            document.getElementById("divErrMess" + INVE.page4.formindex).textContent = "Invalid Quantity Entered";
            return false;
        }
        //if (!dialogResults) { return; }
        var qty = 0;
        INVE.currentObj.countobj.forEach(function (countObj) {
            if (countObj.count !== null) {
                if (countObj.containerpieces === 0) {
                    qty += countObj.count;
                } else {
                    qty += (countObj.containerpieces * countObj.count);
                }
            }
        });
        INVE.currentObj.qty = qty;
        var params = [
            INVE.username,
            INVE.currentObj.location,
            INVE.currentObj.item,
            INVE.currentObj.lot,
            INVE.currentObj.qty,
            INVE.currentObj.company,
            INVE.currentObj.warehouse,
            INVE.site,
            0,
            0,
            (INVE.isTest ? "1" : "0")
        ];
        AJAXPOST.callQuery2("WMS_UpdatePhysicalInv", params, true);
        INVE.page3.display(INVE.currentObj.location, "Data Saved");
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
        document.getElementById("divTxtQty").className = "inventoryEntryPage4TxtQtyL";
        document.getElementById("divKeyPad").className = "inventoryEntryPage4KeyPadL";
    },
    portrait: function () {
        "use strict";
        document.getElementById("divTxtQty").className = "inventoryEntryPage4TxtQtyP";
        document.getElementById("divKeyPad").className = "inventoryEntryPage4KeyPadP";
    }
};
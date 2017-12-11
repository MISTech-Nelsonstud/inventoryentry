/*global AJAXPOST, FILLIN, HELPTOPICS, TIMEPICKER, CAL, window, URLTOPDF, ADMIN, COMMON, DISPLAYGRID, EMBED, CANVAS, CKEDITOR, CANV2, MAIN, CARDS, PFLOGOS*/
/*jslint node:true, white:true, browser:true, this:true, maxlen: 1000000*/
var INVE = {};
INVE.displayDivId = "divDispMain";
INVE.username = null;
INVE.orientationTO = null;
INVE.pages = {
    page1: 1,
    page2: 2,
    page3: 3,
    page4: 4
};
INVE.currentpage = null;
INVE.landscape = "landscape";
INVE.portrait = "portrait";
INVE.locations = null;
INVE.displayProperties = {
    orientation: INVE.portrait,
    wd: 0,
    ht: 0,
    portraitdisplayfunction: null,
    landscapedisplayfunction: null
};
INVE.currentObj = {
    location: "",
    item: "",
    lot: "",
    warehouse: "",
    qty: -1
};
INVE.utility = {
    init: function () {
        "use strict";
        var res = AJAXPOST.callQuery("WMS_GetAllLocation");
        INVE.locations = res.payload.rows;
        INVE.page1.display();
    },
    title: function (title) {
        "use strict";
        var obj = document.getElementById("divTitle");
        obj.innerHTML = "<div class=\"inventoryEntryLeftTitle\">WMS Inventory Entry" + ((title && title !== "") ? " - " + title : "") + "</div><div class=\"inventoryEntryRightTitle\">" + ((INVE.username && INVE.username !== "") ? "Entry by " + INVE.username : "") + "</div>";
    },
    info: function (infoObj) {
        "use strict";
        var ihtml = "";
        if (infoObj) {
            if (typeof infoObj === "string") {
                ihtml = infoObj;
            } else {
                var keys = Object.keys(infoObj);
                keys.forEach(function (item) {
                    var val = infoObj[item];
                    ihtml += "<div class=\"inventoryEntryInfoCell\"><span class=\"inventoryEntryInfoCellTitle\">" + item.replace("+", " ") + "</span><span class=\"inventoryEntryCellValue\">" + val + "</span></div>";
                });
            }
        }
        document.getElementById("divData").innerHTML = ihtml;
    },
    clearDisplay: function () {
        "use strict";
        COMMON.clearParent(INVE.displayDivId);
        if (INVE.orientationTO) {
            clearTimeout(INVE.orientationTO);
            INVE.orientationTO = null;
        }
        INVE.displayProperties.orientation = INVE.portrait;
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
                INVE.displayProperties.landscapedisplayfunction();
            }
            if (INVE.displayProperties.orientation === INVE.portrait && INVE.displayProperties.portraitdisplayfunction !== null) {
                INVE.displayProperties.portraitdisplayfunction();
            }
        }
        INVE.orientationTO = window.setTimeout(function () { INVE.utility.orientationCheck(); }, 100);
    },
    getTextBox: function (id, title, required) {
        "use strict";
        var envelope = COMMON.getBasicElement("div");
        envelope.appendChild(COMMON.getBasicElement("div", null, title, "inventoryEntryTextTitle"));
        envelope.appendChild(COMMON.getFieldObject("txt", id, "", required));
        return envelope;
    }
};
INVE.page1 = {
    display: function () {
        "use strict";
        if (INVE.username) {
            INVE.page2.display();
            return;
        }
        INVE.utility.clearDisplay();
        INVE.utility.title();
        INVE.utility.info();
        var formIndex = FILLIN.createForm(INVE.displayDivId, "Enter Name or Employee Number", "Enter your name or employee number in the textbox and click continue", INVE.page1.displayactions, null, "90%");
        FILLIN.addTextBox(formIndex, "txtName", "", "Name or Employee Number", true, null, null, { width: "400px" }, true, "Name or Employee #");
        FILLIN.addButton(formIndex, "true", null, "Continue", false, true, false);
        FILLIN.displayForm(formIndex);
    },
    displayactions: function (dialogResult, dataValues) {
        "use strict";
        if (!dialogResult) { return; }
        INVE.username = dataValues.txtName.value;
        INVE.page2.display();
    }
};
INVE.page2 = {
    display: function () {
        "use strict";
        INVE.utility.clearDisplay();
        INVE.utility.title("Location");
        INVE.utility.info();
        var txtObj = COMMON.getBasicElement("div", "divPage2Txt", INVE.utility.getTextBox("txtLoc", "Location Filter"));
        var dispObj = document.getElementById(INVE.displayDivId);
        dispObj.appendChild(txtObj);
        dispObj.appendChild(COMMON.getBasicElement("div", "divPage2Div"));
        document.getElementById("txtLoc").setAttribute("onkeyup", "INVE.page2.filter(this);");
        INVE.displayProperties.landscapedisplayfunction = INVE.page2.landscape;
        INVE.displayProperties.portraitdisplayfunction = INVE.page2.portrait;
        INVE.utility.orientationCheck();
        INVE.page2.filter(document.getElementById("txtLoc"));

    }
};
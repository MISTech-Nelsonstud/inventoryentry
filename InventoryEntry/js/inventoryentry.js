/*global AJAXPOST, FILLIN, HELPTOPICS, TIMEPICKER, CAL, window, URLTOPDF, ADMIN, COMMON, DISPLAYGRID, EMBED, CANVAS, CKEDITOR, CANV2, MAIN, CARDS, PFLOGOS*/
/*jslint node:true, white:true, browser:true, this:true, maxlen: 1000000*/
var INVE = {};
INVE.displayDivId = "divDispMain";
INVE.divDialog = "divDialog";
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
    site: "",
    location: "",
    item: "",
    lot: "",
    warehouse: "",
    company: "",
    itemdescription: "",
    qty: -1
};
INVE.utility = {
    init: function () {
        "use strict";
        var res = AJAXPOST.callQuery2("WMS_GetAllLocations");
        INVE.locations = res.payload.rows;
        INVE.page1.display();
    },
    initCurrentObj: function(){
        "use strict";
        INVE.currentObj.location = "";
        INVE.currentObj.item = "";
        INVE.currentObj.lot = "";
        INVE.currentObj.warehouse = "";
        INVE.currentObj.qty = -1;
        INVE.currentObj.company = "";
        INVE.currentObj.itemdescription = "";
        INVE.currentObj.site = "";
    },
    title: function (title) {
        "use strict";
        var obj = document.getElementById("divTitle");
        obj.innerHTML = "<div class=\"inventoryEntryLeftTitle\">WMS Inventory Entry" + ((title && title !== "") ? " - " + title : "") + "</div><div class=\"inventoryEntryRightTitle\">" + ((INVE.username && INVE.username !== "") ? "Entry by " + INVE.username : "") + "</div><div style=\"clear:both;\"></div>";
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
                    ihtml += "<div class=\"inventoryEntryInfoCell\"><div class=\"inventoryEntryInfoCellTitle\">" + item.replace("_", " ") + "</div><div class=\"inventoryEntryCellValue\">" + val + "</div></div>";
                });
                ihtml += "<div style=\"clear:both\"></div>";
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
    },
    getDDL: function (id, title, required) {
        var envelope = COMMON.getBasicElement("div");
        envelope.appendChild(COMMON.getBasicElement("div", null, title, "inventoryEntryTextTitle"));
        //envelope.appendChild(COMMON.getDDL(id, null, null,);
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
        FILLIN.addTextBox(formIndex, "txtName", "", "Name or Employee Number", true, null, null, { width: "400px" }, true, "Name or Employee #", null, null, "butContinue");
        FILLIN.addButton(formIndex, "true", "butContinue", "Continue", false, true, false);
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
    display: function (mess) {
        "use strict";
        INVE.utility.initCurrentObj();
        INVE.currentObj.site = "SD&L"; //***************This should populate from page1
        INVE.utility.clearDisplay();
        INVE.utility.title("Location");
        INVE.utility.info(((mess && mess !== "") ? "<span style=\"color:red;\">" + mess + "</span><br />" : "") + "Select the location whose inventory you are checking. Reduce selection by entering part of the location (i.e. 12, will display location 000120, 000012, etc.)");
        var txtObj = COMMON.getBasicElement("div", "divPage2Txt", INVE.utility.getTextBox("txtLoc", "Location Filter"));
        //location type
        var loctype = {};
        var locComp = {};
        INVE.locations.forEach(function (row) {
            loctype[row[1]] = "";
            locComp[row[2]] = "";
        });
        var li = [{ value: "", text: "Any" }];
        var keys = Object.keys(loctype);
        keys.forEach(function (oneKey) {
            li.push({ value: oneKey, text: oneKey });
        });
        txtObj.appendChild(COMMON.getBasicElement("div", null, "Location Description"));
        txtObj.appendChild(COMMON.getDDL("ddlLocType", null, false, null, li, null, { onchange: "INVE.page2.filter();" }));
        keys = Object.keys(locComp);
        li = [{ value: "", text: "Any" }];
        keys.forEach(function (oneKey) {
            if (oneKey === "") { oneKey = "[Blank]"; }
            li.push({ value: oneKey, text: oneKey });
        });
        txtObj.appendChild(COMMON.getBasicElement("div", null, "Location Company"));
        txtObj.appendChild(COMMON.getDDL("ddlLocComp", null, false, null, li, null, { onchange: "INVE.page2.filter();" }));
        var dispObj = document.getElementById(INVE.displayDivId);
        dispObj.appendChild(txtObj);
        dispObj.appendChild(COMMON.getBasicElement("div", "divPage2Div"));
        document.getElementById("txtLoc").setAttribute("onkeyup", "INVE.page2.filter();");
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
        var locType = COMMON.getDDLValue("ddlLocType");
        var locComp = COMMON.getDDLValue("ddlLocComp");
        var iHTML = "";
        INVE.locations.forEach(function (item) {
            var exp = new RegExp(val.toUpperCase());
            var comp = item[2];
            if (comp === "") { comp = "[Blank]"; }
            if (exp.test(item[0].toUpperCase()) && (locType === "" || item[1] === locType) && (locComp === ""||comp === locComp)) {
                iHTML += "<button data-loc=\"" + item[0] + "\" onclick=\"INVE.page3.display(this.getAttribute('data-loc'));\"><div>" + item[0] + "</div><div style=\"font-size:0.6em;\">" + item[1] + "</div><div style=\"font-size:0.6em;\">Company: " + comp + "</div></button>";
            }
        });
        iHTML += "<div style=\"clear:both\"></div>";
        COMMON.clearParent("divPage2Div");
        document.getElementById("divPage2Div").innerHTML = iHTML;
    }
};
INVE.page3 = {
    display: function (selectedLocation) {
        "use strict";
        INVE.currentObj.location = selectedLocation;
        INVE.currentObj.item = "";
        INVE.currentObj.lot = "";
        INVE.utility.clearDisplay();
        INVE.utility.title("Item");
        var infoObj = {
            Location: selectedLocation,
            Instructions: "Select the Item to inventory or click &quot;Add Part&quot; if the item is not listed"
        };
        INVE.utility.info(infoObj);
        var params = [selectedLocation, INVE.currentObj.site];
        var res = AJAXPOST.callQuery2("pr_WMS_GetAllItems", params);
        var dispObj = document.getElementById(INVE.displayDivId);
        var topObj = COMMON.getBasicElement("div", "divAddItem", COMMON.getButton(null, "Add Item Not Listed", "INVE.page3.newItem();"));
        topObj.appendChild(COMMON.getButton(null, "Return to \"Select Location\"", "INVE.page2.display();"));
        var buttons = COMMON.getBasicElement("div", "divItemButtons");
        var iHTML = "";
        if (res.payload.rows.length > 0) {
            res.payload.rows.forEach(function (row) {
                var title = "<div><h3>" + row[0] + "</h3><div>Lot: " + row[1] + "</div><div>" + row[2] + "</div></div>";
                iHTML += "<button data-item=\"" + row[0] + "\" data-lot=\"" + row[1] + "\" data-qty=\"" + row[3] + "\" onclick=\"INVE.page3.buttonclicked(this);\">" + title + "</button>";
            });
            iHTML += "<div style=\"clear:both\"></div>";
        }
        buttons.innerHTML = iHTML;
        dispObj.appendChild(topObj);
        dispObj.appendChild(buttons);
        INVE.displayProperties.landscapedisplayfunction = INVE.page3.landscape;
        INVE.displayProperties.portraitdisplayfunction = INVE.page3.portrait;
        INVE.utility.orientationCheck();
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
        if (error) {
            FILLIN.errorMessage(formindex, "This Item does not exist. Please check your entry and try again.");
        }
    },
    newItemActions: function (dialogResults, dataValues) {
        "use strict";
        if (!dialogResults) { return; }
        INVE.page3.newItemGetLot(dataValues.txtItem.value);
    },
    newItemGetLot: function (item) {
        "use strict";
        var res = AJAXPOST.callQuery2("WMS_GetValidItemLx", [item]);
        if (res.payload.rows[0][0] === "1") {
            INVE.page3.newItem(true);
            return;
        }
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Select Lot", "Select a Lot to continue", null, null, "800px");
        var iHTML = "";
        res.payload.rows.forEach(function (row) {
            iHTML += "<button data-lot=\"" + row[1] + "\" onclick=\"INVE.page3.newItemLot('" + row[1] + "', '" + item + "', " + formIndex + ");\">" + row[1] + "</button>";
        });
        var buttons = COMMON.getBasicElement("div", "divAllLots", iHTML);
        FILLIN.addGenericControl(formIndex, buttons, "", true);
        FILLIN.addButton(formIndex, false, null, "Cancel", true);
        FILLIN.displayForm(formIndex);
    },
    newItemLot: function (Lot, ItemNumber, formIndex) {
        "use strict";
        FILLIN.closeDialog(formIndex);
        INVE.page4.display(ItemNumber, Lot, 0);
    },
    buttonclicked: function (btnObj) {
        "use strict";
        INVE.page4.display(btnObj.getAttribute("data-item"), btnObj.getAttribute("data-lot"), parseFloat(btnObj.getAttribute("data-qty")));
    }
};
INVE.page4 = {
    initDisplay: false,
    display: function (itemNumber, lot, qty) {
        "use strict";
        INVE.page4.initDisplay = true;
        INVE.currentObj.item = itemNumber;
        INVE.currentObj.lot = lot;
        var params = [INVE.currentObj.item, INVE.currentObj.site];
        var res = AJAXPOST.callQuery2("WMS_GetItemDetails", params).payload.rows;        
        INVE.utility.clearDisplay();
        INVE.utility.title("Enter Quantity");
        INVE.currentObj.itemdescription = res[0][0];
        INVE.currentObj.warehouse = res[0][1];
        INVE.currentObj.company = res[0][2];
        INVE.currentObj.qty = parseFloat(qty);
        var infoObj = {
            Location: INVE.currentObj.location,
            Item_Number: INVE.currentObj.item,
            Description: INVE.currentObj.itemdescription,
            Warehouse: INVE.currentObj.warehouse,
            Company: INVE.currentObj.company,
            Instructions: "Enter the count (Enter 0 for no inventory) and click Continue"
        };
        INVE.utility.info(infoObj);
        var divTxtQty = COMMON.getBasicElement("div", "divTxtQty");
        var dispObj = document.getElementById(INVE.displayDivId);
        dispObj.appendChild(divTxtQty);
        var formIndex = FILLIN.createForm("divTxtQty", "", null, INVE.page4.displayActions, null, "100%");
        FILLIN.addTextBox(formIndex, "txtQty", INVE.currentObj.qty, "Quantity", true, "integer", null, null, true);
        FILLIN.addButton(formIndex, true, null, "Continue", false, true, false);
        FILLIN.addButton(formIndex, false, null, "Select Different Item", true, false, true);
        FILLIN.displayForm(formIndex);
        var keyArea = COMMON.getBasicElement("div", "divKeyPad");
        var getKeyButton = function (keyNumber) {
            var val = String(keyNumber);
            var txt = String(keyNumber);
            var isNumber = (typeof keyNumber !== "string");
            if (!isNumber) {
                if (keyNumber === "backspace") {
                    txt = "<img src=\"data:image/gif;base64,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\" >";
                } else {
                    txt = "<img src=\"data:image/gif;base64,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\" >";
                }
            } else {
                txt = String(keyNumber);
            }
            return "<button onclick=\"INVE.page4.displayKeyActions(" + (!isNumber ? "'" : "") + val + (!isNumber ? "'" : "") + ");\">" + txt + "</button>";
        };
        var iHTML = "<table><tr><td>" + getKeyButton(7) + "</td><td>" + getKeyButton(8) + "</td><td>" + getKeyButton(9) + "</td></tr>" +
            "<tr><td>" + getKeyButton(4) + "</td><td>" + getKeyButton(5) + "</td><td>" + getKeyButton(6) + "</td></tr>" +
            "<tr><td>" + getKeyButton(1) + "</td><td>" + getKeyButton(2) + "</td><td>" + getKeyButton(3) + "</td></tr>" +
            "<tr><td>" + getKeyButton("delete") + "</td><td>" + getKeyButton(0) + "</td><td>" + getKeyButton("backspace") + "</td></tr></table>";
        keyArea.innerHTML = iHTML;
        dispObj.appendChild(keyArea);
        INVE.displayProperties.landscapedisplayfunction = INVE.page4.landscape;
        INVE.displayProperties.portraitdisplayfunction = INVE.page4.portrait;
        INVE.utility.orientationCheck();
    },
    displayActions: function (dialogResults) {
        "use strict";
        if (!dialogResults) {
            INVE.page3.display(INVE.currentObj.location);
            return;
        }
        INVE.currentObj.qty = document.getElementById("txtQty").value;
        var params = [
            INVE.username,
            INVE.currentObj.location,
            INVE.currentObj.item,
            INVE.currentObj.lot,
            INVE.currentObj.qty,
            INVE.currentObj.company,
            INVE.currentObj.warehouse,
            INVE.currentObj.site
        ];
        AJAXPOST.callQuery2("WMS_UpdatePhysicalInv", params, true);
        INVE.page2.display("Data Saved");
    },
    displayKeyActions: function (keyNumber) {
        "use strict";
        var txtQty = document.getElementById("txtQty");
        var val = txtQty.value;
        if (INVE.page4.initDisplay) { val = ""; }
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
        INVE.page4.initDisplay = false;
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
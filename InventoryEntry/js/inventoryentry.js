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
    count: 0
};
INVE.utility = {
    init: function () {
        "use strict";
        var res = AJAXPOST.callQuery2("WMS_GetAllLocations");
        INVE.locations = res.payload.rows;
        INVE.page1.display();
    },
    initCurrentObj: function () {
        "use strict";
        INVE.currentObj.location = "";
        INVE.currentObj.item = "";
        INVE.currentObj.lot = "";
        INVE.currentObj.warehouse = "";
        INVE.currentObj.qty = -1;
        INVE.currentObj.company = "";
        INVE.currentObj.itemdescription = "";
        INVE.currentObj.site = "";
        INVE.currentObj.containercount = 1,
        INVE.currentObj.count = 0
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
INVE.page1 = {
    display: function () {
        "use strict";
        window.scrollTo(0, 0);
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
        window.scrollTo(0, 0);
        //if (window.devicePixelRatio) {
        //    //Cody what is this
        //}
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
        var div = COMMON.getBasicElement("div", null, null, null, null, { "style": "margin-left: 10px" });
        div.appendChild(COMMON.getBasicElement("div", null, "Description", null, null, { "style": "font-size: 1.5em" }));
        div.appendChild(COMMON.getDDL("ddlLocType", INVE.userPreference.descriptionfilter, false, null, li, null, { onchange: "INVE.page2.filter();", "style": "display: block" }));
        
        txtObj.appendChild(div);
        


        keys = Object.keys(locComp);
        li = [{ value: "", text: "Any" }];
        keys.forEach(function (oneKey) {
            if (oneKey === "") { oneKey = "[Blank]"; }
            li.push({ value: oneKey, text: oneKey });
        });

        

        div = COMMON.getBasicElement("div", null, null, null, null, { "style": "margin-left: 10px" });
        div.appendChild(COMMON.getBasicElement("div", null, "Company", null, null, { "style": "font-size: 1.5em" }));
        div.appendChild(COMMON.getDDL("ddlLocComp", INVE.userPreference.companyfilter, false, null, li, null, { onchange: "INVE.page2.filter();", "style": "display: block" }));
        txtObj.appendChild(div);


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
        INVE.userPreference.companyfilter = COMMON.getDDLValue("ddlLocComp");
        
        var iHTML = "";
        INVE.locations.forEach(function (item) {
            var exp = new RegExp(val.toUpperCase());
            var comp = item[2];
            if (comp === "") { comp = "[Blank]"; }
            if (exp.test(item[0].toUpperCase()) && (INVE.userPreference.descriptionfilter === "" || item[1] === INVE.userPreference.descriptionfilter) && (INVE.userPreference.companyfilter === "" || comp === INVE.userPreference.companyfilter)) {
                iHTML += "<button data-loc=\"" + item[0] + "\" onclick=\"INVE.page3.display(this.getAttribute('data-loc'));\"><div style=\"font-size: 2.1em\">" + item[0] + "</div><div style=\"font-size:1.2em;\">" + item[1] + "</div><div style=\"font-size:1.2em;\">Company: " + comp + "</div></button>";
            }
        });
        iHTML += "<div style=\"clear:both\"></div>";
        COMMON.clearParent("divPage2Div");
        document.getElementById("divPage2Div").innerHTML = iHTML;
    }
};
INVE.page3 = {
    display: function (selectedLocation, mess) {
        "use strict";
        window.scrollTo(0, 0);
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
        var params = [selectedLocation, INVE.currentObj.site];
        var res = AJAXPOST.callQuery2("pr_WMS_GetAllItems", params);
        var dispObj = document.getElementById(INVE.displayDivId);
        var topObj = COMMON.getBasicElement("div", "divAddItem", COMMON.getButton(null, "Add Item Not Listed", "INVE.page3.newItem(0);"));
        topObj.appendChild(COMMON.getButton(null, "Return to \"Select Location\"", "INVE.page2.display();"));
        var buttons = COMMON.getBasicElement("div", "divItemButtons");
        var iHTML = "";
        if (res.payload.rows.length > 0) {
            res.payload.rows.forEach(function (row) {
                var title = "<div><h3>" + row[0] + "</h3><div>Lot: " + row[1] + "</div><div>" + row[2] + "</div></div>";
                iHTML += "<button data-item=\"" + row[0] + "\" data-lot=\"" + row[1] + "\" data-qty=\"" + row[3] + "\" onclick=\"INVE.page3.buttonclicked(this);\"" + (row[4] === "1" ? " style=\"background-color:#646F45;\"" : "") + ">" + title + "</button>";
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
        if (String(error)==="1") {
            FILLIN.errorMessage(formindex, "This Item does not exist. Please check your entry and try again.");
        }
    },
    newItemActions: function (dialogResults, dataValues) {
        "use strict";
        if (!dialogResults) { return; }
        INVE.page3.newItemGetLot(dataValues.txtItem.value);
    },
    newItemLotList: null,
    newItemGetLot: function (itemNumber) {
        "use strict";
        var res = AJAXPOST.callQuery2("WMS_GetValidItemLx", [itemNumber]);
        if (res.payload.rows[0][0] === "1") {
            INVE.page3.newItem(res.payload.rows[0][0]);
            return;
        }
        var instructions = "Click on the LOT number button to continue. Use the textbox to filter the list or enter a LOT not in the list. Click continue to add the LOT number that was entered.";
        if (res.payload.rows[0][0] === "2") {
            instructions = "Could not find any Lot Numbers for " + itemNumber + ". Enter a Lot Number and click Continue";
        }
        INVE.page3.newItemLotList = res.payload.rows;
        var formIndex = FILLIN.createDialog(INVE.divDialog, "Select Lot for Item Number " + itemNumber, instructions, INVE.page3.newItemGetLotActions, itemNumber, "80%");
              var buttons = COMMON.getBasicElement("div", "divAllLots");
        FILLIN.addTextBox(formIndex, "txtLot", "", "Lot Number", true, null, null, null, true, "Filter Lots", null, null, "butContinueLot", { "onkeypress": "INVE.page3.newItemLotFilter(" + formIndex + ", '" + itemNumber + "');" });
        FILLIN.addGenericControl(formIndex, buttons, "", true);
        FILLIN.addButton(formIndex, true, "butContinueLot", "Continue", false, true, false);
        FILLIN.addButton(formIndex, false, null, "Cancel", true, false, false);
        FILLIN.displayForm(formIndex);
        INVE.page3.newItemLotFilter(formIndex, itemNumber);

    },
    newItemGetLotActions: function(dialogResults, dataValues, itemNumber){
        "use strict";
        if (!dialogResults) { return; }
        INVE.page4.display(itemNumber, dataValues.txtLot.value, 0);
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
        INVE.page4.display(ItemNumber, Lot, 0);
    },
    buttonclicked: function (btnObj) {
        "use strict";
        INVE.page4.display(btnObj.getAttribute("data-item"), btnObj.getAttribute("data-lot"), parseFloat(btnObj.getAttribute("data-qty")));
    }
};
INVE.page4 = {
    display: function (itemNumber, lot, qty) {
        "use strict";
        window.scrollTo(0, 0);
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
            Lot: INVE.currentObj.lot,
            Description: INVE.currentObj.itemdescription,
            Warehouse: INVE.currentObj.warehouse,
            Company: INVE.currentObj.company,
            Instructions: "Enter the count (Enter 0 for no inventory) and click Continue"
        };
        INVE.utility.info(infoObj);
        var divTxtQty = COMMON.getBasicElement("div", "divTxtQty");
        var dispObj = document.getElementById(INVE.displayDivId);
        dispObj.appendChild(divTxtQty);
        var formIndex = FILLIN.createForm("divTxtQty", "", "Enter Count. If you are counting countainers enter Quantity per container or leave blank or zero for item count", null, null, "80%");
        FILLIN.addTextBox(formIndex, "txtQty", null, "Count", true, "integer", null, null, true, null, null, null, "butContinue", { "style": "font-size: 1.6em; height:32px;" });
        FILLIN.addTextBox(formIndex, "txtContainer", "0", "Pieces Per Container (Zero or Blank if counting individual pieces)", false, "integer", null, null, true, null, null, null, null, { "onkeypress": "INVE.page4.containerCount();", "style": "font-size: 1.6em; height:32px;" });
        FILLIN.addGenericControl(formIndex, COMMON.getBasicElement("div", "divTot"), "", true);
        FILLIN.addFormButton(formIndex, "butReturn", "Return", null, "INVE.page3.display('" + INVE.currentObj.location + "');", true);
        FILLIN.addFormButton(formIndex, "butContinue", "Continue", null, "INVE.page4.displayActions('" + formIndex + "');", false);
        //FILLIN.addButton(formIndex, true, "butContinue", "Continue", false, true, false);
        FILLIN.displayForm(formIndex);
        document.getElementById("txtQty").setAttribute("type", "number");
        document.getElementById("txtQty").setAttribute("pattern", "[0-9]*");
        document.getElementById("txtContainer").setAttribute("type", "number");
        document.getElementById("txtContainer").setAttribute("pattern", "[0-9]*");
        document.getElementById("txtQty").blur();
        document.getElementById("txtQty").focus();

        INVE.page4.containerCount();
        
        window.setTimeout(function () {
            document.getElementById("txtQty").focus();
        }, 100);
        INVE.utility.orientationCheck();
    },
    containerCount: function(){
        "use strict";
        var val = document.getElementById("txtContainer").value;
        var mess = "&nbsp;";
        if (val === "" || val === "0") {
            val = 1;
        } else {
            if (COMMON.isNumber(val)) {
                val = parseFloat(val);
            } else {
                val = 1;
            }
            var count = document.getElementById("txtQty").value;
            if (COMMON.isNumber(count)) {
                count = parseFloat(count);
            } else {
                count = 0;
            }
            var tot = count * val;
            mess = "<span style=\"font-weight:700;color:red;\">" + String(count) + " containers with " + String(val) + " pieces total " + String(tot) + "</span>";
        }
        document.getElementById("divTot").innerHTML = mess;
    },
    displayActions: function (formIndex) {
        "use strict";
        if (!COMMON.validateForm("divTxtQty")) {
            document.getElementById("divErrMess" + formIndex).textContent = "Invalid Quantity Entered";
            return false;
        }
        //if (!dialogResults) { return; }
        INVE.currentObj.count = document.getElementById("txtQty").value;
        INVE.currentObj.containercount = document.getElementById("txtContainer").value;
        if (COMMON.isNumber(INVE.currentObj.containercount) && parseFloat(INVE.currentObj.containercount)) {
            INVE.currentObj.containercount = parseFloat(INVE.currentObj.containercount);
        } else {
            INVE.currentObj.containercount = 1;
        }
        INVE.currentObj.qty = INVE.currentObj.count * INVE.currentObj.containercount;
        var params = [
            INVE.username,
            INVE.currentObj.location,
            INVE.currentObj.item,
            INVE.currentObj.lot,
            INVE.currentObj.qty,
            INVE.currentObj.company,
            INVE.currentObj.warehouse,
            INVE.currentObj.site,
            INVE.currentObj.containercount,
            INVE.currentObj.count
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
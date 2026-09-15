sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/VBox",
    "sap/m/Text",
    "sap/ui/layout/cssgrid/GridItemLayoutData",
    "matchschedule/model/scheduleTransform"
], function (Controller, JSONModel, VBox, Text, GridItemLayoutData, scheduleTransform) {
    "use strict";

    return Controller.extend("matchschedule.controller.Schedule", {

        onInit: function () {
            const oRaw = this.getOwnerComponent().getModel("schedule");
            if (!oRaw) {
                return;
            }
            oRaw.dataLoaded().then(function () {
                const oViewModel = scheduleTransform.computeViewModel(oRaw.getData());
                this.getView().setModel(new JSONModel(oViewModel), "grid");
            }.bind(this));
        },

        _applyCellStyle: function (oControl, oContext) {
            oContext.getProperty("styleClass").split(" ").filter(Boolean).forEach(function (sClass) {
                oControl.addStyleClass(sClass);
            });
            oControl.setLayoutData(new GridItemLayoutData({
                gridColumn: oContext.getProperty("gridColumn"),
                gridRow: oContext.getProperty("gridRow")
            }));
            return oControl;
        },

        /** Factory for every cell of the schedule CSSGrid. */
        cellFactory: function (sId, oContext) {
            const sType = oContext.getProperty("type");
            let oControl;

            switch (sType) {
                case "round":
                case "corner":
                    oControl = new VBox(sId, {
                        items: [new Text({ text: oContext.getProperty("text") || "" })]
                    });
                    break;
                case "dateHeader":
                    oControl = new VBox(sId, {
                        items: [
                            new Text({ text: oContext.getProperty("dow") }).addStyleClass("msDateDow"),
                            new Text({ text: oContext.getProperty("md") }).addStyleClass("msDateMd")
                        ]
                    });
                    break;
                case "venue":
                    oControl = new VBox(sId, {
                        items: [
                            new Text({ text: oContext.getProperty("name") }).addStyleClass("msVenueName"),
                            new Text({
                                text: oContext.getProperty("subtitle"),
                                visible: !!oContext.getProperty("subtitle")
                            }).addStyleClass("msVenueSub")
                        ]
                    });
                    break;
                case "tile":
                    oControl = new VBox(sId, {
                        items: [
                            new Text({ text: oContext.getProperty("matchNo") }).addStyleClass("msTileNo"),
                            new Text({
                                text: oContext.getProperty("matchup"),
                                visible: !!oContext.getProperty("matchup")
                            }).addStyleClass("msTileMatchup"),
                            new Text({ text: oContext.getProperty("timeLine") }).addStyleClass("msTileTime")
                        ]
                    });
                    break;
                default: // "corner", "placeholder"
                    oControl = new VBox(sId, {});
            }

            return this._applyCellStyle(oControl, oContext);
        },

        /** Factory for the six group columns of the lower table. */
        groupFactory: function (sId, oContext) {
            const oHeader = new Text({ text: oContext.getProperty("label") })
                .addStyleClass("msGroupHeader")
                .addStyleClass(oContext.getProperty("colorClass"));

            const aTeamRows = oContext.getProperty("teams").map(function (oTeam) {
                return new Text({ text: oTeam.display }).addStyleClass("msGroupTeam");
            });

            return new VBox(sId, {
                items: [oHeader].concat(aTeamRows)
            }).addStyleClass("msGroupCol");
        }
    });
});

sap.ui.define([
    "sap/ui/core/UIComponent",
    "matchschedule/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("matchschedule.Component", {
        metadata: {
            manifest: "json"
        },

        init() {
            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(models.createDeviceModel(), "device");

            this.getRouter().initialize();
        }
    });
});
"use strict";

define(function (require) {
    const placeholderManager = require("core/placeholderManager");

    const isTest = true;

    const PallExTestUrl = "https://s-nexus-rest-api-test.pallex.com/v1/";
    const PallExUrl = "https://rest-api-nexus.pallex.com/v1/";

    const PallExBaseUrl = isTest ? PallExTestUrl : PallExUrl;

    const TestPluggableAndriiButtonKey = "placeholderTestPluggableAndrii";

    var placeHolder = function ($scope, $element, controlService) {

        this.getItems = () => {
            return [{
                text: "TestPluggableAndrii",
                key: TestPluggableAndriiButtonKey,
                icon: "fa fa-truck"
            }];
        };

        this.isEnabled = (itemKey) => {
            if (itemKey === TestPluggableAndriiButtonKey) {
                const selected = $scope.viewStats.get_selected_orders?.() || [];
                return selected.length > 0;
            }
            return false;
        };

        this.onClick = () => {
            const selectedOrders = $scope.viewStats.get_selected_orders?.() || [];

            if (selectedOrders.length === 0) {
                alert("Please select at least one order.");
                return;
            }

            const order = selectedOrders[0];
            console.log(order);
            const consignmentId = order.id || order.pkOrderId || order.OrderId;

            if (!consignmentId) {
                alert("Could not determine consignment ID from selected order.");
                return;
            }

            const labelUrl = `${PallExBaseUrl}consignments/${consignmentId}/labels`;

            window.open(labelUrl, "_blank");
        };
    };

    placeholderManager.register("OpenOrders_OrderControlButtons", placeHolder);
});

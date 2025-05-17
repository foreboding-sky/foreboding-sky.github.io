'use strict';

define(function (require) {
    const placeholderManager = require('core/placeholderManager');

    const placeHolder = function ($scope, $element, $http) {
        const vm = this;
        vm.ordersService = new Services.OrdersService(vm);
        vm.selectedOrders = [];

        const isTest = true;
        const PallExTestUrl = 'https://s-nexus-rest-api-test.pallex.com/v1/';
        const PallExUrl = 'https://rest-api-nexus.pallex.com/v1/';
        const baseUrl = isTest ? PallExTestUrl : PallExUrl;

        vm.getItems = () => [
            {
                key: 'placeholderTestPallexAndrii',
                text: 'TestPallexAndrii',
                icon: 'fa func fa-print'
            }
        ];

        vm.isEnabled = () => false;

        angular.element(document).ready(function () {
            vm.ordersSelectedWatch = $scope.$watch(
                () => $scope.viewStats.selected_orders,
                function (newVal) {
                    if (newVal && newVal.length) {
                        vm.isEnabled = () => true;
                    } else {
                        vm.isEnabled = () => false;
                    }
                },
                true
            );
        });

        vm.onClick = function (itemKey, $event) {
            vm.selectedOrders = $scope.viewStats.selected_orders.map((i) => i.id);

            if (!vm.selectedOrders.length) {
                Core.Dialogs.addNotify('No orders selected.', 'WARNING');
                return;
            }

            const orderId = vm.selectedOrders[0];
            console.log(vm.selectedOrders[0]);

            const labelUrl = `${baseUrl}consignments/${orderId}/labels`;

            window.open(labelUrl, '_blank');
        };
    };

    placeholderManager.register('OpenOrders_OrderControlButtons', placeHolder);
});

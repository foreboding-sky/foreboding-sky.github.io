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

            const loadImageFromUrl = (url) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = function () {
                        resolve({
                            url,
                            image: img,
                            width: img.width,
                            height: img.height
                        });
                    };
                    img.onerror = function () {
                        reject(new Error(`Failed to load image from ${url}`));
                    };
                    img.src = url;
                });
            };

            const labelUrls = vm.selectedOrders.map((id) => `${baseUrl}consignments/${id}/labels`);

            Promise.all(labelUrls.map(loadImageFromUrl))
                .then((images) => {
                    vm.labelImages = images;
                    console.log("Loaded label images:", images);
                })
                .catch((error) => {
                    Core.Dialogs.addNotify(error.message, 'ERROR');
                });
        };

    };

    placeholderManager.register('OpenOrders_OrderControlButtons', placeHolder);
});

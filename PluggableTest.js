"use strict";

define(function (require) {
    const placeholderManager = require("core/placeholderManager");
    const pdfLib = require("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.js");

    const TestPluggableAndriiButtonKey = "placeholderTestPluggableAndrii";

    var placeHolder = function ($scope, $element, controlService) {
        const vm = this;
        vm.scope = $scope;
        vm.printService = new Services.PrintService(vm);
        vm.macroService = new Services.MacroService(vm);
        vm.buttonPlaceholderKey = TestPluggableAndriiButtonKey;
        vm.loadingHtml = "<i class=\"fa fa-spinner fa-spin\"></i> Print shipping documents";

        vm.getItems = () => ([{
            key: vm.buttonPlaceholderKey,
            text: "TestAndrii",
            icon: "fa-print"
        }]);

        vm.setLoading = (isLoading) => {
            if (isLoading) {
                vm.isEnabled = (itemKey) => false;
                vm.agButton.html(vm.loadingHtml);
            } else {
                vm.isEnabled = (itemKey) => true;
                vm.agButton.html(vm.buttonInnerHTML);
            }
        };

        angular.element(document).ready(function () {
            vm.button = document.querySelectorAll(`button[key='${vm.buttonPlaceholderKey}']`)[0];
            vm.agButton = angular.element(vm.button);
            vm.buttonInnerHTML = vm.button.innerHTML;

            vm.ordersSelectedWatch = $scope.$watch(() => $scope.viewStats.selected_orders, function (newVal, oldVal) {
                if (newVal && newVal.length) {
                    vm.isEnabled = (itemKey) => true;
                } else {
                    vm.isEnabled = (itemKey) => false;
                }
            }, true);
        });

        vm.onClick = async (itemKey, $event) => {
            let items = $scope.viewStats.selected_orders.map(i => i.id);
            if (!items || !items.length) {
                return;
            };
            vm.setLoading(true);
            await vm.loadFilesAndPrint([], items, 1, Math.ceil(items.length / 4));
        };

        vm.loadFilesAndPrint = async (documents, allOrderIds, pageNumber, totalPages) => {
            console.log("loadFilesAndPrint");
            console.log(allOrderIds);
            let orderIds = paginate(allOrderIds, 4, pageNumber);
            vm.macroService.Run({ applicationName: "PluggableTestAndrii", macroName: "PallExLabels", orderIds }, async function (result) {
                console.log(result);
                if (!result.error) {
                    if (result.result.IsError) {
                        Core.Dialogs.addNotify({ message: result.result.ErrorMessage, type: "ERROR", timeout: 5000 });
                    };
                    if (result.result === null) {
                        Core.Dialogs.addNotify({ message: "Result is null", type: "ERROR", timeout: 5000 });
                        vm.setLoading(false);
                        return;
                    };
                    documents = documents.concat(result.result.OrderLabels);
                    if (result.result.OrderIdsLeft && result.result.OrderIdsLeft.length > 0) {
                        allOrderIds = allOrderIds.concat(result.result.OrderIdsLeft);
                        totalPages = Math.ceil(allOrderIds.length / 4);
                    }
                    if (pageNumber == totalPages) {
                        await vm.addLabelsAndPrint(documents);
                    } else {
                        await vm.loadFilesAndPrint(documents, allOrderIds, pageNumber + 1, totalPages);
                    }
                } else {
                    Core.Dialogs.addNotify({ message: result.error, type: "ERROR", timeout: 5000 })
                    vm.setLoading(false);
                }
            });
        };

        function paginate(array, page_size, page_number) {
            return array.slice((page_number - 1) * page_size, page_number * page_size);
        };

        vm.addLabelsAndPrint = async (documents) => {
            console.log("addLabelsAndPrint");
            try {
                const resultDocument = await pdfLib.PDFDocument.create();
                console.log(documents);
                if (documents.length === 0) {
                    Core.Dialogs.addNotify({ message: "No orders found to print.", type: "ERROR", timeout: 5000 });
                    vm.setLoading(false);
                    return;
                }

                for (let i = 0; i < documents.length; i++) {
                    let packageLabel = documents[i].Label

                    if (!!documents[i].ShippingLabelTemplateBase64) {
                        let shippingInvoiceDocument = await pdfLib.PDFDocument.load(documents[i].ShippingLabelTemplateBase64);
                        let labelPageIndex = 0;

                        if (shippingInvoiceDocument.getPageCount() > 1) {

                            if (shippingInvoiceDocument.getPageCount() > 1) {
                                labelPageIndex = shippingInvoiceDocument.getPageCount() - 1;
                            } else {
                                shippingInvoiceDocument.addPage();
                                labelPageIndex = 1;
                            }
                        }

                        shippingInvoiceDocument = await addImageToPdfFitInBox(shippingInvoiceDocument, packageLabel, labelPageIndex, 0, 20, 550, 305);
                        let shipingPages = await resultDocument.copyPages(shippingInvoiceDocument, getDocumentIndices(shippingInvoiceDocument));
                        shipingPages.forEach(page => resultDocument.addPage(page));
                    }
                }

                const resultBase64 = await resultDocument.saveAsBase64();

                printPDFInNewWindow(resultBase64);

                vm.setLoading(false);
            } catch (error) {
                Core.Dialogs.addNotify({ message: error.message, type: "ERROR", timeout: 5000 });
                vm.setLoading(false);
            }
        };

        async function addImageToPdfFitInBox(pdfDocument, pngImageBase64, pageNumber, boxX, boxY, boxWidth, boxHeight) {
            let embeddedImage = await pdfDocument.embedPng(pngImageBase64);
            const { width: imageWidth, height: imageHeight } = embeddedImage.size();

            let [newImageWidth, newImageHeight] = reduceSizeWithProportion(imageWidth, imageHeight, boxHeight, boxWidth);

            let labelPage = pdfDocument.getPages()[pageNumber];

            let pageSize = labelPage.getSize();

            boxX = (pageSize.width - (pageSize.width - boxWidth));

            labelPage.drawImage(embeddedImage, {
                x: boxX,
                y: boxY,
                width: newImageWidth,
                height: newImageHeight,
                rotate: pdfLib.degrees(90)
            });

            return pdfDocument;
        }

        function reduceSizeWithProportion(width, height, maxWidth, maxHeight) {
            if (width > maxWidth) {
                let reduceCoef = maxWidth / width;
                width *= reduceCoef;
                height *= reduceCoef;
                return reduceSizeWithProportion(width, height, maxWidth, maxHeight);
            }
            if (height > maxHeight) {
                let reduceCoef = maxHeight / height;
                width *= reduceCoef;
                height *= reduceCoef;
                return reduceSizeWithProportion(width, height, maxWidth, maxHeight);
            }
            return [width, height];
        }

        function getDocumentIndices(pdfDoc) {
            let arr = [];
            for (let i = 0; i < pdfDoc.getPageCount(); i++) {
                arr.push(i);
            }
            return arr;
        }

        function b64toBlob(content, contentType) {
            contentType = contentType || '';
            const sliceSize = 512;
            const byteCharacters = window.atob(content);

            const byteArrays = [];
            for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                const slice = byteCharacters.slice(offset, offset + sliceSize);
                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
            }
            const blob = new Blob(byteArrays, {
                type: contentType
            });
            return blob;
        };

        function printPDFInNewWindow(pdfBase64) {
            const blob = b64toBlob(pdfBase64, "application/pdf");
            const blobURL = URL.createObjectURL(blob);
            let popup = window.open(blobURL, "", "width=1,height=1,scrollbars=no,resizable=no,toolbar=no,menubar=0,status=no,directories=0,visible=none");

            if (popup == null) {
                Core.Dialogs.addNotify({ message: "Cannot open window for print", type: "ERROR", timeout: 5000 });
            }
            popup.print();

            setTimeout(() => {
                popup.close();
            }, 30000);
        }
    };

    placeholderManager.register("OpenOrders_OrderControlButtons", placeHolder);
});

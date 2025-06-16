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
            let orderIds = paginate(allOrderIds, 4, pageNumber);
            vm.macroService.Run({ applicationName: "PluggableTestAndrii", macroName: "PallExLabels", orderIds }, async function (result) {
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
            try {
                const resultDocument = await pdfLib.PDFDocument.create();
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

                        // Convert PDF to PNG before adding to shipping invoice
                        try {
                            // Ensure the PDF data is properly formatted
                            const pdfData = packageLabel.startsWith('data:application/pdf;base64,')
                                ? packageLabel.split(',')[1]
                                : packageLabel;

                            const pngImages = await convertPdfToPng(pdfData);

                            if (pngImages && pngImages.length > 0) {
                                // Add shipping label template first
                                let shipingPages = await resultDocument.copyPages(shippingInvoiceDocument, getDocumentIndices(shippingInvoiceDocument));
                                shipingPages.forEach(page => resultDocument.addPage(page));

                                // Add PNG images, 4 per page in 2x2 grid
                                for (let i = 0; i < pngImages.length; i += 4) {
                                    console.log(`Processing images starting at index ${i}, total images: ${pngImages.length}`);
                                    const page = resultDocument.addPage([595.28, 841.89]); // A4 size
                                    const pageWidth = page.getWidth();
                                    const pageHeight = page.getHeight();

                                    // Calculate dimensions for 2x2 grid
                                    const imageWidth = (pageWidth - 60) / 2; // 20px margin on each side, 20px between columns
                                    const imageHeight = (pageHeight - 60) / 2; // 20px margin top/bottom, 20px between rows

                                    console.log('Page dimensions:', { pageWidth, pageHeight, imageWidth, imageHeight });

                                    // Calculate column positions
                                    const leftColumnX = 20; // 20px from left edge
                                    const rightColumnX = Math.floor(pageWidth / 2) + 20; // Middle of page + 20px gap

                                    // First image (1/3) - Top left
                                    if (i < pngImages.length) {
                                        console.log('Adding first image to top left');
                                        console.log('BoxX' + leftColumnX + 'BoxY' + (pageHeight - imageHeight - 20));
                                        await addImageToPdfFitInBox(
                                            resultDocument,
                                            pngImages[i],
                                            resultDocument.getPageCount() - 1,
                                            leftColumnX + imageHeight, // Adjust for rotation
                                            pageHeight - imageHeight - 20,
                                            imageWidth,
                                            imageHeight
                                        );
                                    }

                                    // Second image (2/3) - Bottom left
                                    if (i + 1 < pngImages.length) {
                                        console.log('Adding second image to bottom left');
                                        console.log('BoxX' + leftColumnX + 'BoxY' + 20);
                                        await addImageToPdfFitInBox(
                                            resultDocument,
                                            pngImages[i + 1],
                                            resultDocument.getPageCount() - 1,
                                            leftColumnX + imageHeight, // Adjust for rotation
                                            20,
                                            imageWidth,
                                            imageHeight
                                        );
                                    }

                                    // Third image (3/3) - Top right
                                    if (i + 2 < pngImages.length) {
                                        console.log('Adding third image to top right');
                                        console.log('BoxX' + rightColumnX + 'BoxY' + (pageHeight - imageHeight - 20));
                                        await addImageToPdfFitInBox(
                                            resultDocument,
                                            pngImages[i + 2],
                                            resultDocument.getPageCount() - 1,
                                            rightColumnX + imageHeight, // Adjust for rotation
                                            pageHeight - imageHeight - 20,
                                            imageWidth,
                                            imageHeight
                                        );
                                    }

                                    // Fourth image (if exists) - Bottom right
                                    if (i + 3 < pngImages.length) {
                                        console.log('Adding fourth image to bottom right');
                                        console.log('BoxX' + rightColumnX + 'BoxY' + 20);
                                        await addImageToPdfFitInBox(
                                            resultDocument,
                                            pngImages[i + 3],
                                            resultDocument.getPageCount() - 1,
                                            rightColumnX + imageHeight, // Adjust for rotation
                                            20,
                                            imageWidth,
                                            imageHeight
                                        );
                                    }
                                }
                            } else {
                                console.error("No PNG images returned from conversion");
                                Core.Dialogs.addNotify({ message: "Failed to convert PDF to PNG", type: "ERROR", timeout: 5000 });
                            }
                        } catch (conversionError) {
                            console.error("Error during PDF to PNG conversion:", conversionError);
                            Core.Dialogs.addNotify({ message: "Error converting PDF to PNG: " + conversionError.message, type: "ERROR", timeout: 5000 });
                        }
                    }
                }

                const resultBase64 = await resultDocument.saveAsBase64();

                printPDFInNewWindow(resultBase64);

                vm.setLoading(false);
            } catch (error) {
                console.error("Error in addLabelsAndPrint:", error);
                Core.Dialogs.addNotify({ message: error.message, type: "ERROR", timeout: 5000 });
                vm.setLoading(false);
            }
        };

        async function convertPdfToPng(pdfBase64) {
            try {
                console.log("Converting PDF to PNG, input length:", pdfBase64.length);
                const response = await fetch('https://macro-functionality-extender.brainence.info/api/convert/Base64PdfToPng', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ Base64Pdf: pdfBase64 })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("API Error Response:", errorText);
                    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                }

                const pngImages = await response.json();
                console.log("Received PNG images count:", pngImages.length);
                console.log(pngImages);
                return pngImages;
            } catch (error) {
                console.error('Error converting PDF to PNG:', error);
                throw error;
            }
        }

        async function addImageToPdfFitInBox(pdfDocument, pngImageBase64, pageNumber, boxX, boxY, boxWidth, boxHeight) {
            let embeddedImage = await pdfDocument.embedPng(pngImageBase64);
            const { width: imageWidth, height: imageHeight } = embeddedImage.size();

            let [newImageWidth, newImageHeight] = reduceSizeWithProportion(imageWidth, imageHeight, boxHeight, boxWidth);

            let labelPage = pdfDocument.getPages()[pageNumber];

            console.log('Drawing image at:', { boxX, boxY, newImageWidth, newImageHeight });

            // When rotating 90 degrees, we need to adjust the position
            // The rotation point is at (boxX, boxY)
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
            try {
                const blob = b64toBlob(pdfBase64, "application/pdf");
                const blobURL = URL.createObjectURL(blob);

                // Create an iframe instead of a popup window
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                document.body.appendChild(iframe);

                iframe.onload = function () {
                    try {
                        iframe.contentWindow.print();
                        // Clean up after printing
                        setTimeout(() => {
                            document.body.removeChild(iframe);
                            URL.revokeObjectURL(blobURL);
                        }, 1000);
                    } catch (printError) {
                        console.error("Print error:", printError);
                        Core.Dialogs.addNotify({ message: "Error while printing: " + printError.message, type: "ERROR", timeout: 5000 });
                        document.body.removeChild(iframe);
                        URL.revokeObjectURL(blobURL);
                    }
                };

                iframe.src = blobURL;
            } catch (error) {
                console.error("Error in printPDFInNewWindow:", error);
                Core.Dialogs.addNotify({ message: "Error preparing document for print: " + error.message, type: "ERROR", timeout: 5000 });
            }
        }
    };

    placeholderManager.register("OpenOrders_OrderControlButtons", placeHolder);
});

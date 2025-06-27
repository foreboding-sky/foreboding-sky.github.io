"use strict";

define(function (require) {

    $(document).ready(function ($scope) {
        const config = { childList: true, subtree: true };

        function searchTree(element, matchingTitle) {
            if (element && element.querySelectorAll && element.querySelectorAll("div[ng-controller='DescriptionEditorView'] .buttons")) {
                console.log("Founded div[ng-controller='DescriptionEditorView'] .buttons");
                return element.querySelectorAll("div[ng-controller='DescriptionEditorView'] .buttons")[0];
            }
            else if (element && element.children != null) {
                let i;
                let result = null;
                for (i = 0; result == null && i < element.children.length; i++) {
                    result = searchTree(element.children[i], matchingTitle);
                }
                return result;
            }
            return null;
        }

        var callback = function (mutationsList, observer) {
            for (const mutation of mutationsList) {
                if (mutation.type === "childList") {
                    for (const node of mutation.addedNodes) {
                        let result = searchTree(node, "div[ng-controller='DescriptionEditorView'] .buttons");
                        if (result) {
                            console.log("Founded needed div[ng-controller='DescriptionEditorView'] .buttons");
                            console.log(result);

                            const newButton = angular.element('<print-labels-button></print-labels-button>')
                            const ngElem = angular.element(result);
                            ngElem.prepend(newButton);
                            const ngScope = ngElem.scope();
                            const compileF = ngElem.injector().get("$compile");
                            const res = compileF(newButton)(ngScope);

                            return;
                        }
                    }
                }
            }
        };

        const observer = new MutationObserver(callback);

        const session = JSON.parse(window.localStorage.getItem('SPA_auth_session'));

        setTimeout(function () {
            const targetNode = document.getElementsByClassName("legacy-windows-container")[0];
            observer.observe(targetNode, config);
        }, 2000);

        function PrintLabelsButton($scope) {
            const vm = this;
            vm.scope = $scope;

            // vm.doSmth = function ($event) {
            //     console.log();
            //     console.log("Do something");
            // };
        };

        const template = `
          <select name="cars" id="cars">
            <option value="volvo">Volvo</option>
            <option value="saab">Saab</option>
            <option value="opel">Opel</option>
            <option value="audi">Audi</option>
        </select>`;

        angular.module("process-orders-proxy-layer")
            .component("printLabelsButton", {
                template: template,
                controllerAs: "vm",
                controller: PrintLabelsButton
            });
    });
});

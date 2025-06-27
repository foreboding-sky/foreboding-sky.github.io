"use strict";

define(function (require) {
    $(document).ready(function ($scope) {
        const config = { childList: true, subtree: true };
        var select_returnForm;
        // var input_returnForm;
        var select_resendForm;
        var input_resendForm;

        var allowedQuantity = 0;
        // var isAllowedQuantitySet = false;
        var refundSum = 0.0;
        var isRefundSumSet = false;

        var callback = function (mutationsList, observer) {

            if (!permissions.some(x => x.fieldName === 'input_additionalCost') && !admin) {
                var resendForm = document.getElementsByName("submissionForm.Resend")[0];
                if (resendForm) {
                    var inputs = resendForm.getElementsByTagName("input");
                    if (inputs) {
                        for (var input of inputs) {
                            if (input.getAttribute("lw-tst") === "input_additionalCost") {
                                input.parentElement.parentElement.innerHTML = "";
                                break;
                            }
                        }
                    }
                }
            }

            if (!permissions.some(x => x.fieldName === 'order_split_advanced_features') && !admin) {
                let allDivs = document.getElementsByTagName("div");
                for (var div of allDivs) {
                    if (div.getAttribute("ng-controller") === "OpenOrders_SplitOrderView") {
                        let AllButtons = document.getElementsByTagName("button");
                        for (var button of AllButtons) {
                            if (button.innerHTML.toLowerCase().includes("Auto Split".toLowerCase())) {
                                button.disabled = true;
                                break;
                            }
                        }
                        for (var button of AllButtons) {
                            if (button.innerHTML.toLowerCase().includes("One in each order".toLowerCase())) {
                                button.disabled = true;
                                break;
                            }
                        }
                        let AllInputs = document.getElementsByTagName("input");
                        for (var input of AllInputs) {
                            input.disabled = true;
                        }
                    }
                }
            }

            if (!permissions.some(x => x.fieldName === 'advancedPermissions') && !admin) {
                var appsContainer = document.getElementsByClassName("cdk-overlay-container")[0];
                if (appsContainer) {
                    var moduleContainers = appsContainer.getElementsByClassName("moduleContainer");
                    if (moduleContainers.length > 0) {
                        for (var moduleContainer of moduleContainers) {
                            var nameModule = moduleContainer.getElementsByClassName("module-name-text")[0];
                            if (nameModule) {
                                if (nameModule.getAttribute("title") === "Custom Permissions Setup") {
                                    moduleContainer.innerHTML = "";
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            if (!permissions.some(x => x.fieldName === 'cs_app') && !admin) {
                var appsContainer = document.getElementsByClassName("cdk-overlay-container")[0];
                if (appsContainer) {
                    var moduleContainers = appsContainer.getElementsByClassName("moduleContainer");
                    if (moduleContainers.length > 0) {
                        for (var moduleContainer of moduleContainers) {
                            var nameModule = moduleContainer.getElementsByClassName("module-name-text")[0];
                            if (nameModule) {
                                if (nameModule.getAttribute("title") === "CSAppBr") {
                                    moduleContainer.innerHTML = "";
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            if (!permissions.some(x => x.fieldName === 'notes_sync') && !admin) {
                var appsContainer = document.getElementsByClassName("cdk-overlay-container")[0];
                if (appsContainer) {
                    var moduleContainers = appsContainer.getElementsByClassName("moduleContainer");
                    if (moduleContainers.length > 0) {
                        for (var moduleContainer of moduleContainers) {
                            var nameModule = moduleContainer.getElementsByClassName("module-name-text")[0];
                            if (nameModule) {
                                if (nameModule.getAttribute("title").includes("Notes Sync")) {
                                    moduleContainer.innerHTML = "";
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            if (!permissions.some(x => x.fieldName === 'rma_app') && !admin) {
                var appsContainer = document.getElementsByClassName("cdk-overlay-container")[0];
                if (appsContainer) {
                    var moduleContainers = appsContainer.getElementsByClassName("moduleContainer");
                    if (moduleContainers.length > 0) {
                        for (var moduleContainer of moduleContainers) {
                            var nameModule = moduleContainer.getElementsByClassName("module-name-text")[0];
                            if (nameModule) {
                                if (nameModule.getAttribute("title") === "RMAAppBr") {
                                    moduleContainer.innerHTML = "";
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            if (!permissions.some(x => x.fieldName === 'linnworks_settings_button') && !admin) {
                var Settings = document.getElementById("Settings");
                if (Settings) {
                    Settings.innerHTML = "";
                    Settings.parentNode.removeChild(Settings);
                }
            }

            if (permissions.some(x => x.fieldName === 'custom_refund_bundle') && !admin) {

                if (mutationsList[0].target.id === "custom-invalidity-text") {
                    return;
                }

                var rmaDiv = document.getElementsByClassName("RMA_AddView")[0];
                if (rmaDiv) {
                    var divWithSpan = rmaDiv.getElementsByClassName("forced-relative")[0];
                    if (divWithSpan) {
                        let isRemoved = false;
                        for (var span of rmaDiv.getElementsByTagName("span")) {
                            if (span.classList.contains("invalidity")) {
                                span.remove();
                                isRemoved = true;
                                break;
                            }
                        }
                        if (isRemoved) {
                            var tagSpan = document.createElement("span");
                            tagSpan.style.cssText = 'float:left;color:red;';
                            var tagI = document.createElement("i");
                            tagI.setAttribute("id", "custom-invalidity-text");

                            tagSpan.appendChild(tagI);
                            divWithSpan.insertBefore(tagSpan, divWithSpan.firstChild);
                        }
                    }
                }

                var returnForm = document.getElementsByName("submissionForm.Return")[0];
                if (returnForm) {
                    var selects = returnForm.getElementsByTagName("select");
                    if (selects) {
                        for (var select of selects) {
                            //making return location select readonly
                            if (select.getAttribute("lw-tst") === "select_returnLocation") {
                                select.disabled = true;
                            }
                            //checking if there is anything selected in category select
                            if (select.getAttribute("lw-tst") === "select_reasonCategory") {
                                select_returnForm = select;
                                select.required = true;
                                select.addEventListener("change", isReturnFormValid);
                            }
                        }
                    }

                    //making refund input readonly
                    // var inputs = returnForm.getElementsByTagName("input");
                    // if (inputs) {
                    //     for (var input of inputs) {
                    //         if (input.getAttribute("lw-tst") === "input_Refund") {
                    //             if (!isRefundSumSet) {
                    //                 refundSum = parseFloat(input.value);
                    //                 isRefundSumSet = true;
                    //             }
                    //             // input.setAttribute('readonly', true);
                    //         }

                    //         if (input.getAttribute("lw-tst") === "input_returnQuantity") {
                    //             // if (!isAllowedQuantitySet) {
                    //             //     // allowedQuantity = parseInt(input.getAttribute("max"));
                    //             //     // input.setAttribute("min", allowedQuantity);
                    //             //     // isAllowedQuantitySet = true;
                    //             // }
                    //             input_returnForm = input;
                    //             input.addEventListener("change", isReturnFormValid);
                    //         }
                    //     }
                    // }

                    //checking if button need to be disabled
                    isReturnFormValid();
                }
                else {
                    allowedQuantity = 0;
                    // isAllowedQuantitySet = false;
                    refundSum = 0.0;
                    // isRefundSumSet = false;
                }

                //removing exchange tab and form
                var exchangeForm = document.getElementsByName("submissionForm.Exchange")[0];
                if (exchangeForm) {
                    var lis = exchangeForm.parentElement.parentElement.parentElement.getElementsByTagName("li");
                    if (lis) {
                        for (var li of lis) {
                            if (li.getAttribute("lw-tst") === "tab_Exchange") {
                                //removing tab
                                li.remove();
                                //removing tab content
                                exchangeForm.parentElement.remove();
                                break;
                            }
                        }
                    }
                }

                var resendForm = document.getElementsByName("submissionForm.Resend")[0];
                if (resendForm) {
                    var selects = resendForm.getElementsByTagName("select");
                    if (selects) {
                        for (var select of selects) {
                            //making return location select readonly
                            if (select.getAttribute("lw-tst") === "select_RMAOrderLocation") {
                                const options = Array.from(select.options);
                                const optionToSelect = options.find(item => item.label === "Default");
                                optionToSelect.selected = true;
                                select.disabled = true;
                            }
                            //checking if there is anything selected in category select
                            if (select.getAttribute("lw-tst") === "select_reasonCategory") {
                                select_resendForm = select;
                                select.addEventListener("change", isResendFormValid);
                            }
                        }
                    }

                    //making refund input readonly
                    var inputs = resendForm.getElementsByTagName("input");
                    if (inputs) {
                        for (var input of inputs) {
                            if (input.getAttribute("lw-tst") === "input_Refund") {
                                input.value = 0;
                                input.setAttribute('readonly', true);
                            }

                            if (input.getAttribute("lw-tst") === "input_resendQuantity") {
                                // input.setAttribute("max", allowedQuantity);
                                input_resendForm = input;
                                input.addEventListener("change", isResendFormValid);
                            }

                            if (input.getAttribute("lw-tst") === "input_additionalCost") {
                                input.setAttribute('readonly', true);
                            }
                        }
                    }

                    //checking if button need to be disabled
                    isResendFormValid();
                }

                var refundWindow = document.getElementsByClassName("Refund_AddView")[0];
                if (refundWindow) {
                    var inputs = refundWindow.getElementsByTagName("input");
                    if (inputs) {
                        for (var input of inputs) {
                            if (input.getAttribute("lw-tst") === "number") {
                                var value = input.getAttribute("max");
                                input.value = parseFloat(value);
                                input.setAttribute('readonly', true);
                            }
                        }
                    }
                }
            }

        };

        function isReturnFormValid() {
            var btn = getSubmitButton("Add Return");
            if (!btn) {
                return;
            }

            if (!select_returnForm) {
                btn.disabled = true;
                return;
            }

            if (select_returnForm.value === "?") {
                btn.disabled = true;
                select_returnForm.classList.add("selectInvalid");
                addInvalidityText("Reason category is mandatory field");
                return;
            }
            else {
                select_returnForm.classList.remove("selectInvalid");
                addInvalidityText("");
            }

            // if (!isNum(input_returnForm.value) || parseInt(input_returnForm.value) <= 0
            //     || parseInt(input_returnForm.value) != allowedQuantity) {
            //     // btn.disabled = true;
            //     // addInvalidityText("Return quantity must be equal to ordered quantity");
            //     // return;
            // }
            // else {
            //     addInvalidityText("");
            // }

            btn.disabled = false;
        }

        function isResendFormValid() {
            var btn = getSubmitButton("Add Resend");
            if (!btn) {
                return;
            }

            if (!select_resendForm || !input_resendForm) {
                btn.disabled = true;
                return;
            }

            if (select_resendForm.value === "?") {
                btn.disabled = true;
                select_resendForm.classList.add("selectInvalid");
                addInvalidityText("Reason category is mandatory field");
                return;
            }
            else {
                select_resendForm.classList.remove("selectInvalid");
                addInvalidityText("");
            }

            // if (!isNum(input_resendForm.value) || parseInt(input_resendForm.value) <= 0
            //     || parseInt(input_resendForm.value) > allowedQuantity) {
            //     btn.disabled = true;
            //     addInvalidityText("Resend quantity must be equal to ordered quantity");
            //     return;
            // }
            // else {
            //     addInvalidityText("");
            // }

            btn.disabled = false;
        }

        function addInvalidityText(text) {
            let iTag = document.getElementById("custom-invalidity-text");
            if (iTag) {
                var textNode = document.createTextNode(text);
                iTag.innerHTML = "";
                iTag.appendChild(textNode);
            }
        }

        function isNum(str) {
            return /^\d+$/.test(str);
        }

        function getSubmitButton(text) {
            var btnsDiv = document.getElementsByClassName("buttons")[1];
            if (btnsDiv) {
                var buttons = btnsDiv.getElementsByTagName("button");
                if (buttons) {
                    for (var i = 0; i < buttons.length; i++) {
                        if (buttons[i].firstChild.nodeValue === text) {
                            return buttons[i];
                        }
                    }
                }
            }
        }

        var style = document.createElement('style');
        style.innerHTML = '.selectInvalid { color: #b94a48!important; border-color: #b94a48!important; }';
        document.getElementsByTagName('head')[0].appendChild(style);

        const observer = new MutationObserver(callback);

        const session = JSON.parse(window.localStorage.getItem("SPA_auth_session"));
        const admin = session.superAdmin;
        const access_token = window.localStorage.getItem("access_token");

        const groups = JSON.parse(getGroups(access_token, session));

        let userGroupName = '';
        let permissions = [];

        for (const group of groups) {
            const groupUsers = JSON.parse(getGroupUsers(group.GroupId, access_token, session));
            if (groupUsers.map(x => x.UserId).includes(session.sessionUserId)) {
                userGroupName = group.GroupName;
                const groupPermissions = JSON.parse(getPermissions(userGroupName, session.token));
                console.log(userGroupName);
                console.log(groupPermissions);
                permissions = [...permissions, ...groupPermissions]
            }
        }
        console.log(permissions);

        setTimeout(function () {
            const targetNode = document.getElementsByTagName("body")[0];
            observer.observe(targetNode, config);
        }, 2000);
    });

    function getGroups(token, session) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", `${session.server}/api/permissions/getGroups`, false);
        xmlHttp.setRequestHeader('Authorization', `Bearer ${token}`);
        xmlHttp.send(null);
        return xmlHttp.responseText;
    }

    function getGroupUsers(groupId, token, session) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", `${session.server}/api/permissions/getGroupUsers?groupId=${groupId}`, false);
        xmlHttp.setRequestHeader('Authorization', `Bearer ${token}`);
        xmlHttp.send(null);
        return xmlHttp.responseText;
    }

    function getPermissions(groupName, token) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", "https://linnworks-apps.brainence.info/api/getGroupConfiguration?groupName=" + groupName, false);
        xmlHttp.setRequestHeader('Authorization', token);
        xmlHttp.send(null);
        return xmlHttp.responseText;
    }
});
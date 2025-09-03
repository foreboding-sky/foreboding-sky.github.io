"use strict";

const descriptionActions = [
    "Improve writing",
    "Fix spelling and grammar",
    "Make longer",
    "Make shorter",
    "Simplify writing",
    "Custom prompt"
];

// Wait for DOM ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectAIDescriptionControls);
} else {
    injectAIDescriptionControls();
}

function injectAIDescriptionControls() {
    // Helper to find the correct injection point: form inside DescriptionEditorView
    function findDescriptionEditorFormGroup() {
        const view = document.querySelector("div[ng-controller='DescriptionEditorView']");
        if (!view) return null;
        const form = view.querySelector("form.form-horizontal.ng-pristine.ng-valid");
        if (!form) return null;
        const group = form.querySelector("div.control-group");
        return group || null;
    }

    // Try to inject immediately, or observe for later
    function tryInject() {
        const controlGroup = findDescriptionEditorFormGroup();
        if (controlGroup && !controlGroup.parentNode.querySelector("#ai-description-helper-group")) {
            // Group stylings
            const groupDiv = document.createElement("div");
            groupDiv.id = "ai-description-helper-group";
            groupDiv.style.display = "flex";
            groupDiv.style.flexDirection = "column";
            groupDiv.style.alignItems = "stretch";
            groupDiv.style.marginTop = "8px";

            // Dropdown
            const select = document.createElement("select");
            select.id = "ai-description-action";
            select.className = "form-control input-sm";
            select.style.width = "175px";
            select.style.minWidth = "175px";
            select.style.maxWidth = "175px";
            select.style.flex = "none";
            for (const action of descriptionActions) {
                const option = document.createElement("option");
                option.value = action;
                option.textContent = action;
                select.appendChild(option);
            }

            // Custom prompt input (hidden by default)
            const customPromptInput = document.createElement("input");
            customPromptInput.style.display = "none";
            customPromptInput.type = "text";
            customPromptInput.id = "ai-custom-prompt";
            customPromptInput.className = "form-control input-sm";
            customPromptInput.style.marginLeft = "8px";
            customPromptInput.placeholder = "Enter your custom prompt...";
            customPromptInput.style.width = "100%";

            // Create button 
            const button = document.createElement("button");
            button.id = "ai-description-btn";
            button.className = "btn btn-primary btn-sm";
            button.type = "button";
            button.textContent = "AI Rewrite";
            button.style.width = "auto";
            button.style.marginLeft = "8px";
            button.style.padding = "2px 10px";
            button.style.fontSize = "13px";
            button.style.flex = "none";

            // layout
            const row = document.createElement("div");
            row.style.display = "flex";
            row.style.flexDirection = "row";
            row.style.alignItems = "center";
            row.style.width = "100%";
            select.style.flex = "none";
            customPromptInput.style.flex = "1 1 0%";
            button.style.flex = "none";
            row.appendChild(select);
            row.appendChild(button);

            // Show/hide custom prompt input and move button
            select.addEventListener("change", function () {
                if (select.value === "Custom prompt") {
                    if (!row.contains(customPromptInput)) {
                        row.insertBefore(customPromptInput, button);
                    }
                    customPromptInput.style.display = "block";
                } else {
                    if (row.contains(customPromptInput)) {
                        row.removeChild(customPromptInput);
                    }
                    customPromptInput.style.display = "none";
                }
            });

            // Initial state: button in row, custom prompt hidden
            customPromptInput.style.display = "none";
            if (row.contains(customPromptInput)) {
                row.removeChild(customPromptInput);
            }

            // Button click handler
            button.addEventListener("click", async function () {
                const selectedAction = select.value;
                const originalHtml = button.innerHTML;
                button.disabled = true;
                button.innerHTML = '<span class="fa fa-spinner fa-spin"></span> AI Rewrite';
                try {
                    const body = getDescriptionEditorIframeBody();
                    if (!body) throw new Error("Could not find description editor.");
                    const descriptionText = body.innerText || body.textContent || "";
                    if (!descriptionText.trim()) throw new Error("Description is empty.");
                    let newDescription;
                    // Try to get $scope from Angular context if available
                    let $scope = null;
                    try {
                        const view = document.querySelector("div[ng-controller='DescriptionEditorView']");
                        if (view && window.angular && window.angular.element) {
                            $scope = window.angular.element(view).scope();
                        }
                    } catch (e) { $scope = null; }
                    if (selectedAction === "Custom prompt") {
                        const customPrompt = customPromptInput.value.trim();
                        if (!customPrompt) throw new Error("Custom prompt is empty.");
                        newDescription = await modifyDescriptionWithAI(descriptionText, selectedAction, undefined, customPrompt, $scope);
                    } else {
                        newDescription = await modifyDescriptionWithAI(descriptionText, selectedAction, undefined, undefined, $scope);
                    }
                    setDescriptionHtml(`<p>${newDescription.replace(/\n/g, "<br>")}</p>`);
                } catch (err) {
                    alert("AI Description Error: " + err.message);
                } finally {
                    button.disabled = false;
                    button.innerHTML = originalHtml;
                }
            });

            // Add controls to group (single row)
            groupDiv.appendChild(row);

            // Insert after the first control-group
            if (controlGroup.nextSibling) {
                controlGroup.parentNode.insertBefore(groupDiv, controlGroup.nextSibling);
            } else {
                controlGroup.parentNode.appendChild(groupDiv);
            }
        }
    }

    tryInject();

    // Observe for dynamic view changes (only in legacy-windows-container)
    setTimeout(function () {
        const targetNode = document.getElementsByClassName("legacy-windows-container")[0];
        if (targetNode) {
            const observer = new MutationObserver(tryInject);
            observer.observe(targetNode, { childList: true, subtree: true });
        }
    }, 2000);
}

// Accept vmOrScope as an optional last argument
async function modifyDescriptionWithAI(itemDescription, action, openAIApiKey, customPrompt, vmOrScope) {
    if (!window.Services || !window.Services.MacroService) {
        throw new Error("MacroService is not available in the global scope.");
    }
    const prompts = {
        "Improve writing": `Improve writing for this line: ${itemDescription}`,
        "Fix spelling and grammar": `Fix spelling and grammar for this line: ${itemDescription}`,
        "Make longer": `Make this line longer: ${itemDescription}`,
        "Make shorter": `Make this line shorter: ${itemDescription}`,
        "Simplify writing": `Simplify writing for this line: ${itemDescription}`
    };
    let prompt;
    if (action === "Custom prompt" && customPrompt) {
        prompt = customPrompt;
    } else {
        prompt = prompts[action] || prompts["Improve writing"];
    }
    return new Promise((resolve, reject) => {
        // Use vmOrScope if provided, otherwise undefined
        const macroService = new window.Services.MacroService(vmOrScope);
        macroService.Run({
            applicationName: "AIDescriptionHelper",
            macroName: "AIDescriptionHelper",
            prompt: prompt
        }, function (result) {
            console.log(result.result);
            if (result && result.result && !result.result.IsError) {
                resolve(result.result.trim());
            } else if (result && result.result && result.result.IsError) {
                reject(new Error(result.result.ErrorMessage || "AIDescriptionHelper macro error"));
            } else if (result && result.error) {
                reject(new Error(result.error));
            } else {
                reject(new Error("Unknown error from AIDescriptionHelper macro"));
            }
        });
    });
}

// Finds the <body> element inside the description editor's iframe.
function getDescriptionEditorIframeBody() {
    const iframe = document.querySelector(
        'div.tabset div.tab-content div.tab-pane.position-relative.active ' +
        'div.mce-tinymce.mce-container.mce-panel ' +
        'div.mce-container-body.mce-stack-layout ' +
        'div.mce-edit-area.mce-container.mce-panel.mce-stack-layout-item ' +
        'iframe'
    );
    if (!iframe) return null;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    if (!iframeDoc) return null;
    return iframeDoc.body;
}

//Gets the description as HTML from the editor.
function getDescriptionHtml() {
    const body = getDescriptionEditorIframeBody();
    return body ? body.innerHTML : null;
}

// Sets the description as HTML in the editor.
function setDescriptionHtml(html) {
    const body = getDescriptionEditorIframeBody();
    if (body) {
        body.innerHTML = html;
        // Focus to make component active
        body.focus();
        // Dispatch input event to notify the editor of the text change
        const event = new Event('input', { bubbles: true });
        body.dispatchEvent(event);
    }
}
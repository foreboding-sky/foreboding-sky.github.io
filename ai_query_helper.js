"use strict";

// Inject AI SQL helper when the "Custom script" editor is active

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectAIQueryControls);
} else {
    injectAIQueryControls();
}

function injectAIQueryControls() {
    function normalize(text) {
        return (text || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function isCustomScriptSelected() {
        const span = document.querySelector('span[ng-bind-html="$ctrl.selectedItemText"]');
        if (!span) return false;
        const text = (span.textContent || span.innerText || "").trim();
        return text === "<< Custom Script >>";
    }

    function isCustomScriptPresent() {
        const controlGroups = Array.from(document.querySelectorAll("div.control-group"));
        const hasLabel = controlGroups.some(group => {
            const label = group.querySelector("label.control-label, label.control-label.capitalize");
            if (!label) return false;
            const text = normalize(label.textContent);
            return text === "custom script:";
        });
        const hasQueryScript = !!document.querySelector("div.query-script.ace_editor");
        const isSelected = isCustomScriptSelected();
        return (hasLabel || hasQueryScript) && isSelected;
    }

    function findInjectionPoint() {
        const groups = Array.from(document.querySelectorAll("div.control-group"));
        for (const group of groups) {
            const label = group.querySelector("label.control-label, label.control-label.capitalize");
            if (!label) continue;
            const text = normalize(label.textContent);
            if (text === "custom script:") {
                return { parent: group.parentNode, refNode: group.nextSibling };
            }
        }
        const scriptContainer = document.querySelector("div.query-script.ace_editor");
        if (scriptContainer && scriptContainer.parentNode) {
            return { parent: scriptContainer.parentNode, refNode: scriptContainer };
        }
        return null;
    }

    function buildControls() {
        // Container
        const groupDiv = document.createElement("div");
        groupDiv.id = "ai-query-helper-group";
        groupDiv.style.display = "flex";
        groupDiv.style.flexDirection = "column";
        groupDiv.style.alignItems = "stretch";
        groupDiv.style.marginTop = "8px";

        // Row layout
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.flexDirection = "row";
        row.style.alignItems = "center";
        row.style.width = "100%";

        // User input
        const input = document.createElement("input");
        input.type = "text";
        input.id = "ai-query-input";
        input.className = "form-control input-sm";
        input.style.marginLeft = "180px";
        input.placeholder = "Enter prompt for SQL";
        input.style.flex = "1 1 0%";

        const button = document.createElement("button");
        button.id = "ai-query-btn";
        button.className = "btn btn-primary btn-sm";
        button.type = "button";
        button.textContent = "AI Generate";
        button.style.width = "auto";
        button.style.marginLeft = "8px";
        button.style.padding = "2px 10px";
        button.style.fontSize = "13px";
        button.style.flex = "none";

        button.addEventListener("click", async function () {
            const inputEl = document.getElementById("ai-query-input");
            const prompt = (inputEl && inputEl.value ? inputEl.value : "").trim();
            if (!prompt) {
                alert("Please enter a prompt for SQL.");
                return;
            }
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = "Running...";
            try {
                let $scope = null;
                try {
                    const root = document.querySelector('div.well.QueryData') || document.querySelector('[ng-controller="QueryDataModule"]');
                    if (root && window.angular && window.angular.element) {
                        $scope = window.angular.element(root).scope();
                    }
                } catch (e) { $scope = null; }
                const result = await runAiQueryWithMacro(prompt, $scope);
                console.log(result);
            } catch (err) {
                console.error("AI Query Error:", err);
                alert("AI Query Error: " + (err && err.message ? err.message : String(err)));
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });

        row.appendChild(input);
        row.appendChild(button);
        groupDiv.appendChild(row);

        return groupDiv;
    }

    function tryInject() {
        const existing = document.getElementById("ai-query-helper-group");
        if (!isCustomScriptPresent()) {
            if (existing && existing.parentNode) {
                existing.parentNode.removeChild(existing);
            }
            return;
        }
        if (existing) return;
        const insertion = findInjectionPoint();
        if (!insertion) return;
        const controls = buildControls();
        if (insertion.refNode) {
            insertion.parent.insertBefore(controls, insertion.refNode);
        } else {
            insertion.parent.appendChild(controls);
        }
    }

    tryInject();
    setTimeout(function () {
        tryInject();
    }, 800);
    window.addEventListener("load", function () {
        tryInject();
    });

    setTimeout(function () {
        let moduleObserver = null;
        let currentModuleRoot = null;

        function startObservingModule(root) {
            if (!root) return;
            if (moduleObserver) return;
            currentModuleRoot = root;
            moduleObserver = new MutationObserver(function () {
                tryInject();
                if (!document.contains(currentModuleRoot)) {
                    stopObservingModule();
                }
            });
            moduleObserver.observe(root, { childList: true, subtree: true, characterData: true, attributes: true });
            tryInject();
        }

        function stopObservingModule() {
            if (moduleObserver) {
                moduleObserver.disconnect();
                moduleObserver = null;
                currentModuleRoot = null;
            }
        }

        setInterval(function () {
            const root = document.querySelector('div.well.QueryData') || document.querySelector('[ng-controller="QueryDataModule"]');
            if (!!root) {
                if (!moduleObserver) {
                    startObservingModule(root);
                } else if (currentModuleRoot && !document.contains(currentModuleRoot)) {
                    stopObservingModule();
                    startObservingModule(root);
                }
            } else {
                stopObservingModule();
            }
        }, 1000);
    }, 500);
}

// Minimal helper to call the AiQueryHelper macro and return its raw result string
async function runAiQueryWithMacro(prompt, vmOrScope) {
    if (!window.Services || !window.Services.MacroService) {
        throw new Error("MacroService is not available in the global scope.");
    }
    return new Promise((resolve, reject) => {
        const macroService = new window.Services.MacroService(vmOrScope);
        macroService.Run({
            applicationName: "PluggableTestAndrii",
            macroName: "AiQueryHelper",
            prompt: prompt
        }, function (result) {
            // Mirror handling pattern used in ai_description_helper.js
            if (result && result.result && !result.result.IsError) {
                resolve(result.result.trim ? result.result.trim() : result.result);
            } else if (result && result.result && result.result.IsError) {
                reject(new Error(result.result.ErrorMessage || "AiQueryHelper macro error"));
            } else if (result && result.error) {
                reject(new Error(result.error));
            } else {
                reject(new Error("Unknown error from AiQueryHelper macro"));
            }
        });
    });
}
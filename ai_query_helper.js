"use strict";

// Inject an AI SQL helper only when a "Custom script" editor is present
// Detection (both):
// - Label text "Custom script:" or presence of `.query-script.ace_editor`
// - Dropdown selected text equals `<< Custom Script >>`

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

        // Dummy input
        const input = document.createElement("input");
        input.type = "text";
        input.id = "ai-query-dummy-input";
        input.className = "form-control input-sm";
        input.placeholder = "Enter prompt for SQL (dummy)";
        input.style.flex = "1 1 0%";

        // Dummy button
        const button = document.createElement("button");
        button.id = "ai-query-dummy-btn";
        button.className = "btn btn-primary btn-sm";
        button.type = "button";
        button.textContent = "AI Generate";
        button.style.width = "auto";
        button.style.marginLeft = "8px";
        button.style.padding = "2px 10px";
        button.style.fontSize = "13px";
        button.style.flex = "none";

        button.addEventListener("click", function () { });

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

    // Attempt immediate injection + delayed passes to wait for Angular render
    tryInject();
    setTimeout(function () {
        tryInject();
    }, 800);
    window.addEventListener("load", function () {
        tryInject();
    });

    // Poll once per second for module root and observe it when present
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
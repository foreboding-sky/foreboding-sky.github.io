"use strict";

// Inject a dummy AI SQL helper only when a "Custom script" editor is present
// Detection methods:
// 1) A control-group label with text "Custom script:"
// 2) An element with lw-tst="CustomScript"

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
        // Method 3: dropdown selected text equals "<< Custom Script >>"
        const span = document.querySelector('span[ng-bind-html="$ctrl.selectedItemText"]');
        console.log("AI Query Helper - Checking dropdown span:", span);
        if (!span) {
            console.log("AI Query Helper - No dropdown span found");
            return false;
        }
        const text = (span.textContent || span.innerText || "").trim();
        console.log("AI Query Helper - Dropdown text:", text);
        const isCustom = text === "<< Custom Script >>";
        console.log("AI Query Helper - Is custom script selected:", isCustom);
        return isCustom;
    }

    function isCustomScriptPresent() {
        console.log("AI Query Helper - Checking if custom script is present...");

        // Method 1: label says "Custom script:" exactly
        const controlGroups = Array.from(document.querySelectorAll("div.control-group"));
        console.log("AI Query Helper - Found control groups:", controlGroups.length);

        const hasLabel = controlGroups.some(group => {
            const label = group.querySelector("label.control-label, label.control-label.capitalize");
            if (!label) return false;
            const text = normalize(label.textContent);
            console.log("AI Query Helper - Label text:", text);
            return text === "custom script:";
        });
        console.log("AI Query Helper - Has custom script label:", hasLabel);

        // Method 2: stable container for the ace editor
        const queryScript = document.querySelector("div.query-script.ace_editor");
        const hasQueryScript = !!queryScript;
        console.log("AI Query Helper - Found query-script editor:", hasQueryScript, queryScript);

        // Check dropdown selection
        const isSelected = isCustomScriptSelected();

        // Only inject when selection indicates custom script (defensive)
        const shouldInject = (hasLabel || hasQueryScript) && isSelected;
        console.log("AI Query Helper - Should inject:", shouldInject, "(hasLabel:", hasLabel, "hasQueryScript:", hasQueryScript, "isSelected:", isSelected, ")");
        return shouldInject;
    }

    function findInjectionPoint() {
        console.log("AI Query Helper - Finding injection point...");

        // Prefer inserting after the control-group that has the "Custom script:" label
        const groups = Array.from(document.querySelectorAll("div.control-group"));
        console.log("AI Query Helper - Checking", groups.length, "control groups for injection point");

        for (const group of groups) {
            const label = group.querySelector("label.control-label, label.control-label.capitalize");
            if (!label) continue;
            const text = normalize(label.textContent);
            console.log("AI Query Helper - Checking label text:", text);
            if (text === "custom script:") {
                console.log("AI Query Helper - Found custom script control group, will inject after it");
                return { parent: group.parentNode, refNode: group.nextSibling };
            }
        }

        // Fallback: insert right before the custom script editor if present
        const scriptContainer = document.querySelector("div.query-script.ace_editor");
        console.log("AI Query Helper - Fallback: checking for query-script editor:", scriptContainer);
        if (scriptContainer && scriptContainer.parentNode) {
            console.log("AI Query Helper - Found query-script editor, will inject before it");
            return { parent: scriptContainer.parentNode, refNode: scriptContainer };
        }

        console.log("AI Query Helper - No injection point found");
        return null;
    }

    function buildControls() {
        console.log("AI Query Helper - Building controls...");

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

        button.addEventListener("click", function () {
            // Dummy behavior for now
            console.log("AI Query Helper (dummy):", input.value);
        });

        row.appendChild(input);
        row.appendChild(button);
        groupDiv.appendChild(row);

        console.log("AI Query Helper - Controls built successfully");
        return groupDiv;
    }

    function tryInject() {
        console.log("AI Query Helper - tryInject called");

        const existing = document.getElementById("ai-query-helper-group");
        console.log("AI Query Helper - Existing controls found:", !!existing);

        // Only keep controls if present and selected is Custom Script
        if (!isCustomScriptPresent()) {
            console.log("AI Query Helper - Custom script not present, removing existing controls if any");
            if (existing && existing.parentNode) {
                existing.parentNode.removeChild(existing);
                console.log("AI Query Helper - Removed existing controls");
            }
            return;
        }

        if (existing) {
            console.log("AI Query Helper - Controls already exist, skipping injection");
            return;
        }

        console.log("AI Query Helper - Attempting to inject controls...");
        const insertion = findInjectionPoint();
        if (!insertion) {
            console.log("AI Query Helper - No injection point found, aborting");
            return;
        }

        const controls = buildControls();
        if (insertion.refNode) {
            insertion.parent.insertBefore(controls, insertion.refNode);
            console.log("AI Query Helper - Controls injected before reference node");
        } else {
            insertion.parent.appendChild(controls);
            console.log("AI Query Helper - Controls appended to parent");
        }
    }

    // Attempt immediate injection + delayed passes to wait for Angular render
    console.log("AI Query Helper - Starting injection process...");
    tryInject();
    setTimeout(function () {
        console.log("AI Query Helper - Delayed tryInject after initial load");
        tryInject();
    }, 800);
    window.addEventListener("load", function () {
        console.log("AI Query Helper - Window load fired, trying injection");
        tryInject();
    });

    // Observe for dynamic content changes (like tab switches or parameter changes)
    setTimeout(function () {
        console.log("AI Query Helper - Setting up mutation observers...");
        let moduleRoot = document.querySelector('div.well.QueryData') || document.querySelector('[ng-controller="QueryDataModule"]');
        let observingModuleRoot = false;

        // Always start with body observer as a catch-all
        const bodyTarget = document.body;
        const bodyObserver = new MutationObserver(function () {
            // Try injecting on any DOM change
            tryInject();
            // If module root appears later, swap to moduleRoot observer once
            if (!observingModuleRoot) {
                moduleRoot = document.querySelector('div.well.QueryData') || document.querySelector('[ng-controller="QueryDataModule"]');
                if (moduleRoot) {
                    console.log("AI Query Helper - Module root appeared; switching observer to module root");
                    observingModuleRoot = true;
                    const moduleObserver = new MutationObserver(function () {
                        tryInject();
                    });
                    moduleObserver.observe(moduleRoot, { childList: true, subtree: true, characterData: true, attributes: true });
                    // Keep body observer as a fallback, but it will be mostly idle
                }
            }
        });
        if (bodyTarget) {
            bodyObserver.observe(bodyTarget, { childList: true, subtree: true, characterData: true, attributes: true });
            console.log("AI Query Helper - Body observer started");
        }

        // Proactive polling for module root for up to ~15s
        let pollAttempts = 0;
        const maxPollAttempts = 50; // ~15s at 300ms
        const pollInterval = setInterval(function () {
            if (observingModuleRoot) { clearInterval(pollInterval); return; }
            moduleRoot = document.querySelector('div.well.QueryData') || document.querySelector('[ng-controller="QueryDataModule"]');
            pollAttempts++;
            console.log("AI Query Helper - Polling for module root (attempt", pollAttempts, "):", !!moduleRoot);
            if (moduleRoot) {
                console.log("AI Query Helper - Module root found by polling; running tryInject and continuing with observers");
                tryInject();
                observingModuleRoot = true;
                const moduleObserver = new MutationObserver(function () {
                    tryInject();
                });
                moduleObserver.observe(moduleRoot, { childList: true, subtree: true, characterData: true, attributes: true });
                clearInterval(pollInterval);
            } else if (pollAttempts >= maxPollAttempts) {
                console.warn("AI Query Helper - Module root not found after polling; relying on body observer only");
                clearInterval(pollInterval);
            }
        }, 300);
    }, 500);
}
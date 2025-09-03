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
    function isCustomScriptPresent() {
        // Method 1: label says "Custom script:"
        const controlGroups = Array.from(document.querySelectorAll("div.control-group"));
        const hasLabel = controlGroups.some(group => {
            const label = group.querySelector("label.control-label");
            if (!label) return false;
            const text = (label.textContent || "").trim().toLowerCase();
            return text.startsWith("custom script:");
        });

        // Method 2: element with lw-tst="CustomScript"
        const hasAce = !!document.querySelector('[lw-tst="CustomScript"]');

        return hasLabel || hasAce;
    }

    function findInjectionPoint() {
        // Prefer inserting after the control-group that has the "Custom script:" label
        const groups = Array.from(document.querySelectorAll("div.control-group"));
        for (const group of groups) {
            const label = group.querySelector("label.control-label");
            if (!label) continue;
            const text = (label.textContent || "").trim().toLowerCase();
            if (text.startsWith("custom script:")) {
                return { parent: group.parentNode, refNode: group.nextSibling };
            }
        }
        // Fallback: insert right before the custom script editor if present
        const aceContainer = document.querySelector('[lw-tst="CustomScript"]');
        if (aceContainer && aceContainer.parentNode) {
            return { parent: aceContainer.parentNode, refNode: aceContainer };
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

        button.addEventListener("click", function () {
            // Dummy behavior for now
            console.log("AI Query Helper (dummy):", input.value);
        });

        row.appendChild(input);
        row.appendChild(button);
        groupDiv.appendChild(row);
        return groupDiv;
    }

    function tryInject() {
        // Only inject if the custom script UI is present
        if (!isCustomScriptPresent()) return;
        if (document.getElementById("ai-query-helper-group")) return;

        const insertion = findInjectionPoint();
        if (!insertion) return;

        const controls = buildControls();
        if (insertion.refNode) {
            insertion.parent.insertBefore(controls, insertion.refNode);
        } else {
            insertion.parent.appendChild(controls);
        }
    }

    // Attempt immediate injection
    tryInject();

    // Observe for dynamic content changes (like tab switches or parameter changes)
    setTimeout(function () {
        const target = document.querySelector(".legacy-windows-container") || document.body;
        if (!target) return;
        const observer = new MutationObserver(function () {
            tryInject();
        });
        observer.observe(target, { childList: true, subtree: true });
    }, 500);
}
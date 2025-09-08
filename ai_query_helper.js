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
            if (!window.Services || !window.Services.MacroService) {
                alert("MacroService is not available on this page.");
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
                setQueryScriptValue(result);
            } catch (err) {
                const message = (err && err.message) ? err.message : String(err);
                alert("AI Query Error: " + message);
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

// Attempts to set the SQL into the Custom Script Ace editor
function setQueryScriptValue(text) {
    try {
        const editor = getQueryAceEditor();
        if (editor) {
            editor.setValue(text || "", -1);
            editor.focus();
            return true;
        }
    } catch (_) { }
    try {
        const container = document.querySelector("div.query-script.ace_editor");
        if (!container) return false;
        const ta = container.querySelector("textarea.ace_text-input");
        if (ta) {
            ta.value = text || "";
            ta.dispatchEvent(new Event("input", { bubbles: true }));
            ta.dispatchEvent(new Event("change", { bubbles: true }));
            ta.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
            return true;
        }
        return false;
    } catch (_) {
        return false;
    }
}

function getQueryAceEditor() {
    try {
        const container = document.querySelector("div.query-script.ace_editor");
        if (!container || !window.ace || !window.ace.edit) return null;
        return window.ace.edit(container);
    } catch (_) {
        return null;
    }
}

// Minimal helper to call the AIQueryHelper macro and return its raw result string
async function runAiQueryWithMacro(prompt, vmOrScope) {
    if (!window.Services || !window.Services.MacroService) {
        throw new Error("MacroService is not available in the global scope.");
    }
    const payload = {
        applicationName: "PlugDevApp",
        macroName: "AIQueryHelper",
        prompt: prompt
    };
    return runMacroOnce(payload, vmOrScope);
}

function runMacroOnce(payload, vmOrScope) {
    return new Promise((resolve, reject) => {
        const macroService = new window.Services.MacroService(vmOrScope);
        macroService.Run(payload, function (result) {
            console.log("AIQueryHelper raw result:", result);
            if (result && result.result && !result.result.IsError) {
                const value = result.result.trim ? result.result.trim() : result.result;
                resolve(value);
            } else if (result && result.result && result.result.IsError) {
                const message = result.result.ErrorMessage || "AIQueryHelper macro error";
                reject(new Error(message));
            } else if (result && result.error) {
                try {
                    reject(new Error(typeof result.error === "string" ? result.error : JSON.stringify(result.error)));
                } catch (_) {
                    reject(new Error("Unknown error from AIQueryHelper macro"));
                }
            } else {
                reject(new Error("Unknown error from AIQueryHelper macro"));
            }
        });
    });
}
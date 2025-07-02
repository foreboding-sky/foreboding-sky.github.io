"use strict";

const descriptionActions = [
    "Improve writing",
    "Fix spelling and grammar",
    "Make longer",
    "Make shorter",
    "Simplify writing"
];

// Wait for DOM ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectAIDescriptionControls);
} else {
    injectAIDescriptionControls();
}

function injectAIDescriptionControls() {
    // Helper to find the correct injection point (like placeholderChannelDescriptions.js)
    function findDescriptionEditorButtons() {
        // Look for the .buttons inside the DescriptionEditorView controller
        const containers = document.querySelectorAll("div[ng-controller='DescriptionEditorView'] .buttons");
        return containers.length > 0 ? containers[0] : null;
    }

    // Try to inject immediately, or observe for later
    function tryInject() {
        const buttonsDiv = findDescriptionEditorButtons();
        if (buttonsDiv && !buttonsDiv.querySelector("#ai-description-helper-group")) {
            // Group stylings
            const groupDiv = document.createElement("div");
            groupDiv.id = "ai-description-helper-group";
            groupDiv.style.display = "flex";
            groupDiv.style.flexDirection = "row";
            groupDiv.style.alignItems = "left";
            groupDiv.style.marginTop = "8px";

            // Temporary create API key input
            const apiKeyInput = document.createElement("input");
            apiKeyInput.id = "ai-openai-key";
            apiKeyInput.className = "form-control input-sm";
            apiKeyInput.placeholder = "OpenAI API Key";
            apiKeyInput.style.width = "100%";

            // Create dropdown
            const select = document.createElement("select");
            select.id = "ai-description-action";
            select.className = "form-control input-sm";
            select.style.marginLeft = "8px";
            select.style.width = "175px";
            select.style.minWidth = "175px";
            select.style.maxWidth = "175px";
            for (const action of descriptionActions) {
                const option = document.createElement("option");
                option.value = action;
                option.textContent = action;
                select.appendChild(option);
            }

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

            // Button click handler
            button.addEventListener("click", async function () {
                const selectedAction = select.value;
                const userApiKey = apiKeyInput.value.trim();
                const originalHtml = button.innerHTML;
                button.disabled = true;
                button.innerHTML = '<span class="fa fa-spinner fa-spin"></span> AI Rewrite';
                try {
                    const body = getDescriptionEditorIframeBody();
                    if (!body) throw new Error("Could not find description editor.");
                    const descriptionText = body.innerText || body.textContent || "";
                    if (!descriptionText.trim()) throw new Error("Description is empty.");
                    const newDescription = await modifyDescriptionWithAI(descriptionText, selectedAction, userApiKey || undefined);
                    setDescriptionHtml(`<p>${newDescription.replace(/\n/g, "<br>")}</p>`);
                } catch (err) {
                    alert("AI Description Error: " + err.message);
                } finally {
                    button.disabled = false;
                    button.innerHTML = originalHtml;
                }
            });

            // Add controls to group
            groupDiv.appendChild(apiKeyInput);
            groupDiv.appendChild(select);
            groupDiv.appendChild(button);
            buttonsDiv.prepend(groupDiv);
        }
    }

    // Try once in case already present
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

async function modifyDescriptionWithAI(itemDescription, action, openAIApiKey) {
    if (!openAIApiKey) throw new Error("OpenAI API key is required.");
    const apiKey = openAIApiKey;
    const prompts = {
        "Improve writing": `Improve writing for this line: ${itemDescription}`,
        "Fix spelling and grammar": `Fix spelling and grammar for this line: ${itemDescription}`,
        "Make longer": `Make this line longer: ${itemDescription}`,
        "Make shorter": `Make this line shorter: ${itemDescription}`,
        "Simplify writing": `Simplify writing for this line: ${itemDescription}`
    };
    const prompt = prompts[action] || prompts["Improve writing"];
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo-0125", // o3-mini model
            messages: [
                { role: "system", content: "You are a helpful assistant. Only return the modified description, with no extra explanation or text." },
                { role: "user", content: prompt }
            ],
            max_tokens: 256,
            temperature: 0.7
        })
    });
    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
    }
    const data = await response.json();
    return data.choices[0].message.content.trim();
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
    if (body) body.innerHTML = html;
}
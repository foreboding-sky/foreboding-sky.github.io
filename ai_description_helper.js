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
    // Helper to find the .control-group area in the content section
    function findContentControlGroup() {
        // Find the form inside .content
        const form = document.querySelector('.content > form.form-horizontal.ng-pristine.ng-valid');
        if (!form) return null;
        // Find the first .control-group inside the form
        const group = form.querySelector('div.control-group');
        return group || null;
    }

    // Try to inject immediately, or observe for later
    function tryInject() {
        const contentDiv = findContentControlGroup();
        if (contentDiv && !contentDiv.querySelector("#ai-description-helper-group")) {
            // Add controls directly to the existing .control-group
            const groupDiv = document.createElement("div");
            groupDiv.id = "ai-description-helper-group";
            groupDiv.style.display = "flex";
            groupDiv.style.flexDirection = "column";
            groupDiv.style.alignItems = "flex-start";
            groupDiv.style.gap = "8px";

            // Create API key input (full width)
            const apiKeyInput = document.createElement("input");
            apiKeyInput.type = "password";
            apiKeyInput.id = "ai-openai-key";
            apiKeyInput.className = "form-control input-sm";
            apiKeyInput.placeholder = "OpenAI API Key (optional)";
            apiKeyInput.style.width = "100%";

            // Create dropdown (full width)
            const select = document.createElement("select");
            select.id = "ai-description-action";
            select.className = "form-control input-sm";
            select.style.width = "100%";
            for (const action of descriptionActions) {
                const option = document.createElement("option");
                option.value = action;
                option.textContent = action;
                select.appendChild(option);
            }

            // Create button (full width)
            const button = document.createElement("button");
            button.id = "ai-description-btn";
            button.className = "btn btn-primary btn-sm";
            button.type = "button";
            button.textContent = "AI Rewrite";
            button.style.width = "100%";

            // Button click handler (use input value if present)
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

            // Add controls to group (input, then dropdown, then button)
            groupDiv.appendChild(apiKeyInput);
            groupDiv.appendChild(select);
            groupDiv.appendChild(button);

            // Inject into the existing .control-group
            contentDiv.appendChild(groupDiv);
        }
    }

    // Try once in case already present
    tryInject();

    // Observe for dynamic view changes
    const observer = new MutationObserver(tryInject);
    observer.observe(document.body, { childList: true, subtree: true });
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

// --- Text Editor Iframe Helpers ---

/**
 * Finds the <body> element inside the description editor's iframe.
 * @returns {HTMLElement|null}
 */
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

/**
 * Gets the description as HTML from the editor.
 * @returns {string|null}
 */
function getDescriptionHtml() {
    const body = getDescriptionEditorIframeBody();
    return body ? body.innerHTML : null;
}

/**
 * Sets the description as HTML in the editor.
 * @param {string} html
 */
function setDescriptionHtml(html) {
    const body = getDescriptionEditorIframeBody();
    if (body) body.innerHTML = html;
}
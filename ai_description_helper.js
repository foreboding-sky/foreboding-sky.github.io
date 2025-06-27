"use strict";

const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE";
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
    // Helper to find the .buttons area in DescriptionEditorView
    function findDescriptionEditorButtons() {
        const candidates = document.querySelectorAll("div[ng-controller='DescriptionEditorView'] .buttons");
        return candidates.length ? candidates[0] : null;
    }

    // Try to inject immediately, or observe for later
    function tryInject() {
        const buttonsDiv = findDescriptionEditorButtons();
        if (buttonsDiv && !buttonsDiv.querySelector("#ai-description-action")) {
            // Create dropdown
            const select = document.createElement("select");
            select.id = "ai-description-action";
            select.className = "form-control input-sm";
            for (const action of descriptionActions) {
                const option = document.createElement("option");
                option.value = action;
                option.textContent = action;
                select.appendChild(option);
            }
            select.style.display = "inline-block";
            select.style.marginRight = "8px";

            // Create button
            const button = document.createElement("button");
            button.id = "ai-description-btn";
            button.className = "btn btn-primary btn-sm";
            button.type = "button";
            button.textContent = "AI Rewrite";

            // Button click handler
            button.addEventListener("click", async function () {
                const selectedAction = select.value;
                const originalHtml = button.innerHTML;
                button.disabled = true;
                button.innerHTML = '<span class="fa fa-spinner fa-spin"></span> AI Rewrite';
                try {
                    // Get description as plain text (strip HTML tags for AI)
                    const body = getDescriptionEditorIframeBody();
                    if (!body) throw new Error("Could not find description editor.");
                    const descriptionText = body.innerText || body.textContent || "";
                    if (!descriptionText.trim()) throw new Error("Description is empty.");
                    // Send to AI
                    const newDescription = await modifyDescriptionWithAI(descriptionText, selectedAction);
                    // Set new description as a <p> (preserve basic formatting)
                    setDescriptionHtml(`<p>${newDescription.replace(/\n/g, "<br>")}</p>`);
                } catch (err) {
                    alert("AI Description Error: " + err.message);
                } finally {
                    button.disabled = false;
                    button.innerHTML = originalHtml;
                }
            });

            // Insert controls
            buttonsDiv.prepend(button);
            buttonsDiv.prepend(select);
        }
    }

    // Try once in case already present
    tryInject();

    // Observe for dynamic view changes
    const observer = new MutationObserver(tryInject);
    observer.observe(document.body, { childList: true, subtree: true });
}

async function modifyDescriptionWithAI(itemDescription, action, openAIApiKey) {
    const apiKey = openAIApiKey || OPENAI_API_KEY;
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
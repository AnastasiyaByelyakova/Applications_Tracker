// Global references for the confirmation modal, initialized in app.js
// These variables are assumed to be declared and initialized in app.js
// and are accessed here directly from the global scope.
// let globalConfirmModal; // Removed: Declared in app.js
// let globalConfirmMessage; // Removed: Declared in app.js
// let globalConfirmYesBtn; // Removed: Declared in app.js
// let globalConfirmNoBtn; // Removed: Declared in app.js

/**
 * Displays a temporary alert message to the user.
 * @param {string} message The message to display.
 * @param {string} type The type of alert (e.g., 'success', 'error', 'warning', 'info').
 */
function showAlert(message, type = 'info') {
    const alertBox = document.createElement('div');
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    document.body.appendChild(alertBox);

    // Automatically remove the alert after a few seconds
    setTimeout(() => {
        alertBox.remove();
    }, 5000);
}

/**
 * Shows a custom confirmation modal and executes a callback on 'Yes'.
 * @param {string} message The confirmation message.
 * @param {function} onConfirm Callback function to execute if 'Yes' is clicked.
 */
function showConfirm(message, onConfirm) {
    // Ensure globalConfirmModal and its children are initialized before use
    if (!window.globalConfirmModal || !window.globalConfirmMessage || !window.globalConfirmYesBtn || !window.globalConfirmNoBtn) {
        console.error("Global confirmation modal elements are not initialized. Ensure app.js runs first.");
        // Fallback to a browser alert if the custom modal isn't ready
        alert(message);
        return;
    }

    window.globalConfirmMessage.textContent = message;
    window.globalConfirmModal.classList.add('active');

    // Clear previous event listeners to prevent multiple firings
    window.globalConfirmYesBtn.onclick = null;
    window.globalConfirmNoBtn.onclick = null;

    window.globalConfirmYesBtn.onclick = () => {
        onConfirm();
        hideConfirm();
    };
    window.globalConfirmNoBtn.onclick = () => {
        hideConfirm();
    };
}

/**
 * Hides the custom confirmation modal.
 */
function hideConfirm() {
    if (window.globalConfirmModal) {
        window.globalConfirmModal.classList.remove('active');
    }
}

/**
 * Checks if a Date object is valid.
 * @param {Date} date The Date object to check.
 * @returns {boolean} True if the date is valid, false otherwise.
 */
function isValidDate(date) {
    return date instanceof Date && !isNaN(date);
}

/**
 * Formats raw AI text output into structured HTML.
 * Assumes:
 * - Lines starting with "1. ", "2. ", etc., are main headings (h3).
 * - Lines starting with "-" are list items (li).
 * - Other lines are paragraphs (p).
 * @param {string} rawText The raw text output from the AI.
 * @returns {string} HTML formatted text.
 */
function formatAiResultToHtml(rawText) {
    if (!rawText) return '';

    let html = '';
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let inList = false;

    lines.forEach(line => {
        if (/^\d+\.\s/.test(line)) { // Matches "1. ", "2. " etc.
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            html += `<h3>${line}</h3>`;
        } else if (line.startsWith('- ')) {
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            html += `<li>${line.substring(2)}</li>`;
        } else {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            html += `<p>${line}</p>`;
        }
    });

    if (inList) {
        html += '</ul>';
    }

    return html;
}

/**
 * Opens a new window and displays the given HTML content.
 * @param {string} title The title for the new window.
 * @param {string} contentHtml The HTML content to display.
 */
function openHtmlResultWindow(title, contentHtml) {
    const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    if (newWindow) {
        newWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                <style>
                    body { font-family: 'Inter', sans-serif; margin: 20px; line-height: 1.6; color: #333; }
                    .result-container { background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 25px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
                    h1, h2, h3, h4 { color: #4a5568; margin-top: 20px; margin-bottom: 10px; }
                    p { margin-bottom: 10px; }
                    ul { list-style-type: disc; margin-left: 20px; margin-bottom: 10px; }
                    li { margin-bottom: 5px; }
                    pre { background-color: #eee; padding: 15px; border-radius: 8px; overflow-x: auto; }
                </style>
            </head>
            <body>
                <div class="result-container">
                    <h1>${title}</h1>
                    ${contentHtml}
                </div>
            </body>
            </html>
        `);
        newWindow.document.close();
    } else {
        showAlert('Pop-up blocked! Please allow pop-ups for this site to view the results.', 'error');
    }
}

// Expose utility functions to the global scope if needed by other modules or HTML
window.showAlert = showAlert;
// window.showConfirm = showConfirm; // Removed: Handled by app.js global initialization
// window.hideConfirm = hideConfirm; // Removed: Handled by app.js global initialization
window.isValidDate = isValidDate;
window.formatAiResultToHtml = formatAiResultToHtml;
window.openHtmlResultWindow = openHtmlResultWindow;

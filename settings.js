// settings.js

document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const statusMessage = document.getElementById('statusMessage');

    // Load current API key
    chrome.storage.sync.get(['apiKey'], (data) => {
        apiKeyInput.value = data.apiKey || '';
    });

    // Listen for save button click
    saveApiKeyBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.sync.set({ apiKey: apiKey }, () => {
                console.log('API Key saved:', apiKey);
                showStatusMessage('API Key saved successfully.', 'success');
            });
        } else {
            showStatusMessage('Please enter a valid API key.', 'error');
        }
    });
});

// Function to show status messages
function showStatusMessage(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.className = type; // 'success' or 'error'

    // Clear message after 3 seconds
    setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.className = '';
    }, 3000);
}

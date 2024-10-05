// settings.js

document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const statusMessage = document.getElementById('statusMessage');

    // Load existing API key
    chrome.storage.sync.get('apiKey', (data) => {
        if (data.apiKey) {
            apiKeyInput.value = data.apiKey;
        }
    });

    // Save API Key
    saveApiKeyBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.sync.set({ apiKey }, () => {
                statusMessage.textContent = 'API key saved successfully!';
                statusMessage.style.color = '#2ecc71';
                console.log('API Key saved.');
                showToast('API Key saved successfully!');
            });
        } else {
            statusMessage.textContent = 'Please enter a valid API key.';
            statusMessage.style.color = '#e74c3c';
            console.warn('Invalid API Key attempt.');
            showToast('Please enter a valid API key.', true);
        }
    });

    // Function to show toast notifications
    function showToast(message, isError = false) {
        // Create toast container if it doesn't exist
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }

        // Set the message and show the toast
        toast.textContent = message;
        toast.style.backgroundColor = isError ? '#e74c3c' : '#2ecc71';
        toast.className = 'toast show';

        // Hide the toast after 3 seconds
        setTimeout(() => {
            toast.className = toast.className.replace('show', '');
        }, 3000);
    }
});

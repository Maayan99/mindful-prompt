// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const toggleAnalysis = document.getElementById('toggleAnalysis');
    const settingsButton = document.getElementById('settingsButton');

    // Load current settings
    chrome.storage.sync.get(['analysisEnabled'], (data) => {
        toggleAnalysis.checked = data.analysisEnabled !== false;
    });

    // Listen for toggle changes
    toggleAnalysis.addEventListener('change', () => {
        const isEnabled = toggleAnalysis.checked;
        chrome.storage.sync.set({ analysisEnabled: isEnabled }, () => {
            console.log(`Analysis enabled set to: ${isEnabled}`);
            showToast(`Analysis ${isEnabled ? 'enabled' : 'disabled'}.`);
        });
    });

    // Listen for settings button click
    settingsButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'openSettings' });
    });
});

// Function to show toast notifications
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const toggleAnalysis = document.getElementById('toggleAnalysis');
    const toggleLabel = document.getElementById('toggleLabel');
    const settingsButton = document.getElementById('settingsButton');

    // Load the current state
    chrome.storage.sync.get('analysisEnabled', (data) => {
        toggleAnalysis.checked = data.analysisEnabled !== false;
        updateToggleLabel();
    });

    // Listen for toggle changes
    toggleAnalysis.addEventListener('change', (event) => {
        chrome.storage.sync.set({ analysisEnabled: event.target.checked }, () => {
            console.log(`Analysis Enabled set to: ${event.target.checked}`);
            updateToggleLabel();
            showToast(event.target.checked ? 'Analysis Enabled!' : 'Analysis Disabled.');
        });
    });

    function updateToggleLabel() {
        const isChecked = toggleAnalysis.checked;
        toggleLabel.textContent = isChecked ? 'Analysis Enabled' : 'Analysis Disabled';
    }

    // Open settings page
    settingsButton.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Function to show toast notifications
    function showToast(message) {
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
        toast.className = 'toast show';

        // Hide the toast after 3 seconds
        setTimeout(() => {
            toast.className = toast.className.replace('show', '');
        }, 3000);
    }
});
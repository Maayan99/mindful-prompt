// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openSettings') {
        openSettingsPage();
    }
});

function openSettingsPage() {
    chrome.runtime.getURL('settings.html', function(url) {
        chrome.tabs.create({ url: url });
    });
}
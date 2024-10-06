// content.js

// Global variables
let lastPrompt = '';
let lastAnalysisTime = 0;
let lastWordCount = 0;
let analysisEnabled = true;
let apiKey = null;
let inputArea = null;
let suggestionsVisible = false;
let errorNotified = false; // To prevent multiple error notifications
let confettiActive = false; // To track if confetti is active

// Load user settings
chrome.storage.sync.get(['analysisEnabled', 'apiKey'], (data) => {
    analysisEnabled = data.analysisEnabled !== false;
    apiKey = data.apiKey || null;
    console.log(`Settings loaded. Analysis Enabled: ${analysisEnabled}, API Key: ${apiKey ? 'Present' : 'Absent'}`);
    initialize();
});

// Listen for changes in settings
chrome.storage.onChanged.addListener((changes) => {
    if (changes.analysisEnabled) {
        analysisEnabled = changes.analysisEnabled.newValue;
        console.log(`Analysis Enabled changed to: ${analysisEnabled}`);
    }
    if (changes.apiKey) {
        apiKey = changes.apiKey.newValue;
        console.log(`API Key updated: ${apiKey ? 'Present' : 'Absent'}`);
        errorNotified = false; // Reset error notification
    }
});

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openSettings') {
        openSettingsPage();
    }
});

// Function to open the settings page
function openSettingsPage() {
    chrome.runtime.getURL('settings.html', function (url) {
        chrome.tabs.create({url: url});
    });
}

// Function to initialize the extension
function initialize() {
    console.log('Initializing Mindful Prompt extension...');

    // Use MutationObserver to detect the input area
    const observer = new MutationObserver(() => {
        const potentialInputAreas = [
            'div#prompt-textarea[contenteditable="true"]',
            'div.ProseMirror[contenteditable="true"]',
            'textarea', // Backup selector
        ];

        for (let selector of potentialInputAreas) {
            const element = document.querySelector(selector);
            if (element && element !== inputArea) {
                inputArea = element;
                console.log(`Input area found using selector: ${selector}`, inputArea);

                // Create the progress bar and suggestion elements
                createProgressBar();
                createSuggestionPanel();
                createSuggestionButton();

                // Setup event listeners
                setupEventListeners();

                break;
            }
        }

        if (!inputArea) {
            console.warn('Input area not found.');
        }
    });

    // Start observing the body for child additions and attribute changes
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['id', 'class', 'contenteditable']
    });

    // Initial detection in case the input area is already present
    setTimeout(() => {
        const potentialInputAreas = [
            'div#prompt-textarea[contenteditable="true"]',
            'div.ProseMirror[contenteditable="true"]',
            'textarea',
        ];

        for (let selector of potentialInputAreas) {
            const element = document.querySelector(selector);
            if (element) {
                inputArea = element;
                console.log(`Input area found using selector: ${selector}`, inputArea);

                createProgressBar();
                createSuggestionPanel();
                createSuggestionButton();
                setupEventListeners();
                break;
            }
        }

        if (!inputArea) {
            console.warn('Input area not detected during initial load.');
        }
    }, 3000);
}

// Function to setup event listeners on the input area
function setupEventListeners() {
    if (!inputArea) return;

    console.log("Setting up input monitoring...");

    function handleAnalyzePrompt() {
        if (!analysisEnabled) {
            console.log("Analysis is disabled.");
            return;
        }

        let currentPrompt = '';
        console.log(`Input area tag: ${inputArea.tagName.toLowerCase()}`);

        if (inputArea.tagName.toLowerCase() === 'textarea') {
            console.log('Accessing value property.');
            currentPrompt = inputArea.value;
        } else {
            console.log('Accessing innerText.');
            currentPrompt = inputArea.innerText.trim();
        }

        console.log("Current prompt:", currentPrompt);

        const currentWordCount = countWords(currentPrompt);
        const wordCountDifference = Math.abs(currentWordCount - lastWordCount);

        console.log(`Current word count: ${currentWordCount}, Difference: ${wordCountDifference}`);

        const currentTime = Date.now();
        const timeSinceLastAnalysis = currentTime - lastAnalysisTime;

        if (timeSinceLastAnalysis >= 5000 && wordCountDifference >= 8) {
            lastPrompt = currentPrompt;
            lastWordCount = currentWordCount;
            lastAnalysisTime = currentTime;

            analyzePrompt(currentPrompt).then(({score, suggestions, error}) => {
                if (!error) {
                    displayFeedback(score, suggestions);
                } else {
                    // Do not display grade or suggestions
                    resetFeedback();
                }
                savePromptData(currentPrompt, score);
            }).catch(error => {
                console.error("Error in analyzePrompt:", error);
            });
        } else {
            console.log("Skipping analysis. Conditions not met.");
        }
    }

    // Debounce mechanism for event listeners
    let debounceTimeout;
    const eventTypes = ['input', 'keyup', 'paste', 'focus', 'blur'];

    eventTypes.forEach(eventType => {
        inputArea.addEventListener(eventType, () => {
            console.log(`${eventType} event detected on input area`);
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(handleAnalyzePrompt, 500);
        });
    });

    console.log("Event listeners added to input area.");
}

// Function to count words in a given text
function countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Function to create the horizontal progress bar at the top of the chat area
function createProgressBar() {
    let progressBar = document.getElementById('promptProgressBar');
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.id = 'promptProgressBar';
        progressBar.innerHTML = `
            <div class="progress-bar-fill" id="progressBarFill"></div>
            <span id="progressBarText" class="progress-bar-text">0%</span>
        `;
        const chatContainer = document.querySelector('div.chat-container') || document.body;
        chatContainer.insertBefore(progressBar, chatContainer.firstChild);

        console.log("Progress bar created and added to the DOM.");
    }
}

// Function to create the suggestion panel
function createSuggestionPanel() {
    let suggestionPanel = document.getElementById('suggestionPanel');
    if (!suggestionPanel) {
        suggestionPanel = document.createElement('div');
        suggestionPanel.id = 'suggestionPanel';
        suggestionPanel.innerHTML = `
            <div id="suggestionHeader">Areas to Expand On</div>
            <div id="suggestionContent"></div>
        `;
        document.body.appendChild(suggestionPanel);

        suggestionPanel.style.display = 'none';

        console.log("Suggestion panel created and added to the DOM.");
    }
}

// Function to create the suggestion button
function createSuggestionButton() {
    let suggestionButton = document.getElementById('suggestionButton');
    if (!suggestionButton) {
        suggestionButton = document.createElement('div');
        suggestionButton.id = 'suggestionButton';
        suggestionButton.innerHTML = '<span id="suggestionIcon">💡</span>';
        document.body.appendChild(suggestionButton);

        suggestionButton.addEventListener('click', () => {
            toggleSuggestionPanel();
        });

        console.log("Suggestion button created and added to the DOM.");
    }
}

// Function to toggle the display of suggestion panel
function toggleSuggestionPanel() {
    let suggestionPanel = document.getElementById('suggestionPanel');
    if (!suggestionPanel) return;

    suggestionsVisible = !suggestionsVisible;
    suggestionPanel.style.display = suggestionsVisible ? 'block' : 'none';

    if (suggestionsVisible) {
        suggestionPanel.classList.remove('hide');
        suggestionPanel.classList.add('show');
    } else {
        suggestionPanel.classList.remove('show');
        suggestionPanel.classList.add('hide');
    }

    console.log(`Suggestion panel is now ${suggestionsVisible ? 'visible' : 'hidden'}.`);
}

// Function to display feedback by updating the progress bar and suggestion panel
function displayFeedback(score, suggestions) {
    let progressBarFill = document.getElementById('progressBarFill');
    let progressBarText = document.getElementById('progressBarText');

    if (progressBarFill && progressBarText) {
        progressBarFill.style.width = `${score}%`;
        progressBarText.textContent = `${score}%`;

        let color = getScoreColor(score);
        progressBarFill.style.background = `linear-gradient(90deg, ${color}, #8e44ad)`;

        progressBarFill.style.transition = 'width 0.5s ease-in-out, background 0.5s ease-in-out';

        if (score >= 75 && !confettiActive) {
            triggerCelebration();
            confettiActive = true;
        } else if (score < 75 && confettiActive) {
            confettiActive = false;
        }
    }

    let suggestionContent = document.getElementById('suggestionContent');
    let suggestionButton = document.getElementById('suggestionButton');

    if (suggestionContent && suggestionButton) {
        if (suggestions.length) {
            suggestionContent.innerHTML = suggestions.map(s => `<p>${s}</p>`).join('');
            console.log("Suggestions displayed:", suggestions);
            suggestionButton.style.display = 'flex'; // Show suggestion button

            // Animate suggestion button briefly
            suggestionButtonAnimation();
        } else {
            suggestionContent.innerHTML = '<p>Great job! Your prompt looks good.</p>';
            console.log("No suggestions to display.");
            suggestionButton.style.display = 'none'; // Hide suggestion button
        }
    }
}

// Function to animate the suggestion button briefly
function suggestionButtonAnimation() {
    let suggestionButton = document.getElementById('suggestionButton');
    if (suggestionButton) {
        suggestionButton.classList.add('animate-button');
        setTimeout(() => {
            suggestionButton.classList.remove('animate-button');
        }, 2000);
    }
}

// Function to determine score color
function getScoreColor(score) {
    if (score < 50) return '#e74c3c';
    if (score < 75) return '#f1c40f';
    return '#2ecc71';
}

// Function to trigger celebration animation for high scores
function triggerCelebration() {
    const confettiContainer = document.createElement('div');
    confettiContainer.id = 'confettiContainer';
    document.body.appendChild(confettiContainer);

    const confettiCount = 200;
    const confettiColors = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#1abc9c'];

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confettiContainer.appendChild(confetti);

        // Set random position
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = Math.random() * -20 + '%'; // Start slightly above the viewport

        // Randomize confetti appearance
        confetti.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];

        const size = Math.random() * 8 + 4; // 4px to 12px
        confetti.style.width = size + 'px';
        confetti.style.height = size * 0.4 + 'px';

        // Randomize rotation and speed
        confetti.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
        confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
        confetti.style.opacity = Math.random() + 0.5;
    }

    // Remove confetti after animation completes
    setTimeout(() => {
        confettiContainer.remove();
    }, 5000);
}

// Function to analyze the prompt and get score and suggestions
async function analyzePrompt(prompt) {
    if (apiKey) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [{
                        role: 'user',
                        content: `Please evaluate the following prompt on a scale of 0 to 100, considering how detailed and specific it is, where 100 is excellent and 0 is very poor. I wrote the prompt and I want to know if I am using AI in a lazy manner, and your grade will help me figure that out. Also, provide up to 2 suggestions on what could be expanded upon or made more detailed, focusing on areas worth expanding. Provide the score as 'Score: X' and the suggestions as a numbered list.\n\n"${prompt}"`
                    }],
                    max_tokens: 150,
                    temperature: 0.7
                })
            });
            const data = await response.json();

            if (data.error) {
                console.error('API Error:', data.error);
                if (!errorNotified) {
                    showErrorNotification('API Error: ' + data.error.message);
                    errorNotified = true;
                }
                return {error: true};
            }

            const analysis = data.choices[0].message.content;
            console.log('Analysis from API:', analysis);

            // Now parse the analysis to extract the score and suggestions
            const scoreMatch = analysis.match(/Score:\s*(\d+)/i);
            let score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

            // Get suggestions by splitting numbered list
            let suggestions = analysis.split('\n').filter(line => /^\d+[\).\s]/.test(line.trim())).map(line => line.replace(/^\d+[\).\s]/, '').trim()).slice(0, 2);

            if (score !== null) {
                console.log(`API returned score: ${score}`);
                console.log(`API returned suggestions: ${suggestions}`);
                return {score, suggestions, error: false};
            } else {
                console.warn("Received invalid score from API:", analysis);
                if (!errorNotified) {
                    showErrorNotification('Invalid response from API. Please check your API key.');
                    errorNotified = true;
                }
                return {error: true};
            }
        } catch (error) {
            console.error('API Error:', error);
            if (!errorNotified) {
                showErrorNotification('Error communicating with API. Please check your API key.');
                errorNotified = true;
            }
            return {error: true};
        }
    } else {
        console.log("API Key not provided. Using basic prompt analysis.");
        if (!errorNotified) {
            showErrorNotification('API Key not provided. Please enter your API key in the settings page.');
            errorNotified = true;
        }
        return {error: true};
    }
}

// Function to show error notification
function showErrorNotification(message) {
    let existingNotification = document.getElementById('errorNotification');
    if (!existingNotification) {
        const notification = document.createElement('div');
        notification.id = 'errorNotification';
        notification.className = 'error-notification';
        notification.innerHTML = `
            <p>${message}</p>
            <button id="settingsLink">Go to Settings</button>
        `;
        document.body.appendChild(notification);

        const settingsLink = document.getElementById('settingsLink');
        settingsLink.addEventListener('click', () => {
            chrome.runtime.sendMessage({action: 'openOptionsPage'});
            notification.remove();
            errorNotified = false;
        });

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.remove();
                errorNotified = false;
            }
        }, 10000);
    }
}

// Function to reset feedback in case of error
function resetFeedback() {
    let progressBarFill = document.getElementById('progressBarFill');
    let progressBarText = document.getElementById('progressBarText');
    let suggestionContent = document.getElementById('suggestionContent');
    let suggestionButton = document.getElementById('suggestionButton');

    if (progressBarFill && progressBarText) {
        progressBarFill.style.width = `0%`;
        progressBarText.textContent = `0%`;
        progressBarFill.style.background = `linear-gradient(90deg, #e74c3c, #8e44ad)`;
    }

    if (suggestionContent && suggestionButton) {
        suggestionContent.innerHTML = '';
        suggestionButton.style.display = 'none';
    }
}

// Basic prompt analysis function (not used when API is available)
function basicAnalyzePrompt(prompt) {
    let score = 0;
    let criteriaMet = 0;
    let totalCriteria = 5;
    let suggestions = [];

    if (checkClarity(prompt)) criteriaMet++; else suggestions.push('Consider clarifying your prompt with more details.');
    if (checkSpecificity(prompt)) criteriaMet++; else suggestions.push('Include specific keywords or instructions.');
    if (checkLength(prompt)) criteriaMet++; else suggestions.push('Provide more context to your prompt.');
    if (checkStructure(prompt)) criteriaMet++; else suggestions.push('Check the grammar and punctuation.');
    if (checkQuestionType(prompt)) criteriaMet++; else suggestions.push('Ask open-ended questions to get detailed responses.');

    score = ((criteriaMet / totalCriteria) * 100) + 30; // Adjusted to give higher grades
    if (score > 100) score = 100;
    console.log(`Basic prompt score: ${score}`);
    return {score: Math.round(score), suggestions: suggestions.slice(0, 2), error: false};
}

// Criterion functions
function checkClarity(prompt) {
    return prompt.length > 20;
}

function checkSpecificity(prompt) {
    return /(?:\b(?:specifically|detailed|details|exactly|precisely|step-by-step)\b)/i.test(prompt);
}

function checkLength(prompt) {
    return prompt.length >= 50 && prompt.length <= 500;
}

function checkStructure(prompt) {
    return /^[A-Z].*[.!?]$/.test(prompt.trim());
}

function checkQuestionType(prompt) {
    return /how|what|why|describe|explain|tell me about|show me/i.test(prompt);
}

// Function to save prompt data (for analytics)
function savePromptData(prompt, score) {
    chrome.storage.local.get('promptHistory', (data) => {
        let history = data.promptHistory || [];
        history.push({
            prompt: prompt,
            score: score,
            timestamp: Date.now()
        });
        // Keep only the last 100 entries
        if (history.length > 100) history.shift();
        chrome.storage.local.set({promptHistory: history}, () => {
            console.log("Prompt data saved.", {prompt, score});
        });
    });
}

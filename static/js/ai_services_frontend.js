// Function to show a specific AI service section
function showAiServiceSection(serviceId) {
    // Hide all AI service sections
    document.querySelectorAll('.ai-service-page').forEach(page => {
        page.style.display = 'none';
    });
    // Hide the intro message
    document.getElementById('ai-tools-intro-message').style.display = 'none';

    // Show the requested AI service section
    const targetSection = document.getElementById(`ai-service-${serviceId}`);
    if (targetSection) {
        targetSection.style.display = 'block';
    } else {
        window.showAlert('AI service section not found.', 'error');
        document.getElementById('ai-tools-intro-message').style.display = 'block'; // Show intro if target not found
    }
}

// Expose this function globally
window.showAiServiceSection = showAiServiceSection;


/**
 * Helper function to get AI provider and API key from a given section.
 * @param {string} sectionIdPrefix The prefix for the section's IDs (e.g., 'chance', 'cv').
 * @returns {object} An object containing aiProvider and apiKey.
 */
function getAiConfig(sectionIdPrefix) {
    const aiProvider = document.getElementById(`ai-provider-${sectionIdPrefix}`).value;
    const apiKey = document.getElementById(`api-key-${sectionIdPrefix}`).value;
    return { aiProvider, apiKey };
}

/**
 * Helper function to show loading indicator and hide result box.
 * @param {string} loadingId The ID of the loading indicator div.
 * @param {string} resultId The ID of the result div.
 */
function showLoading(loadingId, resultId) {
    const loadingElement = document.getElementById(loadingId);
    const resultElement = document.getElementById(resultId);

    if (loadingElement) {
        loadingElement.style.display = 'flex';
    } else {
        console.warn(`showLoading: Loading element with ID '${loadingId}' not found.`);
        // Fallback or handle gracefully if element is null
        return; // Prevent further errors if element is null
    }

    if (resultElement) {
        resultElement.style.display = 'none';
        resultElement.innerHTML = ''; // Clear previous result
    } else {
        console.warn(`showLoading: Result element with ID '${resultId}' not found.`);
    }
}

/**
 * Helper function to hide loading indicator and show result box.
 * @param {string} loadingId The ID of the loading indicator div.
 * @param {string} resultId The ID of the result div.
 * @param {string} content The HTML content to put in the result div.
 */
function hideLoadingShowResult(loadingId, resultId, content) {
    const loadingElement = document.getElementById(loadingId);
    const resultElement = document.getElementById(resultId);

    if (loadingElement) {
        loadingElement.style.display = 'none';
    } else {
        console.warn(`hideLoadingShowResult: Loading element with ID '${loadingId}' not found.`);
    }

    if (resultElement) {
        resultElement.innerHTML = content;
        resultElement.style.display = 'block';
    } else {
        console.warn(`hideLoadingShowResult: Result element with ID '${resultId}' not found.`);
    }
}

/**
 * Estimates job chance based on job description and user profile.
 */
async function estimateJobChance() {
    const jobDescription = document.getElementById('job-desc-chance').value;
    const { aiProvider, apiKey } = getAiConfig('chance');

    if (!jobDescription || !apiKey) {
        window.showAlert('Please provide job description and API Key.', 'error');
        return;
    }

    // Ensure window.profile is available and not empty
    if (!window.profile || Object.keys(window.profile).length === 0) {
        window.showAlert('Your profile is empty. Please fill out your profile first.', 'warning');
        return;
    }

    showLoading('chance-loading', 'chance-result');

    try {
        const response = await fetch('/api/ai/estimate-chance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                job_description: jobDescription,
                profile: JSON.stringify(window.profile), // Send profile as JSON string
                ai_provider: aiProvider,
                api_key: apiKey
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to estimate job chance.');
        }

        const data = await response.json();
        const formattedResult = window.formatAiResultToHtml(data.result);
        hideLoadingShowResult('chance-loading', 'chance-result', formattedResult);
        window.showAlert('Job chance estimated successfully!', 'success');
    } catch (error) {
        console.error('Error estimating job chance:', error);
        hideLoadingShowResult('chance-loading', 'chance-result', `<p class="text-error">Error: ${error.message}</p>`);
        window.showAlert('Failed to estimate job chance. ' + error.message, 'error');
    }
}

/**
 * Tunes CV for a specific job description.
 */
async function tuneCv() {
    const jobDescription = document.getElementById('job-desc-cv').value;
    const { aiProvider, apiKey } = getAiConfig('cv');

    if (!jobDescription || !apiKey) {
        window.showAlert('Please provide job description and API Key.', 'error');
        return;
    }

    if (!window.profile || Object.keys(window.profile).length === 0) {
        window.showAlert('Your profile is empty. Please fill out your profile first.', 'warning');
        return;
    }

    showLoading('cv-loading', 'cv-result');

    try {
        const response = await fetch('/api/ai/tune-cv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                job_description: jobDescription,
                profile: JSON.stringify(window.profile),
                ai_provider: aiProvider,
                api_key: apiKey
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to tune CV.');
        }

        const data = await response.json();
        const formattedResult = window.formatAiResultToHtml(data.result);
        hideLoadingShowResult('cv-loading', 'cv-result', formattedResult);
        window.showAlert('CV tuned successfully!', 'success');
    } catch (error) {
        console.error('Error tuning CV:', error);
        hideLoadingShowResult('cv-loading', 'cv-result', `<p class="text-error">Error: ${error.message}</p>`);
        window.showAlert('Failed to tune CV. ' + error.message, 'error');
    }
}

/**
 * Generates a cover letter.
 */
async function generateCoverLetter() {
    const jobDescription = document.getElementById('job-desc-cover-letter').value;
    const { aiProvider, apiKey } = getAiConfig('cover-letter');

    if (!jobDescription || !apiKey) {
        window.showAlert('Please provide job description and API Key.', 'error');
        return;
    }

    if (!window.profile || Object.keys(window.profile).length === 0) {
        window.showAlert('Your profile is empty. Please fill out your profile first.', 'warning');
        return;
    }

    showLoading('cover-letter-loading', 'cover-letter-result');

    try {
        const response = await fetch('/api/ai/generate-cover-letter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                job_description: jobDescription,
                profile: JSON.stringify(window.profile),
                ai_provider: aiProvider,
                api_key: apiKey
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to generate cover letter.');
        }

        const data = await response.json();
        const formattedResult = window.formatAiResultToHtml(data.result);
        hideLoadingShowResult('cover-letter-loading', 'cover-letter-result', formattedResult);
        window.showAlert('Cover letter generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating cover letter:', error);
        hideLoadingShowResult('cover-letter-loading', 'cover-letter-result', `<p class="text-error">Error: ${error.message}</p>`);
        window.showAlert('Failed to generate cover letter. ' + error.message, 'error');
    }
}

// Chat history for Interview Q&A
let interviewChatHistory = [];

/**
 * Sends a message in the interview Q&A chat.
 */
async function sendInterviewChatMessage() {
    const chatInput = document.getElementById('qa-chat-input');
    const chatDisplay = document.getElementById('qa-chat-display');
    const jobTitle = document.getElementById('job-title-qa').value;
    const { aiProvider, apiKey } = getAiConfig('qa');

    const userMessageText = chatInput.value.trim();
    if (!userMessageText) return;

    if (!jobTitle) {
        window.showAlert('Please enter a Job Title for context.', 'warning');
        return;
    }
    if (!apiKey) {
        window.showAlert('Please provide an API Key.', 'error');
        return;
    }
    if (!window.profile || Object.keys(window.profile).length === 0) {
        window.showAlert('Your profile is empty. Please fill out your profile first.', 'warning');
        return;
    }

    // Add user message to display and history
    appendChatMessage(userMessageText, 'user');
    interviewChatHistory.push({ role: 'user', content: userMessageText });
    chatInput.value = ''; // Clear input

    showLoading('qa-loading', 'qa-result-placeholder'); // qa-result-placeholder is just a dummy, result goes to chatDisplay

    try {
        const response = await fetch('/api/ai/interview-qa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                job_title: jobTitle,
                profile: JSON.stringify(window.profile),
                chat_history: JSON.stringify(interviewChatHistory), // Send full history
                ai_provider: aiProvider,
                api_key: apiKey
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to get AI response.');
        }

        const data = await response.json();
        const aiResponseText = data.result;
        appendChatMessage(aiResponseText, 'bot');
        interviewChatHistory.push({ role: 'assistant', content: aiResponseText }); // Add AI response to history

        document.getElementById('qa-loading').style.display = 'none'; // Hide loading
        chatDisplay.scrollTop = chatDisplay.scrollHeight; // Scroll to bottom
    } catch (error) {
        console.error('Error in interview chat:', error);
        document.getElementById('qa-loading').style.display = 'none'; // Hide loading
        appendChatMessage(`Error: ${error.message}`, 'bot'); // Show error in chat
        window.showAlert('Error in interview chat: ' + error.message, 'error');
    }
}

/**
 * Appends a message to the chat display.
 * @param {string} message The message text.
 * @param {string} sender 'user' or 'bot'.
 */
function appendChatMessage(message, sender) {
    const chatDisplay = document.getElementById('qa-chat-display');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', `${sender}-message`);
    messageDiv.innerHTML = window.formatAiResultToHtml(message); // Format AI response as Markdown
    chatDisplay.appendChild(messageDiv);
    chatDisplay.scrollTop = chatDisplay.scrollHeight; // Auto-scroll to latest message
}

/**
 * Extracts key skills from job description.
 */
async function extractJobSkills() {
    const jobDescription = document.getElementById('job-desc-skill-extractor').value;
    const { aiProvider, apiKey } = getAiConfig('skill-extractor');

    if (!jobDescription || !apiKey) {
        window.showAlert('Please provide job description and API Key.', 'error');
        return;
    }

    if (!window.profile || Object.keys(window.profile).length === 0) {
        window.showAlert('Your profile is empty. Please fill out your profile first.', 'warning');
        return;
    }

    showLoading('skill-extractor-loading', 'skill-extractor-result');

    try {
        const response = await fetch('/api/ai/extract-skills', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                job_description: jobDescription,
                profile: JSON.stringify(window.profile),
                ai_provider: aiProvider,
                api_key: apiKey
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to extract skills.');
        }

        const data = await response.json();
        const formattedResult = window.formatAiResultToHtml(data.result);
        hideLoadingShowResult('skill-extractor-loading', 'skill-extractor-result', formattedResult);
        window.showAlert('Skills extracted successfully!', 'success');
    } catch (error) {
        console.error('Error extracting skills:', error);
        hideLoadingShowResult('skill-extractor-loading', 'skill-extractor-result', `<p class="text-error">Error: ${error.message}</p>`);
        window.showAlert('Failed to extract skills. ' + error.message, 'error');
    }
}

/**
 * Crafts interview questions.
 */
async function craftInterviewQuestions() {
    const candidateInfo = document.getElementById('candidate-info-questions').value;
    const { aiProvider, apiKey } = getAiConfig('craft-questions');

    if (!candidateInfo || !apiKey) {
        window.showAlert('Please provide candidate information and API Key.', 'error');
        return;
    }

    showLoading('craft-questions-loading', 'craft-questions-result');

    try {
        const response = await fetch('/api/ai/craft-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                candidate_info: candidateInfo,
                ai_provider: aiProvider,
                api_key: apiKey
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to craft questions.');
        }

        const data = await response.json();
        const formattedResult = window.formatAiResultToHtml(data.result);
        hideLoadingShowResult('craft-questions-loading', 'craft-questions-result', formattedResult);
        window.showAlert('Interview questions crafted successfully!', 'success');
    } catch (error) {
        console.error('Error crafting questions:', error);
        hideLoadingShowResult('craft-questions-loading', 'craft-questions-result', `<p class="text-error">Error: ${error.message}</p>`);
        window.showAlert('Failed to craft questions. ' + error.message, 'error');
    }
}

/**
 * Researches company website.
 */
async function researchCompanyWebsite() {
    const companyUrl = document.getElementById('company-url-research').value;
    const { aiProvider, apiKey } = getAiConfig('company-research');

    if (!companyUrl || !apiKey) {
        window.showAlert('Please provide company URL and API Key.', 'error');
        return;
    }

    showLoading('company-research-loading', 'company-research-result');

    try {
        const response = await fetch('/api/ai/company-research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                company_url: companyUrl,
                ai_provider: aiProvider,
                api_key: apiKey
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to research company.');
        }

        const data = await response.json();
        console.log('researchCompanyWebsite: Raw AI response data:', data); // Log the raw data
        const formattedResult = window.formatAiResultToHtml(data.result);
        console.log('researchCompanyWebsite: Formatted result HTML:', formattedResult); // Log formatted HTML
        hideLoadingShowResult('company-research-loading', 'company-research-result', formattedResult);
        window.showAlert('Company research completed successfully!', 'success');
    } catch (error) {
        console.error('Error researching company:', error);
        hideLoadingShowResult('company-research-loading', 'company-research-result', `<p class="text-error">Error: ${error.message}</p>`);
        window.showAlert('Failed to research company. ' + error.message, 'error');
    }
}

/**
 * Generates a tuned "About Me" answer.
 */
async function generateAboutMeAnswer() {
    const jobDescription = document.getElementById('job-desc-about-me').value;
    const { aiProvider, apiKey } = getAiConfig('about-me');

    if (!jobDescription || !apiKey) {
        window.showAlert('Please provide job description and API Key.', 'error');
        return;
    }

    if (!window.profile || Object.keys(window.profile).length === 0) {
        window.showAlert('Your profile is empty. Please fill out your profile first.', 'warning');
        return;
    }

    showLoading('about-me-loading', 'about-me-result');

    try {
        const response = await fetch('/api/ai/about-me-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                job_description: jobDescription,
                profile: JSON.stringify(window.profile),
                ai_provider: aiProvider,
                api_key: apiKey
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to generate "About Me" answer.');
        }

        const data = await response.json();
        const formattedResult = window.formatAiResultToHtml(data.result);
        hideLoadingShowResult('about-me-loading', 'about-me-result', formattedResult);
        window.showAlert('"About Me" answer generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating "About Me" answer:', error);
        hideLoadingShowResult('about-me-loading', 'about-me-result', `<p class="text-error">Error: ${error.message}</p>`);
        window.showAlert('Failed to generate "About Me" answer. ' + error.message, 'error');
    }
}

/**
 * Fills profile from resume using AI.
 */
async function fillProfileFromResumeAI() {
    const resumeFile = document.getElementById('resume-pdf-input').files[0];
    const { aiProvider, apiKey } = getAiConfig('fill-profile');

    if (!resumeFile) {
        window.showAlert('Please upload a resume PDF file.', 'error');
        return;
    }
    if (!apiKey) {
        window.showAlert('Please provide an API Key.', 'error');
        return;
    }

    showLoading('fill-profile-loading', 'fill-profile-result');

    const formData = new FormData();
    formData.append('resume_file', resumeFile);
    formData.append('ai_provider', aiProvider);
    formData.append('api_key', apiKey);

    try {
        const response = await fetch('/api/ai/profile/fill-from-resume-ai', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to fill profile from resume.');
        }

        const data = await response.json();
        const profileData = data.profile; // The backend returns the saved profile

        // Update the frontend profile object and re-render the profile tab
        window.profile = profileData;
        window.populateProfileForm(); // Assuming populateProfileForm is exposed by profile.js

        hideLoadingShowResult('fill-profile-loading', 'fill-profile-result', `<p class="text-success">Profile extracted and filled successfully!</p><pre>${JSON.stringify(profileData, null, 2)}</pre>`);
        window.showAlert('Profile filled from resume successfully!', 'success');
    } catch (error) {
        console.error('Error filling profile from resume:', error);
        hideLoadingShowResult('fill-profile-loading', 'fill-profile-result', `<p class="text-error">Error: ${error.message}</p>`);
        window.showAlert('Failed to fill profile from resume. ' + error.message, 'error');
    }
}


// Expose functions to the global scope
window.estimateJobChance = estimateJobChance;
window.tuneCv = tuneCv;
window.generateCoverLetter = generateCoverLetter;
window.sendInterviewChatMessage = sendInterviewChatMessage;
window.extractJobSkills = extractJobSkills;
window.craftInterviewQuestions = craftInterviewQuestions;
window.researchCompanyWebsite = researchCompanyWebsite;
window.generateAboutMeAnswer = generateAboutMeAnswer;
window.fillProfileFromResumeAI = fillProfileFromResumeAI;

// Add a log to confirm this script has loaded and exposed its functions
console.log("ai_services_frontend.js loaded and functions exposed.");

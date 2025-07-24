// Global variable to store chat history for the Interview Q&A chatbot
let interviewQaChatHistory = [];

/**
 * Shows a specific AI service page and hides others.
 * @param {string} serviceId The ID of the AI service section to show (e.g., 'estimate-chance').
 */
function showAiServicePage(serviceId) {
    // Hide the initial intro message
    document.getElementById('ai-tools-intro-message').style.display = 'none';

    // Hide all AI service pages
    document.querySelectorAll('.ai-service-page').forEach(page => {
        page.style.display = 'none';
    });

    // Show the requested AI service page
    const targetPage = document.getElementById(`ai-service-${serviceId}`);
    if (targetPage) {
        targetPage.style.display = 'block';
    } else {
        showAlert('AI service page not found!', 'error');
    }

    // Reset specific AI service states if needed when switching
    if (serviceId === 'interview-qa') {
        resetInterviewQaChat();
    }
    // You can add more resets here for other services if they maintain state
}

/**
 * Resets the Interview Q&A chatbot state.
 */
function resetInterviewQaChat() {
    interviewQaChatHistory = [];
    const chatDisplay = document.getElementById('qa-chat-display');
    chatDisplay.innerHTML = '<div class="chat-message bot-message">Hello! I\'m your interview practice bot. Tell me a job title, and I\'ll ask you some questions.</div>';
    document.getElementById('qa-chat-input').value = '';
    document.getElementById('job-title-qa').value = '';
    document.getElementById('qa-loading').style.display = 'none';
}

/**
 * Appends a message to the chat display.
 * @param {string} message The message content.
 * @param {string} sender 'user' or 'bot'.
 */
function appendChatMessage(message, sender) {
    const chatDisplay = document.getElementById('qa-chat-display');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    messageDiv.textContent = message;
    chatDisplay.appendChild(messageDiv);
    chatDisplay.scrollTop = chatDisplay.scrollHeight; // Scroll to bottom
}

// --- AI Service Implementations ---

/**
 * Handles the "Estimate Job Chance" AI service request.
 */
async function estimateJobChance() {
    const jobDescription = document.getElementById('job-desc-chance').value;
    const aiProvider = document.getElementById('ai-provider-chance').value;
    const apiKey = document.getElementById('api-key-chance').value;
    const chanceLoading = document.getElementById('chance-loading');
    const chanceResult = document.getElementById('chance-result');

    chanceResult.style.display = 'none';
    chanceLoading.style.display = 'block';

    if (!jobDescription || !apiKey) {
        showAlert('Please provide a job description and your API key.', 'warning');
        chanceLoading.style.display = 'none';
        return;
    }

    try {
        // Ensure profile data is loaded before sending
        await loadProfile();
        const response = await fetch('/api/ai/estimate-chance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_description: jobDescription,
                profile: profile, // Use the globally loaded profile
                ai_provider: aiProvider,
                api_key: apiKey
            })
        });

        if (response.ok) {
            const data = await response.json();
            const formattedHtml = formatAiResultToHtml(data.result);
            openHtmlResultWindow('Job Chance Estimation Result', formattedHtml);
            showAlert('Job chance estimated successfully! Result opened in a new window.', 'success');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to estimate job chance.');
        }
    } catch (error) {
        console.error('Error estimating job chance:', error);
        showAlert('Error estimating job chance: ' + error.message, 'error');
        chanceResult.innerHTML = `<h4>Error:</h4><p>${error.message}</p>`;
        chanceResult.style.display = 'block';
    } finally {
        chanceLoading.style.display = 'none';
    }
}

/**
 * Handles the "Tune CV for Job Description" AI service request.
 */
async function tuneCv() {
    const jobDescription = document.getElementById('job-desc-cv').value;
    const aiProvider = document.getElementById('ai-provider-cv').value;
    const apiKey = document.getElementById('api-key-cv').value;
    const cvLoading = document.getElementById('cv-loading');
    const cvResult = document.getElementById('cv-result');

    cvResult.style.display = 'none';
    cvLoading.style.display = 'block';

    if (!jobDescription || !apiKey) {
        showAlert('Please provide a job description and your API key.', 'warning');
        cvLoading.style.display = 'none';
        return;
    }

    try {
        await loadProfile();
        const response = await fetch('/api/ai/tune-cv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_description: jobDescription,
                profile: profile,
                ai_provider: aiProvider,
                api_key: apiKey
            })
        });

        if (response.ok) {
            const data = await response.json();
            const formattedHtml = formatAiResultToHtml(data.result);
            openHtmlResultWindow('Tuned CV Suggestions', formattedHtml);
            showAlert('CV tuned successfully! Result opened in a new window.', 'success');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to tune CV.');
        }
    } catch (error) {
        console.error('Error tuning CV:', error);
        showAlert('Error tuning CV: ' + error.message, 'error');
        cvResult.innerHTML = `<h4>Error:</h4><p>${error.message}</p>`;
        cvResult.style.display = 'block';
    } finally {
        cvLoading.style.display = 'none';
    }
}

/**
 * Handles the "Cover Letter Writing" AI service request.
 */
async function generateCoverLetter() {
    const jobDescription = document.getElementById('job-desc-cover-letter').value;
    const aiProvider = document.getElementById('ai-provider-cover-letter').value;
    const apiKey = document.getElementById('api-key-cover-letter').value;
    const loadingDiv = document.getElementById('cover-letter-loading');
    const resultDiv = document.getElementById('cover-letter-result');

    resultDiv.style.display = 'none';
    loadingDiv.style.display = 'block';

    if (!jobDescription || !apiKey) {
        showAlert('Please provide a job description and your API key.', 'warning');
        loadingDiv.style.display = 'none';
        return;
    }

    try {
        await loadProfile();
        const response = await fetch('/api/ai/cover-letter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_description: jobDescription,
                profile: profile,
                ai_provider: aiProvider,
                api_key: apiKey
            })
        });

        if (response.ok) {
            const data = await response.json();
            const formattedHtml = formatAiResultToHtml(data.result);
            openHtmlResultWindow('Generated Cover Letter', formattedHtml);
            showAlert('Cover letter generated successfully! Result opened in a new window.', 'success');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to generate cover letter.');
        }
    } catch (error) {
        console.error('Error generating cover letter:', error);
        showAlert('Error generating cover letter: ' + error.message, 'error');
        resultDiv.innerHTML = `<h4>Error:</h4><p>${error.message}</p>`;
        resultDiv.style.display = 'block';
    } finally {
        loadingDiv.style.display = 'none';
    }
}

/**
 * Handles the "Interview Q&A Practice" AI service chat.
 */
async function sendInterviewQaMessage() {
    const chatInput = document.getElementById('qa-chat-input');
    const jobTitle = document.getElementById('job-title-qa').value;
    const aiProvider = document.getElementById('ai-provider-qa').value;
    const apiKey = document.getElementById('api-key-qa').value;
    const loadingDiv = document.getElementById('qa-loading');

    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    appendChatMessage(userMessage, 'user');
    chatInput.value = '';
    loadingDiv.style.display = 'flex';

    interviewQaChatHistory.push({ role: "user", content: userMessage });

    if (!apiKey) {
        showAlert('Please provide your AI provider API key.', 'warning');
        loadingDiv.style.display = 'none';
        return;
    }

    try {
        await loadProfile();
        const response = await fetch('/api/ai/interview-qa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_title: jobTitle,
                profile: profile,
                chat_history: interviewQaChatHistory,
                ai_provider: aiProvider,
                api_key: apiKey
            })
        });

        if (response.ok) {
            const data = await response.json();
            const botResponse = data.response;
            appendChatMessage(botResponse, 'bot');
            interviewQaChatHistory.push({ role: "assistant", content: botResponse });
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to get AI response.');
        }
    } catch (error) {
        console.error('Error in Interview Q&A:', error);
        appendChatMessage('Error: ' + error.message, 'bot');
    } finally {
        loadingDiv.style.display = 'none';
    }
}

/**
 * Handles the "Job Description Key Skill Extractor & Analyzer" AI service request.
 */
async function extractSkills() {
    const jobDescription = document.getElementById('job-desc-skill-extractor').value;
    const aiProvider = document.getElementById('ai-provider-skill-extractor').value;
    const apiKey = document.getElementById('api-key-skill-extractor').value;
    const loadingDiv = document.getElementById('skill-extractor-loading');
    const resultDiv = document.getElementById('skill-extractor-result');

    resultDiv.style.display = 'none';
    loadingDiv.style.display = 'block';

    if (!jobDescription || !apiKey) {
        showAlert('Please provide a job description and your API key.', 'warning');
        loadingDiv.style.display = 'none';
        return;
    }

    try {
        await loadProfile();
        const response = await fetch('/api/ai/skill-extractor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_description: jobDescription,
                profile: profile,
                ai_provider: aiProvider,
                api_key: apiKey
            })
        });

        if (response.ok) {
            const data = await response.json();
            const formattedHtml = formatAiResultToHtml(data.result);
            openHtmlResultWindow('Skill Extraction & Analysis Result', formattedHtml);
            showAlert('Skills extracted and analyzed successfully! Result opened in a new window.', 'success');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to extract skills.');
        }
    } catch (error) {
        console.error('Error extracting skills:', error);
        showAlert('Error extracting skills: ' + error.message, 'error');
        resultDiv.innerHTML = `<h4>Error:</h4><p>${error.message}</p>`;
        resultDiv.style.display = 'block';
    } finally {
        loadingDiv.style.display = 'none';
    }
}

/**
 * Handles the "Craft Interview Questions for a Candidate" AI service request.
 */
async function craftInterviewQuestions() {
    const candidateInfo = document.getElementById('candidate-info-questions').value;
    const aiProvider = document.getElementById('ai-provider-craft-questions').value;
    const apiKey = document.getElementById('api-key-craft-questions').value;
    const loadingDiv = document.getElementById('craft-questions-loading');
    const resultDiv = document.getElementById('craft-questions-result');

    resultDiv.style.display = 'none';
    loadingDiv.style.display = 'block';

    if (!candidateInfo || !apiKey) {
        showAlert('Please provide job description/candidate info and your API key.', 'warning');
        loadingDiv.style.display = 'none';
        return;
    }

    try {
        const response = await fetch('/api/ai/craft-interview-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                candidate_info: candidateInfo,
                ai_provider: aiProvider,
                api_key: apiKey
            })
        });

        if (response.ok) {
            const data = await response.json();
            const formattedHtml = formatAiResultToHtml(data.result);
            openHtmlResultWindow('Generated Interview Questions', formattedHtml);
            showAlert('Interview questions generated successfully! Result opened in a new window.', 'success');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to craft interview questions.');
        }
    } catch (error) {
        console.error('Error crafting interview questions:', error);
        showAlert('Error crafting interview questions: ' + error.message, 'error');
        resultDiv.innerHTML = `<h4>Error:</h4><p>${error.message}</p>`;
        resultDiv.style.display = 'block';
    } finally {
        loadingDiv.style.display = 'none';
    }
}

/**
 * Handles the "Company Website Research" AI service request.
 */
async function researchCompanyWebsite() {
    const companyUrl = document.getElementById('company-url-research').value;
    const aiProvider = document.getElementById('ai-provider-company-research').value;
    const apiKey = document.getElementById('api-key-company-research').value;
    const loadingDiv = document.getElementById('company-research-loading');
    const resultDiv = document.getElementById('company-research-result');

    resultDiv.style.display = 'none';
    loadingDiv.style.display = 'block';

    if (!companyUrl || !apiKey) {
        showAlert('Please provide a company URL and your API key.', 'warning');
        loadingDiv.style.display = 'none';
        return;
    }

    try {
        const response = await fetch('/api/ai/company-research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                company_url: companyUrl,
                ai_provider: aiProvider,
                api_key: apiKey
            })
        });

        if (response.ok) {
            const data = await response.json();
            const formattedHtml = formatAiResultToHtml(data.result);
            openHtmlResultWindow('Company Research Result', formattedHtml);
            showAlert('Company research completed successfully! Result opened in a new window.', 'success');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to research company.');
        }
    } catch (error) {
        console.error('Error researching company:', error);
        showAlert('Error researching company: ' + error.message, 'error');
        resultDiv.innerHTML = `<h4>Error:</h4><p>${error.message}</p>`;
        resultDiv.style.display = 'block';
    } finally {
        loadingDiv.style.display = 'none';
    }
}

/**
 * Handles the "Tuned 'About Me' Answer" AI service request.
 */
async function generateAboutMeAnswer() {
    const jobDescription = document.getElementById('job-desc-about-me').value;
    const aiProvider = document.getElementById('ai-provider-about-me').value;
    const apiKey = document.getElementById('api-key-about-me').value;
    const loadingDiv = document.getElementById('about-me-loading');
    const resultDiv = document.getElementById('about-me-result');

    resultDiv.style.display = 'none';
    loadingDiv.style.display = 'block';

    if (!jobDescription || !apiKey) {
        showAlert('Please provide a job description and your API key.', 'warning');
        loadingDiv.style.display = 'none';
        return;
    }

    try {
        await loadProfile();
        const response = await fetch('/api/ai/about-me-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_description: jobDescription,
                profile: profile,
                ai_provider: aiProvider,
                api_key: apiKey
            })
        });

        if (response.ok) {
            const data = await response.json();
            const formattedHtml = formatAiResultToHtml(data.result);
            openHtmlResultWindow('Tuned "About Me" Answer', formattedHtml);
            showAlert('"About Me" answer generated successfully! Result opened in a new window.', 'success');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to generate "About Me" answer.');
        }
    } catch (error) {
        console.error('Error generating "About Me" answer:', error);
        showAlert('Error generating "About Me" answer: ' + error.message, 'error');
        resultDiv.innerHTML = `<h4>Error:</h4><p>${error.message}</p>`;
        resultDiv.style.display = 'block';
    } finally {
        loadingDiv.style.display = 'none';
    }
}

/**
 * Handles the "Fill Profile from Resume (AI)" AI service request.
 */
async function fillProfileFromResumeAI() {
    const resumeFile = document.getElementById('resume-pdf-input').files[0];
    const aiProvider = document.getElementById('ai-provider-fill-profile').value;
    const apiKey = document.getElementById('api-key-fill-profile').value;
    const fillProfileLoading = document.getElementById('fill-profile-loading');
    const fillProfileResult = document.getElementById('fill-profile-result');

    fillProfileResult.style.display = 'none';
    fillProfileLoading.style.display = 'block';

    if (!resumeFile) {
        showAlert('Please select a resume PDF file.', 'warning');
        fillProfileLoading.style.display = 'none';
        return;
    }
    if (!apiKey) {
        showAlert('Please provide your API key.', 'warning');
        fillProfileLoading.style.display = 'none';
        return;
    }

    const formData = new FormData();
    formData.append('resume_file', resumeFile);
    formData.append('ai_provider', aiProvider);
    formData.append('api_key', apiKey);

    try {
        const response = await fetch('/api/ai/profile/fill-from-resume-ai', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            fillProfileResult.innerHTML = `<h4>Profile Filled Successfully!</h4><pre>${JSON.stringify(data.profile, null, 2)}</pre>`;
            fillProfileResult.style.display = 'block';
            showAlert('Profile filled successfully from resume!', 'success');
            loadProfile(); // Reload profile data to update the form
        } else {
            let errorMessage;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || 'Failed to fill profile from resume';
            } catch (parseError) {
                errorMessage = await response.text() || `HTTP Error: ${response.status}`;
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Error filling profile from resume:', error);
        fillProfileResult.innerHTML = `<h4>Error:</h4><p>${error.message}</p>`;
        fillProfileResult.style.display = 'block';
        showAlert('Error filling profile from resume: ' + error.message, 'error');
    } finally {
        document.getElementById('resume-pdf-input').value = '';
        fillProfileLoading.style.display = 'none';
    }
}


// Expose functions to the global scope for HTML event handlers and app.js
window.showAiServicePage = showAiServicePage;
window.estimateJobChance = estimateJobChance;
window.tuneCv = tuneCv;
window.generateCoverLetter = generateCoverLetter;
window.sendInterviewQaMessage = sendInterviewQaMessage;
window.extractSkills = extractSkills;
window.craftInterviewQuestions = craftInterviewQuestions;
window.researchCompanyWebsite = researchCompanyWebsite;
window.generateAboutMeAnswer = generateAboutMeAnswer;
window.fillProfileFromResumeAI = fillProfileFromResumeAI;

// Global variables for main app logic
// These are defined here for direct access by global functions,
// but module-specific variables are now within their own files.
let globalConfirmModal;
let globalConfirmMessage;
let globalConfirmYesBtn;
let globalConfirmNoBtn;

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get references to global confirm modal elements
    globalConfirmModal = document.getElementById('global-confirm-modal');
    globalConfirmMessage = document.getElementById('global-confirm-message');
    globalConfirmYesBtn = document.getElementById('global-confirm-yes');
    globalConfirmNoBtn = document.getElementById('global-confirm-no');

    initializeEventListeners();
    // Load initial data for the default active tab (Applications)
    loadApplications();
    loadProfile();
    // Show the applications tab by default
    showTab('applications', document.querySelector('.nav-tab[data-tab="applications"]'));

    // Explicitly hide all AI tool loading and result divs on page load
    // This is handled by ai_services_frontend.js's showAiServicePage now,
    // but ensures initial state is clean.
    document.getElementById('chance-loading').style.display = 'none';
    document.getElementById('chance-result').style.display = 'none';
    document.getElementById('cv-loading').style.display = 'none';
    document.getElementById('cv-result').style.display = 'none';
    document.getElementById('cover-letter-loading').style.display = 'none';
    document.getElementById('cover-letter-result').style.display = 'none';
    document.getElementById('qa-loading').style.display = 'none';
    document.getElementById('skill-extractor-loading').style.display = 'none';
    document.getElementById('skill-extractor-result').style.display = 'none';
    document.getElementById('craft-questions-loading').style.display = 'none';
    document.getElementById('craft-questions-result').style.display = 'none';
    document.getElementById('company-research-loading').style.display = 'none';
    document.getElementById('company-research-result').style.display = 'none';
    document.getElementById('about-me-loading').style.display = 'none';
    document.getElementById('about-me-result').style.display = 'none';
    document.getElementById('fill-profile-loading').style.display = 'none';
    document.getElementById('fill-profile-result').style.display = 'none';
});

/**
 * Initializes all core event listeners for tab navigation and AI service selection.
 */
function initializeEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-tabs .nav-tab').forEach(tab => {
        // Exclude the dropdown itself from direct tab switching
        if (!tab.classList.contains('dropdown')) {
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                showTab(tabName, this);
                if (tabName === 'calendar') {
                    loadInterviews(); // Load interviews when calendar tab is shown
                } else if (tabName === 'dashboard') {
                    // Set dashboard month selector to current month by default
                    const year = currentDashboardDate.getFullYear();
                    const month = (currentDashboardDate.getMonth() + 1).toString().padStart(2, '0');
                    document.getElementById('dashboard-month-select').value = `${year}-${month}`;
                    loadDashboardData(); // Load data for dashboard when tab is shown
                }
            });
        }
    });

    // AI Tools Dropdown Toggle
    const aiToolsDropdown = document.getElementById('ai-tools-dropdown');
    aiToolsDropdown.addEventListener('click', function(event) {
        // Toggle 'active' class on the dropdown itself to show/hide content
        this.classList.toggle('active');
        // Prevent immediate closing if clicking inside the dropdown content
        event.stopPropagation();
    });

    // Hide dropdown if clicked outside
    window.addEventListener('click', function(event) {
        if (!aiToolsDropdown.contains(event.target)) {
            aiToolsDropdown.classList.remove('active');
        }
    });

    // AI Service Link Clicks within Dropdown
    document.querySelectorAll('.dropdown-content a').forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default link behavior
            const serviceId = this.getAttribute('data-ai-service');
            showTab('ai-tools', document.getElementById('ai-tools-dropdown')); // Activate AI Tools tab
            showAiServicePage(serviceId); // Show the specific AI service page
            aiToolsDropdown.classList.remove('active'); // Hide the dropdown after selection
        });
    });


    // Application form events (delegated to applications.js)
    document.getElementById('add-app-btn').addEventListener('click', showAddApplicationForm);
    document.getElementById('cancel-app-btn').addEventListener('click', hideAddApplicationForm);
    document.getElementById('application-form').addEventListener('submit', addApplication);
    document.getElementById('filter-applications').addEventListener('input', filterAndRenderApplications);
    document.getElementById('view-toggle').addEventListener('change', toggleApplicationView);
    document.getElementById('cv-file').addEventListener('change', handleCvFileUpload);


    // Profile form events (delegated to profile.js)
    document.getElementById('profile-form').addEventListener('submit', saveProfile);
    document.getElementById('add-education-btn').addEventListener('click', addEducationField);
    document.getElementById('add-experience-btn').addEventListener('click', addExperienceField);
    document.getElementById('add-skill-btn').addEventListener('click', addSkillField);
    document.getElementById('add-language-btn').addEventListener('click', addLanguageField);
    document.getElementById('add-certification-btn').addEventListener('click', addCertificationField);
    document.getElementById('profile-cv-file').addEventListener('change', handleProfileCvUpload);


    // AI Tools event listeners (delegated to ai_services_frontend.js)
    document.getElementById('estimate-chance-btn').addEventListener('click', estimateJobChance);
    document.getElementById('tune-cv-btn').addEventListener('click', tuneCv);
    document.getElementById('generate-cover-letter-btn').addEventListener('click', generateCoverLetter); // New
    document.getElementById('qa-chat-send-btn').addEventListener('click', sendInterviewQaMessage); // New
    document.getElementById('qa-chat-input').addEventListener('keypress', function(event) { // New: Enter key for chat
        if (event.key === 'Enter') {
            sendInterviewQaMessage();
        }
    });
    document.getElementById('extract-skills-btn').addEventListener('click', extractSkills); // New
    document.getElementById('craft-questions-btn').addEventListener('click', craftInterviewQuestions); // New
    document.getElementById('research-company-btn').addEventListener('click', researchCompanyWebsite); // New
    document.getElementById('generate-about-me-btn').addEventListener('click', generateAboutMeAnswer); // New
    document.getElementById('fill-profile-btn').addEventListener('click', fillProfileFromResumeAI); // Existing, now in ai_services_frontend.js

    // Calendar events (delegated to calendar.js)
    document.getElementById('prev-month-btn').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month-btn').addEventListener('click', () => changeMonth(1));
    document.getElementById('add-interview-btn').addEventListener('click', showInterviewFormModal);
    document.getElementById('interview-form').addEventListener('submit', handleInterviewFormSubmit);

    // Dashboard events (delegated to dashboard.js)
    document.getElementById('dashboard-month-select').addEventListener('change', function() {
        const [year, month] = this.value.split('-').map(Number);
        currentDashboardDate = new Date(year, month - 1, 1); // Month is 0-indexed for Date object
        loadDashboardData();
    });
}

/**
 * Function to show/hide main tabs.
 * @param {string} tabName The ID of the tab content to show.
 * @param {HTMLElement} clickedTab The navigation tab element that was clicked.
 */
function showTab(tabName, clickedTab) {
    // Remove 'active' from all tabs and content
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add 'active' to the clicked tab and corresponding content
    clickedTab.classList.add('active');
    document.getElementById(tabName).classList.add('active');

    // If switching to AI Tools, ensure the intro message is visible if no service is selected
    if (tabName === 'ai-tools') {
        const aiToolsIntro = document.getElementById('ai-tools-intro-message');
        const activeServicePage = document.querySelector('.ai-service-page[style*="display: block"]');
        if (!activeServicePage) {
            aiToolsIntro.style.display = 'block';
        } else {
            aiToolsIntro.style.display = 'none';
        }
    }
}

// Expose showTab globally so it can be called from other modules if needed
window.showTab = showTab;

// Global variables
// These are now mostly managed within their respective modules (applications.js, calendar.js, dashboard.js)
// However, some global references for modals and initial setup remain here.

// References to the global confirmation modal elements
let globalConfirmModal;
let globalConfirmMessage;
let globalConfirmYesBtn;
let globalConfirmNoBtn;


// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Get references to global confirm modal elements
    globalConfirmModal = document.getElementById('global-confirm-modal');
    globalConfirmMessage = document.getElementById('global-confirm-message');
    globalConfirmYesBtn = document.getElementById('global-confirm-yes');
    globalConfirmNoBtn = document.getElementById('global-confirm-no');

    // Expose these global elements to the window object so utils.js can access them
    window.globalConfirmModal = globalConfirmModal;
    window.globalConfirmMessage = globalConfirmMessage;
    window.globalConfirmYesBtn = globalConfirmYesBtn;
    window.globalConfirmNoBtn = globalConfirmNoBtn;

    initializeEventListeners();
    window.loadApplications(); // Load applications for the main tab (from applications.js)
    window.loadProfile(); // Load profile (from profile.js)
    // Show the applications tab by default
    // Ensure the 'applications' tab element is correctly passed
    window.showTab('applications', document.querySelector('.nav-tab[data-tab="applications"]'));

    // Explicitly hide all AI tool loading and result divs on page load
    document.getElementById('ai-tools-intro-message').style.display = 'block'; // Show intro message by default
    document.querySelectorAll('.ai-service-page').forEach(page => page.style.display = 'none'); // Hide all AI tool sections

    // Hide loading/result divs for AI tools
    document.getElementById('chance-loading').style.display = 'none';
    document.getElementById('chance-result').style.display = 'none';
    document.getElementById('cv-loading').style.display = 'none';
    document.getElementById('cv-result').style.display = 'none';
    document.getElementById('cover-letter-loading').style.display = 'none';
    document.getElementById('cover-letter-result').style.display = 'none';
    document.getElementById('qa-loading').style.display = 'none';
    // No qa-result div, chat display handles it
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
 * Initializes all major event listeners for the application.
 * This function acts as a central point for setting up interactivity.
 */
function initializeEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        // Skip the AI Tools dropdown itself from the direct tab switching logic
        // This is now handled by its own click listener below, which also activates the main 'ai-tools' tab.
        if (tab.id === 'ai-tools-dropdown') {
            return;
        }
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            if (tabName) { // Only proceed if data-tab exists
                window.showTab(tabName, this); // Use showTab from utils.js
                if (tabName === 'calendar') {
                    window.loadMonthlyInterviews(); // Load interviews when calendar tab is shown (from calendar.js)
                    window.renderCalendar(); // Render the calendar grid
                } else if (tabName === 'dashboard') {
                    // Set dashboard month selector to current month by default
                    const year = window.currentDashboardDate.getFullYear(); // Use global from dashboard.js
                    const month = (window.currentDashboardDate.getMonth() + 1).toString().padStart(2, '0'); // Use global from dashboard.js
                    document.getElementById('dashboard-month-select').value = `${year}-${month}`;
                    window.loadDashboardData(); // Call dashboard.js function
                }
            }
        });
    });

    // Application form events (delegated to applications.js via window scope)
    document.getElementById('add-app-btn').addEventListener('click', window.showAddApplicationForm);
    document.getElementById('cancel-app-btn').addEventListener('click', window.hideAddApplicationForm);
    document.getElementById('application-form').addEventListener('submit', window.addApplication);
    document.getElementById('filter-applications').addEventListener('input', window.filterAndRenderApplications);
    // Ensure this listener is correctly set for the view toggle
    document.getElementById('view-toggle').addEventListener('change', window.toggleApplicationView);
    document.getElementById('cv-file').addEventListener('change', window.handleCvFileUpload);


    // Profile form events (delegated to profile.js via window scope)
    document.getElementById('profile-form').addEventListener('submit', window.saveProfile);
    document.getElementById('add-education-btn').addEventListener('click', window.addEducationField);
    document.getElementById('add-experience-btn').addEventListener('click', window.addExperienceField);
    document.getElementById('add-skill-btn').addEventListener('click', window.addSkillField);
    document.getElementById('add-language-btn').addEventListener('click', window.addLanguageField);
    document.getElementById('add-certification-btn').addEventListener('click', window.addCertificationField);
    document.getElementById('profile-cv-file').addEventListener('change', window.handleProfileCvUpload);


    // AI Tools event listeners (delegated to ai_services_frontend.js via window scope)
    document.getElementById('estimate-chance-btn').addEventListener('click', window.estimateJobChance);
    document.getElementById('tune-cv-btn').addEventListener('click', window.tuneCv);
    document.getElementById('generate-cover-letter-btn').addEventListener('click', window.generateCoverLetter);
    document.getElementById('qa-chat-send-btn').addEventListener('click', window.sendInterviewChatMessage);
    document.getElementById('qa-chat-input').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            window.sendInterviewChatMessage();
        }
    });
    document.getElementById('extract-skills-btn').addEventListener('click', window.extractJobSkills);
    document.getElementById('craft-questions-btn').addEventListener('click', window.craftInterviewQuestions);
    document.getElementById('research-company-btn').addEventListener('click', window.researchCompanyWebsite);
    document.getElementById('generate-about-me-btn').addEventListener('click', window.generateAboutMeAnswer);
    document.getElementById('fill-profile-btn').addEventListener('click', window.fillProfileFromResumeAI);


    // Calendar events (delegated to calendar.js via window scope)
    document.getElementById('prev-month-btn')?.addEventListener('click', () => window.changeMonth(-1));
    document.getElementById('next-month-btn')?.addEventListener('click', () => window.changeMonth(1));
    document.getElementById('add-interview-btn')?.addEventListener('click', window.showInterviewFormModal);
    document.getElementById('interview-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        await window.saveInterview(); // Ensure saveInterview is called from window
    });

    // Dashboard events (delegated to dashboard.js via window scope)
    document.getElementById('dashboard-month-select').addEventListener('change', function() {
        const [year, month] = this.value.split('-').map(Number);
        window.currentDashboardDate = new Date(year, month - 1, 1); // Update global from dashboard.js
        window.loadDashboardData(); // Call dashboard.js function
    });

    // Dashboard view toggle (delegated to dashboard.js via window scope)
    document.getElementById('dashboard-view-toggle').addEventListener('change', function() {
        window.currentDashboardView = this.value; // Update global from dashboard.js
        const monthSelector = document.getElementById('dashboard-month-selector');
        if (window.currentDashboardView === 'monthly') {
            monthSelector.style.display = 'block';
        } else {
            monthSelector.style.display = 'none';
        }
        window.loadDashboardData(); // Call dashboard.js function
    });

    // AI Tools Dropdown menu functionality
    const aiToolsDropdown = document.getElementById('ai-tools-dropdown');
    if (aiToolsDropdown) { // Check if element exists
        aiToolsDropdown.addEventListener('click', function(event) {
            this.classList.toggle('active'); // Toggle 'active' class on click
            event.stopPropagation(); // Prevent click from bubbling up and closing immediately
            // When AI Tools dropdown is clicked, ensure the main AI Tools tab is active
            // Find the actual AI Tools tab element by its data-tab attribute
            const aiToolsTabElement = document.querySelector('.nav-tab[data-tab="ai-tools"]');
            if (aiToolsTabElement) {
                window.showTab('ai-tools', aiToolsTabElement); // Pass the actual AI Tools tab element
            } else {
                console.error("AI Tools tab element not found for showTab call.");
            }
        });
    }

    // Close dropdown if clicked outside
    window.addEventListener('click', function(event) {
        if (aiToolsDropdown && !aiToolsDropdown.contains(event.target)) {
            aiToolsDropdown.classList.remove('active');
        }
    });

    // Handle clicks on dropdown items to show specific AI service sections
    document.querySelectorAll('.dropdown-content a').forEach(item => {
        item.addEventListener('click', function(event) {
            event.preventDefault();
            const serviceId = this.getAttribute('data-ai-service');
            // Ensure window.showAiServiceSection is available before calling
            if (typeof window.showAiServiceSection === 'function') {
                window.showAiServiceSection(serviceId); // Function to show the specific AI section
            } else {
                console.error("window.showAiServiceSection is not a function. ai_services_frontend.js might not be loaded or exposed correctly.");
                window.showAlert("AI services not fully loaded. Please refresh.", "error");
            }

            if (aiToolsDropdown) {
                aiToolsDropdown.classList.remove('active'); // Close dropdown after selection
            }
        });
    });
}


// Function to show/hide tabs (moved from main.js, now in app.js as it's a core UI function)
function showTab(tabName, clickedTab) {
    // Remove 'active' from all tabs and content
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add 'active' to the clicked tab and corresponding content
    if (clickedTab) { // Ensure clickedTab exists before adding class
        clickedTab.classList.add('active');
    }
    const targetTabContent = document.getElementById(tabName);
    if (targetTabContent) { // Ensure targetTabContent exists before adding class
        targetTabContent.classList.add('active');
    } else {
        console.error(`Tab content with ID "${tabName}" not found.`);
    }
}

// Expose core UI functions to the window object for modular access
window.showTab = showTab;
window.initializeEventListeners = initializeEventListeners; // Expose for potential re-initialization if needed

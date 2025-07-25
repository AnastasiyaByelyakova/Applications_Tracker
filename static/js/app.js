// Global variable to store the currently loaded user profile
window.profile = null;

// Global variables for the confirmation modal, initialized on DOMContentLoaded
// These are exposed to the window scope so utils.js can access them.
window.globalConfirmModal = null;
window.globalConfirmMessage = null;
window.globalConfirmYesBtn = null;
window.globalConfirmNoBtn = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize global confirmation modal elements
    window.globalConfirmModal = document.getElementById('global-confirm-modal');
    window.globalConfirmMessage = document.getElementById('global-confirm-message');
    window.globalConfirmYesBtn = document.getElementById('global-confirm-yes');
    window.globalConfirmNoBtn = document.getElementById('global-confirm-no');

    // Get all nav tabs once and convert to an array for stable iteration
    const allNavTabs = Array.from(document.querySelectorAll('.nav-tab'));
    console.log('DEBUG: DOMContentLoaded - allNavTabs initialized:', allNavTabs);

    // Tab Navigation
    allNavTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab; // Get data-tab attribute

            // IMPORTANT: Only proceed with general tab logic if the clicked element has a data-tab.
            // This correctly excludes the AI Tools dropdown itself, which now lacks data-tab.
            if (!tabId) {
                console.log('DEBUG: Clicked element has no data-tab. Skipping general tab logic for:', this);
                // The dedicated aiToolsDropdown listener (further down) will handle toggling its active state.
                return; // Exit this handler if it's not a content-switching tab
            }

            console.log('DEBUG: Regular Tab clicked (with data-tab):', this);

            // Remove 'active' from all tabs and hide all tab contents
            for (const t of allNavTabs) {
                if (t && t.classList) {
                    t.classList.remove('active');
                } else {
                    console.error('ERROR: Encountered invalid nav tab element during deactivation:', t);
                }
            }
            document.querySelectorAll('.tab-content').forEach(content => {
                if (content && content.classList) {
                    content.classList.remove('active');
                } else {
                    console.error('ERROR: Encountered invalid tab content element during deactivation:', content);
                }
            });

            // Add 'active' to the clicked tab
            this.classList.add('active');

            // Show the corresponding tab content
            const targetTabContent = document.getElementById(tabId);
            if (targetTabContent && targetTabContent.classList) {
                targetTabContent.classList.add('active');
            } else {
                console.error('ERROR: Target tab content not found or invalid:', tabId, targetTabContent);
            }

            // Specific actions when switching tabs
            if (tabId === 'dashboard') {
                loadDashboardData();
            } else if (tabId === 'calendar') {
                renderCalendar();
                loadMonthlyInterviews();
            } else if (tabId === 'applications') {
                loadApplications();
            } else if (tabId === 'profile') {
                loadProfile();
            }
            // Hide all AI service sub-pages when switching away from AI Tools,
            // or ensure only the intro message is shown if AI Tools is selected.
            if (tabId !== 'ai-tools') {
                document.querySelectorAll('.ai-service-page').forEach(page => page.style.display = 'none');
                document.getElementById('ai-tools-intro-message').style.display = 'block';
            }
        });
    });

    // AI Tools Dropdown functionality
    const aiToolsDropdown = document.getElementById('ai-tools-dropdown');
    if (aiToolsDropdown) {
        aiToolsDropdown.addEventListener('click', function(event) {
            console.log('DEBUG: AI Tools Dropdown element click listener triggered.');
            this.classList.toggle('active'); // Toggle dropdown visibility
            event.stopPropagation(); // Prevent document click from closing it immediately
        });
    } else {
        console.error('ERROR: AI Tools Dropdown element not found.');
    }

    // Close dropdown if clicked outside
    document.addEventListener('click', function(event) {
        if (aiToolsDropdown && aiToolsDropdown.classList && !aiToolsDropdown.contains(event.target)) {
            aiToolsDropdown.classList.remove('active');
        }
    });

    // Handle clicks on AI service links within the dropdown
    document.querySelectorAll('.dropdown-content a').forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const serviceId = this.dataset.aiService;
            // Explicitly call through window object
            if (typeof window.showAiServicePage === 'function') {
                window.showAiServicePage(serviceId);
            } else {
                console.error('ERROR: window.showAiServicePage is not defined.');
                showAlert('An internal error occurred: AI service display function not found.', 'error');
                return;
            }

            // Also switch to the AI Tools tab if not already there
            if (allNavTabs.length > 0) {
                for (const t of allNavTabs) {
                    if (t && t.classList) {
                        t.classList.remove('active');
                    } else {
                        console.error('ERROR: Encountered invalid nav tab element in dropdown click handler:', t);
                    }
                }
            }
            document.querySelectorAll('.tab-content').forEach(content => {
                if (content && content.classList) {
                    content.classList.remove('active');
                } else {
                    console.error('ERROR: Encountered invalid tab content element in dropdown click handler:', content);
                }
            });
            const aiToolsTab = document.querySelector('.nav-tab[data-tab="ai-tools"]');
            if (aiToolsTab && aiToolsTab.classList) {
                aiToolsTab.classList.add('active');
            } else {
                console.error('ERROR: AI Tools tab element not found or invalid:', aiToolsTab);
            }
            const aiToolsContent = document.getElementById('ai-tools');
            if (aiToolsContent && aiToolsContent.classList) {
                aiToolsContent.classList.add('active');
            } else {
                console.error('ERROR: AI Tools content element not found or invalid:', aiToolsContent);
            }
            if (aiToolsDropdown && aiToolsDropdown.classList) {
                aiToolsDropdown.classList.remove('active'); // Close dropdown after selection
            }
        });
    });

    // Initial load of applications when the page loads
    await loadApplications();
    await loadProfile(); // Load profile data on startup
    await loadDashboardData(); // Load dashboard data on startup
    renderCalendar(); // Render calendar on startup
    loadMonthlyInterviews(); // Load interviews for the current month on startup

    // Event Listeners for AI Service Buttons
    document.getElementById('estimate-chance-btn')?.addEventListener('click', estimateJobChance);
    document.getElementById('tune-cv-btn')?.addEventListener('click', tuneCv);
    document.getElementById('generate-cover-letter-btn')?.addEventListener('click', generateCoverLetter);
    document.getElementById('qa-chat-send-btn')?.addEventListener('click', sendInterviewQaMessage);
    document.getElementById('qa-chat-input')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendInterviewQaMessage();
        }
    });
    document.getElementById('extract-skills-btn')?.addEventListener('click', extractSkills);
    document.getElementById('craft-questions-btn')?.addEventListener('click', craftInterviewQuestions);
    document.getElementById('research-company-btn')?.addEventListener('click', researchCompanyWebsite);
    document.getElementById('generate-about-me-btn')?.addEventListener('click', generateAboutMeAnswer);
    document.getElementById('fill-profile-btn')?.addEventListener('click', fillProfileFromResumeAI);

    // Dashboard month selection listener
    const dashboardMonthSelect = document.getElementById('dashboard-month-select');
    if (dashboardMonthSelect) {
        // Set initial value to current month
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        dashboardMonthSelect.value = `${year}-${month}`;

        dashboardMonthSelect.addEventListener('change', (event) => {
            const [selectedYear, selectedMonth] = event.target.value.split('-').map(Number);
            // Set currentDashboardDate to the first day of the selected month
            currentDashboardDate = new Date(selectedYear, selectedMonth - 1, 1);
            loadDashboardData();
        });
    }
});

// Function to load profile (can be called by other modules)
async function loadProfile() {
    try {
        const response = await fetch('/api/profile');
        if (!response.ok) {
            // If profile doesn't exist yet, that's okay, we'll create a new one
            if (response.status === 404) {
                window.profile = {
                    full_name: "", email: "", phone: "", location: "", summary: "",
                    education: [], experience: [], skills: [], languages: [], certifications: [],
                    linkedin_url: "", github_url: "", portfolio_url: "", cv_profile_file: null
                };
                console.log("No profile found, initializing a new empty profile.");
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        window.profile = await response.json();
        populateProfileForm(window.profile);
    } catch (error) {
        console.error('Error loading profile:', error);
        showAlert('Error loading profile: ' + error.message, 'error');
    }
}

// Expose loadProfile to the window so other modules can call it
window.loadProfile = loadProfile;

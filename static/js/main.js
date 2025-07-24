// Global variables
let applications = []; // Filtered applications for the main applications tab
let allApplications = []; // All applications for dashboard calculations
let profile = {};
let interviews = []; // Stores interview data
let currentSortColumnApplications = 'application_date';
let currentSortDirectionApplications = 'desc';
let currentFilterTextApplications = '';
let currentViewApplications = 'cards';

let currentSortColumnEducation = 'graduation_year';
let currentSortDirectionEducation = 'desc';
let currentFilterTextEducation = '';

let currentSortColumnExperience = 'start_date';
let currentSortDirectionExperience = 'desc';
let currentFilterTextExperience = '';

let currentCalendarDate = new Date(); // For calendar navigation
let currentDashboardDate = new Date(); // For dashboard month selection

// New global variables for interview table sorting
let currentSortColumnInterviews = 'start_datetime';
let currentSortDirectionInterviews = 'asc';


// Chart instances to allow for updates
let applicationsStatusChartInstance = null;
let interviewsCountChartInstance = null;
let applicationTrendChartInstance = null;
let interviewTypeChartInstance = null;

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

    initializeEventListeners();
    loadApplications(); // Load applications for the main tab
    loadProfile();
    // Show the applications tab by default
    showTab('applications', document.querySelector('.nav-tab[data-tab="applications"]'));

    // Explicitly hide all AI tool loading and result divs on page load
    document.getElementById('chance-loading').style.display = 'none';
    document.getElementById('chance-result').style.display = 'none';
    document.getElementById('cv-loading').style.display = 'none';
    document.getElementById('cv-result').style.display = 'none';
    document.getElementById('fill-profile-loading').style.display = 'none';
    document.getElementById('fill-profile-result').style.display = 'none';
});

// Initialize all event listeners
function initializeEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
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
    });

    // Application form events
    document.getElementById('add-app-btn').addEventListener('click', showAddApplicationForm);
    document.getElementById('cancel-app-btn').addEventListener('click', hideAddApplicationForm);
    document.getElementById('application-form').addEventListener('submit', addApplication);
    document.getElementById('filter-applications').addEventListener('input', filterAndRenderApplications);
    document.getElementById('view-toggle').addEventListener('change', toggleApplicationView);
    document.getElementById('cv-file').addEventListener('change', handleCvFileUpload);


    // Profile form events
    document.getElementById('profile-form').addEventListener('submit', saveProfile);
    document.getElementById('add-education-btn').addEventListener('click', addEducationField);
    document.getElementById('add-experience-btn').addEventListener('click', addExperienceField);
    document.getElementById('add-skill-btn').addEventListener('click', addSkillField);
    document.getElementById('add-language-btn').addEventListener('click', addLanguageField);
    document.getElementById('add-certification-btn').addEventListener('click', addCertificationField);
    document.getElementById('profile-cv-file').addEventListener('change', handleProfileCvUpload);


    // AI Tools event listeners
    document.getElementById('estimate-chance-btn').addEventListener('click', estimateJobChance);
    document.getElementById('tune-cv-btn').addEventListener('click', tuneCv);
    document.getElementById('fill-profile-btn').addEventListener('click', fillProfileFromResumeAI);

    // Calendar events
    document.getElementById('prev-month-btn').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month-btn').addEventListener('click', () => changeMonth(1));
    document.getElementById('add-interview-btn').addEventListener('click', showInterviewFormModal);
    document.getElementById('interview-form').addEventListener('submit', handleInterviewFormSubmit);

    // Dashboard events
    document.getElementById('dashboard-month-select').addEventListener('change', function() {
        const [year, month] = this.value.split('-').map(Number);
        currentDashboardDate = new Date(year, month - 1, 1); // Month is 0-indexed for Date object
        loadDashboardData();
    });
}

// Function to show/hide tabs
function showTab(tabName, clickedTab) {
    // Remove 'active' from all tabs and content
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add 'active' to the clicked tab and corresponding content
    clickedTab.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// --- Application Functions ---

function renderApplications() {
    const applicationListCards = document.getElementById('application-list-cards');
    const applicationsTableBody = document.getElementById('applications-table-body');

    applicationListCards.innerHTML = '';
    applicationsTableBody.innerHTML = '';

    let filteredApplications = applications.filter(app =>
        app.job_title.toLowerCase().includes(currentFilterTextApplications.toLowerCase()) ||
        app.company.toLowerCase().includes(currentFilterTextApplications.toLowerCase()) ||
        app.status.toLowerCase().includes(currentFilterTextApplications.toLowerCase())
    );

    // Sort applications
    filteredApplications.sort((a, b) => {
        let valA = a[currentSortColumnApplications];
        let valB = b[currentSortColumnApplications];

        // Handle date sorting
        if (currentSortColumnApplications === 'application_date') {
            valA = new Date(valA);
            valB = new Date(valB);
        }

        if (valA < valB) return currentSortDirectionApplications === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDirectionApplications === 'asc' ? 1 : -1;
        return 0;
    });

    filteredApplications.forEach(app => {
        // Render card view
        const card = document.createElement('div');
        card.className = 'application-card';
        card.innerHTML = `
            <h4>${app.job_title} at ${app.company}</h4>
            <p><strong>Status:</strong> <span class="status-badge status-${app.status.toLowerCase()}">${app.status}</span></p>
            <p><strong>Applied On:</strong> ${new Date(app.application_date).toLocaleDateString()}</p>
            <div class="card-actions">
                <button class="btn btn-info btn-sm" onclick="viewApplication('${app.id}')">View Details</button>
                <button class="btn btn-danger btn-sm" onclick="deleteApplication('${app.id}')">Delete</button>
            </div>
        `;
        applicationListCards.appendChild(card);

        // Render table row view
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${app.job_title}</td>
            <td>${app.company}</td>
            <td>${new Date(app.application_date).toLocaleDateString()}</td>
            <td>
                <select onchange="updateApplicationStatus('${app.id}', this.value)" class="status-select status-${app.status.toLowerCase()}">
                    <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
                    <option value="Interview" ${app.status === 'Interview' ? 'selected' : ''}>Interview</option>
                    <option value="Rejection" ${app.status === 'Rejection' ? 'selected' : ''}>Rejection</option>
                    <option value="Offer" ${app.status === 'Offer' ? 'selected' : ''}>Offer</option>
                </select>
            </td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewApplication('${app.id}')">View</button>
                <button class="btn btn-danger btn-sm" onclick="deleteApplication('${app.id}')">Delete</button>
            </div>
        `;
        applicationsTableBody.appendChild(row);
    });

    toggleApplicationView(); // Apply the current view setting
}

function filterAndRenderApplications() {
    currentFilterTextApplications = document.getElementById('filter-applications').value;
    renderApplications();
}

function sortTableApplications(column) {
    if (currentSortColumnApplications === column) {
        currentSortDirectionApplications = currentSortDirectionApplications === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumnApplications = column;
        currentSortDirectionApplications = 'asc';
    }
    renderApplications();
}

function toggleApplicationView() {
    currentViewApplications = document.getElementById('view-toggle').value;
    const cardsView = document.getElementById('application-list-cards');
    const tableView = document.getElementById('application-list-table');

    if (currentViewApplications === 'cards') {
        cardsView.style.display = 'grid';
        tableView.style.display = 'none';
    } else {
        cardsView.style.display = 'none';
        tableView.style.display = 'block';
    }
}

async function loadApplications() {
    try {
        const response = await fetch('/api/applications');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        applications = await response.json();
        renderApplications();
    } catch (error) {
        console.error('Error loading applications:', error);
        showAlert('Failed to load applications. Please try again.', 'error');
    }
}

async function addApplication(event) {
    event.preventDefault();

    const jobTitle = document.getElementById('job-title').value;
    const company = document.getElementById('company').value;
    const description = document.getElementById('description').value;
    const link = document.getElementById('link').value;
    const applicationDate = document.getElementById('application-date').value; // This will be set by JS if empty
    const status = document.getElementById('status').value;
    const cvFile = document.getElementById('cv-file').files[0];
    const coverLetter = document.getElementById('cover-letter').value;

    let cvFilePath = null;
    if (cvFile) {
        const formData = new FormData();
        formData.append('file', cvFile);
        try {
            const uploadResponse = await fetch('/api/upload-cv', {
                method: 'POST',
                body: formData
            });
            if (!uploadResponse.ok) {
                throw new Error('Failed to upload CV file.');
            }
            const uploadResult = await uploadResponse.json();
            cvFilePath = uploadResult.path;
        } catch (error) {
            console.error('Error uploading CV:', error);
            showAlert('Failed to upload CV. Please try again.', 'error');
            return; // Stop the process if CV upload fails
        }
    }

    const newApplication = {
        job_title: jobTitle,
        company: company,
        description: description,
        link: link,
        application_date: applicationDate || new Date().toISOString().split('T')[0], // Set default if empty
        status: status,
        cv_file: cvFilePath,
        cover_letter: coverLetter
    };

    try {
        const response = await fetch('/api/applications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newApplication)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const addedApp = await response.json();
        applications.push(addedApp);
        renderApplications();
        document.getElementById('application-form').reset();
        hideAddApplicationForm();
        showAlert('Application added successfully!', 'success');
    } catch (error) {
        console.error('Error adding application:', error);
        showAlert('Failed to add application. Please try again.', 'error');
    }
}

async function updateApplicationStatus(id, newStatus) {
    const appIndex = applications.findIndex(app => app.id === id);
    if (appIndex > -1) {
        const appToUpdate = { ...applications[appIndex], status: newStatus };
        try {
            const response = await fetch(`/api/applications/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(appToUpdate)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const updatedApp = await response.json();
            applications[appIndex] = updatedApp;
            renderApplications(); // Re-render to update status badge/style
            showAlert('Application status updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating application status:', error);
            showAlert('Failed to update application status. Please try again.', 'error');
        }
    }
}

async function deleteApplication(id) {
    console.log('deleteApplication function called with ID:', id); // Debugging: Check if function is called and ID
    showConfirm('Are you sure you want to delete this application?', async () => {
        console.log('Confirmation received for deleting application ID:', id); // Debugging: Check if confirmed
        console.log('Applications array BEFORE deletion attempt:', [...applications]); // Debugging: Array before filter
        console.log(`Attempting to send DELETE request to: /api/applications/${id}`); // NEW LOG: Confirming fetch is about to happen
        try {
            const response = await fetch(`/api/applications/${id}`, {
                method: 'DELETE'
            });

            console.log('Delete API response status:', response.status); // Debugging: Check response status
            // Clone the response before reading its body, as body can only be read once
            const responseBody = await response.clone().json();
            console.log('Delete API full response:', responseBody); // Debugging: Log full response

            if (!response.ok) {
                // Attempt to parse error response from backend
                let errorMessage = `HTTP error! status: ${response.status}`;
                if (responseBody && responseBody.detail) {
                    errorMessage = responseBody.detail;
                } else {
                    errorMessage = await response.clone().text() || errorMessage; // Fallback to text if no JSON detail
                }
                throw new Error(errorMessage);
            }

            // If response is OK, filter the application from the local array
            applications = applications.filter(app => String(app.id) !== String(id)); // Ensure string comparison for IDs
            console.log('Applications array AFTER deletion attempt (filtered):', [...applications]); // Debugging: Array after filter
            renderApplications();
            showAlert('Application deleted successfully!', 'success');
            console.log('Application deleted successfully from frontend and re-rendered.'); // Debugging: Success log
        } catch (error) {
            console.error('Error deleting application:', error); // Debugging: Log full error
            showAlert('Failed to delete application: ' + error.message, 'error');
        }
    });
}

// Function to view application details in a modal
function viewApplication(id) {
    const app = applications.find(a => a.id === id);
    if (app) {
        document.getElementById('modal-job-title').textContent = app.job_title;
        document.getElementById('modal-company').textContent = app.company;
        document.getElementById('modal-status').textContent = app.status;
        document.getElementById('modal-status').className = `status-badge status-${app.status.toLowerCase()}`;
        document.getElementById('modal-application-date').textContent = new Date(app.application_date).toLocaleDateString();
        document.getElementById('modal-description').textContent = app.description;

        const modalLink = document.getElementById('modal-link');
        if (app.link) {
            modalLink.href = app.link;
            modalLink.style.display = 'inline';
        } else {
            modalLink.style.display = 'none';
        }

        const modalCvFileName = document.getElementById('modal-cv-file-name');
        const modalCvFileLink = document.getElementById('modal-cv-file-link');
        if (app.cv_file) {
            modalCvFileName.textContent = app.cv_file.split('/').pop(); // Display just the file name
            modalCvFileLink.href = app.cv_file;
            modalCvFileLink.style.display = 'inline';
        } else {
            modalCvFileName.textContent = 'No CV uploaded';
            modalCvFileLink.style.display = 'none';
        }

        document.getElementById('modal-cover-letter').textContent = app.cover_letter || 'No cover letter provided.';

        document.getElementById('application-detail-modal').classList.add('active'); // Show the modal
    }
}

// Function to close the application detail modal
function closeApplicationDetailModal() {
    document.getElementById('application-detail-modal').classList.remove('active');
}


function showAddApplicationForm() {
    document.getElementById('add-application-form').style.display = 'block';
    document.getElementById('add-app-btn').style.display = 'none';
    // Set default application date to today
    document.getElementById('application-date').value = new Date().toISOString().split('T')[0];
}

function hideAddApplicationForm() {
    document.getElementById('add-application-form').style.display = 'none';
    document.getElementById('add-app-btn').style.display = 'block';
    document.getElementById('application-form').reset(); // Clear form fields
}

function handleCvFileUpload(event) {
    const fileName = event.target.files[0] ? event.target.files[0].name : 'No file chosen';
    console.log('CV File selected:', fileName); // You can update a label here if needed
}

// --- Profile Functions ---

async function loadProfile() {
    try {
        const response = await fetch('/api/profile');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const fetchedProfile = await response.json();
        if (Object.keys(fetchedProfile).length > 0) { // Check if profile is not empty
            profile = fetchedProfile;
            populateProfileForm();
        } else {
            profile = { // Initialize with empty lists if no profile exists
                full_name: "", email: "", phone: "", location: "", summary: "",
                education: [], experience: [], skills: [], languages: [], certifications: [],
                linkedin_url: "", github_url: "", portfolio_url: "", "cv_profile_file": "" // Ensure cv_profile_file is initialized
            };
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showAlert('Failed to load profile. Please try again.', 'error');
        profile = { // Fallback to empty profile on error
            full_name: "", email: "", phone: "", location: "", summary: "",
            education: [], experience: [], skills: [], languages: [], certifications: [],
            linkedin_url: "", github_url: "", portfolio_url: "", "cv_profile_file": "" // Ensure cv_profile_file is initialized
        };
    }
}

function populateProfileForm() {
    document.getElementById('profile-full-name').value = profile.full_name || '';
    document.getElementById('profile-email').value = profile.email || '';
    document.getElementById('profile-phone').value = profile.phone || '';
    document.getElementById('profile-location').value = profile.location || '';
    document.getElementById('profile-summary').value = profile.summary || '';
    document.getElementById('profile-linkedin').value = profile.linkedin_url || '';
    document.getElementById('profile-github').value = profile.github_url || '';
    document.getElementById('profile-portfolio').value = profile.portfolio_url || '';
    document.getElementById('profile-cv-filename').textContent = profile.cv_profile_file ? `File: ${profile.cv_profile_file.split('/').pop()}` : 'No file uploaded';

    renderEducation();
    renderExperience();
    renderSkills();
    renderLanguages();
    renderCertifications();
}

async function saveProfile(event) {
    event.preventDefault();

    profile.full_name = document.getElementById('profile-full-name').value;
    profile.email = document.getElementById('profile-email').value;
    profile.phone = document.getElementById('profile-phone').value;
    profile.location = document.getElementById('profile-location').value;
    profile.summary = document.getElementById('profile-summary').value;
    profile.linkedin_url = document.getElementById('profile-linkedin').value;
    profile.github_url = document.getElementById('profile-github').value;
    profile.portfolio_url = document.getElementById('profile-portfolio').value;

    // The cv_profile_file path is already updated by handleProfileCvUpload if a new file was selected
    // If no new file was selected, it retains its previous value.

    try {
        const response = await fetch('/api/profile', {
            method: 'POST', // Or PUT if you want to use PUT for updates
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profile)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const savedProfile = await response.json();
        profile = savedProfile; // Update global profile with saved data (including ID)
        populateProfileForm(); // Re-populate to ensure consistency
        showAlert('Profile saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving profile:', error);
        showAlert('Failed to save profile. Please try again.', 'error');
    }
}

async function handleProfileCvUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        profile.cv_profile_file = null; // Clear if no file selected
        document.getElementById('profile-cv-filename').textContent = 'No file uploaded';
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const uploadResponse = await fetch('/api/profile/upload-cv', {
            method: 'POST',
            body: formData
        });
        if (!uploadResponse.ok) {
            throw new Error('Failed to upload profile CV file.');
        }
        const uploadResult = await uploadResponse.json();
        profile.cv_profile_file = uploadResult.path; // Store the path
        document.getElementById('profile-cv-filename').textContent = `File: ${file.name}`;
        showAlert('Profile CV uploaded successfully!', 'success');
    } catch (error) {
        console.error('Error uploading profile CV:', error);
        showAlert('Failed to upload profile CV. ' + error.message, 'error');
        profile.cv_profile_file = null; // Clear on error
        document.getElementById('profile-cv-file').value = ''; // Clear file input
        document.getElementById('profile-cv-filename').textContent = 'No file uploaded';
    }
}


// --- Dynamic List Management (Education, Experience, Skills, etc.) ---

function renderEducation() {
    const educationList = document.getElementById('education-list');
    educationList.innerHTML = '';
    profile.education.forEach((edu, index) => {
        const item = document.createElement('div');
        item.className = 'dynamic-item';
        item.innerHTML = `
            <div class="form-group editable-cell">
                <label>Degree</label>
                <input type="text" value="${edu.degree || ''}" onchange="updateEducationField(${index}, 'degree', this.value)">
            </div>
            <div class="form-group editable-cell">
                <label>Institution</label>
                <input type="text" value="${edu.institution || ''}" onchange="updateEducationField(${index}, 'institution', this.value)">
            </div>
            <div class="form-group editable-cell">
                <label>Graduation Year</label>
                <input type="number" value="${edu.graduation_year || ''}" onchange="updateEducationField(${index}, 'graduation_year', parseInt(this.value))">
            </div>
            <div class="form-group editable-cell">
                <label>GPA</label>
                <input type="number" step="0.01" value="${edu.gpa || ''}" onchange="updateEducationField(${index}, 'gpa', parseFloat(this.value))">
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn" onclick="removeEducation(${index})">Remove</button>
        `;
        educationList.appendChild(item);
    });
}

function addEducationField() {
    profile.education.push({ degree: '', institution: '', graduation_year: null, gpa: null });
    renderEducation();
}

function removeEducation(index) {
    profile.education.splice(index, 1);
    renderEducation();
}

function updateEducationField(index, field, value) {
    profile.education[index][field] = value;
}

// Function to sort education entries (placeholder)
function sortTableEducation(column) {
    if (currentSortColumnEducation === column) {
        currentSortDirectionEducation = currentSortDirectionEducation === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumnEducation = column;
        currentSortDirectionEducation = 'asc';
    }
    // For now, simply re-render. If a table view is added, this would sort the table.
    renderEducation();
    showAlert(`Education sorted by ${column} ${currentSortDirectionEducation.toUpperCase()}`, 'info');
}


function renderExperience() {
    const experienceList = document.getElementById('experience-list');
    experienceList.innerHTML = '';
    profile.experience.forEach((exp, index) => {
        // Format dates to YYYY-MM for month input type
        const startDateFormatted = exp.start_date ? exp.start_date.substring(0, 7) : '';
        const endDateFormatted = exp.end_date ? exp.end_date.substring(0, 7) : '';

        const item = document.createElement('div');
        item.className = 'dynamic-item';
        item.innerHTML = `
            <div class="form-group editable-cell">
                <label>Position</label>
                <input type="text" value="${exp.position || ''}" onchange="updateExperienceField(${index}, 'position', this.value)">
            </div>
            <div class="form-group editable-cell">
                <label>Company</label>
                <input type="text" value="${exp.company || ''}" onchange="updateExperienceField(${index}, 'company', this.value)">
            </div>
            <div class="form-group editable-cell">
                <label>Start Date</label>
                <input type="month" value="${startDateFormatted}" onchange="updateExperienceField(${index}, 'start_date', this.value)">
            </div>
            <div class="form-group editable-cell">
                <label>End Date</label>
                <input type="month" value="${endDateFormatted}" onchange="updateExperienceField(${index}, 'end_date', this.value)">
            </div>
            <div class="form-group editable-cell full-width">
                <label>Description</label>
                <textarea rows="3" onchange="updateExperienceField(${index}, 'description', this.value)">${exp.description || ''}</textarea>
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn" onclick="removeExperience(${index})">Remove</button>
        `;
        experienceList.appendChild(item);
    });
}

function addExperienceField() {
    profile.experience.push({ position: '', company: '', start_date: '', end_date: '', description: '' });
    renderExperience();
}

function removeExperience(index) {
    profile.experience.splice(index, 1);
    renderExperience();
}

function updateExperienceField(index, field, value) {
    profile.experience[index][field] = value;
}

// Function to sort experience entries (placeholder)
function sortTableExperience(column) {
    if (currentSortColumnExperience === column) {
        currentSortDirectionExperience = currentSortDirectionExperience === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumnExperience = column;
        currentSortDirectionExperience = 'asc';
    }
    // For now, simply re-render. If a table view is added, this would sort the table.
    renderExperience();
    showAlert(`Experience sorted by ${column} ${currentSortDirectionExperience.toUpperCase()}`, 'info');
}


function renderSkills() {
    const skillsList = document.getElementById('skills-list');
    skillsList.innerHTML = '';
    profile.skills.forEach((skill, index) => {
        const item = document.createElement('div');
        item.className = 'dynamic-item';
        item.innerHTML = `
            <div class="form-group editable-cell">
                <label>Skill Name</label>
                <input type="text" value="${skill.name || ''}" onchange="updateSkill(${index}, 'name', this.value)">
            </div>
            <div class="form-group editable-cell">
                <label>Level</label>
                <select onchange="updateSkill(${index}, 'level', this.value)">
                    <option value="Beginner" ${skill.level === 'Beginner' ? 'selected' : ''}>Beginner</option>
                    <option value="Intermediate" ${skill.level === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                    <option value="Advanced" ${skill.level === 'Advanced' ? 'selected' : ''}>Advanced</option>
                    <option value="Expert" ${skill.level === 'Expert' ? 'selected' : ''}>Expert</option>
                </select>
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn" onclick="removeSkill(${index})">Remove</button>
        `;
        skillsList.appendChild(item);
    });
}

function addSkillField() {
    profile.skills.push({ name: '', level: 'Intermediate' });
    renderSkills();
}

function removeSkill(index) {
    profile.skills.splice(index, 1);
    renderSkills();
}

function updateSkill(index, field, value) {
    profile.skills[index][field] = value;
}

function renderLanguages() {
    const languagesList = document.getElementById('languages-list');
    languagesList.innerHTML = '';
    profile.languages.forEach((lang, index) => {
        const item = document.createElement('div');
        item.className = 'dynamic-item';
        item.innerHTML = `
            <div class="form-group editable-cell">
                <label>Language</label>
                <input type="text" value="${lang || ''}" onchange="updateLanguage(${index}, this.value)">
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn" onclick="removeLanguage(${index})">Remove</button>
        `;
        languagesList.appendChild(item);
    });
}

function addLanguageField() {
    profile.languages.push('');
    renderLanguages();
}

function removeLanguage(index) {
    profile.languages.splice(index, 1);
    renderLanguages();
}

function updateLanguage(index, value) {
    profile.languages[index] = value;
}

function renderCertifications() {
    const certificationsList = document.getElementById('certifications-list');
    certificationsList.innerHTML = '';
    profile.certifications.forEach((cert, index) => {
        const item = document.createElement('div');
        item.className = 'dynamic-item';
        item.innerHTML = `
            <div class="form-group editable-cell">
                <label>Certification</label>
                <input type="text" value="${cert || ''}" onchange="updateCertification(${index}, this.value)">
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn" onclick="removeCertification(${index})">Remove</button>
        `;
        certificationsList.appendChild(item);
    });
}

function addCertificationField() {
    profile.certifications.push('');
    renderCertifications();
}

function removeCertification(index) {
    profile.certifications.splice(index, 1);
    renderCertifications();
}

function updateCertification(index, value) {
    profile.certifications[index] = value;
}


// --- AI Tools Functions ---

/**
 * Formats raw AI text output into structured HTML.
 * Assumes:
 * - Lines starting with "1. ", "2. ", etc., are main headings (h3).
 * - Lines starting with "-" are list items (li).
 * - Other lines are paragraphs (p).
 * @param {string} rawText The raw text output from the AI.
 * @returns {string} HTML formatted text.
 */
function formatAiResultToHtml(rawText) {
    if (!rawText) return '';

    let html = '';
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let inList = false;

    lines.forEach(line => {
        if (/^\d+\.\s/.test(line)) { // Matches "1. ", "2. " etc.
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            html += `<h3>${line}</h3>`;
        } else if (line.startsWith('- ')) {
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            html += `<li>${line.substring(2)}</li>`;
        } else {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            html += `<p>${line}</p>`;
        }
    });

    if (inList) {
        html += '</ul>';
    }

    return html;
}

/**
 * Opens a new window and displays the given HTML content.
 * @param {string} title The title for the new window.
 * @param {string} contentHtml The HTML content to display.
 */
function openHtmlResultWindow(title, contentHtml) {
    const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    if (newWindow) {
        newWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                <style>
                    body { font-family: 'Inter', sans-serif; margin: 20px; line-height: 1.6; color: #333; }
                    .result-container { background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 25px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
                    h1, h2, h3, h4 { color: #4a5568; margin-top: 20px; margin-bottom: 10px; }
                    p { margin-bottom: 10px; }
                    ul { list-style-type: disc; margin-left: 20px; margin-bottom: 10px; }
                    li { margin-bottom: 5px; }
                    pre { background-color: #eee; padding: 15px; border-radius: 8px; overflow-x: auto; }
                </style>
            </head>
            <body>
                <div class="result-container">
                    <h1>${title}</h1>
                    ${contentHtml}
                </div>
            </body>
            </html>
        `);
        newWindow.document.close();
    } else {
        showAlert('Pop-up blocked! Please allow pop-ups for this site to view the results.', 'error');
    }
}


async function estimateJobChance() {
    const jobDescription = document.getElementById('job-desc-chance').value;
    const aiProvider = document.getElementById('ai-provider-chance').value;
    const apiKey = document.getElementById('api-key-chance').value;
    const chanceLoading = document.getElementById('chance-loading');
    const chanceResult = document.getElementById('chance-result'); // Keep for potential fallback or simpler display

    chanceResult.style.display = 'none'; // Hide local display
    chanceLoading.style.display = 'block';

    if (!jobDescription || !apiKey) {
        showAlert('Please provide a job description and your API key.', 'warning');
        chanceLoading.style.display = 'none';
        return;
    }

    try {
        const formData = new FormData();
        formData.append('job_description', jobDescription);
        formData.append('ai_provider', aiProvider);
        formData.append('api_key', apiKey);

        const response = await fetch('/api/estimate-chance', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            const formattedHtml = formatAiResultToHtml(data.result);
            openHtmlResultWindow('Job Chance Estimation Result', formattedHtml);
            showAlert('Job chance estimated successfully! Result opened in a new window.', 'success');
        } else {
            // Attempt to parse error response
            let errorMessage;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || 'Failed to estimate job chance.';
            } catch (parseError) {
                // If response is not JSON, get text
                errorMessage = await response.text() || `HTTP Error: ${response.status}`;
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Error estimating job chance:', error);
        showAlert('Error estimating job chance: ' + error.message, 'error');
        // Optionally display error in the local div as well
        chanceResult.innerHTML = `<h4>Error:</h4><p>${error.message}</p>`;
        chanceResult.style.display = 'block';
    } finally {
        chanceLoading.style.display = 'none';
    }
}

async function tuneCv() {
    const jobDescription = document.getElementById('job-desc-cv').value;
    const aiProvider = document.getElementById('ai-provider-cv').value;
    const apiKey = document.getElementById('api-key-cv').value;
    const cvLoading = document.getElementById('cv-loading');
    const cvResult = document.getElementById('cv-result'); // Keep for potential fallback or simpler display

    cvResult.style.display = 'none'; // Hide local display
    cvLoading.style.display = 'block';

    if (!jobDescription || !apiKey) {
        showAlert('Please provide a job description and your API key.', 'warning');
        cvLoading.style.display = 'none';
        return;
    }

    try {
        const formData = new FormData();
        formData.append('job_description', jobDescription);
        formData.append('ai_provider', aiProvider);
        formData.append('api_key', apiKey);

        const response = await fetch('/api/tune-cv', {
            method: 'POST',
            body: formData
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
        // Optionally display error in the local div as well
        cvResult.innerHTML = `<h4>Error:</h4><p>${error.message}</p>`;
        cvResult.style.display = 'block';
    } finally {
        cvLoading.style.display = 'none';
    }
}

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
        const response = await fetch('/api/profile/fill-from-resume-ai', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            // For fill profile, we still show the raw JSON in the local div as it's structured data
            fillProfileResult.innerHTML = `<h4>Profile Filled Successfully!</h4><pre>${JSON.stringify(data.profile, null, 2)}</pre>`;
            fillProfileResult.style.display = 'block';
            showAlert('Profile filled successfully from resume!', 'success');
            loadProfile(); // Reload profile data to update the form
        } else {
            // Attempt to parse error response
            let errorMessage;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || 'Failed to fill profile from resume';
            } catch (parseError) {
                // If response is not JSON, get text
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


// --- Calendar Functions ---

async function loadInterviews() {
    try {
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth() + 1; // Months are 0-indexed in JS, 1-indexed in API

        // Fetch all interviews for the current month/year
        const response = await fetch(`/api/interviews?year=${year}&month=${month}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        interviews = await response.json();
        console.log('Loaded interviews (with IDs):', interviews); // Debugging: Check IDs here
        renderCalendar(); // Re-render calendar after loading interviews
        renderMonthlyInterviewList(); // Render the list of interviews for the month
        renderMiniCalendar('mini-calendar-next-1', new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
        renderMiniCalendar('mini-calendar-next-2', new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 2, 1));
    } catch (error) {
        console.error('Error loading interviews:', error);
        showAlert('Failed to load interviews. Please try again.', 'error');
    }
}

function renderCalendar() {
    const monthYearDisplay = document.getElementById('current-month-year');
    const daysGrid = document.getElementById('calendar-days-grid');
    daysGrid.innerHTML = ''; // Clear previous days

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth(); // 0-indexed

    monthYearDisplay.textContent = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday, etc.
    const daysInMonth = new Date(year, month + 1, 0).getDate(); // Last day of current month

    // Add empty cells for leading days
    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        daysGrid.appendChild(emptyCell);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.innerHTML = `<span class="day-number">${day}</span>`;

        // Add interviews to the day cell
        const interviewsForDay = interviews.filter(interview => {
            const interviewStart = new Date(interview.start_datetime);
            return interviewStart.getDate() === day &&
                   interviewStart.getMonth() === month &&
                   interviewStart.getFullYear() === year;
        });

        interviewsForDay.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

        interviewsForDay.forEach(interview => {
            const interviewTime = new Date(interview.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const interviewElement = document.createElement('div');
            interviewElement.className = 'calendar-event';
            // Ensure interview.id is a string, or convert it to string if it's a number
            interviewElement.dataset.interviewId = String(interview.id);
            interviewElement.innerHTML = `
                <span class="event-time">${interviewTime}</span>
                <span class="event-title">${interview.interview_title}</span>
            `;
            interviewElement.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering day cell click
                viewInterviewDetails(interview.id);
            });
            dayCell.appendChild(interviewElement);
        });

        daysGrid.appendChild(dayCell);
    }
}

/**
 * Renders a mini calendar grid for a given month.
 * @param {string} targetElementId The ID of the HTML element to render the mini-calendar into.
 * @param {Date} displayDate A Date object representing the month to display (e.g., new Date(year, month, 1)).
 */
function renderMiniCalendar(targetElementId, displayDate) {
    const miniCalendarContainer = document.getElementById(targetElementId);
    if (!miniCalendarContainer) {
        console.error(`Mini calendar target element not found: ${targetElementId}`);
        return;
    }
    miniCalendarContainer.innerHTML = ''; // Clear previous content

    const year = displayDate.getFullYear();
    const month = displayDate.getMonth(); // 0-indexed

    const monthName = displayDate.toLocaleString('default', { month: 'short' });

    const miniHeader = document.createElement('div');
    miniHeader.className = 'mini-calendar-header';
    miniHeader.innerHTML = `<h4>${monthName} ${year}</h4>`;
    miniCalendarContainer.appendChild(miniHeader);

    const miniGrid = document.createElement('div');
    miniGrid.className = 'mini-calendar-grid';
    miniCalendarContainer.appendChild(miniGrid);

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'mini-calendar-day-header';
        header.textContent = day.substring(0, 1); // Just first letter
        miniGrid.appendChild(header);
    });

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Add empty cells for leading days
    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'mini-calendar-day empty';
        miniGrid.appendChild(emptyCell);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'mini-calendar-day';
        dayCell.innerHTML = `<span class="mini-day-number">${day}</span>`;

        // Add a small indicator if there's an interview on this day
        const hasInterview = interviews.some(interview => {
            const interviewStart = new Date(interview.start_datetime);
            return interviewStart.getDate() === day &&
                   interviewStart.getMonth() === month &&
                   interviewStart.getFullYear() === year;
        });

        if (hasInterview) {
            const indicator = document.createElement('div');
            indicator.className = 'mini-event-indicator';
            dayCell.appendChild(indicator);
        }

        miniGrid.appendChild(dayCell);
    }
}


function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    loadInterviews(); // Reload interviews for the new month
}

// Removed populateApplicationSelect as interviews are no longer linked to applications

async function showInterviewFormModal(interview = null) {
    console.log('showInterviewFormModal called with interview:', interview); // Debugging log
    const modal = document.getElementById('interview-form-modal');
    const form = document.getElementById('interview-form');
    const modalTitle = document.getElementById('interview-modal-title');
    form.reset(); // Clear form

    // Removed call to populateApplicationSelect();

    if (interview) {
        console.log('Editing Interview Object:', interview); // Debugging: Log the entire object
        console.log('Editing Interview ID from object:', interview.id); // Debugging log
        modalTitle.textContent = 'Edit Interview';
        // Ensure the ID is always a string or empty string
        document.getElementById('interview-id').value = interview.id ? String(interview.id) : '';
        document.getElementById('interview-title').value = interview.interview_title;

        // Safely set date and time values
        const startDate = new Date(interview.start_datetime);
        const endDate = new Date(interview.end_datetime);

        document.getElementById('interview-date').value = isValidDate(startDate) ? startDate.toISOString().split('T')[0] : '';
        document.getElementById('interview-start-time').value = isValidDate(startDate) ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        document.getElementById('interview-end-time').value = isValidDate(endDate) ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

        document.getElementById('interview-location').value = interview.location || '';
        document.getElementById('interview-type').value = interview.interview_type || '';
        document.getElementById('interview-notes').value = interview.notes || '';
    } else {
        console.log('Scheduling new interview.'); // Debugging log
        modalTitle.textContent = 'Schedule New Interview';
        document.getElementById('interview-id').value = ''; // Clear ID for new interview
        // Set default date to today for new interviews
        document.getElementById('interview-date').value = new Date().toISOString().split('T')[0];
        // Set default times for new interviews (e.g., 9:00 AM to 10:00 AM)
        document.getElementById('interview-start-time').value = '09:00';
        document.getElementById('interview-end-time').value = '10:00';
    }
    modal.classList.add('active');
}

function hideInterviewFormModal() {
    document.getElementById('interview-form-modal').classList.remove('active');
}

async function handleInterviewFormSubmit(event) {
    event.preventDefault();

    const interviewId = document.getElementById('interview-id').value;
    console.log('handleInterviewFormSubmit - interviewId from hidden input (before sending):', interviewId); // Debugging log

    // Removed jobApplicationId
    const interviewTitle = document.getElementById('interview-title').value;
    const interviewDate = document.getElementById('interview-date').value;
    const startTime = document.getElementById('interview-start-time').value;
    const endTime = document.getElementById('interview-end-time').value;
    const location = document.getElementById('interview-location').value;
    const type = document.getElementById('interview-type').value;
    const notes = document.getElementById('interview-notes').value;

    // Basic validation
    if (!interviewTitle || !interviewDate || !startTime || !endTime) { // Simplified validation
        showAlert('Please fill in all required interview fields (Title, Date, Start/End Time).', 'error');
        return;
    }

    // Combine date and time into full datetime strings
    const startDatetime = `${interviewDate}T${startTime}:00`;
    const endDatetime = `${interviewDate}T${endTime}:00`;

    // Client-side overlap check
    const newStart = new Date(startDatetime);
    const newEnd = new Date(endDatetime);

    if (newStart >= newEnd) {
        showAlert('End time must be after start time.', 'error');
        return;
    }

    const hasOverlap = interviews.some(existingInterview => {
        // Exclude the current interview if we are editing
        if (interviewId && String(existingInterview.id) === interviewId) { // Compare as strings
            return false;
        }

        const existingStart = new Date(existingInterview.start_datetime);
        const existingEnd = new Date(existingInterview.end_datetime);

        // Check for overlap: (start1 < end2) and (end1 > start2)
        return (newStart < existingEnd) && (newEnd > existingStart);
    });

    if (hasOverlap) {
        showAlert('This interview time overlaps with an existing interview. Please choose a different time.', 'error');
        return;
    }

    const interviewData = {
        // Removed job_application_id
        interview_title: interviewTitle,
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        location: location,
        notes: notes,
        interview_type: type
    };

    try {
        let response;
        let method;
        let url;

        if (interviewId) {
            method = 'PUT';
            url = `/api/interviews/${interviewId}`;
            // interviewData.id = interviewId; // No need to send ID in body for PUT, it's in URL
        } else {
            method = 'POST';
            url = '/api/interviews';
        }

        console.log('Sending interview data:', interviewData); // Debugging: What's being sent
        console.log('Sending to URL:', url, 'with method:', method); // Debugging: What URL/Method

        response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(interviewData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to save interview.');
        }

        showAlert('Interview saved successfully!', 'success');
        hideInterviewFormModal();
        loadInterviews(); // Reload interviews to update calendar and list
    } catch (error) {
        console.error('Error saving interview:', error);
        showAlert('Error saving interview: ' + error.message, 'error');
    }
}


async function viewInterviewDetails(id) {
    const interview = interviews.find(i => String(i.id) === String(id)); // Ensure string comparison
    if (!interview) {
        showAlert('Interview details not found.', 'error');
        return;
    }
    console.log('Viewing interview details for:', interview); // Debugging: Check the interview object here

    const detailModal = document.getElementById('interview-detail-modal');
    document.getElementById('detail-interview-title').textContent = interview.interview_title;

    const startDt = new Date(interview.start_datetime);
    const endDt = new Date(interview.end_datetime);
    document.getElementById('detail-interview-time').textContent =
        `${isValidDate(startDt) ? startDt.toLocaleDateString() : 'Invalid Date'} ${isValidDate(startDt) ? startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} - ${isValidDate(endDt) ? endDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`;

    document.getElementById('detail-interview-location').textContent = interview.location || 'N/A';
    document.getElementById('detail-interview-type').textContent = interview.interview_type || 'N/A';
    document.getElementById('detail-interview-notes').textContent = interview.notes || 'No notes.';

    // Set up Edit and Delete buttons in detail modal
    document.getElementById('edit-interview-btn').onclick = () => {
        hideInterviewDetailModal();
        showInterviewFormModal(interview);
    };
    document.getElementById('delete-interview-btn').onclick = () => {
        hideInterviewDetailModal();
        deleteInterview(interview.id);
    };

    detailModal.classList.add('active');
}

function hideInterviewDetailModal() {
    document.getElementById('interview-detail-modal').classList.remove('active');
}

// --- Monthly Interview List Function ---
function renderMonthlyInterviewList() {
    const monthlyListContainer = document.getElementById('monthly-interview-list');
    monthlyListContainer.innerHTML = ''; // Clear previous list

    // Filter interviews for the current month and sort them
    let currentMonthInterviews = interviews.filter(interview => {
        const interviewDate = new Date(interview.start_datetime);
        return isValidDate(interviewDate) &&
               interviewDate.getFullYear() === currentCalendarDate.getFullYear() &&
               interviewDate.getMonth() === currentCalendarDate.getMonth();
    });

    // Sort interviews based on current sort column and direction
    currentMonthInterviews.sort((a, b) => {
        let valA = a[currentSortColumnInterviews];
        let valB = b[currentSortColumnInterviews];

        // Handle date/time sorting for start_datetime
        if (currentSortColumnInterviews === 'start_datetime') {
            valA = new Date(valA);
            valB = new Date(valB);
        } else if (currentSortColumnInterviews === 'interview_title' || currentSortColumnInterviews === 'location' || currentSortColumnInterviews === 'interview_type') {
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
        }

        if (valA < valB) return currentSortDirectionInterviews === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDirectionInterviews === 'asc' ? 1 : -1;
        return 0;
    });

    if (currentMonthInterviews.length === 0) {
        monthlyListContainer.innerHTML = '<p>No interviews scheduled for this month.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'interview-list-table'; // Use a class for styling, similar to applications table
    table.innerHTML = `
        <thead>
            <tr>
                <th onclick="sortTableInterviews('start_datetime')">Date & Time</th>
                <th onclick="sortTableInterviews('interview_title')">Title</th>
                <th onclick="sortTableInterviews('location')">Location</th>
                <th onclick="sortTableInterviews('interview_type')">Type</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody id="interviews-table-body">
            <!-- Interview rows will be rendered here -->
        </tbody>
    `;
    monthlyListContainer.appendChild(table);

    const tableBody = document.getElementById('interviews-table-body');
    currentMonthInterviews.forEach(interview => {
        const row = document.createElement('tr');
        const startDt = new Date(interview.start_datetime);
        const endDt = new Date(interview.end_datetime);

        const dateStr = isValidDate(startDt) ? startDt.toLocaleDateString() : 'Invalid Date';
        const timeStr = isValidDate(startDt) && isValidDate(endDt) ?
                        `${startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';

        row.innerHTML = `
            <td>${dateStr} ${timeStr}</td>
            <td>${interview.interview_title}</td>
            <td>${interview.location || 'N/A'}</td>
            <td>${interview.interview_type || 'N/A'}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewInterviewDetails('${interview.id}')">View</button>
                <button class="btn btn-danger btn-sm" onclick="deleteInterview('${interview.id}')">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function sortTableInterviews(column) {
    if (currentSortColumnInterviews === column) {
        currentSortDirectionInterviews = currentSortDirectionInterviews === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumnInterviews = column;
        currentSortDirectionInterviews = 'asc';
    }
    renderMonthlyInterviewList(); // Re-render to apply new sort order
}


// --- Dashboard Functions ---

async function loadAllApplicationsForDashboard() {
    try {
        const response = await fetch('/api/applications');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allApplications = await response.json();
        console.log('All applications loaded for dashboard:', allApplications); // Debugging log
    }
    catch (error) {
        console.error('Error loading all applications for dashboard:', error);
        showAlert('Failed to load all applications for dashboard. Please try again.', 'error');
    }
}

async function loadDashboardData() {
    await loadAllApplicationsForDashboard(); // Ensure all applications are loaded
    // Note: loadInterviews() is called by the tab click, and it filters by currentCalendarDate.
    // For the dashboard, we need interviews for the currentDashboardDate.
    // So, we'll refetch interviews specifically for the dashboard's selected month.
    try {
        const year = currentDashboardDate.getFullYear();
        const month = currentDashboardDate.getMonth() + 1; // Months are 0-indexed in JS, 1-indexed in API

        console.log('Dashboard - Fetching interviews for year:', year, 'month:', month); // Debugging log
        const response = await fetch(`/api/interviews?year=${year}&month=${month}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const dashboardInterviews = await response.json();
        console.log('Dashboard - Loaded interviews for selected month:', dashboardInterviews); // Debugging log

        const selectedYear = currentDashboardDate.getFullYear();
        const selectedMonth = currentDashboardDate.getMonth(); // 0-indexed

        console.log('Dashboard - currentDashboardDate:', currentDashboardDate); // Debugging log
        console.log('Dashboard - selectedYear:', selectedYear, 'selectedMonth:', selectedMonth); // Debugging log

        // Filter applications for the selected month
        const monthlyApplications = allApplications.filter(app => {
            const appDate = new Date(app.application_date);
            const isValid = isValidDate(appDate) &&
                            appDate.getFullYear() === selectedYear &&
                            appDate.getMonth() === selectedMonth;
            // console.log(`App: ${app.job_title}, Date: ${app.application_date}, IsValid: ${isValid}`); // Detailed app filtering debug
            return isValid;
        });
        console.log('Dashboard - monthlyApplications (filtered):', monthlyApplications); // Debugging log

        renderApplicationsStatusChart(monthlyApplications);
        renderInterviewsCountChart(dashboardInterviews); // Use dashboardInterviews
        renderApplicationTrendChart(monthlyApplications, selectedYear, selectedMonth);
        renderInterviewTypeChart(dashboardInterviews); // Use dashboardInterviews
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showAlert('Failed to load dashboard data. Please try again.', 'error');
    }
}

function renderApplicationsStatusChart(data) {
    const ctx = document.getElementById('applicationsStatusChart').getContext('2d');

    const statusCounts = {
        "Applied": 0,
        "Interview": 0,
        "Rejection": 0,
        "Offer": 0
    };

    data.forEach(app => {
        if (statusCounts.hasOwnProperty(app.status)) {
            statusCounts[app.status]++;
        }
    });

    const chartData = {
        labels: Object.keys(statusCounts),
        datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: [
                '#4299e1', // Applied (Blue)
                '#f6ad55', // Interview (Orange)
                '#ef4444', // Rejection (Red)
                '#48bb78'  // Offer (Green)
            ],
            hoverOffset: 4
        }]
    };
    console.log('Chart Data for Applications Status Chart:', chartData); // Debugging log

    if (applicationsStatusChartInstance) {
        applicationsStatusChartInstance.destroy();
    }
    applicationsStatusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false,
                    text: 'Applications by Status'
                }
            }
        }
    });
}

function renderInterviewsCountChart(data) {
    const ctx = document.getElementById('interviewsCountChart').getContext('2d');

    const daysInMonth = new Date(currentDashboardDate.getFullYear(), currentDashboardDate.getMonth() + 1, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1); // Days 1 to 31

    const interviewCounts = new Array(daysInMonth).fill(0);

    data.forEach(interview => {
        const interviewDay = new Date(interview.start_datetime).getDate();
        if (isValidDate(new Date(interview.start_datetime)) && interviewDay >= 1 && interviewDay <= daysInMonth) {
            interviewCounts[interviewDay - 1]++;
        }
    });

    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Number of Interviews',
            data: interviewCounts,
            backgroundColor: '#667eea',
            borderColor: '#5a67d8',
            borderWidth: 1,
            borderRadius: 5,
        }]
    };
    console.log('Chart Data for Interviews Count Chart:', chartData); // Debugging log

    if (interviewsCountChartInstance) {
        interviewsCountChartInstance.destroy();
    }
    interviewsCountChartInstance = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: false,
                    text: 'Interviews Scheduled'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Day of Month'
                    }
                }
            }
        }
    });
}

function renderApplicationTrendChart(data, year, month) {
    const ctx = document.getElementById('applicationTrendChart').getContext('2d');

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1); // Days 1 to 31

    const dailyApplications = new Array(daysInMonth).fill(0);

    data.forEach(app => {
        const appDate = new Date(app.application_date);
        const appDay = appDate.getDate();
        if (isValidDate(appDate) && appDay >= 1 && appDay <= daysInMonth) {
            dailyApplications[appDay - 1]++;
        }
    });

    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Applications Submitted',
            data: dailyApplications,
            fill: false,
            borderColor: '#48bb78', // Green
            tension: 0.1
        }]
    };
    console.log('Chart Data for Application Trend Chart:', chartData); // Debugging log

    if (applicationTrendChartInstance) {
        applicationTrendChartInstance.destroy();
    }
    applicationTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: false,
                    text: 'Application Trends'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Day of Month'
                    }
                }
            }
        }
    });
}

function renderInterviewTypeChart(data) {
    const ctx = document.getElementById('interviewTypeChart').getContext('2d');

    const typeCounts = {};
    data.forEach(interview => {
        const type = interview.interview_type || 'Unspecified';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const backgroundColors = [
        '#667eea', // Purple
        '#4299e1', // Blue
        '#48bb78', // Green
        '#f6ad55', // Orange
        '#ef4444', // Red
        '#a0aec0'  // Gray
    ];

    const chartData = {
        labels: Object.keys(typeCounts),
        datasets: [{
            data: Object.values(typeCounts),
            backgroundColor: backgroundColors.slice(0, Object.keys(typeCounts).length),
            hoverOffset: 4
        }]
    };
    console.log('Chart Data for Interview Type Chart:', chartData); // Debugging log

    if (interviewTypeChartInstance) {
        interviewTypeChartInstance.destroy();
    }
    interviewTypeChartInstance = new Chart(ctx, {
        type: 'pie', // Using pie chart for breakdown
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false,
                    text: 'Interview Type Breakdown'
                }
            }
        }
    });
}


// --- Utility Functions ---

/**
 * Checks if a Date object is valid.
 * @param {Date} date The Date object to check.
 * @returns {boolean} True if the date is valid, false otherwise.
 */
function isValidDate(date) {
    return date instanceof Date && !isNaN(date);
}


function showAlert(message, type = 'info') {
    const alertBox = document.createElement('div');
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    document.body.appendChild(alertBox);

    // Automatically remove the alert after a few seconds
    setTimeout(() => {
        alertBox.remove();
    }, 5000);
}

// Custom confirmation modal (replaces window.confirm)
function showConfirm(message, onConfirm) {
    console.log('showConfirm function called with message:', message);
    globalConfirmMessage.textContent = message;
    globalConfirmModal.classList.add('active');

    // Clear previous event listeners to prevent multiple firings
    globalConfirmYesBtn.onclick = null;
    globalConfirmNoBtn.onclick = null;

    globalConfirmYesBtn.onclick = () => {
        console.log('Confirmation "Yes" button clicked!');
        onConfirm();
        hideConfirm();
    };
    globalConfirmNoBtn.onclick = () => {
        console.log('Confirmation "No" button clicked!');
        hideConfirm();
    };
}

function hideConfirm() {
    globalConfirmModal.classList.remove('active');
}

// --- Interview Delete Function ---
async function deleteInterview(id) {
    console.log('deleteInterview function called with ID:', id); // Debugging: Check if function is called and ID
    showConfirm('Are you sure you want to delete this interview?', async () => {
        console.log('Confirmation received for deleting interview ID:', id); // Debugging: Check if confirmed
        console.log('Interviews array BEFORE deletion attempt:', [...interviews]); // Debugging: Array before filter
        console.log(`Attempting to send DELETE request to: /api/interviews/${id}`); // NEW LOG: Confirming fetch is about to happen
        try {
            const response = await fetch(`/api/interviews/${id}`, {
                method: 'DELETE'
            });

            console.log('Delete Interview API response status:', response.status); // Debugging: Check response status
            // Note: FastAPI delete endpoint returns 204 No Content on success, so no JSON body expected.
            // If it returns a body, you might need to adjust this.
            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorMessage;
                } catch (e) {
                    errorMessage = await response.text() || errorMessage;
                }
                throw new Error(errorMessage);
            }

            // If response is OK, filter the interview from the local array
            interviews = interviews.filter(interview => String(interview.id) !== String(id)); // Ensure string comparison for IDs
            console.log('Interviews array AFTER deletion attempt (filtered):', [...interviews]); // Debugging: Array after filter
            showAlert('Interview deleted successfully!', 'success');
            console.log('Interview deleted successfully from frontend.'); // Debugging: Success log
            loadInterviews(); // Reload interviews to update calendar and list
        } catch (error) {
            console.error('Error deleting interview:', error); // Debugging: Log full error
            showAlert('Failed to delete interview: ' + error.message, 'error');
        }
    });
}


// Expose functions to global scope for onclick attributes in dynamically generated HTML
window.deleteApplication = deleteApplication;
window.viewApplication = viewApplication; // Exposed viewApplication
window.removeEducation = removeEducation;
window.removeExperience = removeExperience;
window.updateSkill = updateSkill;
window.removeSkill = removeSkill;
window.sortTableApplications = sortTableApplications;
window.updateApplicationStatus = updateApplicationStatus;
window.sortTableEducation = sortTableEducation; // Exposed sortTableEducation
window.sortTableExperience = sortTableExperience; // Exposed sortTableExperience
window.updateEducationField = updateEducationField;
window.updateExperienceField = updateExperienceField;
window.removeLanguage = removeLanguage;
window.updateLanguage = updateLanguage;
window.removeCertification = removeCertification;
window.updateCertification = updateCertification;
window.closeApplicationDetailModal = closeApplicationDetailModal; // Expose close function for the modal
window.viewInterviewDetails = viewInterviewDetails; // Expose for dynamically created calendar events
window.hideInterviewFormModal = hideInterviewFormModal;
window.hideInterviewDetailModal = hideInterviewDetailModal;
window.deleteInterview = deleteInterview;
window.sortTableInterviews = sortTableInterviews; // Expose sortTableInterviews
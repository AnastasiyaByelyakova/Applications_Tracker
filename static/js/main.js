// Global variables
let applications = [];
let profile = {};
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

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadApplications();
    loadProfile();
    // Show the applications tab by default
    showTab('applications', document.querySelector('.nav-tab[data-tab="applications"]'));
});

// Initialize all event listeners
function initializeEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            showTab(tabName, this);
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
            </td>
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
    const applicationDate = document.getElementById('application-date').value;
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
        application_date: applicationDate,
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
    // Using a custom modal for confirmation instead of window.confirm
    showConfirm('Are you sure you want to delete this application?', async () => {
        try {
            const response = await fetch(`/api/applications/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            applications = applications.filter(app => app.id !== id);
            renderApplications();
            showAlert('Application deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting application:', error);
            showAlert('Failed to delete application. Please try again.', 'error');
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
                linkedin_url: "", github_url: "", portfolio_url: "", cv_profile_file: ""
            };
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showAlert('Failed to load profile. Please try again.', 'error');
        profile = { // Fallback to empty profile on error
            full_name: "", email: "", phone: "", location: "", summary: "",
            education: [], experience: [], skills: [], languages: [], certifications: [],
            linkedin_url: "", github_url: "", portfolio_url: "", cv_profile_file: ""
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
        fillProfileLoading.style.display = 'none';
        document.getElementById('resume-pdf-input').value = '';
    }
}


// --- Utility Functions ---

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
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <p>${message}</p>
            <div class="modal-actions">
                <button id="confirm-yes" class="btn btn-danger">Yes</button>
                <button id="confirm-no" class="btn btn-secondary">No</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('confirm-yes').onclick = () => {
        onConfirm();
        modal.remove();
    };
    document.getElementById('confirm-no').onclick = () => {
        modal.remove();
    };
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

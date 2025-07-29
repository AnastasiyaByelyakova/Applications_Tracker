/**
 * Handles all functionalities related to the user's professional profile:
 * loading, saving, and managing dynamic fields like education, experience, and skills.
 */

// Global variable to store the user's profile data
let profile = {};

/**
 * Fetches the user's profile from the backend.
 * @returns {Promise<object>} A promise that resolves to the user's profile object.
 */
async function fetchProfile() {
    try {
        const response = await fetch('/api/profile');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const fetchedProfile = await response.json();
        if (Object.keys(fetchedProfile).length > 0) { // Check if profile is not empty
            profile = fetchedProfile;
        } else {
            // Initialize with empty lists if no profile exists on the backend
            profile = {
                full_name: "", email: "", phone: "", location: "", summary: "",
                education: [], experience: [], skills: [], languages: [], certifications: [],
                linkedin_url: "", github_url: "", portfolio_url: "", cv_profile_file: ""
            };
        }
        // Expose profile globally for dashboard.js and AI services
        window.profile = profile;
        return profile;
    } catch (error) {
        console.error('Error fetching profile:', error);
        window.showAlert('Failed to load profile. Please try again.', 'error');
        // Fallback to empty profile on error to prevent further crashes
        profile = {
            full_name: "", email: "", phone: "", location: "", summary: "",
            education: [], experience: [], skills: [], languages: [], certifications: [],
            linkedin_url: "", github_url: "", portfolio_url: "", cv_profile_file: ""
        };
        window.profile = profile; // Ensure global profile is set even on error
        return profile;
    }
}

/**
 * Loads the user's profile and populates the form fields.
 */
async function loadProfile() {
    await fetchProfile(); // Fetch the latest data
    populateProfileForm();
}

/**
 * Populates the profile form with the current profile data.
 */
function populateProfileForm() {
    const profileFullName = document.getElementById('profile-full-name');
    const profileEmail = document.getElementById('profile-email');
    const profilePhone = document.getElementById('profile-phone');
    const profileLocation = document.getElementById('profile-location');
    const profileSummary = document.getElementById('profile-summary');
    const profileLinkedin = document.getElementById('profile-linkedin');
    const profileGithub = document.getElementById('profile-github');
    const profilePortfolio = document.getElementById('profile-portfolio');
    const profileCvFilename = document.getElementById('profile-cv-filename');

    if (profileFullName) profileFullName.value = profile.full_name || '';
    if (profileEmail) profileEmail.value = profile.email || '';
    if (profilePhone) profilePhone.value = profile.phone || '';
    if (profileLocation) profileLocation.value = profile.location || '';
    if (profileSummary) profileSummary.value = profile.summary || '';
    if (profileLinkedin) profileLinkedin.value = profile.linkedin_url || '';
    if (profileGithub) profileGithub.value = profile.github_url || '';
    if (profilePortfolio) profilePortfolio.value = profile.portfolio_url || '';
    if (profileCvFilename) profileCvFilename.textContent = profile.cv_profile_file ? `File: ${profile.cv_profile_file.split('/').pop()}` : 'No file uploaded';

    renderEducation();
    renderExperience();
    renderSkills();
    renderLanguages();
    renderCertifications();
}

/**
 * Saves the user's profile to the backend.
 * @param {Event} event The form submission event.
 */
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
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to save profile.');
        }

        const savedProfile = await response.json();
        profile = savedProfile; // Update global profile with saved data (including ID)
        window.profile = profile; // Update global window.profile
        populateProfileForm(); // Re-populate to ensure consistency
        window.showAlert('Profile saved successfully!', 'success');
        window.loadDashboardData(); // Reload dashboard data after profile save
    } catch (error) {
        console.error('Error saving profile:', error);
        window.showAlert('Failed to save profile: ' + error.message, 'error');
    }
}

/**
 * Handles CV file selection and upload for the profile.
 * @param {Event} event The file input change event.
 */
async function handleProfileCvUpload(event) {
    const file = event.target.files[0];
    const profileCvFilename = document.getElementById('profile-cv-filename');

    if (!file) {
        profile.cv_profile_file = null; // Clear if no file selected
        if (profileCvFilename) profileCvFilename.textContent = 'No file uploaded';
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
        if (profileCvFilename) profileCvFilename.textContent = `File: ${file.name}`;
        window.showAlert('Profile CV uploaded successfully!', 'success');
    } catch (error) {
        console.error('Error uploading profile CV:', error);
        window.showAlert('Failed to upload profile CV: ' + error.message, 'error');
        profile.cv_profile_file = null; // Clear on error
        const profileCvInput = document.getElementById('profile-cv-file');
        if (profileCvInput) profileCvInput.value = ''; // Clear file input
        if (profileCvFilename) profileCvFilename.textContent = 'No file uploaded';
    }
}


// --- Dynamic List Management (Education, Experience, Skills, etc.) ---

/**
 * Renders the education entries in the profile form.
 */
function renderEducation() {
    const educationList = document.getElementById('education-list');
    if (!educationList) {
        console.error("Education list container not found.");
        return;
    }
    educationList.innerHTML = '';
    profile.education.forEach((edu, index) => {
        const item = document.createElement('div');
        item.className = 'dynamic-item';
        item.innerHTML = `
            <div class="form-group editable-cell">
                <label>Degree</label>
                <input type="text" value="${edu.degree || ''}" onchange="window.updateEducationField(${index}, 'degree', this.value)">
            </div>
            <div class="form-group editable-cell">
                <label>Institution</label>
                <input type="text" value="${edu.institution || ''}" onchange="window.updateEducationField(${index}, 'institution', this.value)">
            </div>
            <div class="form-group editable-cell">
                <label>Graduation Year</label>
                <input type="number" value="${edu.graduation_year || ''}" onchange="window.updateEducationField(${index}, 'graduation_year', parseInt(this.value))">
            </div>
            <div class="form-group editable-cell">
                <label>GPA</label>
                <input type="number" step="0.01" value="${edu.gpa || ''}" onchange="window.updateEducationField(${index}, 'gpa', parseFloat(this.value))">
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn" onclick="window.removeEducation(${index})">Remove</button>
        `;
        educationList.appendChild(item);
    });
}

/**
 * Adds a new empty education field to the profile.
 */
function addEducationField() {
    profile.education.push({ degree: '', institution: '', graduation_year: null, gpa: null });
    renderEducation();
}

/**
 * Removes an education entry from the profile.
 * @param {number} index The index of the education entry to remove.
 */
function removeEducation(index) {
    profile.education.splice(index, 1);
    renderEducation();
}

/**
 * Updates a specific field of an education entry.
 * @param {number} index The index of the education entry.
 * @param {string} field The field name to update (e.g., 'degree', 'institution').
 * @param {*} value The new value for the field.
 */
function updateEducationField(index, field, value) {
    profile.education[index][field] = value;
}


/**
 * Renders the experience entries in the profile form.
 */
function renderExperience() {
    const experienceList = document.getElementById('experience-list');
    if (!experienceList) {
        console.error("Experience list container not found.");
        return;
    }
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
                <input type="text" value="${exp.position || ''}" onchange="window.updateExperienceField(${index}, 'position', this.value)">
            </div>
            <div class="form-group editable-cell">
                <label>Company</label>
                <input type="text" value="${exp.company || ''}" onchange="window.updateExperienceField(${index}, 'company', this.value)">
            </div>
            <div class="form-group editable-cell">
                <label>Start Date</label>
                <input type="month" value="${startDateFormatted}" onchange="window.updateExperienceField(${index}, 'start_date', this.value)">
            </div>
            <div class="form-group editable-cell">
                <label>End Date</label>
                <input type="month" value="${endDateFormatted}" onchange="window.updateExperienceField(${index}, 'end_date', this.value)">
            </div>
            <div class="form-group editable-cell full-width">
                <label>Description</label>
                <textarea rows="3" onchange="window.updateExperienceField(${index}, 'description', this.value)">${exp.description || ''}</textarea>
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn" onclick="window.removeExperience(${index})">Remove</button>
        `;
        experienceList.appendChild(item);
    });
}

/**
 * Adds a new empty experience field to the profile.
 */
function addExperienceField() {
    profile.experience.push({ position: '', company: '', start_date: '', end_date: '', description: '' });
    renderExperience();
}

/**
 * Removes an experience entry from the profile.
 * @param {number} index The index of the experience entry to remove.
 */
function removeExperience(index) {
    profile.experience.splice(index, 1);
    renderExperience();
}

/**
 * Updates a specific field of an experience entry.
 * @param {number} index The index of the experience entry.
 * @param {string} field The field name to update (e.g., 'position', 'company').
 * @param {*} value The new value for the field.
 */
function updateExperienceField(index, field, value) {
    profile.experience[index][field] = value;
}


/**
 * Renders the skills entries in the profile form.
 */
function renderSkills() {
    const skillsList = document.getElementById('skills-list');
    if (!skillsList) {
        console.error("Skills list container not found.");
        return;
    }
    skillsList.innerHTML = '';
    profile.skills.forEach((skill, index) => {
        const item = document.createElement('div');
        item.className = 'dynamic-item';
        item.innerHTML = `
            <div class="form-group editable-cell">
                <label>Skill Name</label>
                <input type="text" value="${skill.name || ''}" onchange="window.updateSkill(${index}, 'name', this.value)">
            </div>
            <div class="form-group editable-cell">
                <label>Level</label>
                <select onchange="window.updateSkill(${index}, 'level', this.value)">
                    <option value="Beginner" ${skill.level === 'Beginner' ? 'selected' : ''}>Beginner</option>
                    <option value="Intermediate" ${skill.level === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                    <option value="Advanced" ${skill.level === 'Advanced' ? 'selected' : ''}>Advanced</option>
                    <option value="Expert" ${skill.level === 'Expert' ? 'selected' : ''}>Expert</option>
                </select>
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn" onclick="window.removeSkill(${index})">Remove</button>
        `;
        skillsList.appendChild(item);
    });
}

/**
 * Adds a new empty skill field to the profile.
 */
function addSkillField() {
    profile.skills.push({ name: '', level: 'Intermediate' });
    renderSkills();
}

/**
 * Removes a skill entry from the profile.
 * @param {number} index The index of the skill entry to remove.
 */
function removeSkill(index) {
    profile.skills.splice(index, 1);
    renderSkills();
}

/**
 * Updates a specific field of a skill entry.
 * @param {number} index The index of the skill entry.
 * @param {string} field The field name to update (e.g., 'name', 'level').
 * @param {*} value The new value for the field.
 */
function updateSkill(index, field, value) {
    profile.skills[index][field] = value;
}


/**
 * Renders the languages entries in the profile form.
 */
function renderLanguages() {
    const languagesList = document.getElementById('languages-list');
    if (!languagesList) {
        console.error("Languages list container not found.");
        return;
    }
    languagesList.innerHTML = '';
    profile.languages.forEach((lang, index) => {
        const item = document.createElement('div');
        item.className = 'dynamic-item';
        item.innerHTML = `
            <div class="form-group editable-cell">
                <label>Language</label>
                <input type="text" value="${lang || ''}" onchange="window.updateLanguage(${index}, this.value)">
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn" onclick="window.removeLanguage(${index})">Remove</button>
        `;
        languagesList.appendChild(item);
    });
}

/**
 * Adds a new empty language field to the profile.
 */
function addLanguageField() {
    profile.languages.push('');
    renderLanguages();
}

/**
 * Removes a language entry from the profile.
 * @param {number} index The index of the language entry to remove.
 */
function removeLanguage(index) {
    profile.languages.splice(index, 1);
    renderLanguages();
}

/**
 * Updates a specific language entry.
 * @param {number} index The index of the language entry.
 * @param {*} value The new value for the language.
 */
function updateLanguage(index, value) {
    profile.languages[index] = value;
}


/**
 * Renders the certifications entries in the profile form.
 */
function renderCertifications() {
    const certificationsList = document.getElementById('certifications-list');
    if (!certificationsList) {
        console.error("Certifications list container not found.");
        return;
    }
    certificationsList.innerHTML = '';
    profile.certifications.forEach((cert, index) => {
        const item = document.createElement('div');
        item.className = 'dynamic-item';
        item.innerHTML = `
            <div class="form-group editable-cell">
                <label>Certification</label>
                <input type="text" value="${cert || ''}" onchange="window.updateCertification(${index}, this.value)">
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn" onclick="window.removeCertification(${index})">Remove</button>
        `;
        certificationsList.appendChild(item);
    });
}

/**
 * Adds a new empty certification field to the profile.
 */
function addCertificationField() {
    profile.certifications.push('');
    renderCertifications();
}

/**
 * Removes a certification entry from the profile.
 * @param {number} index The index of the certification entry to remove.
 */
function removeCertification(index) {
    profile.certifications.splice(index, 1);
    renderCertifications();
}

/**
 * Updates a specific certification entry.
 * @param {number} index The index of the certification entry.
 * @param {*} value The new value for the certification.
 */
function updateCertification(index, value) {
    profile.certifications[index] = value;
}

// Expose functions to the global scope for access from other modules and HTML
window.fetchProfile = fetchProfile;
window.loadProfile = loadProfile;
window.saveProfile = saveProfile;
window.handleProfileCvUpload = handleProfileCvUpload;
window.addEducationField = addEducationField;
window.removeEducation = removeEducation;
window.updateEducationField = updateEducationField;
window.addExperienceField = addExperienceField;
window.removeExperience = removeExperience;
window.updateExperienceField = updateExperienceField;
window.addSkillField = addSkillField;
window.removeSkill = removeSkill;
window.updateSkill = updateSkill;
window.addLanguageField = addLanguageField;
window.removeLanguage = removeLanguage;
window.updateLanguage = updateLanguage;
window.addCertificationField = addCertificationField;
window.removeCertification = removeCertification;
window.updateCertification = updateCertification;

console.log("profile.js loaded and functions exposed.");

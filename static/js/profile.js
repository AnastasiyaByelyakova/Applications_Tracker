// Global variable for profile data
let profile = {};

// New global variables for profile dynamic lists sorting (if needed in future)
let currentSortColumnEducation = 'graduation_year';
let currentSortDirectionEducation = 'desc';

let currentSortColumnExperience = 'start_date';
let currentSortDirectionExperience = 'desc';


/**
 * Loads the user profile from the backend API.
 * Initializes the profile object and populates the form.
 * @returns {Promise<void>}
 */
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
        // Expose profile globally for dashboard.js and AI services
        window.profile = profile;
    } catch (error) {
        console.error('Error loading profile:', error);
        window.showAlert('Failed to load profile. Please try again.', 'error');
        profile = { // Fallback to empty profile on error
            full_name: "", email: "", phone: "", location: "", summary: "",
            education: [], experience: [], skills: [], languages: [], certifications: [],
            linkedin_url: "", github_url: "", portfolio_url: "", "cv_profile_file": "" // Ensure cv_profile_file is initialized
        };
        window.profile = profile; // Ensure global profile is set even on error
    }
}

/**
 * Populates the profile form fields with the current profile data.
 */
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

/**
 * Saves the user profile data to the backend API.
 * @param {Event} event The form submission event.
 * @returns {Promise<void>}
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const savedProfile = await response.json();
        profile = savedProfile; // Update global profile with saved data (including ID)
        window.profile = profile; // Update global window.profile
        populateProfileForm(); // Re-populate to ensure consistency
        window.showAlert('Profile saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving profile:', error);
        window.showAlert('Failed to save profile. Please try again.', 'error');
    }
}

/**
 * Handles the upload of the master CV file for the profile.
 * @param {Event} event The file input change event.
 * @returns {Promise<void>}
 */
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
        window.showAlert('Profile CV uploaded successfully!', 'success');
    } catch (error) {
        console.error('Error uploading profile CV:', error);
        window.showAlert('Failed to upload profile CV. ' + error.message, 'error');
        profile.cv_profile_file = null; // Clear on error
        document.getElementById('profile-cv-file').value = ''; // Clear file input
        document.getElementById('profile-cv-filename').textContent = 'No file uploaded';
    }
}


// --- Dynamic List Management (Education, Experience, Skills, etc.) ---

/**
 * Renders the education entries in the profile form.
 */
function renderEducation() {
    const educationList = document.getElementById('education-list');
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
 * Adds a new empty education entry to the profile.
 */
function addEducationField() {
    profile.education.push({ degree: '', institution: '', graduation_year: null, gpa: null });
    renderEducation();
}

/**
 * Removes an education entry from the profile.
 * @param {number} index The index of the entry to remove.
 */
function removeEducation(index) {
    profile.education.splice(index, 1);
    renderEducation();
}

/**
 * Updates a specific field of an education entry.
 * @param {number} index The index of the education entry.
 * @param {string} field The field name to update.
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
 * Adds a new empty experience entry to the profile.
 */
function addExperienceField() {
    profile.experience.push({ position: '', company: '', start_date: '', end_date: '', description: '' });
    renderExperience();
}

/**
 * Removes an experience entry from the profile.
 * @param {number} index The index of the entry to remove.
 */
function removeExperience(index) {
    profile.experience.splice(index, 1);
    renderExperience();
}

/**
 * Updates a specific field of an experience entry.
 * @param {number} index The index of the experience entry.
 * @param {string} field The field name to update.
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
 * Adds a new empty skill entry to the profile.
 */
function addSkillField() {
    profile.skills.push({ name: '', level: 'Intermediate' });
    renderSkills();
}

/**
 * Removes a skill entry from the profile.
 * @param {number} index The index of the entry to remove.
 */
function removeSkill(index) {
    profile.skills.splice(index, 1);
    renderSkills();
}

/**
 * Updates a specific field of a skill entry.
 * @param {number} index The index of the skill entry.
 * @param {string} field The field name to update ('name' or 'level').
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
 * Adds a new empty language entry to the profile.
 */
function addLanguageField() {
    profile.languages.push('');
    renderLanguages();
}

/**
 * Removes a language entry from the profile.
 * @param {number} index The index of the entry to remove.
 */
function removeLanguage(index) {
    profile.languages.splice(index, 1);
    renderLanguages();
}

/**
 * Updates a language entry.
 * @param {number} index The index of the language entry.
 * @param {string} value The new value for the language.
 */
function updateLanguage(index, value) {
    profile.languages[index] = value;
}

/**
 * Renders the certifications entries in the profile form.
 */
function renderCertifications() {
    const certificationsList = document.getElementById('certifications-list');
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
 * Adds a new empty certification entry to the profile.
 */
function addCertificationField() {
    profile.certifications.push('');
    renderCertifications();
}

/**
 * Removes a certification entry from the profile.
 * @param {number} index The index of the entry to remove.
 */
function removeCertification(index) {
    profile.certifications.splice(index, 1);
    renderCertifications();
}

/**
 * Updates a certification entry.
 * @param {number} index The index of the certification entry.
 * @param {string} value The new value for the certification.
 */
function updateCertification(index, value) {
    profile.certifications[index] = value;
}

// Expose functions to the global scope
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
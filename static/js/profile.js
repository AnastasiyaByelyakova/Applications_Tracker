// Global variable to hold the profile data, managed by app.js (window.profile)

/**
 * Populates the profile form with data.
 * @param {object} profileData The user profile data object.
 */
function populateProfileForm(profileData) {
    document.getElementById('profile-full-name').value = profileData.full_name || '';
    document.getElementById('profile-email').value = profileData.email || '';
    document.getElementById('profile-phone').value = profileData.phone || '';
    document.getElementById('profile-location').value = profileData.location || '';
    document.getElementById('profile-summary').value = profileData.summary || '';

    // Ensure these are always arrays before rendering
    renderEducation(profileData.education || []);
    renderExperience(profileData.experience || []);
    renderSkills(profileData.skills || []);
    renderLanguages(profileData.languages || []);
    renderCertifications(profileData.certifications || []);

    document.getElementById('profile-linkedin').value = profileData.linkedin_url || '';
    document.getElementById('profile-github').value = profileData.github_url || '';
    document.getElementById('profile-portfolio').value = profileData.portfolio_url || '';

    const cvFileNameSpan = document.getElementById('profile-cv-filename');
    if (profileData.cv_profile_file) {
        cvFileNameSpan.textContent = profileData.cv_profile_file.split('/').pop(); // Display just the filename
    } else {
        cvFileNameSpan.textContent = 'No file uploaded';
    }
}

/**
 * Gathers data from the profile form.
 * @returns {object} The user profile data object.
 */
function getProfileFormData() {
    const education = [];
    document.querySelectorAll('#education-list .dynamic-item').forEach(item => {
        education.push({
            degree: item.querySelector('[name="education-degree"]').value,
            institution: item.querySelector('[name="education-institution"]').value,
            graduation_year: parseInt(item.querySelector('[name="education-graduation-year"]').value) || null,
            gpa: parseFloat(item.querySelector('[name="education-gpa"]').value) || null
        });
    });

    const experience = [];
    document.querySelectorAll('#experience-list .dynamic-item').forEach(item => {
        experience.push({
            position: item.querySelector('[name="experience-position"]').value,
            company: item.querySelector('[name="experience-company"]').value,
            start_date: item.querySelector('[name="experience-start-date"]').value,
            end_date: item.querySelector('[name="experience-end-date"]').value || null,
            description: item.querySelector('[name="experience-description"]').value
        });
    });

    const skills = [];
    document.querySelectorAll('#skills-list .dynamic-item').forEach(item => {
        skills.push({
            name: item.querySelector('[name="skill-name"]').value,
            level: item.querySelector('[name="skill-level"]').value
        });
    });

    const languages = Array.from(document.querySelectorAll('#languages-list .dynamic-item input[name="language-name"]'))
        .map(input => input.value.trim())
        .filter(value => value);

    const certifications = Array.from(document.querySelectorAll('#certifications-list .dynamic-item input[name="certification-name"]'))
        .map(input => input.value.trim())
        .filter(value => value);

    return {
        id: window.profile ? window.profile.id : null, // Preserve ID if exists
        full_name: document.getElementById('profile-full-name').value,
        email: document.getElementById('profile-email').value,
        phone: document.getElementById('profile-phone').value,
        location: document.getElementById('profile-location').value,
        summary: document.getElementById('profile-summary').value,
        education: education,
        experience: experience,
        skills: skills,
        languages: languages,
        certifications: certifications,
        linkedin_url: document.getElementById('profile-linkedin').value,
        github_url: document.getElementById('profile-github').value,
        portfolio_url: document.getElementById('profile-portfolio').value,
        // cv_profile_file is handled separately via file upload
        cv_profile_file: window.profile ? window.profile.cv_profile_file : null // Keep existing file path if not re-uploaded
    };
}

/**
 * Saves the user profile.
 */
async function saveProfile() {
    const profileData = getProfileFormData();
    const profileCvFile = document.getElementById('profile-cv-file').files[0];

    const formData = new FormData();
    // Append JSON data as a string
    formData.append('profile', JSON.stringify(profileData));

    // Append file if selected
    if (profileCvFile) {
        formData.append('cv_profile_file', profileCvFile);
    }

    try {
        const response = await fetch('/api/profile', {
            method: 'POST', // Use POST for both create and update, backend handles logic
            body: formData // FormData sets Content-Type header automatically
        });

        if (response.ok) {
            const updatedProfile = await response.json();
            window.profile = updatedProfile; // Update global profile with returned data (including ID if new)
            populateProfileForm(window.profile); // Re-populate to show any backend-generated data (like ID)
            showAlert('Profile saved successfully!', 'success');
            // After saving, reload dashboard to reflect potential skill changes
            loadDashboardData();
        } else {
            let errorMessage = 'Failed to save profile.';
            try {
                const errorData = await response.json();
                if (errorData.detail && Array.isArray(errorData.detail)) {
                    // FastAPI validation errors are often in errorData.detail as an array
                    errorMessage = errorData.detail.map(err => {
                        const loc = err.loc ? err.loc.join('.') : 'unknown';
                        return `${loc}: ${err.msg}`;
                    }).join('\n');
                } else if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else {
                    errorMessage = await response.text();
                }
            } catch (parseError) {
                // If response is not JSON, use raw text
                errorMessage = await response.text();
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        showAlert('Error saving profile: ' + error.message, 'error');
    }
}

// --- Dynamic List Rendering Functions ---

function renderEducation(educationList) {
    const container = document.getElementById('education-list');
    container.innerHTML = '';
    (educationList || []).forEach((edu, index) => { // Ensure educationList is an array
        const item = document.createElement('div');
        item.className = 'dynamic-item';
        item.innerHTML = `
            <div class="form-group">
                <label>Degree</label>
                <input type="text" name="education-degree" value="${edu.degree || ''}">
            </div>
            <div class="form-group">
                <label>Institution</label>
                <input type="text" name="education-institution" value="${edu.institution || ''}">
            </div>
            <div class="form-group">
                <label>Graduation Year</label>
                <input type="number" name="education-graduation-year" value="${edu.graduation_year || ''}" min="1900" max="${new Date().getFullYear() + 5}">
            </div>
            <div class="form-group">
                <label>GPA</label>
                <input type="number" name="education-gpa" step="0.01" value="${edu.gpa || ''}">
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn" data-index="${index}">Remove</button>
        `;
        container.appendChild(item);
    });
    addRemoveEventListeners(container, 'education');
}

function renderExperience(experienceList) {
    const container = document.getElementById('experience-list');
    container.innerHTML = '';
    (experienceList || []).forEach((exp, index) => { // Ensure experienceList is an array
        const item = document.createElement('div');
        item.className = 'dynamic-item';
        item.innerHTML = `
            <div class="form-group">
                <label>Position</label>
                <input type="text" name="experience-position" value="${exp.position || ''}">
            </div>
            <div class="form-group">
                <label>Company</label>
                <input type="text" name="experience-company" value="${exp.company || ''}">
            </div>
            <div class="form-group">
                <label>Start Date</label>
                <input type="month" name="experience-start-date" value="${exp.start_date || ''}">
            </div>
            <div class="form-group">
                <label>End Date (or 'Present')</label>
                <input type="month" name="experience-end-date" value="${exp.end_date || ''}">
            </div>
            <div class="form-group full-width">
                <label>Description</label>
                <textarea name="experience-description" rows="3">${exp.description || ''}</textarea>
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn" data-index="${index}">Remove</button>
        `;
        container.appendChild(item);
    });
    addRemoveEventListeners(container, 'experience');
}

function renderSkills(skillsList) {
    const container = document.getElementById('skills-list');
    container.innerHTML = '';
    (skillsList || []).forEach((skill, index) => { // Ensure skillsList is an array
        const item = document.createElement('div');
        item.className = 'dynamic-item';
        item.innerHTML = `
            <div class="form-group">
                <label>Skill Name</label>
                <input type="text" name="skill-name" value="${skill.name || ''}">
            </div>
            <div class="form-group">
                <label>Level</label>
                <select name="skill-level">
                    <option value="Beginner" ${skill.level === 'Beginner' ? 'selected' : ''}>Beginner</option>
                    <option value="Intermediate" ${skill.level === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                    <option value="Advanced" ${skill.level === 'Advanced' ? 'selected' : ''}>Advanced</option>
                    <option value="Expert" ${skill.level === 'Expert' ? 'selected' : ''}>Expert</option>
                </select>
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn" data-index="${index}">Remove</button>
        `;
        container.appendChild(item);
    });
    addRemoveEventListeners(container, 'skills');
}

function renderLanguages(languagesList) {
    const container = document.getElementById('languages-list');
    container.innerHTML = '';
    (languagesList || []).forEach((lang, index) => { // Ensure languagesList is an array
        const item = document.createElement('div');
        item.className = 'dynamic-item';
        item.innerHTML = `
            <div class="form-group">
                <label>Language</label>
                <input type="text" name="language-name" value="${lang || ''}">
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn" data-index="${index}">Remove</button>
        `;
        container.appendChild(item);
    });
    addRemoveEventListeners(container, 'languages');
}

function renderCertifications(certificationsList) {
    const container = document.getElementById('certifications-list');
    container.innerHTML = '';
    (certificationsList || []).forEach((cert, index) => { // Ensure certificationsList is an array
        const item = document.createElement('div');
        item.className = 'dynamic-item';
        item.innerHTML = `
            <div class="form-group">
                <label>Certification</label>
                <input type="text" name="certification-name" value="${cert || ''}">
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-btn" data-index="${index}">Remove</button>
        `;
        container.appendChild(item);
    });
    addRemoveEventListeners(container, 'certifications');
}

// --- Add New Item Functions ---

function addEducationItem() {
    const container = document.getElementById('education-list');
    const item = document.createElement('div');
    item.className = 'dynamic-item';
    item.innerHTML = `
        <div class="form-group">
            <label>Degree</label>
            <input type="text" name="education-degree">
        </div>
        <div class="form-group">
            <label>Institution</label>
            <input type="text" name="education-institution">
        </div>
        <div class="form-group">
            <label>Graduation Year</label>
            <input type="number" name="education-graduation-year" min="1900" max="${new Date().getFullYear() + 5}">
        </div>
        <div class="form-group">
            <label>GPA</label>
            <input type="number" name="education-gpa" step="0.01">
        </div>
        <button type="button" class="btn btn-danger btn-sm remove-btn">Remove</button>
    `;
    container.appendChild(item);
    addRemoveEventListeners(container, 'education');
}

function addExperienceItem() {
    const container = document.getElementById('experience-list');
    const item = document.createElement('div');
    item.className = 'dynamic-item';
    item.innerHTML = `
        <div class="form-group">
            <label>Position</label>
            <input type="text" name="experience-position">
        </div>
        <div class="form-group">
            <label>Company</labe l>
            <input type="text" name="experience-company">
        </div>
        <div class="form-group">
            <label>Start Date</label>
            <input type="month" name="experience-start-date">
        </div>
        <div class="form-group">
            <label>End Date (or 'Present')</label>
            <input type="month" name="experience-end-date">
        </div>
        <div class="form-group full-width">
            <label>Description</label>
            <textarea name="experience-description" rows="3"></textarea>
        </div>
        <button type="button" class="btn btn-danger btn-sm remove-btn">Remove</button>
    `;
    container.appendChild(item);
    addRemoveEventListeners(container, 'experience');
}

function addSkillItem() {
    const container = document.getElementById('skills-list');
    const item = document.createElement('div');
    item.className = 'dynamic-item';
    item.innerHTML = `
        <div class="form-group">
            <label>Skill Name</label>
            <input type="text" name="skill-name">
        </div>
        <div class="form-group">
            <label>Level</label>
            <select name="skill-level">
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced" selected>Advanced</option>
                <option value="Expert">Expert</option>
            </select>
        </div>
        <button type="button" class="btn btn-danger btn-sm remove-btn">Remove</button>
    `;
    container.appendChild(item);
    addRemoveEventListeners(container, 'skills');
}

function addLanguageItem() {
    const container = document.getElementById('languages-list');
    const item = document.createElement('div');
    item.className = 'dynamic-item';
    item.innerHTML = `
        <div class="form-group">
            <label>Language</label>
            <input type="text" name="language-name">
        </div>
        <button type="button" class="btn btn-danger btn-sm remove-btn">Remove</button>
    `;
    container.appendChild(item);
    addRemoveEventListeners(container, 'languages');
}

function addCertificationItem() {
    const container = document.getElementById('certifications-list');
    const item = document.createElement('div');
    item.className = 'dynamic-item';
    item.innerHTML = `
        <div class="form-group">
            <label>Certification</label>
            <input type="text" name="certification-name">
        </div>
        <button type="button" class="btn btn-danger btn-sm remove-btn">Remove</button>
    `;
    container.appendChild(item);
    addRemoveEventListeners(container, 'certifications');
}

// --- Event Listener for Remove Buttons ---

function addRemoveEventListeners(container, type) {
    container.querySelectorAll('.remove-btn').forEach(button => {
        button.onclick = null; // Remove existing listeners to prevent duplicates
        button.addEventListener('click', function() {
            const itemToRemove = this.closest('.dynamic-item');
            showConfirm(`Are you sure you want to remove this ${type} entry?`, () => {
                itemToRemove.remove();
                // If the profile is currently loaded, remove the item from the global profile object as well
                if (window.profile && window.profile[type]) {
                    const index = Array.from(container.children).indexOf(itemToRemove);
                    if (index > -1) {
                        window.profile[type].splice(index, 1);
                    }
                }
            });
        });
    });
}

// --- Event Listeners for Profile Page ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('profile-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        await saveProfile();
    });

    document.getElementById('add-education-btn')?.addEventListener('click', addEducationItem);
    document.getElementById('add-experience-btn')?.addEventListener('click', addExperienceItem);
    document.getElementById('add-skill-btn')?.addEventListener('click', addSkillItem);
    document.getElementById('add-language-btn')?.addEventListener('click', addLanguageItem);
    document.getElementById('add-certification-btn')?.addEventListener('click', addCertificationItem);
});

// Expose functions to the global scope for app.js and other modules
window.populateProfileForm = populateProfileForm;
window.getProfileFormData = getProfileFormData; // Potentially useful for AI tools
window.saveProfile = saveProfile; // Expose saveProfile for direct calls if needed

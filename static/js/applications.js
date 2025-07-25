// Global variables specific to applications tab
let applications = []; // Stores application data
let currentSortColumnApplications = 'application_date';
let currentSortDirectionApplications = 'desc';
let currentFilterTextApplications = '';
let currentViewApplications = 'cards';

/**
 * Renders the list of applications based on current filters and sort order.
 */
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
            ${app.link ? `<p><strong>Job Link:</strong> <a href="${app.link}" target="_blank" class="text-blue-500 hover:underline">View Job</a></p>` : ''}
            <div class="card-actions">
                <button class="btn btn-info btn-sm" onclick="viewApplication('${app.id}')">View Details</button>
                <button class="btn btn-secondary btn-sm" onclick="editApplication('${app.id}')">Edit</button>
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
            <td>${app.link ? `<a href="${app.link}" target="_blank" class="text-blue-500 hover:underline">Link</a>` : 'N/A'}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewApplication('${app.id}')">View</button>
                <button class="btn btn-secondary btn-sm" onclick="editApplication('${app.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteApplication('${app.id}')">Delete</button>
            </td>
        `;
        applicationsTableBody.appendChild(row);
    });

    toggleApplicationView(); // Apply the current view setting
}

/**
 * Filters and re-renders applications based on the search input.
 */
function filterAndRenderApplications() {
    currentFilterTextApplications = document.getElementById('filter-applications').value;
    renderApplications();
}

/**
 * Sorts the applications table by the given column.
 * @param {string} column The column to sort by.
 */
function sortTableApplications(column) {
    if (currentSortColumnApplications === column) {
        currentSortDirectionApplications = currentSortDirectionApplications === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumnApplications = column;
        currentSortDirectionApplications = 'asc';
    }
    renderApplications();
}

/**
 * Toggles the display between card view and table view for applications.
 */
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

/**
 * Loads applications from the backend API.
 * @returns {Promise<void>}
 */
async function loadApplications() {
    try {
        const response = await fetch('/api/applications');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        applications = await response.json();
        renderApplications();
    }
    catch (error) {
        console.error('Error loading applications:', error);
        window.showAlert('Failed to load applications. Please try again.', 'error');
    }
}

/**
 * Adds a new application or updates an existing one.
 * @param {Event} event The form submission event.
 * @returns {Promise<void>}
 */
async function addApplication(event) {
    event.preventDefault();

    const applicationId = document.getElementById('application-id').value; // Get ID for edit mode
    const jobTitle = document.getElementById('job-title').value.trim(); // Trim whitespace
    const company = document.getElementById('company').value.trim(); // Trim whitespace
    const description = document.getElementById('description').value;
    const link = document.getElementById('link').value;
    const applicationDateValue = document.getElementById('application-date').value;
    const status = document.getElementById('status').value;
    const cvFile = document.getElementById('cv-file').files[0];
    const coverLetter = document.getElementById('cover-letter').value;

    // --- START DEBUGGING LOGS ---
    console.log("--- addApplication Debugging ---");
    console.log("applicationId:", applicationId);
    console.log("jobTitle (trimmed):", jobTitle);
    console.log("company (trimmed):", company);
    console.log("applicationDateValue (from input):", applicationDateValue);
    console.log("status:", status);
    console.log("cvFile:", cvFile ? cvFile.name : "No file");
    console.log("coverLetter:", coverLetter);
    // --- END DEBUGGING LOGS ---

    // Client-side validation for required fields
    if (!jobTitle) {
        window.showAlert('Job Title is required.', 'error');
        console.error("Validation failed: Job Title is empty.");
        return;
    }
    if (!company) {
        window.showAlert('Company is required.', 'error');
        console.error("Validation failed: Company is empty.");
        return;
    }
    if (!applicationDateValue) {
        window.showAlert('Application Date is required.', 'error');
        console.error("Validation failed: Application Date is empty.");
        return;
    }

    // Format application_date to ISO 8601 string including time, for robust Pydantic parsing
    let formattedApplicationDate;
    try {
        if (applicationDateValue) {
            // Create a Date object from the YYYY-MM-DD string.
            // Using setHours to ensure it has a time component for ISO string,
            // otherwise, it might default to midnight UTC which can shift dates.
            const dateObj = new Date(applicationDateValue);
            // Check if the dateObj is valid after parsing
            if (isNaN(dateObj.getTime())) {
                throw new Error("Parsed date is invalid.");
            }
            dateObj.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues with midnight
            formattedApplicationDate = dateObj.toISOString();
        } else {
            // This path should ideally not be hit if client-side validation works,
            // but as a fallback, use current date/time.
            formattedApplicationDate = new Date().toISOString();
        }
        console.log("formattedApplicationDate (ISO):", formattedApplicationDate); // Log formatted date
    } catch (e) {
        console.error("Error formatting application date:", e);
        window.showAlert('Invalid Application Date format. Please use YYYY-MM-DD.', 'error');
        return;
    }


    let cvFilePath = null;
    // If editing and no new file is selected, retain the old file path
    if (applicationId) {
        const existingApp = applications.find(app => app.id === applicationId);
        if (existingApp && !cvFile) {
            cvFilePath = existingApp.cv_file;
        }
    }

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
            window.showAlert('Failed to upload CV. Please try again.', 'error');
            return; // Stop the process if CV upload fails
        }
    }

    const applicationData = {
        job_title: jobTitle,
        company: company,
        description: description,
        link: link,
        application_date: formattedApplicationDate, // Use the fully formatted date
        status: status,
        cv_file: cvFilePath,
        cover_letter: coverLetter
    };

    console.log("Application data being sent:", applicationData); // Log final payload

    try {
        let response;
        if (applicationId) { // If ID exists, it's an update
            response = await fetch(`/api/applications/${applicationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(applicationData)
            });
        } else { // Otherwise, it's a new application
            response = await fetch('/api/applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(applicationData)
            });
        }

        if (!response.ok) {
            // Attempt to parse error response from backend
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.detail && Array.isArray(errorData.detail)) {
                    // FastAPI validation errors often come as an array of dicts
                    errorMessage = errorData.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join('\n');
                } else if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else {
                    errorMessage = await response.text(); // Fallback to text if no JSON detail
                }
            } catch (parseError) {
                errorMessage = await response.text(); // Use raw text if JSON parsing fails
            }
            throw new Error(errorMessage);
        }

        const resultApp = await response.json();
        if (applicationId) {
            // Update the existing application in the local array
            const index = applications.findIndex(app => app.id === applicationId);
            if (index !== -1) {
                applications[index] = resultApp;
            }
            window.showAlert('Application updated successfully!', 'success');
        } else {
            applications.push(resultApp);
            window.showAlert('Application added successfully!', 'success');
        }

        renderApplications();
        document.getElementById('application-form').reset();
        hideAddApplicationForm(); // Reset form and hide it
    } catch (error) {
        console.error('Error saving application:', error);
        window.showAlert('Failed to save application: ' + error.message, 'error');
    }
}

/**
 * Updates the status of an existing application.
 * @param {string} id The ID of the application to update.
 * @param {string} newStatus The new status.
 * @returns {Promise<void>}
 */
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
            window.showAlert('Application status updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating application status:', error);
            window.showAlert('Failed to update application status. Please try again.', 'error');
        }
    }
}

/**
 * Deletes an application after user confirmation.
 * @param {string} id The ID of the application to delete.
 * @returns {Promise<void>}
 */
async function deleteApplication(id) {
    window.showConfirm('Are you sure you want to delete this application?', async () => {
        try {
            const response = await fetch(`/api/applications/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const responseBody = await response.json();
                    if (responseBody && responseBody.detail) {
                        errorMessage = responseBody.detail;
                    }
                } catch (e) {
                    errorMessage = await response.text() || errorMessage;
                }
                throw new Error(errorMessage);
            }

            applications = applications.filter(app => String(app.id) !== String(id));
            renderApplications();
            window.showAlert('Application deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting application:', error);
            window.showAlert('Failed to delete application: ' + error.message, 'error');
        }
    });
}

/**
 * Displays application details in a modal.
 * @param {string} id The ID of the application to view.
 */
function viewApplication(id) {
    const app = applications.find(a => a.id === id);
    if (app) {
        document.getElementById('modal-job-title').textContent = app.job_title;
        document.getElementById('modal-company').textContent = app.company;
        document.getElementById('modal-status').textContent = app.status;
        document.getElementById('modal-status').className = `status-badge status-${app.status.toLowerCase()}`;
        document.getElementById('modal-application-date').textContent = new Date(app.application_date).toLocaleDateString();

        // Use innerHTML to respect line breaks and potential formatting
        document.getElementById('modal-description').innerHTML = app.description || 'No description provided.';

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

        // Use innerHTML to respect line breaks and potential formatting
        document.getElementById('modal-cover-letter').innerHTML = app.cover_letter || 'No cover letter provided.';

        document.getElementById('application-detail-modal').classList.add('active'); // Show the modal
    }
}

/**
 * Populates the application form with data for editing an existing application.
 * @param {string} id The ID of the application to edit.
 */
function editApplication(id) {
    const app = applications.find(a => a.id === id);
    if (app) {
        document.getElementById('application-id').value = app.id; // Set hidden ID for update
        document.getElementById('job-title').value = app.job_title;
        document.getElementById('company').value = app.company;
        document.getElementById('description').value = app.description;
        document.getElementById('link').value = app.link;
        // Format date for input type="date" (YYYY-MM-DD)
        document.getElementById('application-date').value = new Date(app.application_date).toISOString().split('T')[0];
        document.getElementById('status').value = app.status;
        document.getElementById('cover-letter').value = app.cover_letter;

        // Display current CV file name if exists
        const cvFileInput = document.getElementById('cv-file');
        const cvFileNameSpan = document.getElementById('cv-file-name-display');
        if (app.cv_file) {
            cvFileNameSpan.textContent = `Current CV: ${app.cv_file.split('/').pop()}`;
            cvFileNameSpan.style.display = 'inline';
        } else {
            cvFileNameSpan.textContent = 'No current CV';
            cvFileNameSpan.style.display = 'none';
        }
        cvFileInput.value = ''; // Clear file input to allow new selection

        document.getElementById('add-application-form').style.display = 'block';
        document.getElementById('add-app-btn').style.display = 'none';
        document.getElementById('application-form-title').textContent = 'Edit Application';
        document.getElementById('save-application-btn').textContent = 'Update Application';
    }
}


/**
 * Closes the application detail modal.
 */
function closeApplicationDetailModal() {
    document.getElementById('application-detail-modal').classList.remove('active');
}

/**
 * Shows the add/edit application form.
 */
function showAddApplicationForm() {
    document.getElementById('add-application-form').style.display = 'block';
    document.getElementById('add-app-btn').style.display = 'none';

    // Reset form for new application
    document.getElementById('application-form').reset();
    document.getElementById('application-id').value = ''; // Clear ID for new application
    document.getElementById('application-form-title').textContent = 'Add New Application'; // Reset form title
    document.getElementById('save-application-btn').textContent = 'Save Application'; // Reset button text
    document.getElementById('application-date').value = new Date().toISOString().split('T')[0]; // Set default date to today
    document.getElementById('cv-file-name-display').style.display = 'none'; // Hide current CV display
}

/**
 * Hides the add/edit application form and resets it.
 */
function hideAddApplicationForm() {
    document.getElementById('add-application-form').style.display = 'none';
    document.getElementById('add-app-btn').style.display = 'block';
    document.getElementById('application-form').reset(); // Clear form fields
    document.getElementById('application-id').value = ''; // Ensure ID is cleared
    document.getElementById('application-form-title').textContent = 'Add New Application'; // Reset form title
    document.getElementById('save-application-btn').textContent = 'Save Application'; // Reset button text
    document.getElementById('cv-file-name-display').style.display = 'none'; // Hide current CV display
}

/**
 * Handles CV file selection for the application form.
 * @param {Event} event The file input change event.
 */
function handleCvFileUpload(event) {
    const fileName = event.target.files[0] ? event.target.files[0].name : 'No file chosen';
    const cvFileNameDisplay = document.getElementById('cv-file-name-display');
    cvFileNameDisplay.textContent = fileName;
    cvFileNameDisplay.style.display = 'inline';
    console.log('CV File selected:', fileName);
}

// Expose functions to the global scope for use in HTML event attributes or other modules
window.renderApplications = renderApplications;
window.filterAndRenderApplications = filterAndRenderApplications;
window.sortTableApplications = sortTableApplications;
window.toggleApplicationView = toggleApplicationView;
window.loadApplications = loadApplications;
window.addApplication = addApplication;
window.updateApplicationStatus = updateApplicationStatus;
window.deleteApplication = deleteApplication;
window.viewApplication = viewApplication;
window.editApplication = editApplication; // Expose new edit function
window.closeApplicationDetailModal = closeApplicationDetailModal;
window.showAddApplicationForm = showAddApplicationForm;
window.hideAddApplicationForm = hideAddApplicationForm;
window.handleCvFileUpload = handleCvFileUpload;

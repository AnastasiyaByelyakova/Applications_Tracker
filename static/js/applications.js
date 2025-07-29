/**
 * Handles all functionalities related to job applications:
 * adding, editing, deleting, displaying, filtering, and sorting.
 */

// Global variable to store applications and their current sort/filter state
let applications = [];
let currentSortColumn = 'application_date'; // Default sort column
let currentSortDirection = 'desc'; // Default sort direction (most recent first)
let currentApplicationView = 'cards'; // Default view mode

// Utility to map status to badge class
const getStatusBadgeClass = (status) => {
    switch (status) {
        case 'Applied': return 'status-applied';
        case 'Interview': return 'status-interview';
        case 'Rejection': return 'status-rejection';
        case 'Offer': return 'status-offer';
        default: return '';
    }
};

/**
 * Fetches applications from the backend.
 * @returns {Promise<Array>} A promise that resolves to an array of application objects.
 */
async function fetchApplications() {
    try {
        const response = await fetch('/api/applications');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        applications = data; // Update global applications array
        return applications;
    } catch (error) {
        console.error('Error fetching applications:', error);
        window.showAlert('Failed to load applications.', 'error');
        return [];
    }
}

/**
 * Loads applications and renders them based on current filter/sort/view settings.
 */
async function loadApplications() {
    await fetchApplications(); // Fetch the latest data
    filterAndRenderApplications(); // Apply current filters/sort and render
}

/**
 * Renders applications in either card or table view based on currentApplicationView.
 * @param {Array} appsToRender The array of applications to render. Defaults to global 'applications'.
 */
function renderApplications(appsToRender = applications) {
    const cardsContainer = document.getElementById('application-list-cards');
    const tableContainer = document.getElementById('application-list-table');
    const tableBody = document.getElementById('applications-table-body');

    if (!cardsContainer || !tableContainer || !tableBody) {
        console.error("Application list containers not found in DOM.");
        return;
    }

    cardsContainer.innerHTML = '';
    tableBody.innerHTML = '';

    if (appsToRender.length === 0) {
        cardsContainer.innerHTML = '<p class="text-center">No applications added yet.</p>';
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No applications added yet.</td></tr>';
    } else {
        appsToRender.forEach(app => {
            // Card View HTML
            cardsContainer.innerHTML += `
                <div class="application-card" data-id="${app.id}">
                    <h4>${app.job_title || 'N/A'}</h4>
                    <p><strong>Company:</strong> ${app.company || 'N/A'}</p>
                    <p><strong>Status:</strong> <span class="status-badge ${getStatusBadgeClass(app.status)}">${app.status || 'N/A'}</span></p>
                    <p><strong>Applied On:</strong> ${app.application_date || 'N/A'}</p>
                    <div class="card-actions">
                        <button class="btn btn-info btn-sm view-btn" data-id="${app.id}">View</button>
                        <button class="btn btn-secondary btn-sm edit-btn" data-id="${app.id}">Edit</button>
                        <button class="btn btn-danger btn-sm delete-btn" data-id="${app.id}">Delete</button>
                    </div>
                </div>
            `;

            // Table View HTML with data-label for responsiveness
            tableBody.innerHTML += `
                <tr data-id="${app.id}">
                    <td data-label="Job Title">${app.job_title || 'N/A'}</td>
                    <td data-label="Company">${app.company || 'N/A'}</td>
                    <td data-label="Application Date">${app.application_date || 'N/A'}</td>
                    <td data-label="Status">
                        <select class="status-select ${getStatusBadgeClass(app.status)}" data-id="${app.id}">
                            <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
                            <option value="Interview" ${app.status === 'Interview' ? 'selected' : ''}>Interview</option>
                            <option value="Rejection" ${app.status === 'Rejection' ? 'selected' : ''}>Rejection</option>
                            <option value="Offer" ${app.status === 'Offer' ? 'selected' : ''}>Offer</option>
                        </select>
                    </td>
                    <td data-label="Job Link">${app.link ? `<a href="${app.link}" target="_blank" class="text-blue-500 hover:underline">Link</a>` : 'N/A'}</td>
                    <td data-label="Actions">
                        <button class="btn btn-info btn-sm view-btn" data-id="${app.id}">View</button>
                        <button class="btn btn-secondary btn-sm edit-btn" data-id="${app.id}">Edit</button>
                        <button class="btn btn-danger btn-sm delete-btn" data-id="${app.id}">Delete</button>
                    </td>
                </tr>
            `;
        });
    }

    // Attach event listeners to newly rendered buttons and selects
    document.querySelectorAll('.view-btn').forEach(button => {
        button.onclick = (event) => showApplicationDetailModal(event.target.dataset.id);
    });
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.onclick = (event) => editApplication(event.target.dataset.id);
    });
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = (event) => deleteApplication(event.target.dataset.id);
    });
    document.querySelectorAll('.status-select').forEach(select => {
        select.onchange = (event) => updateApplicationStatus(event.target.dataset.id, event.target.value);
    });

    // Show the correct container based on current view mode
    if (currentApplicationView === 'cards') {
        cardsContainer.style.display = 'grid';
        tableContainer.style.display = 'none';
    } else { // currentApplicationView === 'table'
        cardsContainer.style.display = 'none';
        tableContainer.style.display = 'table'; // Use 'table' for table display
    }
}

/**
 * Toggles the view mode for applications (cards vs. table).
 */
function toggleApplicationView() {
    const viewToggle = document.getElementById('view-toggle');
    if (viewToggle) {
        currentApplicationView = viewToggle.value;
        renderApplications();
    } else {
        console.error("Application view toggle element not found.");
    }
}

/**
 * Filters and renders applications based on user input.
 */
function filterAndRenderApplications() {
    const filterInput = document.getElementById('filter-applications');
    const filterText = filterInput ? filterInput.value.toLowerCase() : '';

    const filteredApps = applications.filter(app => {
        return (app.job_title && app.job_title.toLowerCase().includes(filterText)) ||
               (app.company && app.company.toLowerCase().includes(filterText)) ||
               (app.status && app.status.toLowerCase().includes(filterText));
    });
    renderApplications(filteredApps);
}

/**
 * Sorts applications by a given column.
 * @param {string} column The column to sort by (e.g., 'job_title', 'company', 'application_date').
 */
function sortTableApplications(column) {
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc'; // Default to ascending when changing column
    }

    applications.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        // Handle date comparison
        if (column === 'application_date') {
            valA = new Date(valA);
            valB = new Date(valB);
        } else if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    renderApplications(); // Re-render with sorted data
}


/**
 * Shows the add/edit application form.
 * If an ID is provided, it populates the form for editing.
 * @param {string} [appId] The ID of the application to edit (optional).
 */
async function showAddApplicationForm(appId = null) {
    const formSection = document.getElementById('add-application-form');
    const formTitle = document.getElementById('application-form-title');
    const saveButton = document.getElementById('save-application-btn');
    const appIdInput = document.getElementById('application-id');
    const cvFileNameDisplay = document.getElementById('cv-file-name-display');
    const cvFileInput = document.getElementById('cv-file');

    if (!formSection || !formTitle || !saveButton || !appIdInput || !cvFileNameDisplay || !cvFileInput) {
        console.error("One or more application form elements not found.");
        return;
    }

    formSection.style.display = 'block';
    document.getElementById('add-app-btn').style.display = 'none';

    if (appId) {
        formTitle.textContent = 'Edit Application';
        saveButton.textContent = 'Update Application';
        appIdInput.value = appId;

        const app = applications.find(a => a.id === appId);
        if (app) {
            document.getElementById('job-title').value = app.job_title || '';
            document.getElementById('company').value = app.company || '';
            document.getElementById('link').value = app.link || '';
            document.getElementById('application-date').value = app.application_date || '';
            document.getElementById('status').value = app.status || 'Applied';
            document.getElementById('description').value = app.description || '';
            document.getElementById('cover-letter').value = app.cover_letter_notes || '';

            // Display current CV file name if available
            if (app.cv_file_name) {
                cvFileNameDisplay.textContent = `Current CV: ${app.cv_file_name}`;
                cvFileNameDisplay.style.display = 'inline';
            } else {
                cvFileNameDisplay.textContent = '';
                cvFileNameDisplay.style.display = 'none';
            }
            cvFileInput.value = ''; // Clear file input for new upload
        }
    } else {
        formTitle.textContent = 'Add New Application';
        saveButton.textContent = 'Save Application';
        appIdInput.value = ''; // Clear ID for new application
        document.getElementById('application-form').reset(); // Clear form fields
        cvFileNameDisplay.textContent = '';
        cvFileNameDisplay.style.display = 'none';
    }
}

/**
 * Hides the add/edit application form.
 */
function hideAddApplicationForm() {
    const formSection = document.getElementById('add-application-form');
    if (formSection) {
        formSection.style.display = 'none';
    }
    const addAppBtn = document.getElementById('add-app-btn');
    if (addAppBtn) {
        addAppBtn.style.display = 'block';
    }
    document.getElementById('application-form').reset(); // Reset form fields
    document.getElementById('application-id').value = ''; // Clear hidden ID
    document.getElementById('cv-file-name-display').style.display = 'none'; // Hide CV file name display
}

/**
 * Handles CV file selection for an application.
 */
function handleCvFileUpload(event) {
    const fileNameDisplay = document.getElementById('cv-file-name-display');
    if (fileNameDisplay) {
        if (event.target.files.length > 0) {
            fileNameDisplay.textContent = `Selected: ${event.target.files[0].name}`;
            fileNameDisplay.style.display = 'inline';
        } else {
            fileNameDisplay.textContent = '';
            fileNameDisplay.style.display = 'none';
        }
    }
}

/**
 * Adds a new application or updates an existing one.
 * @param {Event} event The form submission event.
 */
async function addApplication(event) {
    event.preventDefault();

    const appId = document.getElementById('application-id').value;
    const jobTitle = document.getElementById('job-title').value;
    const company = document.getElementById('company').value;
    const link = document.getElementById('link').value;
    const applicationDate = document.getElementById('application-date').value;
    const status = document.getElementById('status').value;
    const description = document.getElementById('description').value;
    const cvFile = document.getElementById('cv-file').files[0];
    const coverLetterNotes = document.getElementById('cover-letter').value;

    const formData = new FormData();
    formData.append('job_title', jobTitle);
    formData.append('company', company);
    formData.append('link', link);
    formData.append('application_date', applicationDate);
    formData.append('status', status);
    formData.append('description', description);
    formData.append('cover_letter_notes', coverLetterNotes);

    if (cvFile) {
        formData.append('cv_file', cvFile);
    }

    const method = appId ? 'PUT' : 'POST';
    const url = appId ? `/api/applications/${appId}` : '/api/applications';

    try {
        const response = await fetch(url, {
            method: method,
            body: formData // FormData automatically sets Content-Type to multipart/form-data
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to save application.');
        }

        const result = await response.json();
        window.showAlert(`Application ${appId ? 'updated' : 'added'} successfully!`, 'success');
        hideAddApplicationForm();
        loadApplications(); // Reload and re-render applications
        window.loadDashboardData(); // Reload dashboard data
    } catch (error) {
        console.error('Error saving application:', error);
        window.showAlert('Error saving application: ' + error.message, 'error');
    }
}

/**
 * Populates the form with existing application data for editing.
 * @param {string} appId The ID of the application to edit.
 */
function editApplication(appId) {
    showAddApplicationForm(appId);
}

/**
 * Updates the status of an application directly from the table view.
 * @param {string} appId The ID of the application to update.
 * @param {string} newStatus The new status.
 */
async function updateApplicationStatus(appId, newStatus) {
    try {
        const response = await fetch(`/api/applications/${appId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to update application status.');
        }

        window.showAlert('Application status updated!', 'success');
        loadApplications(); // Reload and re-render applications
        window.loadDashboardData(); // Reload dashboard data
    } catch (error) {
        console.error('Error updating status:', error);
        window.showAlert('Error updating status: ' + error.message, 'error');
    }
}

/**
 * Deletes an application after confirmation.
 * @param {string} appId The ID of the application to delete.
 */
function deleteApplication(appId) {
    window.showConfirm('Are you sure you want to delete this application?', async () => {
        try {
            const response = await fetch(`/api/applications/${appId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to delete application.');
            }

            window.showAlert('Application deleted successfully!', 'success');
            loadApplications(); // Reload and re-render applications
            window.loadDashboardData(); // Reload dashboard data
        } catch (error) {
            console.error('Error deleting application:', error);
            window.showAlert('Error deleting application: ' + error.message, 'error');
        }
    });
}

/**
 * Shows the application detail modal with data for the given application ID.
 * @param {string} appId The ID of the application to display.
 */
async function showApplicationDetailModal(appId) {
    const app = applications.find(a => a.id === appId);
    if (!app) {
        window.showAlert('Application not found.', 'error');
        return;
    }

    document.getElementById('modal-job-title').textContent = app.job_title || 'N/A';
    document.getElementById('modal-company').textContent = app.company || 'N/A';

    const statusBadge = document.getElementById('modal-status');
    statusBadge.textContent = app.status || 'N/A';
    statusBadge.className = `status-badge ${getStatusBadgeClass(app.status)}`; // Update class for styling

    document.getElementById('modal-application-date').textContent = app.application_date || 'N/A';
    document.getElementById('modal-description').textContent = app.description || 'N/A';

    const modalLink = document.getElementById('modal-link');
    if (app.link) {
        modalLink.href = app.link;
        modalLink.textContent = 'View Job Posting';
        modalLink.style.display = 'inline';
    } else {
        modalLink.textContent = 'N/A';
        modalLink.style.display = 'none';
    }

    const modalCvFileName = document.getElementById('modal-cv-file-name');
    const modalCvFileLink = document.getElementById('modal-cv-file-link');
    if (app.cv_file_name) {
        modalCvFileName.textContent = app.cv_file_name;
        modalCvFileLink.href = `/api/applications/${app.id}/cv`; // Endpoint to download CV
        modalCvFileLink.style.display = 'inline';
        modalCvFileName.style.display = 'inline';
    } else {
        modalCvFileName.textContent = 'No CV uploaded';
        modalCvFileLink.style.display = 'none';
        modalCvFileName.style.display = 'inline'; // Still show "No CV uploaded"
    }

    document.getElementById('modal-cover-letter').textContent = app.cover_letter_notes || 'N/A';

    document.getElementById('application-detail-modal').classList.add('active');
}

/**
 * Hides the application detail modal.
 */
function closeApplicationDetailModal() {
    document.getElementById('application-detail-modal').classList.remove('active');
}

// Expose functions to the global scope for access from other modules and HTML
window.fetchApplications = fetchApplications;
window.loadApplications = loadApplications;
window.renderApplications = renderApplications;
window.toggleApplicationView = toggleApplicationView;
window.filterAndRenderApplications = filterAndRenderApplications;
window.sortTableApplications = sortTableApplications;
window.showAddApplicationForm = showAddApplicationForm;
window.hideAddApplicationForm = hideAddApplicationForm;
window.handleCvFileUpload = handleCvFileUpload;
window.addApplication = addApplication; // This is actually save/update
window.editApplication = editApplication;
window.updateApplicationStatus = updateApplicationStatus;
window.deleteApplication = deleteApplication;
window.showApplicationDetailModal = showApplicationDetailModal;
window.closeApplicationDetailModal = closeApplicationDetailModal;

console.log("applications.js loaded and functions exposed.");

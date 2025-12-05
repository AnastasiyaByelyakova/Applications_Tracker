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
    // Sort by application_date in descending order by default
    applications.sort((a, b) => new Date(b.application_date) - new Date(a.application_date));
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
        // Ensure that editApplication is called with the correct ID
        button.onclick = (event) => {
            const appId = event.target.dataset.id;
            console.log("edit-btn clicked. Extracted ID:", appId); // Debug log
            editApplication(appId);
        };
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

    // Ensure appId is a string and not an object
    const validatedAppId = typeof appId === 'string' ? appId : null;

    if (validatedAppId) {
        formTitle.textContent = 'Edit Application';
        saveButton.textContent = 'Update Application';
        appIdInput.value = validatedAppId;
        console.log("showAddApplicationForm: Editing app, setting application-id to:", appIdInput.value); // Debug log

        const app = applications.find(a => String(a.id) === String(validatedAppId)); // Ensure string comparison
        if (app) {
            console.log("Editing application. app.application_date:", app.application_date); // Debug log for date value

            // ** Start of added debug logs and date formatting **
            console.log("Before parsing app.application_date:", app.application_date);
            const dateObj = new Date(app.application_date);
            console.log("After parsing to Date object:", dateObj);

            // Check if the dateObj is valid
            if (!isNaN(dateObj.getTime())) {
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
                const day = String(dateObj.getDate()).padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}`;
                console.log("Formatted date (YYYY-MM-DD):", formattedDate);

                console.log("Before setting application-date input value to:", formattedDate);
                document.getElementById('application-date').value = formattedDate;
                console.log("After setting application-date input value.");
            } else {
                console.error("Invalid date received from backend:", app.application_date);
                document.getElementById('application-date').value = ''; // Clear the input if date is invalid
            }
            // ** End of added debug logs and date formatting **
            document.getElementById('job-title').value = app.job_title || '';
            document.getElementById('company').value = app.company || '';
            document.getElementById('link').value = app.link || '';
            document.getElementById('status').value = app.status || 'Applied';
            document.getElementById('description').value = app.description || '';
            document.getElementById('cover-letter').value = app.cover_letter_notes || '';

            // Display current CV file name if available
            if (app.cv_file) { // Check for cv_file path existence
                const fileName = app.cv_file.split('/').pop(); // Extract filename from path
                cvFileNameDisplay.textContent = `Current CV: ${fileName}`;
                cvFileNameDisplay.style.display = 'inline';
            } else {
                cvFileNameDisplay.textContent = '';
                cvFileNameDisplay.style.display = 'none';
            }
            cvFileInput.value = ''; // Clear file input for new upload
        } else {
            console.error("Application not found for editing with ID:", validatedAppId);
            window.showAlert("Application not found for editing.", "error");
            // Optionally, reset form and hide if app not found
            hideAddApplicationForm();
        }
    } else {
        formTitle.textContent = 'Add New Application';
        saveButton.textContent = 'Save Application';
        appIdInput.value = ''; // Clear ID for new application
        console.log("showAddApplicationForm: Adding new app, clearing application-id to:", appIdInput.value); // Debug log
        document.getElementById('application-form').reset(); // Clear form fields
        cvFileNameDisplay.textContent = '';
        // ** Start of added code to pre-fill date **
        // Only pre-fill date for new applications (when appId is null)
        if (!validatedAppId) { // Use validatedAppId here as well
            // Get today's date
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
            const day = String(today.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;

            // Set the value of the application date input
            const applicationDateInput = document.getElementById('application-date');
            if (applicationDateInput) {
                applicationDateInput.value = formattedDate;
            }
        }
        // ** End of added code **
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
    const appIdInput = document.getElementById('application-id');
    if (appIdInput) {
        appIdInput.value = ''; // Explicitly clear hidden ID
        console.log("hideAddApplicationForm: Clearing application-id to:", appIdInput.value); // Debug log
    }
    document.getElementById('cv-file-name-display').style.display = 'none'; // Hide CV file name display
    // Also hide any previous error/loading messages
    hideLoadingHideResult('app-form-loading', 'application-form-messages');
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
    console.log('1. addApplication function called!');
    event.preventDefault(); // Prevent default form submission

    const form = event.target;
    console.log('2. Form element captured:', form);
    const formData = new FormData(form);
    console.log('3. FormData created:', formData);

    // CRITICAL FIX: Get appId directly from the element's value, not from the event object.
    const appIdElement = document.getElementById('application-id');
    const appId = appIdElement ? appIdElement.value : ''; // Safely get the value
    console.log('4. Application ID value:', appId); // This should now be a string or empty string

    // Validate required fields using formData.get()
    const jobTitle = formData.get('job_title');
    const company = formData.get('company');
    const applicationDate = formData.get('application_date');

    if (!jobTitle || !company || !applicationDate) {
        console.log('5. Validation failed: Missing required fields.');
        window.showAlert('Please fill in all required fields (Job Title, Company, Application Date).', 'error');
        // Ensure loading/messages are hidden if validation fails
        hideLoadingHideResult('app-form-loading', 'application-form-messages');
        return;
    }
    console.log('5. Validation passed.');

    showLoading('app-form-loading', 'application-form-messages');
    console.log('6. Loading indicator shown.');

    let endpoint = '/api/applications';
    let method = 'POST';
    if (appId) {
        endpoint = `/api/applications/${appId}`;
        method = 'PUT';
    }
    console.log(`7. Preparing fetch request: Method=${method}, Endpoint=${endpoint}`);

    try {
        console.log('8. Attempting to send fetch request...');
        const response = await fetch(endpoint, {
            method: method,
            body: formData // FormData automatically sets Content-Type to multipart/form-data
        });
        console.log('9. Fetch request completed, response received.');

        if (!response.ok) {
            const errorData = await response.json(); // Attempt to parse JSON error
            console.error("10. Server responded with an error:", errorData); // Log full error from backend
            // Try to get a more specific error message from the backend response
            let errorMessage = 'Failed to save application.';
            if (errorData && typeof errorData === 'object') {
                if (errorData.detail) {
                    // FastAPI validation errors often have 'detail' as an array of objects
                    if (Array.isArray(errorData.detail) && errorData.detail.length > 0 && errorData.detail[0].msg) {
                        errorMessage = errorData.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join('; ');
                    } else if (typeof errorData.detail === 'string') {
                        errorMessage = errorData.detail;
                    }
                } else if (errorData.message) { // Some APIs might use 'message'
                    errorMessage = errorData.message;
                } else {
                    errorMessage = JSON.stringify(errorData); // Fallback to stringifying the whole object
                }
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('11. Application saved successfully:', result);
        window.showAlert(`Application ${appId ? 'updated' : 'added'} successfully!`, 'success');
        hideLoadingHideResult('app-form-loading', 'application-form-messages');
        document.getElementById('add-application-form').style.display = 'none';
        document.getElementById('add-app-btn').style.display = 'block';
        loadApplications(); // Reload and re-render applications
        window.loadDashboardData(); // Reload dashboard data

        // Reset the form after successful submission
        form.reset();
        document.getElementById('cv-file-name-display').textContent = ''; // Clear file name display
        document.getElementById('cv-file-name-display').style.display = 'none';
        document.getElementById('application-id').value = ''; // Clear hidden ID for next add
    } catch (error) {
        console.error('12. Error saving application (frontend catch):', error);
        // Ensure error.message is always a string for display
        const displayMessage = error.message || 'An unknown error occurred.';
        hideLoadingShowResult('app-form-loading', 'application-form-messages', `<p class="text-error">Error: ${displayMessage}</p>`);
        window.showAlert('Error saving application: ' + displayMessage, 'error');
    }
}

/**
 * Populates the form with existing application data for editing.
 * @param {string} appId The ID of the application to edit.
 */
function editApplication(appId) {
    // IMPORTANT: Ensure appId is a string here. If it's an event, this indicates a problem
    // with how the event listener is set up in renderApplications.
    console.log("editApplication: Called with raw appId:", appId, "Type:", typeof appId);
    if (typeof appId !== 'string' || !appId) {
        console.error("editApplication: Invalid appId received. Expected string, got:", appId);
        window.showAlert("Error: Invalid application ID for editing.", "error");
        return;
    }
    console.log("editApplication: Valid appId received:", appId); // Debug log
    showAddApplicationForm(appId);
}

/**
 * Updates the status of an application directly from the table view.
 * @param {string} appId The ID of the application to update.
 * @param {string} newStatus The new status.
 */
async function updateApplicationStatus(appId, newStatus) {
    const app = applications.find(a => String(a.id) === String(appId));
    if (!app) {
        window.showAlert('Application not found.', 'error');
        return;
    }

    // Create a FormData object to send
    const formData = new FormData();
    formData.append('job_title', app.job_title);
    formData.append('company', app.company);
    formData.append('application_date', app.application_date.split('T')[0]); // Send date in YYYY-MM-DD format
    formData.append('status', newStatus);
    formData.append('description', app.description || '');
    formData.append('link', app.link || '');
    formData.append('cover_letter', app.cover_letter || '');

    try {
        const response = await fetch(`/api/applications/${appId}`, {
            method: 'PUT',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to update status.');
        }

        window.showAlert('Application status updated!', 'success');
        await loadApplications(); // Reload applications to reflect changes
        window.loadDashboardData(); // Update dashboard data as well
    } catch (error) {
        console.error('Error updating status:', error);
        window.showAlert('Error updating status: ' + error.message, 'error');
        // Optionally, revert the select dropdown on failure
        loadApplications();
    }
}

/**
 * Deletes an application after confirmation.
 * @param {string} appId The ID of the application to delete.
 */
function deleteApplication(appId) {
    console.log("deleteApplication: Deleting app ID:", appId); // Debug log
    window.showConfirm('Are you sure you want to delete this application?', async () => {
        try {
            const response = await fetch(`/api/applications/${appId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Backend error deleting application:", errorData); // Log full error from backend
                let errorMessage = 'Failed to delete application.';
                if (errorData && errorData.detail) {
                    if (Array.isArray(errorData.detail) && errorData.detail.length > 0 && errorData.detail[0].msg) {
                        errorMessage = errorData.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join('; ');
                    } else if (typeof errorData.detail === 'string') {
                        errorMessage = errorData.detail;
                    }
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                } else {
                    errorMessage = JSON.stringify(errorData);
                }
                throw new Error(errorMessage);
            }

            window.showAlert('Application deleted successfully!', 'success');
            loadApplications(); // Reload and re-render applications
            window.loadDashboardData(); // Reload dashboard data
        } catch (error) {
            console.error('Error deleting application (frontend catch):', error);
            window.showAlert('Error deleting application: ' + error.message, 'error');
        }
    });
}

/**
 * Shows the application detail modal with data for the given application ID.
 * @param {string} appId The ID of the application to display.
 */
async function showApplicationDetailModal(appId) {
    console.log("showApplicationDetailModal: Viewing app ID:", appId); // Debug log
    const app = applications.find(a => String(a.id) === String(appId)); // Ensure string comparison
    if (!app) {
        window.showAlert('Application not found.', 'error');
        console.error("Application not found for detail modal with ID:", appId);
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
    if (app.cv_file) { // Check for cv_file path existence
        const fileName = app.cv_file.split('/').pop(); // Extract filename from path
        modalCvFileName.textContent = fileName;
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
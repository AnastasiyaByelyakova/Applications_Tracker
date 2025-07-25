// Global array to store applications
let applications = [];

/**
 * Fetches applications from the backend and renders them.
 */
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

/**
 * Renders applications based on the current view mode (cards or table).
 */
function renderApplications() {
    const viewToggle = document.getElementById('view-toggle');
    const cardsView = document.getElementById('application-list-cards');
    const tableView = document.getElementById('application-list-table');

    if (viewToggle.value === 'cards') {
        cardsView.style.display = 'grid';
        tableView.style.display = 'none';
        renderApplicationCards(applications);
    } else {
        cardsView.style.display = 'none';
        tableView.style.display = 'block';
        renderApplicationTable(applications);
    }
}

/**
 * Renders applications as cards.
 * @param {Array<object>} apps The array of application objects.
 */
function renderApplicationCards(apps) {
    const container = document.getElementById('application-list-cards');
    container.innerHTML = ''; // Clear existing cards

    if (apps.length === 0) {
        container.innerHTML = '<p class="text-center">No applications found. Add a new one!</p>';
        return;
    }

    apps.forEach(app => {
        const appDate = new Date(app.application_date).toLocaleDateString();
        const card = document.createElement('div');
        card.classList.add('application-card');
        card.innerHTML = `
            <h4>${app.job_title} at ${app.company}</h4>
            <p>Status: <span class="status-badge status-${app.status.toLowerCase()}">${app.status}</span></p>
            <p>Applied On: ${appDate}</p>
            <div class="card-actions">
                <button class="btn btn-info btn-sm" onclick="showApplicationDetailModal('${app.id}')">View Details</button>
                <button class="btn btn-danger btn-sm" onclick="deleteApplication('${app.id}')">Delete</button>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * Renders applications as a table.
 * @param {Array<object>} apps The array of application objects.
 */
function renderApplicationTable(apps) {
    const tbody = document.getElementById('applications-table-body');
    tbody.innerHTML = ''; // Clear existing rows

    if (apps.length === 0) {
        const table = document.getElementById('application-list-table');
        table.style.display = 'block'; // Ensure table is visible to show message
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No applications found. Add a new one!</td></tr>';
        return;
    }

    apps.forEach(app => {
        const appDate = new Date(app.application_date).toLocaleDateString();
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${app.job_title}</td>
            <td>${app.company}</td>
            <td>${appDate}</td>
            <td>
                <select class="status-select status-${app.status.toLowerCase()}" onchange="updateApplicationStatus('${app.id}', this.value)">
                    <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
                    <option value="Interview" ${app.status === 'Interview' ? 'selected' : ''}>Interview</option>
                    <option value="Rejection" ${app.status === 'Rejection' ? 'selected' : ''}>Rejection</option>
                    <option value="Offer" ${app.status === 'Offer' ? 'selected' : ''}>Offer</option>
                </select>
            </td>
            <td>
                <button class="btn btn-info btn-sm" onclick="showApplicationDetailModal('${app.id}')">View</button>
                <button class="btn btn-danger btn-sm" onclick="deleteApplication('${app.id}')">Delete</button>
            </td>
        `;
    });
}

/**
 * Shows the add/edit application form modal.
 * @param {string} [appId=null] The ID of the application to edit, or null for a new application.
 */
async function showApplicationForm(appId = null) {
    const formSection = document.getElementById('add-application-form');
    const form = document.getElementById('application-form');
    form.reset(); // Clear previous form data
    document.getElementById('application-id').value = ''; // Clear hidden ID field

    if (appId) {
        // Editing existing application
        try {
            const response = await fetch(`/api/applications/${appId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const app = await response.json();
            document.getElementById('application-id').value = app.id; // Set hidden ID
            document.getElementById('job-title').value = app.job_title;
            document.getElementById('company').value = app.company;
            document.getElementById('link').value = app.link;
            document.getElementById('application-date').value = app.application_date.split('T')[0]; // Format date
            document.getElementById('status').value = app.status;
            document.getElementById('description').value = app.description;
            // CV file name display (actual file input remains empty for security)
            // document.getElementById('cv-file-name').textContent = app.cv_file ? app.cv_file.split('/').pop() : 'No file uploaded';
            document.getElementById('cover-letter').value = app.cover_letter;
            formSection.querySelector('h3').textContent = 'Edit Application';
        } catch (error) {
            console.error('Error fetching application for edit:', error);
            showAlert('Failed to load application for editing.', 'error');
            return;
        }
    } else {
        // Adding new application
        formSection.querySelector('h3').textContent = 'Add New Application';
        // Set default application date to today
        document.getElementById('application-date').value = new Date().toISOString().split('T')[0];
    }
    formSection.style.display = 'block';
    document.getElementById('add-app-btn').style.display = 'none'; // Hide add button when form is open
}

/**
 * Hides the add/edit application form.
 */
function hideApplicationForm() {
    document.getElementById('add-application-form').style.display = 'none';
    document.getElementById('add-app-btn').style.display = 'block'; // Show add button
}

/**
 * Handles saving a new or updating an existing application.
 */
async function saveApplication() {
    const appId = document.getElementById('application-id').value;
    const jobTitle = document.getElementById('job-title').value;
    const company = document.getElementById('company').value;
    const link = document.getElementById('link').value;
    const applicationDate = document.getElementById('application-date').value;
    const status = document.getElementById('status').value;
    const description = document.getElementById('description').value;
    const cvFile = document.getElementById('cv-file').files[0];
    const coverLetter = document.getElementById('cover-letter').value;

    if (!jobTitle || !company) {
        showAlert('Job Title and Company are required.', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('job_title', jobTitle);
    formData.append('company', company);
    formData.append('link', link);
    formData.append('application_date', applicationDate);
    formData.append('status', status);
    formData.append('description', description);
    formData.append('cover_letter', coverLetter);
    if (cvFile) {
        formData.append('cv_file', cvFile);
    }

    try {
        let response;
        if (appId) {
            // Update existing application
            response = await fetch(`/api/applications/${appId}`, {
                method: 'PUT',
                body: formData
            });
        } else {
            // Add new application
            response = await fetch('/api/applications', {
                method: 'POST',
                body: formData
            });
        }

        if (response.ok) {
            showAlert('Application saved successfully!', 'success');
            hideApplicationForm();
            loadApplications(); // Reload applications list
            loadDashboardData(); // Update dashboard charts
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to save application.');
        }
    } catch (error) {
        console.error('Error saving application:', error);
        showAlert('Error saving application: ' + error.message, 'error');
    }
}

/**
 * Deletes an application after confirmation.
 * @param {string} appId The ID of the application to delete.
 */
function deleteApplication(appId) {
    showConfirm('Are you sure you want to delete this application?', async () => {
        try {
            const response = await fetch(`/api/applications/${appId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showAlert('Application deleted successfully!', 'success');
                loadApplications(); // Reload applications list
                loadDashboardData(); // Update dashboard charts
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to delete application.');
            }
        } catch (error) {
            console.error('Error deleting application:', error);
            showAlert('Error deleting application: ' + error.message, 'error');
        }
    });
}

/**
 * Updates the status of an application directly from the table view.
 * @param {string} appId The ID of the application to update.
 * @param {string} newStatus The new status.
 */
async function updateApplicationStatus(appId, newStatus) {
    const appToUpdate = applications.find(app => app.id === appId);
    if (!appToUpdate) {
        showAlert('Application not found for status update.', 'error');
        return;
    }

    // Create a copy and update only the status
    const updatedAppData = { ...appToUpdate, status: newStatus };

    // Remove ID and last_updated as they are not part of the Pydantic model for PUT
    delete updatedAppData.id;
    delete updatedAppData.last_updated;

    try {
        const response = await fetch(`/api/applications/${appId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedAppData)
        });

        if (response.ok) {
            showAlert('Application status updated!', 'success');
            loadApplications(); // Reload to reflect changes and update dashboard
            loadDashboardData();
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to update application status.');
        }
    } catch (error) {
        console.error('Error updating application status:', error);
        showAlert('Error updating status: ' + error.message, 'error');
    }
}


/**
 * Shows the application detail modal.
 * @param {string} appId The ID of the application to display.
 */
async function showApplicationDetailModal(appId) {
    const modal = document.getElementById('application-detail-modal');
    const app = applications.find(a => a.id === appId);

    if (!app) {
        showAlert('Application details not found!', 'error');
        return;
    }

    document.getElementById('modal-job-title').textContent = app.job_title;
    document.getElementById('modal-company').textContent = app.company;

    const statusBadge = document.getElementById('modal-status');
    statusBadge.textContent = app.status;
    statusBadge.className = `status-badge status-${app.status.toLowerCase()}`; // Update class for styling

    document.getElementById('modal-application-date').textContent = new Date(app.application_date).toLocaleDateString();
    document.getElementById('modal-description').textContent = app.description || 'N/A';

    const linkElement = document.getElementById('modal-link');
    if (app.link) {
        linkElement.href = app.link;
        linkElement.style.display = 'inline';
    } else {
        linkElement.style.display = 'none';
    }

    const cvFileNameSpan = document.getElementById('modal-cv-file-name');
    const cvFileLink = document.getElementById('modal-cv-file-link');
    if (app.cv_file) {
        const filename = app.cv_file.split('/').pop();
        cvFileNameSpan.textContent = filename;
        cvFileLink.href = `/uploads/${filename}`; // Assuming files are served from /uploads
        cvFileLink.style.display = 'inline';
    } else {
        cvFileNameSpan.textContent = 'No CV uploaded';
        cvFileLink.style.display = 'none';
    }
    document.getElementById('modal-cover-letter').textContent = app.cover_letter || 'No notes.';

    modal.classList.add('active');
}

/**
 * Hides the application detail modal.
 */
function closeApplicationDetailModal() {
    document.getElementById('application-detail-modal').classList.remove('active');
}

/**
 * Filters applications based on search input.
 */
function filterApplications() {
    const filterText = document.getElementById('filter-applications').value.toLowerCase();
    const filteredApps = applications.filter(app =>
        app.job_title.toLowerCase().includes(filterText) ||
        app.company.toLowerCase().includes(filterText) ||
        app.status.toLowerCase().includes(filterText)
    );
    renderApplicationsBasedOnCurrentView(filteredApps); // Render filtered apps based on current view
}

/**
 * Helper to render applications based on the currently selected view (cards/table).
 * @param {Array<object>} apps The array of application objects to render.
 */
function renderApplicationsBasedOnCurrentView(apps) {
    const viewToggle = document.getElementById('view-toggle');
    if (viewToggle.value === 'cards') {
        renderApplicationCards(apps);
    } else {
        renderApplicationTable(apps);
    }
}


/**
 * Sorts the applications table.
 * @param {string} column The column to sort by.
 */
let currentAppSortColumn = '';
let currentAppSortDirection = 'asc'; // 'asc' or 'desc'

function sortTableApplications(column) {
    if (currentAppSortColumn === column) {
        currentAppSortDirection = (currentAppSortDirection === 'asc') ? 'desc' : 'asc';
    } else {
        currentAppSortColumn = column;
        currentAppSortDirection = 'asc';
    }

    applications.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        // Handle date comparisons
        if (column.includes('date')) {
            valA = new Date(valA);
            valB = new Date(valB);
        }

        if (valA < valB) {
            return currentAppSortDirection === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
            return currentAppSortDirection === 'asc' ? 1 : -1;
        }
        return 0;
    });

    renderApplicationsBasedOnCurrentView(applications); // Re-render with sorted data
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('add-app-btn')?.addEventListener('click', () => showApplicationForm());
    document.getElementById('cancel-app-btn')?.addEventListener('click', hideApplicationForm);
    document.getElementById('application-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        await saveApplication();
    });
    document.getElementById('filter-applications')?.addEventListener('input', filterApplications);
    document.getElementById('view-toggle')?.addEventListener('change', renderApplications); // Re-render on view change
});

// Expose functions to the global scope for app.js and HTML
window.loadApplications = loadApplications;
window.showApplicationForm = showApplicationForm;
window.deleteApplication = deleteApplication;
window.updateApplicationStatus = updateApplicationStatus;
window.showApplicationDetailModal = showApplicationDetailModal;
window.closeApplicationDetailModal = closeApplicationDetailModal;
window.sortTableApplications = sortTableApplications;

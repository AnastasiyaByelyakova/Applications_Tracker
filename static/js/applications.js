// Global variables for applications module
let applications = []; // Filtered applications for the main applications tab
let allApplications = []; // All applications for dashboard calculations (used by dashboard.js)
let currentSortColumnApplications = 'application_date';
let currentSortDirectionApplications = 'desc';
let currentFilterTextApplications = '';
let currentViewApplications = 'cards';

/**
 * Renders the list of job applications in either card or table view.
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

/**
 * Filters and re-renders applications based on the search input.
 */
function filterAndRenderApplications() {
    currentFilterTextApplications = document.getElementById('filter-applications').value;
    renderApplications();
}

/**
 * Sorts the applications table by a given column.
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
 * Toggles between card and table view for applications.
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
 * Loads job applications from the backend API.
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
 * Adds a new job application or updates an existing one.
 * @param {Event} event The form submission event.
 */
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

/**
 * Updates the status of an existing application.
 * @param {string} id The ID of the application to update.
 * @param {string} newStatus The new status.
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
            showAlert('Application status updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating application status:', error);
            showAlert('Failed to update application status. Please try again.', 'error');
        }
    }
}

/**
 * Deletes a job application after confirmation.
 * @param {string} id The ID of the application to delete.
 */
async function deleteApplication(id) {
    showConfirm('Are you sure you want to delete this application?', async () => {
        try {
            const response = await fetch(`/api/applications/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorMessage;
                } catch (parseError) {
                    errorMessage = await response.text() || errorMessage;
                }
                throw new Error(errorMessage);
            }

            applications = applications.filter(app => String(app.id) !== String(id));
            showAlert('Application deleted successfully!', 'success');
            renderApplications();
        } catch (error) {
            console.error('Error deleting application:', error);
            showAlert('Failed to delete application: ' + error.message, 'error');
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
    // Set default application date to today
    document.getElementById('application-date').value = new Date().toISOString().split('T')[0];
}

/**
 * Hides the add/edit application form and resets it.
 */
function hideAddApplicationForm() {
    document.getElementById('add-application-form').style.display = 'none';
    document.getElementById('add-app-btn').style.display = 'block';
    document.getElementById('application-form').reset(); // Clear form fields
}

/**
 * Handles CV file selection (for logging purposes, can be extended).
 * @param {Event} event The file input change event.
 */
function handleCvFileUpload(event) {
    const fileName = event.target.files[0] ? event.target.files[0].name : 'No file chosen';
    console.log('CV File selected:', fileName);
}

// Expose functions to the global scope for HTML event handlers
window.deleteApplication = deleteApplication;
window.viewApplication = viewApplication;
window.sortTableApplications = sortTableApplications;
window.updateApplicationStatus = updateApplicationStatus;
window.closeApplicationDetailModal = closeApplicationDetailModal;
window.showAddApplicationForm = showAddApplicationForm;
window.hideAddApplicationForm = hideAddApplicationForm;
window.addApplication = addApplication;
window.filterAndRenderApplications = filterAndRenderApplications;
window.toggleApplicationView = toggleApplicationView;
window.handleCvFileUpload = handleCvFileUpload;

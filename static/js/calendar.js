// Global variables for calendar module
let interviews = []; // Stores interview data
let currentCalendarDate = new Date(); // For calendar navigation
let currentSortColumnInterviews = 'start_datetime';
let currentSortDirectionInterviews = 'asc';

/**
 * Loads interview data for the current month from the backend API.
 */
async function loadInterviews() {
    try {
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth() + 1; // Months are 0-indexed in JS, 1-indexed in API

        const response = await fetch(`/api/interviews?year=${year}&month=${month}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        interviews = await response.json();
        renderCalendar(); // Re-render main calendar
        renderMonthlyInterviewList(); // Render the list of interviews for the month
        renderMiniCalendar('mini-calendar-next-1', new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
        renderMiniCalendar('mini-calendar-next-2', new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 2, 1));
    } catch (error) {
        console.error('Error loading interviews:', error);
        showAlert('Failed to load interviews. Please try again.', 'error');
    }
}

/**
 * Renders the main calendar grid for the current month.
 */
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
 * Renders a mini calendar grid for a given month, showing only event indicators.
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

/**
 * Changes the current month displayed in the calendar.
 * @param {number} delta The number of months to change by (-1 for previous, 1 for next).
 */
function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    loadInterviews(); // Reload interviews for the new month
}

/**
 * Shows the interview form modal for scheduling a new interview or editing an existing one.
 * @param {object} [interview=null] The interview object to edit, or null for a new interview.
 */
async function showInterviewFormModal(interview = null) {
    const modal = document.getElementById('interview-form-modal');
    const form = document.getElementById('interview-form');
    const modalTitle = document.getElementById('interview-modal-title');
    form.reset(); // Clear form

    if (interview) {
        modalTitle.textContent = 'Edit Interview';
        document.getElementById('interview-id').value = interview.id ? String(interview.id) : '';
        document.getElementById('interview-title').value = interview.interview_title;

        const startDate = new Date(interview.start_datetime);
        const endDate = new Date(interview.end_datetime);

        document.getElementById('interview-date').value = isValidDate(startDate) ? startDate.toISOString().split('T')[0] : '';
        document.getElementById('interview-start-time').value = isValidDate(startDate) ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        document.getElementById('interview-end-time').value = isValidDate(endDate) ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

        document.getElementById('interview-location').value = interview.location || '';
        document.getElementById('interview-type').value = interview.interview_type || '';
        document.getElementById('interview-notes').value = interview.notes || '';
    } else {
        modalTitle.textContent = 'Schedule New Interview';
        document.getElementById('interview-id').value = ''; // Clear ID for new interview
        document.getElementById('interview-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('interview-start-time').value = '09:00';
        document.getElementById('interview-end-time').value = '10:00';
    }
    modal.classList.add('active');
}

/**
 * Hides the interview form modal.
 */
function hideInterviewFormModal() {
    document.getElementById('interview-form-modal').classList.remove('active');
}

/**
 * Handles the submission of the interview form (add or edit).
 * @param {Event} event The form submission event.
 */
async function handleInterviewFormSubmit(event) {
    event.preventDefault();

    const interviewId = document.getElementById('interview-id').value;
    const interviewTitle = document.getElementById('interview-title').value;
    const interviewDate = document.getElementById('interview-date').value;
    const startTime = document.getElementById('interview-start-time').value;
    const endTime = document.getElementById('interview-end-time').value;
    const location = document.getElementById('interview-location').value;
    const type = document.getElementById('interview-type').value;
    const notes = document.getElementById('interview-notes').value;

    if (!interviewTitle || !interviewDate || !startTime || !endTime) {
        showAlert('Please fill in all required interview fields (Title, Date, Start/End Time).', 'error');
        return;
    }

    const startDatetime = `${interviewDate}T${startTime}:00`;
    const endDatetime = `${interviewDate}T${endTime}:00`;

    const newStart = new Date(startDatetime);
    const newEnd = new Date(endDatetime);

    if (newStart >= newEnd) {
        showAlert('End time must be after start time.', 'error');
        return;
    }

    const hasOverlap = interviews.some(existingInterview => {
        if (interviewId && String(existingInterview.id) === interviewId) {
            return false;
        }

        const existingStart = new Date(existingInterview.start_datetime);
        const existingEnd = new Date(existingInterview.end_datetime);

        return (newStart < existingEnd) && (newEnd > existingStart);
    });

    if (hasOverlap) {
        showAlert('This interview time overlaps with an existing interview. Please choose a different time.', 'error');
        return;
    }

    const interviewData = {
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
        } else {
            method = 'POST';
            url = '/api/interviews';
        }

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

/**
 * Displays interview details in a modal.
 * @param {string} id The ID of the interview to view.
 */
function viewInterviewDetails(id) {
    const interview = interviews.find(i => String(i.id) === String(id));
    if (!interview) {
        showAlert('Interview details not found.', 'error');
        return;
    }

    const detailModal = document.getElementById('interview-detail-modal');
    document.getElementById('detail-interview-title').textContent = interview.interview_title;

    const startDt = new Date(interview.start_datetime);
    const endDt = new Date(interview.end_datetime);
    document.getElementById('detail-interview-time').textContent =
        `${isValidDate(startDt) ? startDt.toLocaleDateString() : 'Invalid Date'} ${isValidDate(startDt) ? startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} - ${isValidDate(endDt) ? endDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`;

    document.getElementById('detail-interview-location').textContent = interview.location || 'N/A';
    document.getElementById('detail-interview-type').textContent = interview.interview_type || 'N/A';
    document.getElementById('detail-interview-notes').textContent = interview.notes || 'No notes.';

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

/**
 * Hides the interview detail modal.
 */
function hideInterviewDetailModal() {
    document.getElementById('interview-detail-modal').classList.remove('active');
}

/**
 * Renders the monthly interview list as a sortable table.
 */
function renderMonthlyInterviewList() {
    const monthlyListContainer = document.getElementById('monthly-interview-list');
    monthlyListContainer.innerHTML = ''; // Clear previous list

    let currentMonthInterviews = interviews.filter(interview => {
        const interviewDate = new Date(interview.start_datetime);
        return isValidDate(interviewDate) &&
               interviewDate.getFullYear() === currentCalendarDate.getFullYear() &&
               interviewDate.getMonth() === currentCalendarDate.getMonth();
    });

    currentMonthInterviews.sort((a, b) => {
        let valA = a[currentSortColumnInterviews];
        let valB = b[currentSortColumnInterviews];

        if (currentSortColumnInterviews === 'start_datetime') {
            valA = new Date(valA);
            valB = new Date(valB);
        } else if (['interview_title', 'location', 'interview_type'].includes(currentSortColumnInterviews)) {
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
    table.className = 'interview-list-table';
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

/**
 * Sorts the monthly interview table by a given column.
 * @param {string} column The column to sort by.
 */
function sortTableInterviews(column) {
    if (currentSortColumnInterviews === column) {
        currentSortDirectionInterviews = currentSortDirectionInterviews === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumnInterviews = column;
        currentSortDirectionInterviews = 'asc';
    }
    renderMonthlyInterviewList(); // Re-render to apply new sort order
}

/**
 * Deletes an interview after confirmation.
 * @param {string} id The ID of the interview to delete.
 */
async function deleteInterview(id) {
    showConfirm('Are you sure you want to delete this interview?', async () => {
        try {
            const response = await fetch(`/api/interviews/${id}`, {
                method: 'DELETE'
            });

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

            interviews = interviews.filter(interview => String(interview.id) !== String(id));
            showAlert('Interview deleted successfully!', 'success');
            loadInterviews(); // Reload interviews to update calendar and list
        } catch (error) {
            console.error('Error deleting interview:', error);
            showAlert('Failed to delete interview: ' + error.message, 'error');
        }
    });
}

// Expose functions to the global scope for HTML event handlers
window.viewInterviewDetails = viewInterviewDetails;
window.hideInterviewFormModal = hideInterviewFormModal;
window.hideInterviewDetailModal = hideInterviewDetailModal;
window.deleteInterview = deleteInterview;
window.sortTableInterviews = sortTableInterviews;
window.changeMonth = changeMonth; // Expose for prev/next month buttons
window.showInterviewFormModal = showInterviewFormModal; // Expose for add interview button
window.handleInterviewFormSubmit = handleInterviewFormSubmit; // Expose for form submit
/**
 * Handles calendar functionalities including rendering, interview scheduling, and data management.
 */

// Global variable to store interviews
let interviews = [];

// Global variable for the current month being displayed in the main calendar
window.currentCalendarDate = new Date();

/**
 * Fetches interviews from the backend.
 * @returns {Promise<Array>} A promise that resolves to an array of interview objects.
 */
async function fetchInterviews() {
    console.log("Fetching interviews...");
    try {
        const response = await fetch('/api/interviews');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        interviews = data; // Update global interviews array
        console.log("Interviews fetched successfully:", interviews);
        return interviews;
    } catch (error) {
        console.error('Error fetching interviews:', error);
        window.showAlert('Failed to load interviews.', 'error');
        return [];
    }
}

/**
 * Renders the main calendar grid for the current month.
 */
async function renderCalendar() {
    console.log("Rendering calendar...");
    await fetchInterviews(); // Ensure interviews are loaded before rendering

    const monthYearDisplay = document.getElementById('current-month-year');
    const daysGrid = document.getElementById('calendar-days-grid');

    if (!monthYearDisplay || !daysGrid) {
        console.error("Calendar elements (monthYearDisplay or daysGrid) not found in DOM.");
        return;
    }

    monthYearDisplay.textContent = window.currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    daysGrid.innerHTML = `
        <div class="calendar-day-header">Sun</div>
        <div class="calendar-day-header">Mon</div>
        <div class="calendar-day-header">Tue</div>
        <div class="calendar-day-header">Wed</div>
        <div class="calendar-day-header">Thu</div>
        <div class="calendar-day-header">Fri</div>
        <div class="calendar-day-header">Sat</div>
    `; // Re-add headers

    const year = window.currentCalendarDate.getFullYear();
    const month = window.currentCalendarDate.getMonth(); // 0-indexed

    // Get the first day of the month and the number of days in the month
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday, etc.
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Add empty divs for days before the 1st of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
        daysGrid.innerHTML += '<div class="calendar-day empty"></div>';
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        dayElement.dataset.date = dateString; // Store full date for easy lookup

        // Add day number
        const dayNumberSpan = document.createElement('span');
        dayNumberSpan.classList.add('day-number');
        dayNumberSpan.textContent = day;
        dayElement.appendChild(dayNumberSpan);

        // Add interviews for this day
        const interviewsOnThisDay = interviews.filter(interview => {
            // Ensure interview.start_datetime is a valid date string before creating Date object
            if (!interview.start_datetime) return false;
            const interviewDate = new Date(interview.start_datetime);
            return window.isValidDate(interviewDate) && interviewDate.toISOString().split('T')[0] === dateString;
        });

        interviewsOnThisDay.forEach(interview => {
            const eventDiv = document.createElement('div');
            eventDiv.classList.add('calendar-event');
            eventDiv.dataset.id = interview.id;

            const startTime = new Date(interview.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            eventDiv.innerHTML = `<span class="event-time">${startTime}</span> ${interview.interview_title}`;
            eventDiv.onclick = (event) => {
                event.stopPropagation(); // Prevent day click from firing
                showInterviewDetailModal(interview.id);
            };
            dayElement.appendChild(eventDiv);
        });

        dayElement.onclick = () => showInterviewFormModal(dateString); // Click day to add interview
        daysGrid.appendChild(dayElement);
    }

    console.log("Calendar rendered. Total interviews for this month:", interviews.length);
    renderMiniCalendars(); // Update mini calendars when main calendar changes
    loadMonthlyInterviews(); // Update monthly list
}

/**
 * Changes the displayed month in the main calendar.
 * @param {number} offset - -1 for previous month, 1 for next month.
 */
function changeMonth(offset) {
    window.currentCalendarDate.setMonth(window.currentCalendarDate.getMonth() + offset);
    renderCalendar();
}

/**
 * Renders mini calendars for the next two months.
 */
function renderMiniCalendars() {
    const miniCalendar1 = document.getElementById('mini-calendar-next-1');
    const miniCalendar2 = document.getElementById('mini-calendar-next-2');

    if (!miniCalendar1 || !miniCalendar2) {
        console.error("Mini calendar containers not found.");
        return;
    }

    miniCalendar1.innerHTML = '';
    miniCalendar2.innerHTML = '';

    const nextMonthDate = new Date(window.currentCalendarDate.getFullYear(), window.currentCalendarDate.getMonth() + 1, 1);
    const twoMonthsLaterDate = new Date(window.currentCalendarDate.getFullYear(), window.currentCalendarDate.getMonth() + 2, 1);

    renderSingleMiniCalendar(miniCalendar1, nextMonthDate);
    renderSingleMiniCalendar(miniCalendar2, twoMonthsLaterDate);
}

/**
 * Renders a single mini calendar.
 * @param {HTMLElement} container The container element for the mini calendar.
 * @param {Date} date The date object for the month to render.
 */
function renderSingleMiniCalendar(container, date) {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed

    const monthName = date.toLocaleString('default', { month: 'short' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    let miniCalendarHtml = `
        <div class="mini-calendar-header"><h4>${monthName} ${year}</h4></div>
        <div class="mini-calendar-grid">
            <div class="mini-calendar-day-header">S</div>
            <div class="mini-calendar-day-header">M</div>
            <div class="mini-calendar-day-header">T</div>
            <div class="mini-calendar-day-header">W</div>
            <div class="mini-calendar-day-header">T</div>
            <div class="mini-calendar-day-header">F</div>
            <div class="mini-calendar-day-header">S</div>
    `;

    for (let i = 0; i < firstDayOfMonth; i++) {
        miniCalendarHtml += '<div class="mini-calendar-day empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasInterview = interviews.some(interview => {
            if (!interview.start_datetime) return false;
            const interviewDate = new Date(interview.start_datetime);
            return window.isValidDate(interviewDate) && interviewDate.toISOString().split('T')[0] === dateString;
        });
        miniCalendarHtml += `
            <div class="mini-calendar-day">
                ${day}
                ${hasInterview ? '<span class="mini-event-indicator"></span>' : ''}
            </div>
        `;
    }
    miniCalendarHtml += '</div>';
    container.innerHTML = miniCalendarHtml;
}

/**
 * Loads and displays interviews for the current month in a list format.
 */
function loadMonthlyInterviews() {
    console.log("Loading monthly interviews list...");
    const monthlyInterviewList = document.getElementById('monthly-interview-list');
    if (!monthlyInterviewList) {
        console.error("Monthly interview list container not found.");
        return;
    }

    const year = window.currentCalendarDate.getFullYear();
    const month = window.currentCalendarDate.getMonth();

    const interviewsThisMonth = interviews.filter(interview => {
        if (!interview.start_datetime) return false;
        const interviewDate = new Date(interview.start_datetime);
        return window.isValidDate(interviewDate) && interviewDate.getFullYear() === year && interviewDate.getMonth() === month;
    }).sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    console.log("Interviews for this month:", interviewsThisMonth);

    if (interviewsThisMonth.length === 0) {
        monthlyInterviewList.innerHTML = '<p class="text-center">No interviews scheduled for this month.</p>';
        return;
    }

    let tableHtml = `
        <table class="interview-list-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Title</th>
                    <th>Location</th>
                    <th>Type</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    interviewsThisMonth.forEach(interview => {
        const startDt = new Date(interview.start_datetime);
        const endDt = new Date(interview.end_datetime);

        const dateStr = window.isValidDate(startDt) ? startDt.toLocaleDateString() : 'N/A';
        const startTimeStr = window.isValidDate(startDt) ? startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        const endTimeStr = window.isValidDate(endDt) ? endDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

        tableHtml += `
            <tr>
                <td data-label="Date">${dateStr}</td>
                <td data-label="Time">${startTimeStr} - ${endTimeStr}</td>
                <td data-label="Title">${interview.interview_title || 'N/A'}</td>
                <td data-label="Location">${interview.location || 'N/A'}</td>
                <td data-label="Type">${interview.interview_type || 'N/A'}</td>
                <td data-label="Actions">
                    <button class="btn btn-info btn-sm view-interview-btn" data-id="${interview.id}">View</button>
                    <button class="btn btn-secondary btn-sm edit-interview-btn" data-id="${interview.id}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-interview-btn" data-id="${interview.id}">Delete</button>
                </td>
            </tr>
        `;
    });

    tableHtml += `
            </tbody>
        </table>
    `;
    monthlyInterviewList.innerHTML = tableHtml;

    // Attach event listeners to newly rendered buttons
    document.querySelectorAll('.view-interview-btn').forEach(button => {
        button.onclick = (event) => showInterviewDetailModal(event.target.dataset.id);
    });
    document.querySelectorAll('.edit-interview-btn').forEach(button => {
        button.onclick = (event) => editInterview(event.target.dataset.id);
    });
    document.querySelectorAll('.delete-interview-btn').forEach(button => {
        button.onclick = (event) => deleteInterview(event.target.dataset.id);
    });
}

/**
 * Shows the interview form modal.
 * @param {string} [date] Optional date to pre-fill the form.
 * @param {string} [interviewId] Optional interview ID to pre-fill for editing.
 */
function showInterviewFormModal(date = null, interviewId = null) {
    console.log('showInterviewFormModal called. Date:', date, 'Interview ID:', interviewId);
    const modal = document.getElementById('interview-form-modal');
    const form = document.getElementById('interview-form');
    const titleInput = document.getElementById('interview-title');
    const dateInput = document.getElementById('interview-date');
    const startTimeInput = document.getElementById('interview-start-time');
    const endTimeInput = document.getElementById('interview-end-time');
    const locationInput = document.getElementById('interview-location');
    const typeInput = document.getElementById('interview-type');
    const notesInput = document.getElementById('interview-notes');
    const interviewIdInput = document.getElementById('interview-id');
    const modalTitle = document.getElementById('interview-modal-title');

    if (!modal || !form || !titleInput || !dateInput || !startTimeInput || !endTimeInput || !locationInput || !typeInput || !notesInput || !interviewIdInput || !modalTitle) {
        console.error("One or more interview form modal elements not found.");
        return;
    }

    form.reset(); // Clear form

    if (interviewId) {
        modalTitle.textContent = 'Edit Interview';
        const interview = interviews.find(i => String(i.id) === String(interviewId)); // Ensure string comparison
        if (interview) {
            console.log("Found interview for editing:", interview);
            interviewIdInput.value = interview.id;
            titleInput.value = interview.interview_title || '';

            const startDate = new Date(interview.start_datetime);
            const endDate = new Date(interview.end_datetime);

            dateInput.value = window.isValidDate(startDate) ? startDate.toISOString().split('T')[0] : '';
            startTimeInput.value = window.isValidDate(startDate) ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
            endTimeInput.value = window.isValidDate(endDate) ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

            locationInput.value = interview.location || '';
            typeInput.value = interview.interview_type || '';
            notesInput.value = interview.notes || '';
        } else {
            console.error("Interview not found for ID:", interviewId);
            window.showAlert("Interview not found for editing.", "error");
            return; // Exit if interview not found
        }
    } else {
        modalTitle.textContent = 'Schedule New Interview';
        interviewIdInput.value = '';
        if (date) {
            dateInput.value = date; // Pre-fill date if provided
        }
        // Set default times for new interview (e.g., next hour)
        const now = new Date();
        const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
        startTimeInput.value = nextHour.toTimeString().slice(0, 5);
        const nextHourPlus30 = new Date(nextHour.getTime() + 30 * 60000); // Add 30 minutes
        endTimeInput.value = nextHourPlus30.toTimeString().slice(0, 5);
    }
    modal.classList.add('active');
}

/**
 * Hides the interview form modal.
 */
function hideInterviewFormModal() {
    const modal = document.getElementById('interview-form-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Saves a new interview or updates an existing one.
 * @param {Event} event The form submission event.
 */
async function saveInterview() {
    const interviewId = document.getElementById('interview-id').value;
    console.log('saveInterview - interviewId from hidden input (before sending):', interviewId);

    const interviewTitle = document.getElementById('interview-title').value;
    const interviewDate = document.getElementById('interview-date').value;
    const startTime = document.getElementById('interview-start-time').value;
    const endTime = document.getElementById('interview-end-time').value;
    const location = document.getElementById('interview-location').value;
    const type = document.getElementById('interview-type').value;
    const notes = document.getElementById('interview-notes').value;

    if (!interviewTitle || !interviewDate || !startTime || !endTime) {
        window.showAlert('Please fill in all required interview fields (Title, Date, Start Time, End Time).', 'error');
        return;
    }

    // Combine date and time into full ISO 8601 datetime strings
    const startDatetime = new Date(`${interviewDate}T${startTime}`).toISOString();
    const endDatetime = new Date(`${interviewDate}T${endTime}`).toISOString();

    // Client-side overlap check
    const newStart = new Date(startDatetime);
    const newEnd = new Date(endDatetime);

    if (!window.isValidDate(newStart) || !window.isValidDate(newEnd)) {
        window.showAlert('Invalid date or time format. Please check your input.', 'error');
        return;
    }

    if (newStart >= newEnd) {
        window.showAlert('End time must be after start time.', 'error');
        return;
    }

    const hasOverlap = interviews.some(existingInterview => {
        // Exclude the current interview if we are editing
        if (interviewId && String(existingInterview.id) === String(interviewId)) {
            return false;
        }

        const existingStart = new Date(existingInterview.start_datetime);
        const existingEnd = new Date(existingInterview.end_datetime);

        if (!window.isValidDate(existingStart) || !window.isValidDate(existingEnd)) {
            console.warn("Skipping overlap check for invalid existing interview dates:", existingInterview);
            return false;
        }

        // Check for overlap: (start1 < end2) and (end1 > start2)
        return (newStart < existingEnd) && (newEnd > existingStart);
    });

    if (hasOverlap) {
        window.showAlert('This interview time overlaps with an existing interview. Please choose a different time.', 'error');
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

    const method = interviewId ? 'PUT' : 'POST';
    const url = interviewId ? `/api/interviews/${interviewId}` : '/api/interviews';

    try {
        console.log('Sending interview data:', interviewData);
        console.log('Sending to URL:', url, 'with method:', method);

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(interviewData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to save interview.');
        }

        window.showAlert(`Interview ${interviewId ? 'updated' : 'scheduled'} successfully!`, 'success');
        hideInterviewFormModal();
        renderCalendar(); // Re-render calendar to show new/updated interview
        loadMonthlyInterviews(); // Update monthly list
        window.loadDashboardData(); // Reload dashboard data
    } catch (error) {
        console.error('Error saving interview:', error);
        window.showAlert('Error saving interview: ' + error.message, 'error');
    }
}

/**
 * Populates and shows the interview detail modal.
 * @param {string} interviewId The ID of the interview to display.
 */
function showInterviewDetailModal(interviewId) {
    const interview = interviews.find(i => String(i.id) === String(interviewId)); // Ensure string comparison
    if (!interview) {
        window.showAlert('Interview not found.', 'error');
        return;
    }
    console.log('Viewing interview details for:', interview);

    const detailModal = document.getElementById('interview-detail-modal');
    document.getElementById('detail-interview-title').textContent = interview.interview_title || 'N/A';

    const startDt = new Date(interview.start_datetime);
    const endDt = new Date(interview.end_datetime);

    const dateStr = window.isValidDate(startDt) ? startDt.toLocaleDateString() : 'N/A';
    const timeRangeStr = (window.isValidDate(startDt) && window.isValidDate(endDt)) ?
                         `${startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A';

    document.getElementById('detail-interview-time').textContent = `${dateStr} ${timeRangeStr}`;

    document.getElementById('detail-interview-location').textContent = interview.location || 'N/A';
    document.getElementById('detail-interview-type').textContent = interview.interview_type || 'N/A';
    document.getElementById('detail-interview-notes').textContent = interview.notes || 'No notes.';

    // Set up Edit and Delete buttons in detail modal
    const editBtn = document.getElementById('edit-interview-btn');
    const deleteBtn = document.getElementById('delete-interview-btn');
    if (editBtn) {
        editBtn.onclick = () => {
            hideInterviewDetailModal();
            showInterviewFormModal(null, interview.id); // Pass ID for editing
        };
    }
    if (deleteBtn) {
        deleteBtn.onclick = () => {
            hideInterviewDetailModal();
            deleteInterview(interview.id);
        };
    }

    detailModal.classList.add('active');
}

/**
 * Hides the interview detail modal.
 */
function hideInterviewDetailModal() {
    const modal = document.getElementById('interview-detail-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Edits an interview by showing the form modal with pre-filled data.
 * @param {string} interviewId The ID of the interview to edit.
 */
function editInterview(interviewId) {
    hideInterviewDetailModal(); // Close detail modal if open
    showInterviewFormModal(null, interviewId);
}

/**
 * Deletes an interview after confirmation.
 * @param {string} interviewId The ID of the interview to delete.
 */
function deleteInterview(interviewId) {
    window.showConfirm('Are you sure you want to delete this interview?', async () => {
        try {
            const response = await fetch(`/api/interviews/${interviewId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to delete interview.');
            }

            window.showAlert('Interview deleted successfully!', 'success');
            hideInterviewDetailModal();
            renderCalendar(); // Re-render calendar
            loadMonthlyInterviews(); // Update monthly list
            window.loadDashboardData(); // Reload dashboard data
        } catch (error) {
            console.error('Error deleting interview:', error);
            window.showAlert('Error deleting interview: ' + error.message, 'error');
        }
    });
}

// Expose functions to the global scope for access from other modules and HTML
window.fetchInterviews = fetchInterviews;
window.renderCalendar = renderCalendar;
window.changeMonth = changeMonth;
window.renderMiniCalendars = renderMiniCalendars;
window.renderSingleMiniCalendar = renderSingleMiniCalendar; // Might not need to be global
window.loadMonthlyInterviews = loadMonthlyInterviews;
window.showInterviewFormModal = showInterviewFormModal;
window.hideInterviewFormModal = hideInterviewFormModal;
window.saveInterview = saveInterview;
window.showInterviewDetailModal = showInterviewDetailModal;
window.hideInterviewDetailModal = hideInterviewDetailModal;
window.editInterview = editInterview;
window.deleteInterview = deleteInterview;

console.log("calendar.js loaded and functions exposed.");

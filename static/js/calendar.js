// Global variable to keep track of the current month displayed in the calendar
let currentCalendarDate = new Date();

// Global array to store interviews fetched from the backend
let interviews = [];

// Chart instances for mini-calendars to allow for updates
let miniCalendarCharts = {};

/**
 * Renders the main calendar grid for the current month.
 */
async function renderCalendar() {
    const calendarDaysGrid = document.getElementById('calendar-days-grid');
    const currentMonthYearHeader = document.getElementById('current-month-year');

    calendarDaysGrid.innerHTML = ''; // Clear previous days

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth(); // 0-indexed month

    // Set header text
    currentMonthYearHeader.textContent = currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Get the first day of the month
    const firstDayOfMonth = new Date(year, month, 1);
    // Get the last day of the month
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Calculate the day of the week for the first day (0 for Sunday, 1 for Monday, etc.)
    const startDayOfWeek = firstDayOfMonth.getDay();

    // Add empty divs for days before the 1st of the month to align correctly
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('calendar-day', 'empty');
        calendarDaysGrid.appendChild(emptyDay);
    }

    // Add days of the month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');
        dayDiv.innerHTML = `<span class="day-number">${day}</span>`;
        dayDiv.dataset.date = new Date(year, month, day).toISOString().split('T')[0]; // Store date as YYYY-MM-DD

        // Add click listener to open interview form for that day
        dayDiv.addEventListener('click', () => {
            showInterviewFormModal(dayDiv.dataset.date);
        });

        calendarDaysGrid.appendChild(dayDiv);
    }

    // After rendering the grid, populate with interviews
    await populateCalendarWithInterviews();
    renderMiniCalendars(); // Render mini-calendars when main calendar updates
}

/**
 * Populates the main calendar grid with fetched interview data.
 */
async function populateCalendarWithInterviews() {
    // Clear existing events from the calendar days
    document.querySelectorAll('.calendar-day').forEach(dayDiv => {
        // Remove all children except the day number span
        Array.from(dayDiv.children).forEach(child => {
            if (!child.classList.contains('day-number')) {
                child.remove();
            }
        });
    });

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth(); // 0-indexed

    // Filter interviews relevant to the current month being displayed
    const interviewsForMonth = interviews.filter(interview => {
        const interviewDate = new Date(interview.start_datetime);
        return isValidDate(interviewDate) &&
               interviewDate.getFullYear() === year &&
               interviewDate.getMonth() === month;
    });

    interviewsForMonth.forEach(interview => {
        const interviewDate = new Date(interview.start_datetime);
        const dayNumber = interviewDate.getDate();
        const dayDiv = document.querySelector(`.calendar-day[data-date="${interviewDate.toISOString().split('T')[0]}"]`);

        if (dayDiv) {
            const eventDiv = document.createElement('div');
            eventDiv.classList.add('calendar-event');
            const startTime = interviewDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            eventDiv.innerHTML = `<span class="event-time">${startTime}</span> <span class="event-title">${interview.interview_title}</span>`;
            eventDiv.dataset.interviewId = interview.id; // Store interview ID

            eventDiv.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent opening add interview modal
                showInterviewDetailModal(interview.id);
            });
            dayDiv.appendChild(eventDiv);
        }
    });
}

/**
 * Loads interviews from the backend for the current month and populates the monthly list.
 */
async function loadMonthlyInterviews() {
    const monthlyInterviewList = document.getElementById('monthly-interview-list');
    monthlyInterviewList.innerHTML = ''; // Clear previous list

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth() + 1; // API expects 1-indexed month

    try {
        const response = await fetch(`/api/interviews?year=${year}&month=${month}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        interviews = await response.json(); // Update global interviews array

        if (interviews.length === 0) {
            monthlyInterviewList.innerHTML = '<p class="text-center">No interviews scheduled for this month.</p>';
            return;
        }

        const table = document.createElement('table');
        table.classList.add('interview-list-table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th onclick="sortTableInterviews('interview_title')">Title</th>
                    <th onclick="sortTableInterviews('start_datetime')">Date & Time</th>
                    <th onclick="sortTableInterviews('location')">Location</th>
                    <th onclick="sortTableInterviews('interview_type')">Type</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="interviews-table-body"></tbody>
        `;
        monthlyInterviewList.appendChild(table);

        const tbody = document.getElementById('interviews-table-body');
        interviews.forEach(interview => {
            const row = tbody.insertRow();
            const startDate = new Date(interview.start_datetime);
            const endDate = new Date(interview.end_datetime);
            row.innerHTML = `
                <td>${interview.interview_title}</td>
                <td>${startDate.toLocaleString()} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${interview.location || 'N/A'}</td>
                <td>${interview.interview_type || 'N/A'}</td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="showInterviewDetailModal('${interview.id}')">View</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteInterview('${interview.id}')">Delete</button>
                </td>
            `;
        });

        // After loading interviews, update the main calendar grid
        populateCalendarWithInterviews();

    } catch (error) {
        console.error('Error loading monthly interviews:', error);
        showAlert('Failed to load interviews. Please try again.', 'error');
        monthlyInterviewList.innerHTML = '<p class="text-center text-error">Failed to load interviews.</p>';
    }
}


/**
 * Renders mini calendars for the next two months.
 */
function renderMiniCalendars() {
    const miniCalendar1 = document.getElementById('mini-calendar-next-1');
    const miniCalendar2 = document.getElementById('mini-calendar-next-2');

    miniCalendar1.innerHTML = '';
    miniCalendar2.innerHTML = '';

    const nextMonthDate1 = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1);
    const nextMonthDate2 = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 2, 1);

    drawMiniCalendar(miniCalendar1, nextMonthDate1);
    drawMiniCalendar(miniCalendar2, nextMonthDate2);
}

/**
 * Draws a single mini calendar.
 * @param {HTMLElement} container The container element for the mini calendar.
 * @param {Date} date The date object for the month to display.
 */
function drawMiniCalendar(container, date) {
    const year = date.getFullYear();
    const month = date.getMonth();

    const monthName = date.toLocaleString('default', { month: 'short' });
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay();

    container.innerHTML = `
        <div class="mini-calendar-header">
            <h4>${monthName} ${year}</h4>
        </div>
        <div class="mini-calendar-grid">
            <div class="mini-calendar-day-header">Sun</div>
            <div class="mini-calendar-day-header">Mon</div>
            <div class="mini-calendar-day-header">Tue</div>
            <div class="mini-calendar-day-header">Wed</div>
            <div class="mini-calendar-day-header">Thu</div>
            <div class="mini-calendar-day-header">Fri</div>
            <div class="mini-calendar-day-header">Sat</div>
        </div>
    `;

    const grid = container.querySelector('.mini-calendar-grid');

    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('mini-calendar-day', 'empty');
        grid.appendChild(emptyDay);
    }

    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('mini-calendar-day');
        dayDiv.textContent = day;

        // Check for interviews on this day
        const currentDayInterviews = interviews.filter(interview => {
            const interviewDate = new Date(interview.start_datetime);
            return isValidDate(interviewDate) &&
                   interviewDate.getFullYear() === year &&
                   interviewDate.getMonth() === month &&
                   interviewDate.getDate() === day;
        });

        if (currentDayInterviews.length > 0) {
            const indicator = document.createElement('div');
            indicator.classList.add('mini-event-indicator');
            dayDiv.appendChild(indicator);
        }
        grid.appendChild(dayDiv);
    }
}

/**
 * Shows the interview form modal, optionally pre-filling date for a new interview.
 * @param {string} dateString Optional date string (YYYY-MM-DD) to pre-fill.
 * @param {object} interviewData Optional interview object for editing.
 */
function showInterviewFormModal(dateString = null, interviewData = null) {
    const modal = document.getElementById('interview-form-modal');
    const title = document.getElementById('interview-modal-title');
    const form = document.getElementById('interview-form');
    form.reset(); // Clear previous form data

    document.getElementById('interview-id').value = ''; // Clear ID for new interview

    if (interviewData) {
        title.textContent = 'Edit Interview';
        document.getElementById('interview-id').value = interviewData.id;
        document.getElementById('interview-title').value = interviewData.interview_title;

        const startDate = new Date(interviewData.start_datetime);
        const endDate = new Date(interviewData.end_datetime);

        document.getElementById('interview-date').value = startDate.toISOString().split('T')[0];
        document.getElementById('interview-start-time').value = startDate.toTimeString().slice(0, 5);
        document.getElementById('interview-end-time').value = endDate.toTimeString().slice(0, 5);
        document.getElementById('interview-location').value = interviewData.location || '';
        document.getElementById('interview-type').value = interviewData.interview_type || '';
        document.getElementById('interview-notes').value = interviewData.notes || '';
    } else {
        title.textContent = 'Schedule New Interview';
        if (dateString) {
            document.getElementById('interview-date').value = dateString;
        } else {
            // Default to today's date if no date string provided for new interview
            document.getElementById('interview-date').value = new Date().toISOString().split('T')[0];
        }
        // Set default times to common interview start/end times if not provided
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
 * Shows the interview detail modal.
 * @param {string} interviewId The ID of the interview to display.
 */
async function showInterviewDetailModal(interviewId) {
    const modal = document.getElementById('interview-detail-modal');
    const interview = interviews.find(i => i.id === interviewId);

    if (!interview) {
        showAlert('Interview details not found!', 'error');
        return;
    }

    const startDate = new Date(interview.start_datetime);
    const endDate = new Date(interview.end_datetime);

    document.getElementById('detail-interview-title').textContent = interview.interview_title;
    document.getElementById('detail-interview-time').textContent =
        `${startDate.toLocaleString()} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    document.getElementById('detail-interview-location').textContent = interview.location || 'N/A';
    document.getElementById('detail-interview-type').textContent = interview.interview_type || 'N/A';
    document.getElementById('detail-interview-notes').textContent = interview.notes || 'No notes.';

    // Set up edit and delete buttons
    document.getElementById('edit-interview-btn').onclick = () => {
        hideInterviewDetailModal();
        showInterviewFormModal(null, interview); // Pass the interview object for editing
    };
    document.getElementById('delete-interview-btn').onclick = () => {
        hideInterviewDetailModal();
        deleteInterview(interview.id);
    };

    modal.classList.add('active');
}

/**
 * Hides the interview detail modal.
 */
function hideInterviewDetailModal() {
    document.getElementById('interview-detail-modal').classList.remove('active');
}

/**
 * Saves a new or updates an existing interview.
 */
async function saveInterview() {
    const interviewId = document.getElementById('interview-id').value;
    const interviewTitle = document.getElementById('interview-title').value;
    const interviewDate = document.getElementById('interview-date').value;
    const interviewStartTime = document.getElementById('interview-start-time').value;
    const interviewEndTime = document.getElementById('interview-end-time').value;
    const interviewLocation = document.getElementById('interview-location').value;
    const interviewType = document.getElementById('interview-type').value;
    const interviewNotes = document.getElementById('interview-notes').value;

    const startDateTime = new Date(`${interviewDate}T${interviewStartTime}:00`);
    const endDateTime = new Date(`${interviewDate}T${interviewEndTime}:00`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        showAlert('Invalid date or time. Please check your input.', 'error');
        return;
    }

    if (startDateTime >= endDateTime) {
        showAlert('End time must be after start time.', 'error');
        return;
    }

    const interviewData = {
        interview_title: interviewTitle,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        location: interviewLocation,
        notes: interviewNotes,
        interview_type: interviewType
    };

    try {
        let response;
        if (interviewId) {
            // Update existing interview
            response = await fetch(`/api/interviews/${interviewId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(interviewData)
            });
        } else {
            // Add new interview
            response = await fetch('/api/interviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(interviewData)
            });
        }

        if (response.ok) {
            showAlert('Interview saved successfully!', 'success');
            hideInterviewFormModal();
            await loadMonthlyInterviews(); // Reload interviews to update calendar and list
            loadDashboardData(); // Also update dashboard
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to save interview.');
        }
    } catch (error) {
        console.error('Error saving interview:', error);
        showAlert('Error saving interview: ' + error.message, 'error');
    }
}

/**
 * Deletes an interview after confirmation.
 * @param {string} interviewId The ID of the interview to delete.
 */
function deleteInterview(interviewId) {
    showConfirm('Are you sure you want to delete this interview?', async () => {
        try {
            const response = await fetch(`/api/interviews/${interviewId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showAlert('Interview deleted successfully!', 'success');
                await loadMonthlyInterviews(); // Reload interviews to update calendar and list
                loadDashboardData(); // Also update dashboard
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to delete interview.');
            }
        } catch (error) {
            console.error('Error deleting interview:', error);
            showAlert('Error deleting interview: ' + error.message, 'error');
        }
    });
}

/**
 * Sorts the interviews table.
 * @param {string} column The column to sort by.
 */
let currentSortColumn = '';
let currentSortDirection = 'asc'; // 'asc' or 'desc'

function sortTableInterviews(column) {
    if (currentSortColumn === column) {
        currentSortDirection = (currentSortDirection === 'asc') ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }

    interviews.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        // Handle date comparisons
        if (column.includes('date')) {
            valA = new Date(valA);
            valB = new Date(valB);
        }

        if (valA < valB) {
            return currentSortDirection === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
            return currentSortDirection === 'asc' ? 1 : -1;
        }
        return 0;
    });

    // Re-render the table body
    const tbody = document.getElementById('interviews-table-body');
    tbody.innerHTML = ''; // Clear existing rows

    interviews.forEach(interview => {
        const row = tbody.insertRow();
        const startDate = new Date(interview.start_datetime);
        const endDate = new Date(interview.end_datetime);
        row.innerHTML = `
            <td>${interview.interview_title}</td>
            <td>${startDate.toLocaleString()} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${interview.location || 'N/A'}</td>
            <td>${interview.interview_type || 'N/A'}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="showInterviewDetailModal('${interview.id}')">View</button>
                <button class="btn btn-danger btn-sm" onclick="deleteInterview('${interview.id}')">Delete</button>
            </td>
        `;
    });
}


// --- Event Listeners for Calendar Page ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('prev-month-btn')?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
        loadMonthlyInterviews();
    });

    document.getElementById('next-month-btn')?.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
        loadMonthlyInterviews();
    });

    document.getElementById('add-interview-btn')?.addEventListener('click', () => showInterviewFormModal());

    document.getElementById('interview-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        await saveInterview();
    });
});

// Expose functions to the global scope for app.js and HTML
window.renderCalendar = renderCalendar;
window.loadMonthlyInterviews = loadMonthlyInterviews;
window.showInterviewFormModal = showInterviewFormModal;
window.hideInterviewFormModal = hideInterviewFormModal;
window.showInterviewDetailModal = showInterviewDetailModal;
window.hideInterviewDetailModal = hideInterviewDetailModal;
window.deleteInterview = deleteInterview;
window.sortTableInterviews = sortTableInterviews;

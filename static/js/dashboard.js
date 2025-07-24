// Global variables for dashboard module
let currentDashboardDate = new Date(); // For dashboard month selection

// Chart instances to allow for updates
let applicationsStatusChartInstance = null;
let interviewsCountChartInstance = null;
let applicationTrendChartInstance = null;
let interviewTypeChartInstance = null;

/**
 * Loads all applications for dashboard calculations.
 * (Note: `applications` array in `applications.js` is filtered, this one gets all)
 */
async function loadAllApplicationsForDashboard() {
    try {
        const response = await fetch('/api/applications');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Assuming 'allApplications' is a global variable or passed appropriately
        // For now, it's defined in applications.js. We need to ensure it's accessible.
        // A better approach would be to return it and pass it to rendering functions.
        window.allApplications = await response.json();
    }
    catch (error) {
        console.error('Error loading all applications for dashboard:', error);
        showAlert('Failed to load all applications for dashboard. Please try again.', 'error');
    }
}

/**
 * Loads and renders all dashboard data for the selected month.
 */
async function loadDashboardData() {
    await loadAllApplicationsForDashboard(); // Ensure all applications are loaded

    try {
        const year = currentDashboardDate.getFullYear();
        const month = currentDashboardDate.getMonth() + 1; // Months are 0-indexed in JS, 1-indexed in API

        const response = await fetch(`/api/interviews?year=${year}&month=${month}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const dashboardInterviews = await response.json();

        const selectedYear = currentDashboardDate.getFullYear();
        const selectedMonth = currentDashboardDate.getMonth(); // 0-indexed

        const monthlyApplications = window.allApplications.filter(app => {
            const appDate = new Date(app.application_date);
            return isValidDate(appDate) &&
                   appDate.getFullYear() === selectedYear &&
                   appDate.getMonth() === selectedMonth;
        });

        renderApplicationsStatusChart(monthlyApplications);
        renderInterviewsCountChart(dashboardInterviews);
        renderApplicationTrendChart(monthlyApplications, selectedYear, selectedMonth);
        renderInterviewTypeChart(dashboardInterviews);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showAlert('Failed to load dashboard data. Please try again.', 'error');
    }
}

/**
 * Renders the Applications by Status doughnut chart.
 * @param {Array<object>} data Filtered application data.
 */
function renderApplicationsStatusChart(data) {
    const ctx = document.getElementById('applicationsStatusChart').getContext('2d');

    const statusCounts = {
        "Applied": 0,
        "Interview": 0,
        "Rejection": 0,
        "Offer": 0
    };

    data.forEach(app => {
        if (statusCounts.hasOwnProperty(app.status)) {
            statusCounts[app.status]++;
        }
    });

    const chartData = {
        labels: Object.keys(statusCounts),
        datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: [
                '#4299e1', // Applied (Blue)
                '#f6ad55', // Interview (Orange)
                '#ef4444', // Rejection (Red)
                '#48bb78'  // Offer (Green)
            ],
            hoverOffset: 4
        }]
    };

    if (applicationsStatusChartInstance) {
        applicationsStatusChartInstance.destroy();
    }
    applicationsStatusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false,
                    text: 'Applications by Status'
                }
            }
        }
    });
}

/**
 * Renders the Interviews Scheduled bar chart.
 * @param {Array<object>} data Filtered interview data.
 */
function renderInterviewsCountChart(data) {
    const ctx = document.getElementById('interviewsCountChart').getContext('2d');

    const daysInMonth = new Date(currentDashboardDate.getFullYear(), currentDashboardDate.getMonth() + 1, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1); // Days 1 to 31

    const interviewCounts = new Array(daysInMonth).fill(0);

    data.forEach(interview => {
        const interviewDay = new Date(interview.start_datetime).getDate();
        if (isValidDate(new Date(interview.start_datetime)) && interviewDay >= 1 && interviewDay <= daysInMonth) {
            interviewCounts[interviewDay - 1]++;
        }
    });

    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Number of Interviews',
            data: interviewCounts,
            backgroundColor: '#667eea',
            borderColor: '#5a67d8',
            borderWidth: 1,
            borderRadius: 5,
        }]
    };

    if (interviewsCountChartInstance) {
        interviewsCountChartInstance.destroy();
    }
    interviewsCountChartInstance = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: false,
                    text: 'Interviews Scheduled'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Day of Month'
                    }
                }
            }
        }
    });
}

/**
 * Renders the Application Trends line chart.
 * @param {Array<object>} data Filtered application data.
 * @param {number} year The selected year.
 * @param {number} month The selected month (0-indexed).
 */
function renderApplicationTrendChart(data, year, month) {
    const ctx = document.getElementById('applicationTrendChart').getContext('2d');

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1); // Days 1 to 31

    const dailyApplications = new Array(daysInMonth).fill(0);

    data.forEach(app => {
        const appDate = new Date(app.application_date);
        const appDay = appDate.getDate();
        if (isValidDate(appDate) && appDay >= 1 && appDay <= daysInMonth) {
            dailyApplications[appDay - 1]++;
        }
    });

    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Applications Submitted',
            data: dailyApplications,
            fill: false,
            borderColor: '#48bb78', // Green
            tension: 0.1
        }]
    };

    if (applicationTrendChartInstance) {
        applicationTrendChartInstance.destroy();
    }
    applicationTrendChartInstance = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: false,
                    text: 'Application Trends'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Day of Month'
                    }
                }
            }
        }
    });
}

/**
 * Renders the Interview Types pie chart.
 * @param {Array<object>} data Filtered interview data.
 */
function renderInterviewTypeChart(data) {
    const ctx = document.getElementById('interviewTypeChart').getContext('2d');

    const typeCounts = {};
    data.forEach(interview => {
        const type = interview.interview_type || 'Unspecified';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const backgroundColors = [
        '#667eea', // Purple
        '#4299e1', // Blue
        '#48bb78', // Green
        '#f6ad55', // Orange
        '#ef4444', // Red
        '#a0aec0'  // Gray
    ];

    const chartData = {
        labels: Object.keys(typeCounts),
        datasets: [{
            data: Object.values(typeCounts),
            backgroundColor: backgroundColors.slice(0, Object.keys(typeCounts).length),
            hoverOffset: 4
        }]
    };

    if (interviewTypeChartInstance) {
        interviewTypeChartInstance.destroy();
    }
    interviewTypeChartInstance = new Chart(ctx, {
        type: 'pie', // Using pie chart for breakdown
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false,
                    text: 'Interview Type Breakdown'
                }
            }
        }
    });
}

// Expose functions to the global scope if needed by app.js or HTML
window.loadDashboardData = loadDashboardData;
window.currentDashboardDate = currentDashboardDate; // Expose for initial setup in app.js

/**
 * Handles dashboard functionalities including chart rendering and data loading.
 */

// Global Chart instances
let applicationsStatusChart;
let interviewsCountChart;
let applicationTrendChart;
let interviewTypeChart;
let skillsLevelChart;
let applicationsByJobTitleChart;

// Global variables for dashboard state
window.currentDashboardDate = new Date(); // Default to current month
window.currentDashboardView = 'monthly'; // Default view: 'monthly' or 'all-time'

/**
 * Destroys existing chart instances to prevent duplicates.
 */
function destroyCharts() {
    if (applicationsStatusChart) applicationsStatusChart.destroy();
    if (interviewsCountChart) interviewsCountChart.destroy();
    if (applicationTrendChart) applicationTrendChart.destroy();
    if (interviewTypeChart) interviewTypeChart.destroy();
    if (skillsLevelChart) skillsLevelChart.destroy();
    if (applicationsByJobTitleChart) applicationsByJobTitleChart.destroy();
}

/**
 * Renders the Applications by Status Pie Chart.
 * @param {object} data - Data for the chart.
 */
function renderApplicationsStatusChart(data) {
    const ctx = document.getElementById('applicationsStatusChart');
    if (!ctx) {
        console.error("applicationsStatusChart canvas not found.");
        return;
    }

    applicationsStatusChart = new Chart(ctx, {
        type: 'doughnut', // Doughnut chart for status
        data: {
            labels: data.labels,
            datasets: [{
                data: data.counts,
                backgroundColor: data.colors,
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            family: 'Inter',
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Applications by Status',
                    font: {
                        family: 'Inter',
                        size: 16,
                        weight: '600'
                    },
                    color: '#2c3e50'
                },
                // Configure datalabels plugin
                datalabels: {
                    color: '#fff', // White color for labels
                    font: {
                        family: 'Inter',
                        size: 12,
                        weight: 'bold'
                    },
                    formatter: (value, context) => {
                        const total = context.dataset.data.reduce((sum, current) => sum + current, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `${value} (${percentage}%)`; // Display count and percentage
                    }
                }
            }
        },
        plugins: [ChartDataLabels] // Register the plugin for this chart
    });
}

/**
 * Renders the Interviews Scheduled Bar Chart.
 * @param {object} data - Data for the chart.
 */
function renderInterviewsCountChart(data) {
    const ctx = document.getElementById('interviewsCountChart');
    if (!ctx) {
        console.error("interviewsCountChart canvas not found.");
        return;
    }

    interviewsCountChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Interviews',
                data: data.counts,
                backgroundColor: '#4a90e2', // Blue color
                borderColor: '#4a90e2',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Interviews Scheduled',
                    font: {
                        family: 'Inter',
                        size: 16,
                        weight: '600'
                    },
                    color: '#2c3e50'
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    color: '#333',
                    font: {
                        family: 'Inter',
                        size: 10,
                        weight: 'bold'
                    },
                    formatter: (value) => value > 0 ? value : '' // Only show label if value > 0
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Day of Month',
                        font: {
                            family: 'Inter',
                            size: 12,
                            weight: '500'
                        },
                        color: '#555'
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: 'Inter'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count',
                        font: {
                            family: 'Inter',
                            size: 12,
                            weight: '500'
                        },
                        color: '#555'
                    },
                    ticks: {
                        precision: 0, // Ensure integer ticks
                        font: {
                            family: 'Inter'
                        }
                    }
                }
            }
        },
        plugins: [ChartDataLabels] // Register the plugin for this chart
    });
}

/**
 * Renders the Application Trends Line Chart.
 * @param {object} data - Data for the chart.
 */
function renderApplicationTrendChart(data) {
    const ctx = document.getElementById('applicationTrendChart');
    if (!ctx) {
        console.error("applicationTrendChart canvas not found.");
        return;
    }

    applicationTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Applications',
                data: data.counts,
                borderColor: '#28a745', // Green color
                backgroundColor: 'rgba(40, 167, 69, 0.2)',
                fill: true,
                tension: 0.3, // Smooth the line
                pointBackgroundColor: '#28a745',
                pointBorderColor: '#fff',
                pointBorderWidth: 1,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Application Trends',
                    font: {
                        family: 'Inter',
                        size: 16,
                        weight: '600'
                    },
                    color: '#2c3e50'
                },
                datalabels: {
                    display: false // Usually not needed for line charts unless specific points are highlighted
                }
            }
        }
    });
}

/**
 * Renders the Interview Types Pie Chart.
 * @param {object} data - Data for the chart.
 */
function renderInterviewTypeChart(data) {
    const ctx = document.getElementById('interviewTypeChart');
    if (!ctx) {
        console.error("interviewTypeChart canvas not found.");
        return;
    }

    interviewTypeChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.counts,
                backgroundColor: data.colors,
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            family: 'Inter',
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Interview Types',
                    font: {
                        family: 'Inter',
                        size: 16,
                        weight: '600'
                    },
                    color: '#2c3e50'
                },
                // Configure datalabels plugin
                datalabels: {
                    color: '#fff', // White color for labels
                    font: {
                        family: 'Inter',
                        size: 12,
                        weight: 'bold'
                    },
                    formatter: (value, context) => {
                        const total = context.dataset.data.reduce((sum, current) => sum + current, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `${value} (${percentage}%)`; // Display count and percentage
                    }
                }
            }
        },
        plugins: [ChartDataLabels] // Register the plugin for this chart
    });
}

/**
 * Renders the Skills by Level Bar Chart.
 * @param {object} data - Data for the chart.
 */
function renderSkillsLevelChart(data) {
    const ctx = document.getElementById('skillsLevelChart');
    if (!ctx) {
        console.error("skillsLevelChart canvas not found.");
        return;
    }

    skillsLevelChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Number of Skills',
                data: data.counts,
                backgroundColor: '#4a90e2', // Blue color
                borderColor: '#4a90e2',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Skills by Level',
                    font: {
                        family: 'Inter',
                        size: 16,
                        weight: '600'
                    },
                    color: '#2c3e50'
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    color: '#333',
                    font: {
                        family: 'Inter',
                        size: 10,
                        weight: 'bold'
                    },
                    formatter: (value) => value > 0 ? value : ''
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Skill Level',
                        font: {
                            family: 'Inter',
                            size: 12,
                            weight: '500'
                        },
                        color: '#555'
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: 'Inter'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count',
                        font: {
                            family: 'Inter',
                            size: 12,
                            weight: '500'
                        },
                        color: '#555'
                    },
                    ticks: {
                        precision: 0,
                        font: {
                            family: 'Inter'
                        }
                    }
                }
            }
        },
        plugins: [ChartDataLabels] // Register the plugin for this chart
    });
}

/**
 * Renders the Applications by Job Title Bar Chart.
 * @param {object} data - Data for the chart.
 */
function renderApplicationsByJobTitleChart(data) {
    const ctx = document.getElementById('applicationsByJobTitleChart');
    if (!ctx) {
        console.error("applicationsByJobTitleChart canvas not found.");
        return;
    }

    applicationsByJobTitleChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Applications',
                data: data.counts,
                backgroundColor: '#17a2b8', // Info blue color
                borderColor: '#17a2b8',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Applications by Job Title',
                    font: {
                        family: 'Inter',
                        size: 16,
                        weight: '600'
                    },
                    color: '#2c3e50'
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    color: '#333',
                    font: {
                        family: 'Inter',
                        size: 10,
                        weight: 'bold'
                    },
                    formatter: (value) => value > 0 ? value : ''
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Job Title',
                        font: {
                            family: 'Inter',
                            size: 12,
                            weight: '500'
                        },
                        color: '#555'
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            family: 'Inter'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count',
                        font: {
                            family: 'Inter',
                            size: 12,
                            weight: '500'
                        },
                        color: '#555'
                    },
                    ticks: {
                        precision: 0,
                        font: {
                            family: 'Inter'
                        }
                    }
                }
            }
        },
        plugins: [ChartDataLabels] // Register the plugin for this chart
    });
}


/**
 * Loads and processes data for the dashboard charts.
 */
async function loadDashboardData() {
    destroyCharts(); // Destroy existing charts before rendering new ones

    let allApplications = [];
    let allInterviews = [];
    let userProfile = null;

    // Defensive checks before calling global functions
    if (window.fetchApplications && typeof window.fetchApplications === 'function') {
        allApplications = await window.fetchApplications(); // From applications.js
    } else {
        console.error("window.fetchApplications is not available. Dashboard data may be incomplete.");
    }

    if (window.fetchInterviews && typeof window.fetchInterviews === 'function') {
        allInterviews = await window.fetchInterviews(); // From calendar.js
    } else {
        console.error("window.fetchInterviews is not available. Dashboard data may be incomplete.");
    }

    if (window.fetchProfile && typeof window.fetchProfile === 'function') {
        userProfile = await window.fetchProfile(); // From profile.js
    } else {
        console.error("window.fetchProfile is not available. Dashboard data may be incomplete.");
    }


    let filteredApplications = allApplications;
    let filteredInterviews = allInterviews;

    const dashboardMonthSelect = document.getElementById('dashboard-month-select');
    if (dashboardMonthSelect) {
        const selectedMonth = dashboardMonthSelect.value;
        if (window.currentDashboardView === 'monthly' && selectedMonth) {
            const [year, month] = selectedMonth.split('-').map(Number);

            // Filter applications for the selected month
            filteredApplications = allApplications.filter(app => {
                const appDate = new Date(app.application_date);
                return window.isValidDate(appDate) && appDate.getFullYear() === year && (appDate.getMonth() + 1) === month;
            });

            // Filter interviews for the selected month
            filteredInterviews = allInterviews.filter(interview => {
                if (!interview.start_datetime) {
                    console.warn("Interview missing start_datetime:", interview);
                    return false; // Skip if datetime is missing
                }
                const interviewDate = new Date(interview.start_datetime);
                return window.isValidDate(interviewDate) && interviewDate.getFullYear() === year && (interviewDate.getMonth() + 1) === month;
            });
        }
    }

    console.log("Dashboard - Filtered Applications:", filteredApplications);
    console.log("Dashboard - Filtered Interviews (for charts):", filteredInterviews); // Crucial log for debugging


    // 1. Applications by Status
    const statusCounts = {};
    filteredApplications.forEach(app => {
        statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
    });
    const statusLabels = Object.keys(statusCounts);
    const statusData = Object.values(statusCounts);
    const statusColors = statusLabels.map(status => {
        switch (status) {
            case 'Applied': return '#4a90e2'; // Blue
            case 'Interview': return '#f5a623'; // Orange
            case 'Rejection': return '#dc3545'; // Red
            case 'Offer': return '#28a745'; // Green
            default: return '#cccccc'; // Gray
        }
    });
    renderApplicationsStatusChart({ labels: statusLabels, counts: statusData, colors: statusColors });

    // 2. Interviews Scheduled (by day of month)
    const interviewDayCounts = {};
    filteredInterviews.forEach(interview => {
        // Ensure start_datetime exists and is a valid date before processing
        if (!interview.start_datetime) {
            console.warn("Skipping interview for chart due to missing start_datetime:", interview);
            return;
        }
        const date = new Date(interview.start_datetime);
        if (window.isValidDate(date)) {
            const day = date.getDate();
            interviewDayCounts[day] = (interviewDayCounts[day] || 0) + 1;
        } else {
            console.warn("Skipping interview for chart due to invalid start_datetime:", interview.start_datetime);
        }
    });
    const daysInMonth = new Date(window.currentDashboardDate.getFullYear(), window.currentDashboardDate.getMonth() + 1, 0).getDate();
    const interviewLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const interviewData = interviewLabels.map(day => interviewDayCounts[day] || 0);
    console.log("Dashboard - Interviews Scheduled Chart Data:", { labels: interviewLabels, counts: interviewData }); // Debug chart data
    renderInterviewsCountChart({ labels: interviewLabels, counts: interviewData });

    // 3. Application Trends (by day of month)
    const applicationDayCounts = {};
    filteredApplications.forEach(app => {
        const date = new Date(app.application_date);
        if (window.isValidDate(date)) {
            const day = date.getDate();
            applicationDayCounts[day] = (applicationDayCounts[day] || 0) + 1;
        }
    });
    const trendLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const trendData = trendLabels.map(day => applicationDayCounts[day] || 0);
    renderApplicationTrendChart({ labels: trendLabels, counts: trendData });

    // 4. Interview Types
    const interviewTypeCounts = {};
    filteredInterviews.forEach(interview => {
        const type = interview.interview_type || 'Unspecified';
        interviewTypeCounts[type] = (interviewTypeCounts[type] || 0) + 1;
    });
    const interviewTypeLabels = Object.keys(interviewTypeCounts);
    const interviewTypeData = Object.values(interviewTypeCounts);
    const interviewTypeColors = interviewTypeLabels.map((_, i) => `hsl(${i * 60 % 360}, 70%, 60%)`); // Generate distinct colors
    console.log("Dashboard - Interview Types Chart Data:", { labels: interviewTypeLabels, counts: interviewTypeData, colors: interviewTypeColors }); // Debug chart data
    renderInterviewTypeChart({ labels: interviewTypeLabels, counts: interviewTypeData, colors: interviewTypeColors });

    // 5. Skills by Level
    const skillLevelCounts = {};
    if (userProfile && userProfile.skills) {
        userProfile.skills.forEach(skill => {
            const level = skill.level || 'Unspecified';
            skillLevelCounts[level] = (skillLevelCounts[level] || 0) + 1;
        });
    }
    const skillLevelOrder = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Unspecified'];
    const skillLabels = skillLevelOrder.filter(level => skillLevelCounts[level] !== undefined);
    const skillData = skillLabels.map(level => skillLevelCounts[level]);
    renderSkillsLevelChart({ labels: skillLabels, counts: skillData });

    // 6. Applications by Job Title
    const jobTitleCounts = {};
    filteredApplications.forEach(app => {
        const title = app.job_title || 'Unspecified';
        jobTitleCounts[title] = (jobTitleCounts[title] || 0) + 1;
    });
    const jobTitleLabels = Object.keys(jobTitleCounts).sort((a, b) => jobTitleCounts[b] - jobTitleCounts[a]).slice(0, 5); // Top 5 titles
    const jobTitleData = jobTitleLabels.map(title => jobTitleCounts[title]);
    const jobTitleColors = jobTitleLabels.map((_, i) => `hsl(${i * 80 % 360}, 60%, 50%)`); // Generate distinct colors
    renderApplicationsByJobTitleChart({ labels: jobTitleLabels, counts: jobTitleData, colors: jobTitleColors });
}

// Set initial month for dashboard month selector
document.addEventListener('DOMContentLoaded', () => {
    const dashboardMonthSelect = document.getElementById('dashboard-month-select');
    if (dashboardMonthSelect) {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        dashboardMonthSelect.value = `${year}-${month}`;
    }
});


// Expose functions to the window object
window.loadDashboardData = loadDashboardData;
window.renderApplicationsStatusChart = renderApplicationsStatusChart;
window.renderInterviewsCountChart = renderInterviewsCountChart;
window.renderApplicationTrendChart = renderApplicationTrendChart;
window.renderInterviewTypeChart = renderInterviewTypeChart;
window.renderSkillsLevelChart = renderSkillsLevelChart;
window.renderApplicationsByJobTitleChart = renderApplicationsByJobTitleChart;

console.log("dashboard.js loaded and functions exposed.");

// Dashboard-specific global variables
let allApplications = []; // All applications for dashboard calculations
let currentDashboardDate = new Date(); // For dashboard month selection
let currentDashboardView = 'monthly'; // 'monthly' or 'all-time'

// Chart instances to allow for updates
let applicationsStatusChartInstance = null;
let interviewsCountChartInstance = null;
let applicationTrendChartInstance = null;
let interviewTypeChartInstance = null;
let skillsLevelChartInstance = null;
let applicationsByJobTitleChartInstance = null;

/**
 * Loads all applications from the API for dashboard calculations.
 * @returns {Promise<void>}
 */
async function loadAllApplicationsForDashboard() {
    try {
        const response = await fetch('/api/applications');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allApplications = await response.json();
        console.log('All applications loaded for dashboard:', allApplications);
    } catch (error) {
        console.error('Error loading all applications for dashboard:', error);
        // Using window.showAlert as it's a global utility function
        window.showAlert('Failed to load all applications for dashboard. Please try again.', 'error');
    }
}

/**
 * Loads and renders all dashboard data based on the current view (monthly or all-time).
 * @returns {Promise<void>}
 */
async function loadDashboardData() {
    await loadAllApplicationsForDashboard(); // Ensure all applications are loaded

    let dashboardApplications = [];
    let dashboardInterviews = [];

    if (currentDashboardView === 'monthly') {
        // Fetch interviews for the specific month
        const year = currentDashboardDate.getFullYear();
        const month = currentDashboardDate.getMonth() + 1; // Months are 0-indexed in JS, 1-indexed in API
        try {
            const response = await fetch(`/api/interviews?year=${year}&month=${month}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            dashboardInterviews = await response.json();
        } catch (error) {
            console.error('Error loading monthly interviews for dashboard:', error);
            window.showAlert('Failed to load monthly interviews for dashboard. Please try again.', 'error');
            dashboardInterviews = []; // Ensure it's an empty array on error
        }

        // Filter applications for the specific month
        const selectedYear = currentDashboardDate.getFullYear();
        const selectedMonth = currentDashboardDate.getMonth(); // 0-indexed
        dashboardApplications = allApplications.filter(app => {
            const appDate = new Date(app.application_date);
            return window.isValidDate(appDate) &&
                   appDate.getFullYear() === selectedYear &&
                   appDate.getMonth() === selectedMonth;
        });
        document.getElementById('dashboard-month-selector').style.display = 'block';

    } else if (currentDashboardView === 'all-time') {
        // For all-time view, use all loaded applications and fetch all interviews
        dashboardApplications = allApplications;
        try {
            const response = await fetch('/api/interviews'); // Fetch all interviews
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            dashboardInterviews = await response.json();
        } catch (error) {
            console.error('Error loading all-time interviews for dashboard:', error);
            window.showAlert('Failed to load all-time interviews for dashboard. Please try again.', 'error');
            dashboardInterviews = []; // Ensure it's an empty array on error
        }
        document.getElementById('dashboard-month-selector').style.display = 'none';
    }

    renderApplicationsStatusChart(dashboardApplications);
    renderInterviewsCountChart(dashboardInterviews);
    renderApplicationTrendChart(dashboardApplications);
    renderInterviewTypeChart(dashboardInterviews);
    // Assuming 'profile' is a global variable loaded by main.js or app.js
    // Ensure window.profile is available before calling this
    if (window.profile && window.profile.skills) {
        renderSkillsLevelChart(window.profile.skills);
    } else {
        console.warn("Profile or profile skills not available for rendering Skills by Level chart.");
        // Optionally clear or show a message in the chart area if data is missing
    }
    renderApplicationsByJobTitleChart(dashboardApplications);
}

/**
 * Renders the Applications by Status doughnut chart.
 * @param {Array<Object>} data Array of application objects.
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
 * @param {Array<Object>} data Array of interview objects.
 */
function renderInterviewsCountChart(data) {
    const ctx = document.getElementById('interviewsCountChart').getContext('2d');

    let labels;
    let interviewCounts;
    let xTitle;

    if (currentDashboardView === 'monthly') {
        const daysInMonth = new Date(currentDashboardDate.getFullYear(), currentDashboardDate.getMonth() + 1, 0).getDate();
        labels = Array.from({ length: daysInMonth }, (_, i) => i + 1); // Days 1 to 31
        interviewCounts = new Array(daysInMonth).fill(0);
        xTitle = 'Day of Month';

        data.forEach(interview => {
            const interviewDay = new Date(interview.start_datetime).getDate();
            if (window.isValidDate(new Date(interview.start_datetime)) && interviewDay >= 1 && interviewDay <= daysInMonth) {
                interviewCounts[interviewDay - 1]++;
            }
        });
    } else { // All-time view
        // Group by month and year
        const monthlyCounts = {};
        data.forEach(interview => {
            const interviewDate = new Date(interview.start_datetime);
            if (window.isValidDate(interviewDate)) {
                const monthYear = `${interviewDate.getFullYear()}-${(interviewDate.getMonth() + 1).toString().padStart(2, '0')}`;
                monthlyCounts[monthYear] = (monthlyCounts[monthYear] || 0) + 1;
            }
        });
        labels = Object.keys(monthlyCounts).sort();
        interviewCounts = labels.map(label => monthlyCounts[label]);
        xTitle = 'Month-Year';
    }

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
                        text: xTitle
                    }
                }
            }
        }
    });
}

/**
 * Renders the Application Trends line chart.
 * @param {Array<Object>} data Array of application objects.
 */
function renderApplicationTrendChart(data) {
    const ctx = document.getElementById('applicationTrendChart').getContext('2d');

    let labels;
    let dailyOrMonthlyApplications;
    let xTitle;

    if (currentDashboardView === 'monthly') {
        const daysInMonth = new Date(currentDashboardDate.getFullYear(), currentDashboardDate.getMonth() + 1, 0).getDate();
        labels = Array.from({ length: daysInMonth }, (_, i) => i + 1); // Days 1 to 31
        dailyOrMonthlyApplications = new Array(daysInMonth).fill(0);
        xTitle = 'Day of Month';

        data.forEach(app => {
            const appDate = new Date(app.application_date);
            const appDay = appDate.getDate();
            if (window.isValidDate(appDate) && appDay >= 1 && appDay <= daysInMonth) {
                dailyOrMonthlyApplications[appDay - 1]++;
            }
        });
    } else { // All-time view
        // Group by month and year
        const monthlyApplicationsMap = {};
        data.forEach(app => {
            const appDate = new Date(app.application_date);
            if (window.isValidDate(appDate)) {
                const monthYear = `${appDate.getFullYear()}-${(appDate.getMonth() + 1).toString().padStart(2, '0')}`;
                monthlyApplicationsMap[monthYear] = (monthlyApplicationsMap[monthYear] || 0) + 1;
            }
        });
        labels = Object.keys(monthlyApplicationsMap).sort();
        dailyOrMonthlyApplications = labels.map(label => monthlyApplicationsMap[label]);
        xTitle = 'Month-Year';
    }

    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Applications Submitted',
            data: dailyOrMonthlyApplications,
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
                        text: xTitle
                    }
                }
            }
        }
    });
}

/**
 * Renders the Interview Types pie chart.
 * @param {Array<Object>} data Array of interview objects.
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
        type: 'pie',
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

/**
 * Renders the Skills by Level bar chart.
 * @param {Array<Object>} skillsData Array of skill objects from the user profile.
 */
function renderSkillsLevelChart(skillsData) {
    const ctx = document.getElementById('skillsLevelChart').getContext('2d');

    const levelCounts = {
        "Beginner": 0,
        "Intermediate": 0,
        "Advanced": 0,
        "Expert": 0
    };

    skillsData.forEach(skill => {
        if (levelCounts.hasOwnProperty(skill.level)) {
            levelCounts[skill.level]++;
        }
    });

    const chartData = {
        labels: Object.keys(levelCounts),
        datasets: [{
            label: 'Number of Skills',
            data: Object.values(levelCounts),
            backgroundColor: [
                '#a0aec0', // Beginner (Gray)
                '#f6ad55', // Intermediate (Orange)
                '#4299e1', // Advanced (Blue)
                '#48bb78'  // Expert (Green)
            ],
            borderColor: '#ffffff',
            borderWidth: 1
        }]
    };

    if (skillsLevelChartInstance) {
        skillsLevelChartInstance.destroy();
    }
    skillsLevelChartInstance = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Skills'
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Skill Level'
                    }
                }
            }
        }
    });
}

/**
 * Renders the Applications by Job Title bar chart.
 * @param {Array<Object>} data Array of application objects.
 */
function renderApplicationsByJobTitleChart(data) {
    const ctx = document.getElementById('applicationsByJobTitleChart').getContext('2d');

    const jobTitleCounts = {};
    data.forEach(app => {
        const title = app.job_title || 'Unspecified';
        jobTitleCounts[title] = (jobTitleCounts[title] || 0) + 1;
    });

    // Sort job titles by count in descending order and take top N
    const sortedJobTitles = Object.entries(jobTitleCounts).sort(([, countA], [, countB]) => countB - countA);
    const topN = 5; // Display top 5 job titles
    const labels = sortedJobTitles.slice(0, topN).map(([title,]) => title);
    const counts = sortedJobTitles.slice(0, topN).map(([, count]) => count);

    const backgroundColors = [
        '#667eea', '#4299e1', '#48bb78', '#f6ad55', '#ef4444', '#a0aec0'
    ];

    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Number of Applications',
            data: counts,
            backgroundColor: backgroundColors.slice(0, labels.length),
            borderColor: '#ffffff',
            borderWidth: 1
        }]
    };

    if (applicationsByJobTitleChartInstance) {
        applicationsByJobTitleChartInstance.destroy();
    }
    applicationsByJobTitleChartInstance = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
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
                        text: 'Job Title'
                    }
                }
            }
        }
    });
}

// Expose dashboard functions and variables to the global scope
window.currentDashboardDate = currentDashboardDate;
window.currentDashboardView = currentDashboardView;
window.loadDashboardData = loadDashboardData;
window.renderApplicationsStatusChart = renderApplicationsStatusChart;
window.renderInterviewsCountChart = renderInterviewsCountChart;
window.renderApplicationTrendChart = renderApplicationTrendChart;
window.renderInterviewTypeChart = renderInterviewTypeChart;
window.renderSkillsLevelChart = renderSkillsLevelChart;
window.renderApplicationsByJobTitleChart = renderApplicationsByJobTitleChart;

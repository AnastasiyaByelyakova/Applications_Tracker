// Global variables for dashboard module
let currentDashboardDate = new Date(); // For dashboard month selection

// Chart instances to allow for updates
let applicationsStatusChartInstance = null;
let interviewsCountChartInstance = null;
let applicationTrendChartInstance = null;
let interviewTypeChartInstance = null;
let skillsLevelChartInstance = null; // New chart instance for skills
let applicationsByJobTitleChartInstance = null; // New chart instance for applications by job title

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

        // Fetch interviews for the current month
        const interviewsResponse = await fetch(`/api/interviews?year=${year}&month=${month}`);
        if (!interviewsResponse.ok) {
            throw new Error(`HTTP error! status: ${interviewsResponse.status}`);
        }
        const dashboardInterviews = await interviewsResponse.json();

        // Fetch user profile for skills data
        const profileResponse = await fetch('/api/profile');
        if (!profileResponse.ok) {
            throw new Error(`HTTP error! status: ${profileResponse.status}`);
        }
        const userProfile = await profileResponse.json();
        const profileSkills = userProfile.skills || []; // Ensure skills is an array

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
        renderSkillsLevelChart(profileSkills); // Render the new skills chart
        renderApplicationsByJobTitleChart(monthlyApplications); // Render new chart for applications by job title
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
                '#a7c7e7', // Applied (Soft Blue)
                '#ffe0b2', // Interview (Soft Orange)
                '#ffb2b2', // Rejection (Soft Red)
                '#b2e8b2'  // Offer (Soft Green)
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
                },
                datalabels: { // Datalabels plugin configuration
                    color: '#2d3748', // Dark text color for readability
                    formatter: (value, context) => {
                        const total = context.dataset.data.reduce((sum, current) => sum + current, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                        return `${value} (${percentage})`; // Show count and percentage
                    },
                    font: {
                        weight: 'bold'
                    }
                }
            }
        },
        plugins: [ChartDataLabels] // Register the plugin
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
            backgroundColor: '#c1d9f0', // Soft blue
            borderColor: '#a7c7e7',
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
            borderColor: '#b2e8b2', // Soft Green
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
        '#c1d9f0', // Soft Blue
        '#ffe0b2', // Soft Orange
        '#b2e8b2', // Soft Green
        '#ffb2b2', // Soft Red
        '#e0e7eb', // Light Gray
        '#d9f0f7'  // Very Light Blue
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
                },
                datalabels: { // Datalabels plugin configuration
                    color: '#2d3748', // Dark text color for readability
                    formatter: (value, context) => {
                        const total = context.dataset.data.reduce((sum, current) => sum + current, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                        return `${value} (${percentage})`; // Show count and percentage
                    },
                    font: {
                        weight: 'bold'
                    }
                }
            }
        },
        plugins: [ChartDataLabels] // Register the plugin
    });
}

/**
 * Renders a bar chart showing the count of skills by their level.
 * @param {Array<object>} skills An array of skill objects from the user profile.
 */
function renderSkillsLevelChart(skills) {
    const ctx = document.getElementById('skillsLevelChart').getContext('2d');

    const levelOrder = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    const levelCounts = {
        'Beginner': 0,
        'Intermediate': 0,
        'Advanced': 0,
        'Expert': 0
    };

    skills.forEach(skill => {
        if (levelCounts.hasOwnProperty(skill.level)) {
            levelCounts[skill.level]++;
        } else {
            // Handle any unexpected levels, e.g., count as 'Unspecified'
            levelCounts['Unspecified'] = (levelCounts['Unspecified'] || 0) + 1;
        }
    });

    // Ensure labels are in a consistent order
    const labels = levelOrder.filter(level => levelCounts[level] > 0 || level in levelCounts);
    if (levelCounts['Unspecified'] > 0) {
        labels.push('Unspecified');
    }

    const dataValues = labels.map(label => levelCounts[label]);

    const backgroundColors = [
        '#ffb2b2', // Soft Red (for Beginner)
        '#ffe0b2', // Soft Orange (for Intermediate)
        '#b2e8b2', // Soft Green (for Advanced)
        '#a7c7e7', // Soft Blue (for Expert)
        '#e0e7eb'  // Light Gray (for Unspecified)
    ];

    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Number of Skills',
            data: dataValues,
            backgroundColor: backgroundColors.slice(0, labels.length),
            borderColor: backgroundColors.slice(0, labels.length).map(color => {
                // Slightly darker border for contrast
                const rgb = parseInt(color.substring(1), 16);
                const r = (rgb >> 16) & 0xFF;
                const g = (rgb >> 8) & 0xFF;
                const b = rgb & 0xFF;
                return `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`;
            }),
            borderWidth: 1,
            borderRadius: 5,
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
                    display: false,
                },
                title: {
                    display: false,
                    text: 'Skills by Level'
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
                        text: 'Skill Level'
                    }
                }
            }
        }
    });
}

/**
 * Renders a bar chart showing the distribution of applications by job title.
 * @param {Array<object>} data Filtered application data.
 */
function renderApplicationsByJobTitleChart(data) {
    const ctx = document.getElementById('applicationsByJobTitleChart').getContext('2d');

    const jobTitleCounts = {};
    data.forEach(app => {
        const title = app.job_title || 'Unspecified';
        jobTitleCounts[title] = (jobTitleCounts[title] || 0) + 1;
    });

    // Sort job titles alphabetically for consistent display
    const sortedJobTitles = Object.keys(jobTitleCounts).sort();
    const dataValues = sortedJobTitles.map(title => jobTitleCounts[title]);

    const backgroundColors = [
        '#a7c7e7', '#ffe0b2', '#b2e8b2', '#ffb2b2', '#c1d9f0', '#e0e7eb', '#d9f0f7',
        '#f0c1d9', '#c1f0d9', '#d9c1f0', '#f0d9c1' // More pastel colors
    ];

    const chartData = {
        labels: sortedJobTitles,
        datasets: [{
            label: 'Number of Applications',
            data: dataValues,
            backgroundColor: backgroundColors.slice(0, sortedJobTitles.length),
            borderColor: backgroundColors.slice(0, sortedJobTitles.length).map(color => {
                const rgb = parseInt(color.substring(1), 16);
                const r = (rgb >> 16) & 0xFF;
                const g = (rgb >> 8) & 0xFF;
                const b = rgb & 0xFF;
                return `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`;
            }),
            borderWidth: 1,
            borderRadius: 5,
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
                    display: false,
                },
                title: {
                    display: false,
                    text: 'Applications by Job Title'
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


// Expose functions to the global scope if needed by app.js or HTML
window.loadDashboardData = loadDashboardData;
window.currentDashboardDate = currentDashboardDate; // Expose for initial setup in app.js

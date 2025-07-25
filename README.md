# 🚀 Job Application Tracker with AI Assistant 🚀

A comprehensive web application designed to streamline your job search, track applications, manage interviews, and leverage AI-powered tools to enhance your career development.

## ✨ Features

This application provides a robust set of features to help you stay organized and competitive in your job hunt:

### 📋 Application Management
* **Add/Edit/Delete Applications:** Full CRUD (Create, Read, Update, Delete) operations for all your job applications.
* **Detailed Tracking:** Store job title, company, application link, date, status, job description, attached CV, and cover letter notes.
* **Flexible Views:** Toggle between intuitive **Card View** and a sortable, filterable **Table View** for your applications.
* **Filtering & Sorting:** Easily search and sort your applications by various criteria (job title, company, status, date).
* **CV Attachment:** Upload specific CVs for each application.

### 👤 Personal Profile Management
* **Comprehensive Profile:** Maintain a detailed professional profile including personal information, education, work experience, skills, languages, certifications, and professional links (LinkedIn, GitHub, Portfolio).
* **Master CV Upload:** Store a master CV for quick reference and AI processing.
* **Dynamic Fields:** Easily add and manage multiple entries for education, experience, skills, languages, and certifications.

### 🗓️ Interview Calendar
* **Schedule Interviews:** Add and manage interview events with titles, dates, times, locations, and types.
* **Monthly View:** Visualize your interviews on an interactive calendar.
* **Upcoming Interviews:** See a list of scheduled interviews for the current month and quick overviews for upcoming months.

### 📊 Dashboard & Analytics
* **Visual Insights:** Gain insights into your job search progress with interactive charts.
* **Key Metrics:** Track applications by status, interview counts, application trends over time, and interview types.
* **Skill Analysis:** Visualize your skills by level.
* **Job Title Distribution:** See which job titles you're applying for most.
* **Time-based Views:** Filter dashboard data by current month or all-time.

### 🤖 AI-Powered Career Tools

Leverage the power of AI (Gemini, OpenAI, Claude) to assist you at every stage of your job search. **(Note: Requires API keys for selected AI providers)**

**AI-Powered Job Search:**
* **Estimate Job Chance:** Get an AI-driven assessment of your likelihood of getting a job based on your profile and a specific job description.
* **Tune CV for Job:** Receive AI suggestions on how to tailor your CV's summary, experience, and skills to better match a target job description.
* **Cover Letter Writing:** Generate a personalized cover letter draft using your profile and the job description.
* **Interview Q&A Practice:** Engage in a chatbot-based interview simulation, receiving questions and feedback on your answers.
* **Skill Extractor & Analyzer:** Extract key skills from a job description and compare them against your profile, highlighting gaps and suggesting phrasing.
* **Craft Interview Questions:** Generate insightful interview questions for a candidate based on their resume summary or a job description.
* **Company Website Research:** Extract key information (mission, values, products, news) from a company's website using a browsing tool.
* **Tuned "About Me" Answer:** Generate a compelling "Tell me about yourself" answer tailored to a specific job and your profile.
* **Fill Profile from Resume (AI):** Upload your resume (PDF) and let AI automatically extract and populate your profile information.

## 🛠️ Technologies Used

### Backend
* **Python 3.9+**
* **FastAPI:** A modern, fast (high-performance) web framework for building APIs with Python 3.7+ based on standard Python type hints.
* **SQLAlchemy:** Python SQL toolkit and Object Relational Mapper that gives application developers the full power and flexibility of SQL.
* **PostgreSQL:** A powerful, open source object-relational database system.
* **`python-dotenv`:** For managing environment variables.
* **`google-generativeai`:** Python client for Google Gemini API (for AI features).
* **`openai`:** Python client for OpenAI API (for AI features).
* **`anthropic`:** Python client for Anthropic Claude API (for AI features).
* **`python-multipart`:** For handling form data, especially file uploads.
* **`PyPDF2`:** For PDF file processing (used in resume extraction).
* **`uvicorn`:** ASGI server for running FastAPI applications.

### Frontend
* **HTML5:** Structure of the web pages.
* **CSS3:** Styling and responsive design.
* **Vanilla JavaScript:** Client-side logic and interactivity.
* **Chart.js:** For creating interactive data visualizations on the dashboard.
* **`marked.js`:** For rendering Markdown content (e.g., AI responses).

## 🚀 Setup and Installation

Follow these steps to get the project up and running on your local machine.

### 1. Clone the Repository

```bash
git clone <repository_url> 
cd job-application-tracker
```

### 2. Create and Activate a Virtual Environment
It's highly recommended to use a virtual environment to manage dependencies.

```bash
# For macOS/Linux
python3 -m venv venv
source venv/bin/activate
```


### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Database Setup (PostgreSQL)
Ensure you have PostgreSQL installed and running and database created

### 5. Environment Variables

Create a .env file in the root directory of your project and add the following:

```bash
DATABASE_URL="postgresql+asyncpg://job_tracker_user:your_password@localhost/job_tracker_db"
 ```
Replace with your actual database user, password, and host if different

### 5. Run the FastAPI Application

```bash
uvicorn main:app --reload
```

The --reload flag will automatically restart the server on code changes.

### 8. Access the Application
Open your web browser and navigate to:

[http://127.0.0.1:8000](http://127.0.0.1:8000)

## 💡 Usage

Once the application is running:

* Navigate Tabs: Use the top navigation bar to switch between "Applications", "Profile", "AI Tools", "Job Search", "Calendar", and "Dashboard".

* Fill Your Profile: Go to the "Profile" tab and fill in your personal, educational, and professional details. This information is crucial for the AI tools. Remember to click "Save Profile".

* Manage Applications: In the "Applications" tab, add new job applications, update their status, or view details. Use the "View As" toggle to switch between card and table layouts.

### Use AI Tools:

Go to the "AI Tools" dropdown and select a service.

Enter the required information (e.g., job description, company URL).

Select your AI Provider (Gemini, OpenAI, or Claude) and enter your corresponding API Key.

Click the action button (e.g., "Estimate Chance", "Find Jobs").

Calendar: Schedule and view your interviews.

Dashboard: Monitor your job search progress with visual analytics.
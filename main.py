from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from typing import List, Optional
from typing_extensions import Annotated  # For Python < 3.9, otherwise use typing.Annotated
import os
from datetime import datetime, timezone  # Import timezone
import json
from typing import *
from database import Database
from models import *
from ai_services import AIService
from contextlib import asynccontextmanager  # Import asynccontextmanager

db = Database()
ai_service = AIService()

# Ensure uploads directory exists
UPLOAD_DIR = "uploads/cvs"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# Define lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown events for the application.
    Connects to the database on startup and closes the connection on shutdown.
    """
    print("Application startup: Connecting to database...")
    await db.connect()
    print("Database connected.")
    yield  # Application runs
    print("Application shutdown: Closing database connection...")
    await db.close()
    print("Database connection closed.")


# Initialize FastAPI app with lifespan
app = FastAPI(lifespan=lifespan)
# Mount static files (HTML, CSS, JS)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")  # Mount uploads directory


# Root endpoint to serve the HTML application
@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serves the main HTML page of the application."""
    return FileResponse("static/index.html")


# API Endpoints
# Job Application Endpoints
@app.post("/api/applications", response_model=JobApplication)
async def add_application(
        job_title: Annotated[str, Form()],
        company: Annotated[str, Form()],
        application_date: Annotated[str, Form()],  # Keep as string, parse inside if needed
        status: Annotated[ApplicationStatus, Form()] = ApplicationStatus.APPLIED,
        description: Annotated[Optional[str], Form()] = None,
        link: Annotated[Optional[str], Form()] = None,
        cv_file: Annotated[Optional[UploadFile], File()] = None,  # Use UploadFile for file
        cover_letter: Annotated[Optional[str], Form()] = None,
):
    """Adds a new job application to the database."""
    cv_file_path = None
    if cv_file and cv_file.filename:
        file_extension = os.path.splitext(cv_file.filename)[1]
        # Generate a unique filename to prevent collisions
        unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{os.urandom(4).hex()}{file_extension}"
        cv_file_path = os.path.join(UPLOAD_DIR, unique_filename)
        try:
            with open(cv_file_path, "wb") as buffer:
                content = await cv_file.read()
                buffer.write(content)
            print(f"CV file saved to: {cv_file_path}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload CV file: {e}")

    # Convert application_date string to datetime object (assuming YYYY-MM-DD from HTML date input)
    try:
        parsed_application_date = datetime.strptime(application_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid application_date format. Expected YYYY-MM-DD.")

    application_data = JobApplication(
        job_title=job_title,
        company=company,
        description=description,
        link=link,
        application_date=parsed_application_date,
        status=status,
        cv_file=cv_file_path,  # Store the path to the uploaded file
        cover_letter=cover_letter
    )
    new_application = await db.add_application(application_data)
    if not new_application:
        raise HTTPException(status_code=500, detail="Failed to add application to database.")
    return new_application


@app.get("/api/applications", response_model=List[JobApplication])
async def get_applications():
    """Retrieves all job applications."""
    applications = await db.get_all_applications()
    return applications


@app.get("/api/applications/{application_id}", response_model=JobApplication)
async def get_application(application_id: str):
    """Retrieves a single job application by ID."""
    application = await db.get_application(application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")
    return application


@app.put("/api/applications/{application_id}", response_model=JobApplication)
async def update_application(
        application_id: str,
        job_title: Annotated[str, Form()],
        company: Annotated[str, Form()],
        application_date: Annotated[str, Form()],
        status: Annotated[ApplicationStatus, Form()] = ApplicationStatus.APPLIED,
        description: Annotated[Optional[str], Form()] = None,
        link: Annotated[Optional[str], Form()] = None,
        cv_file: Annotated[Optional[UploadFile], File()] = None,  # Optional new CV file
        cover_letter: Annotated[Optional[str], Form()] = None,
):
    """Updates an existing job application."""
    existing_application = await db.get_application(application_id)
    if not existing_application:
        raise HTTPException(status_code=404, detail="Application not found.")

    cv_file_path = existing_application.cv_file  # Keep existing path by default
    if cv_file and cv_file.filename:
        # Delete old CV file if it exists
        if cv_file_path and os.path.exists(cv_file_path):
            os.remove(cv_file_path)
            print(f"Old CV file deleted: {cv_file_path}")

        file_extension = os.path.splitext(cv_file.filename)[1]
        unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{os.urandom(4).hex()}{file_extension}"
        cv_file_path = os.path.join(UPLOAD_DIR, unique_filename)
        try:
            with open(cv_file_path, "wb") as buffer:
                content = await cv_file.read()
                buffer.write(content)
            print(f"New CV file saved to: {cv_file_path}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload new CV file: {e}")

    try:
        parsed_application_date = datetime.strptime(application_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid application_date format. Expected YYYY-MM-DD.")

    updated_application_data = JobApplication(
        id=application_id,  # Ensure ID is passed for update
        job_title=job_title,
        company=company,
        description=description,
        link=link,
        application_date=parsed_application_date,
        status=status,
        cv_file=cv_file_path,
        cover_letter=cover_letter,
        last_updated=datetime.now(timezone.utc)  # Update last_updated timestamp
    )
    updated_app = await db.update_application(application_id, updated_application_data)
    if not updated_app:
        raise HTTPException(status_code=500, detail="Failed to update application in database.")
    return updated_app


@app.delete("/api/applications/{application_id}")
async def delete_application(application_id: str):
    """Deletes a job application by ID."""
    # Retrieve application to get CV file path for deletion
    application_to_delete = await db.get_application(application_id)
    if not application_to_delete:
        raise HTTPException(status_code=404, detail="Application not found.")

    if application_to_delete.cv_file and os.path.exists(application_to_delete.cv_file):
        try:
            os.remove(application_to_delete.cv_file)
            print(f"Associated CV file deleted: {application_to_delete.cv_file}")
        except Exception as e:
            print(f"Error deleting associated CV file {application_to_delete.cv_file}: {e}")
            # Do not raise HTTPException, as the application itself should still be deleted

    success = await db.delete_application(application_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete application from database.")
    return {"message": "Application deleted successfully."}


@app.get("/api/applications/{application_id}/cv")
async def download_cv(application_id: str):
    """Downloads the CV file associated with a job application."""
    application = await db.get_application(application_id)
    if not application or not application.cv_file or not os.path.exists(application.cv_file):
        raise HTTPException(status_code=404, detail="CV file not found for this application.")

    # Extract original filename for download
    filename = os.path.basename(application.cv_file)
    return FileResponse(path=application.cv_file, filename=filename, media_type="application/octet-stream")


# User Profile Endpoints
@app.post("/api/profile", response_model=UserProfile)
async def save_user_profile(profile: UserProfile):
    """Saves or updates the user's profile."""
    saved_profile = await db.save_user_profile(profile)
    if not saved_profile:
        raise HTTPException(status_code=500, detail="Failed to save user profile.")
    return saved_profile


@app.get("/api/profile", response_model=UserProfile)
async def get_user_profile():
    """Retrieves the user's profile."""
    profile = await db.get_user_profile()
    if not profile:
        # Return a default empty profile if none exists, so frontend doesn't break
        return UserProfile(
            full_name="", email="", phone="", location="", summary="",
            education=[], experience=[], skills=[], languages=[], certifications=[]
        )
    return profile


@app.post("/api/profile/cv", response_model=UserProfile)
async def upload_profile_cv(cv_file: UploadFile = File(...)):
    """Uploads a master CV file for the user's profile."""
    if not cv_file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    # Define a fixed path for the master CV, overwriting if exists
    cv_file_path = os.path.join(UPLOAD_DIR, "master_cv.pdf")  # Or use a unique name if multiple master CVs are allowed

    # Ensure the uploads directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    try:
        with open(cv_file_path, "wb") as buffer:
            content = await cv_file.read()
            buffer.write(content)
        print(f"Master CV file saved to: {cv_file_path}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload master CV file: {e}")

    # Update the user profile with the new CV file path
    existing_profile = await db.get_user_profile()
    if existing_profile:
        existing_profile.cv_profile_file = cv_file_path
        updated_profile = await db.save_user_profile(existing_profile)  # Use save to update
    else:
        # If no profile exists, create a minimal one with just the CV file
        new_profile = UserProfile(cv_profile_file=cv_file_path, full_name="Guest User")  # Add a default name
        updated_profile = await db.save_user_profile(new_profile)

    if not updated_profile:
        raise HTTPException(status_code=500, detail="Failed to update user profile with CV file path.")
    return updated_profile


# Interview Endpoints
@app.post("/api/interviews", response_model=Interview)
async def add_interview(interview: Interview):
    """Adds a new interview to the database."""
    try:
        new_interview = await db.add_interview(interview)
        if not new_interview:
            raise HTTPException(status_code=500, detail="Failed to add interview to database.")
        return new_interview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/interviews", response_model=List[Interview])
async def get_interviews():
    """Retrieves all interviews."""
    interviews = await db.get_interviews_by_month()
    return interviews


@app.get("/api/interviews/{interview_id}", response_model=Interview)
async def get_interview(interview_id: str):
    """Retrieves a single interview by ID."""
    interview = await db.get_interview(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")
    return interview


@app.put("/api/interviews/{interview_id}", response_model=Interview)
async def update_interview(interview_id: str, interview: Interview):
    """Updates an existing interview."""
    try:
        updated_interview = await db.update_interview(interview_id, interview)
        if not updated_interview:
            raise HTTPException(status_code=500, detail="Failed to update interview in database.")
        return updated_interview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/interviews/{interview_id}")
async def delete_interview(interview_id: str):
    """Deletes an interview."""
    success = await db.delete_interview(interview_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete interview from database.")
    return {"message": "Interview deleted successfully."}


# AI Service Endpoints
@app.post("/api/ai/estimate-chance")
async def estimate_job_chance_ai(
        job_description: Annotated[str, Form()],
        profile: Annotated[str, Form()],  # profile comes as a JSON string
        ai_provider: Annotated[AIProvider, Form()],
        api_key: Annotated[str, Form()]
):
    """Estimates job chance using AI."""
    try:
        # Parse the profile JSON string back into a dictionary
        profile_data = json.loads(profile)
        # Assuming AIService expects a dict for profile
        result = await ai_service.estimate_job_chance(
            user_profile=profile_data,
            job_description=job_description,
            ai_provider=ai_provider,
            api_key=api_key
        )
        return {"result": result}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format for profile data.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI job chance estimation failed: {e}")


@app.post("/api/ai/tune-cv", response_model=Dict[str, str])
async def tune_cv_ai(
        job_description: Annotated[str, Form()],
        profile: Annotated[str, Form()],
        ai_provider: Annotated[AIProvider, Form()],
        api_key: Annotated[str, Form()]
):
    """Tunes CV for a job description using AI."""
    try:
        profile_data = json.loads(profile)
        result = await ai_service.tune_cv_for_job(
            user_profile=profile_data,
            job_description=job_description,
            ai_provider=ai_provider,
            api_key=api_key
        )
        return {"result": result}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format for profile data.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI CV tuning failed: {e}")


@app.post("/api/ai/generate-cover-letter", response_model=Dict[str, str])
async def generate_cover_letter_ai(
        job_description: Annotated[str, Form()],
        profile: Annotated[str, Form()],
        ai_provider: Annotated[AIProvider, Form()],
        api_key: Annotated[str, Form()]
):
    """Generates a cover letter using AI."""
    try:
        profile_data = json.loads(profile)
        result = await ai_service.generate_cover_letter(
            user_profile=profile_data,
            job_description=job_description,
            ai_provider=ai_provider,
            api_key=api_key
        )
        return {"result": result}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format for profile data.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI cover letter generation failed: {e}")


@app.post("/api/ai/interview-chat", response_model=Dict[str, str])
async def interview_chat_ai(
        job_title: Annotated[str, Form()],
        chat_history: Annotated[str, Form()],  # chat_history comes as a JSON string
        ai_provider: Annotated[AIProvider, Form()],
        api_key: Annotated[str, Form()]
):
    """Handles interview Q&A chat using AI."""
    try:
        chat_history_data = json.loads(chat_history)
        result = await ai_service.interview_qa_chat(
            job_title=job_title,
            chat_history=chat_history_data,
            ai_provider=ai_provider,
            api_key=api_key
        )
        return {"result": result}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format for chat history.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI interview chat failed: {e}")


@app.post("/api/ai/extract-skills", response_model=Dict[str, str])
async def extract_job_skills_ai(
        job_description: Annotated[str, Form()],
        profile: Annotated[str, Form()],
        ai_provider: Annotated[AIProvider, Form()],
        api_key: Annotated[str, Form()]
):
    """Extracts key skills from a job description using AI."""
    try:
        profile_data = json.loads(profile)
        result = await ai_service.extract_job_skills(
            user_profile=profile_data,
            job_description=job_description,
            ai_provider=ai_provider,
            api_key=api_key
        )
        return {"result": result}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format for profile data.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI skill extraction failed: {e}")


@app.post("/api/ai/craft-interview-questions", response_model=Dict[str, str])
async def craft_interview_questions_ai(
        candidate_info: Annotated[str, Form()],
        ai_provider: Annotated[AIProvider, Form()],
        api_key: Annotated[str, Form()]
):
    """Crafts interview questions using AI."""
    try:
        result = await ai_service.craft_interview_questions(
            candidate_info=candidate_info,
            ai_provider=ai_provider,
            api_key=api_key
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI interview question crafting failed: {e}")


@app.post("/api/ai/research-company", response_model=Dict[str, str])
async def research_company_website_ai(
        company_url: Annotated[str, Form()],
        ai_provider: Annotated[AIProvider, Form()],
        api_key: Annotated[str, Form()]
):
    """Researches company website using AI."""
    try:
        result = await ai_service.research_company_website(
            company_url=company_url,
            ai_provider=ai_provider,
            api_key=api_key
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI company research failed: {e}")


@app.post("/api/ai/generate-about-me", response_model=Dict[str, str])
async def generate_about_me_answer_ai(
        job_description: Annotated[str, Form()],
        profile: Annotated[str, Form()],
        ai_provider: Annotated[AIProvider, Form()],
        api_key: Annotated[str, Form()]
):
    """Generates 'About Me' answer using AI."""
    try:
        profile_data = json.loads(profile)
        result = await ai_service.generate_about_me_answer(
            user_profile=profile_data,
            job_description=job_description,
            ai_provider=ai_provider,
            api_key=api_key
        )
        return {"result": result}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format for profile data.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 'About Me' generation failed: {e}")


@app.post("/api/ai/fill-profile-from-resume", response_model=UserProfile)
async def fill_profile_from_resume_ai(
        api_key: Annotated[str, Form()],
        ai_provider: Annotated[AIProvider, Form()],
        resume_file: UploadFile = File(...),


):
    """Fills user profile from resume using AI."""
    if not resume_file.filename:
        raise HTTPException(status_code=400, detail="No resume file uploaded.")

    # Read the content of the uploaded PDF file
    file_content = await resume_file.read()

    try:
        # Pass the file content (bytes) to the AI service
        extracted_profile_data = await ai_service.fill_profile_from_resume(
            resume_content=file_content,
            ai_provider=ai_provider,
            api_key=api_key
        )

        # Fetch existing profile to merge or create new
        existing_profile = await db.get_user_profile()

        if existing_profile:
            # Update existing profile with extracted data
            # Convert extracted_profile_data (dict) to UserProfileUpdate model
            # Ensure proper merging, handling lists (append/replace) as needed
            # For simplicity, this example overwrites fields if present in extracted_profile_data
            updated_data = existing_profile.dict(exclude_unset=True)
            updated_data.update(extracted_profile_data)  # Merge dictionaries
            full_profile = UserProfile(**updated_data)
        else:
            # Create a new profile if none exists
            full_profile = UserProfile(**extracted_profile_data)

        saved_profile = await db.save_user_profile(full_profile)

        if not saved_profile:
            raise HTTPException(status_code=500, detail="Failed to save extracted profile data.")
        print("Profile filled from resume and saved successfully.")
        return saved_profile
    except Exception as e:
        print(f"Error in fill_profile_from_resume_ai endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"AI profile fill failed: {e}")


# Add a simple health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "message": "Application is running."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)


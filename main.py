import os
import shutil
from contextlib import asynccontextmanager
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, UploadFile, File, HTTPException, status, Request, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from datetime import datetime
import json

# Assuming these models are defined in models.py
from models import JobApplication, UserProfile, Interview, ApplicationStatus, AIProvider, Education, Experience, Skill
# Assuming Database class is defined in database.py
from database import Database
# Assuming AIService class is defined in ai_services.py
from ai_services import AIService

# Initialize database and AI service globally
db = Database()
ai_service = AIService()

# Directory for uploaded files
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Context manager for application startup and shutdown events.
    Connects to the database on startup and closes the connection on shutdown.
    """
    print("Starting up...")
    await db.connect()
    yield
    print("Shutting down...")
    await db.close()


app = FastAPI(lifespan=lifespan)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve the main HTML page."""
    with open("static/index.html", "r", encoding='utf-8') as f:
        return HTMLResponse(content=f.read())


# --- Job Application Endpoints ---

@app.get("/api/applications", response_model=List[JobApplication])
async def get_applications():
    """Retrieve all job applications."""
    applications = await db.get_all_applications()
    return applications


@app.post("/api/applications", response_model=JobApplication, status_code=status.HTTP_201_CREATED)
async def create_application(application: JobApplication):
    """Create a new job application."""
    new_application = await db.add_application(application)
    if not new_application:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to add application.")
    return new_application


@app.get("/api/applications/{application_id}", response_model=JobApplication)
async def get_application(application_id: str):
    """Retrieve a single job application by ID."""
    application = await db.get_application(application_id)
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    return application


@app.put("/api/applications/{application_id}", response_model=JobApplication)
async def update_application(application_id: str, application: JobApplication):
    """Update an existing job application."""
    updated_application = await db.update_application(application_id, application)
    if not updated_application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found or update failed.")
    return updated_application


@app.delete("/api/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(application_id: str):
    """Delete a job application."""
    success = await db.delete_application(application_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    return {"message": "Application deleted successfully."}


@app.post("/api/upload-cv")
async def upload_cv(file: UploadFile = File(...)):
    """Upload a CV file for a job application."""
    try:
        file_location = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        return {"filename": file.filename, "path": f"/uploads/{file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not upload file: {e}")


# --- User Profile Endpoints ---

@app.get("/api/profile", response_model=UserProfile)
async def get_user_profile():
    """Retrieve the user profile."""
    profile = await db.get_user_profile()
    if not profile:
        # Return an empty but valid UserProfile if none exists
        return UserProfile()
    return profile


@app.post("/api/profile", response_model=UserProfile)
async def save_user_profile(profile: UserProfile):
    """Save or update the user profile."""
    # Assuming there's only one user profile, we'll upsert it.
    # In a multi-user system, you'd associate it with a user ID.
    saved_profile = await db.save_user_profile(profile)
    if not saved_profile:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save profile.")
    return saved_profile


@app.post("/api/profile/upload-cv")
async def upload_profile_cv(file: UploadFile = File(...)):
    """Upload a master CV file for the user profile."""
    try:
        file_location = os.path.join(UPLOAD_DIR, "profile_master_cv.pdf")  # Standardize name for profile CV
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        return {"filename": "profile_master_cv.pdf", "path": f"/uploads/profile_master_cv.pdf"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Could not upload profile CV: {e}")


# --- Interview Endpoints ---

@app.get("/api/interviews", response_model=List[Interview])
async def get_interviews(year: Optional[int] = None, month: Optional[int] = None):
    """Retrieve interviews, optionally filtered by year and month."""
    interviews = await db.get_interviews_by_month(year, month)
    return interviews


@app.post("/api/interviews", response_model=Interview, status_code=status.HTTP_201_CREATED)
async def create_interview(interview: Interview):
    """Schedule a new interview."""
    try:
        new_interview = await db.add_interview(interview)
        if not new_interview:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to schedule interview.")
        return new_interview
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))  # Conflict for overlaps


@app.put("/api/interviews/{interview_id}", response_model=Interview)
async def update_interview(interview_id: str, interview: Interview):
    """Update an existing interview."""
    try:
        updated_interview = await db.update_interview(interview_id, interview)
        if not updated_interview:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found or update failed.")
        return updated_interview
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))  # Conflict for overlaps


@app.delete("/api/interviews/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interview(interview_id: str):
    """Delete an interview."""
    success = await db.delete_interview(interview_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    return {"message": "Interview deleted successfully."}


# --- AI Service Endpoints ---

class AiRequest(BaseModel):
    job_description: Optional[str] = None
    profile: Optional[UserProfile] = None
    ai_provider: AIProvider
    api_key: str
    candidate_info: Optional[str] = None  # For crafting interview questions
    company_url: Optional[str] = None  # For company research
    chat_history: Optional[List[Dict[str, str]]] = None  # For chat bot
    job_title: Optional[str] = None  # For interview Q&A


@app.post("/api/ai/estimate-chance")
async def ai_estimate_chance(request: AiRequest):
    """Endpoint for AI job chance estimation."""
    if not request.job_description or not request.profile:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job description and profile are required.")
    try:
        result = await ai_service.estimate_job_chance(
            job_description=request.job_description,
            profile=request.profile,
            ai_provider=request.ai_provider,
            api_key=request.api_key
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/ai/tune-cv")
async def ai_tune_cv(request: AiRequest):
    """Endpoint for AI CV tuning."""
    if not request.job_description or not request.profile:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job description and profile are required.")
    try:
        result = await ai_service.tune_cv(
            job_description=request.job_description,
            profile=request.profile,
            ai_provider=request.ai_provider,
            api_key=request.api_key
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/ai/cover-letter")
async def ai_generate_cover_letter(request: AiRequest):
    """Endpoint for AI cover letter generation."""
    if not request.job_description or not request.profile:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job description and profile are required.")
    try:
        result = await ai_service.generate_cover_letter(
            job_description=request.job_description,
            profile=request.profile,
            ai_provider=request.ai_provider,
            api_key=request.api_key
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/ai/interview-qa")
async def ai_interview_qa(request: AiRequest):
    """Endpoint for AI interview Q&A chatbot."""
    if not request.job_title or not request.profile or not request.chat_history:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Job title, profile, and chat history are required.")
    try:
        response_text = await ai_service.interview_qa_chat(
            job_title=request.job_title,
            profile=request.profile,
            chat_history=request.chat_history,
            ai_provider=request.ai_provider,
            api_key=request.api_key
        )
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/ai/skill-extractor")
async def ai_extract_skills(request: AiRequest):
    """Endpoint for AI job description skill extraction and analysis."""
    if not request.job_description or not request.profile:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job description and profile are required.")
    try:
        result = await ai_service.extract_job_skills(
            job_description=request.job_description,
            profile=request.profile,
            ai_provider=request.ai_provider,
            api_key=request.api_key
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/ai/craft-interview-questions")
async def ai_craft_interview_questions(request: AiRequest):
    """Endpoint for AI crafting interview questions for a candidate."""
    if not request.candidate_info:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Candidate information is required.")
    try:
        result = await ai_service.craft_interview_questions(
            candidate_info=request.candidate_info,
            ai_provider=request.ai_provider,
            api_key=request.api_key
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/ai/company-research")
async def ai_company_research(request: AiRequest):
    """Endpoint for AI company website research."""
    if not request.company_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Company URL is required.")
    try:
        result = await ai_service.research_company_website(
            company_url=request.company_url,
            ai_provider=request.ai_provider,
            api_key=request.api_key
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/ai/about-me-answer")
async def ai_generate_about_me_answer(request: AiRequest):
    """Endpoint for AI generating a tuned 'About Me' answer."""
    if not request.job_description or not request.profile:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job description and profile are required.")
    try:
        result = await ai_service.generate_about_me_answer(
            job_description=request.job_description,
            profile=request.profile,
            ai_provider=request.ai_provider,
            api_key=request.api_key
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/ai/profile/fill-from-resume-ai")
async def ai_fill_profile_from_resume(
        resume_file: UploadFile = File(...),
        ai_provider: AIProvider = Form(...),  # Use Form for these parameters
        api_key: str = Form(...)  # Use Form for these parameters
):
    """Endpoint for AI to fill profile from a resume PDF."""
    if not resume_file:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resume PDF file is required.")
    if not api_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="AI API key is required.")

    try:
        pdf_content = await resume_file.read()
        extracted_profile_data = await ai_service.extract_profile_from_resume_pdf(
            pdf_content=pdf_content,
            ai_provider=ai_provider,
            api_key=api_key
        )

        # Update the user's profile in the database with extracted data
        # First, fetch the current profile to merge (or create if none exists)
        current_profile = await db.get_user_profile()
        if not current_profile:
            current_profile = UserProfile()

        # Merge extracted data into the current profile
        # This will overwrite existing fields and append to lists
        updated_profile_data = current_profile.dict(exclude_unset=True)  # Get current profile as dict

        # Merge top-level fields
        for key, value in extracted_profile_data.items():
            if key not in ['education', 'experience', 'skills', 'languages', 'certifications']:
                if value is not None and value != "":
                    updated_profile_data[key] = value

        # Merge lists (append new entries, avoid duplicates if possible, or replace for simplicity)
        # For simplicity, we'll extend the lists. For more complex merging (e.g., avoiding exact duplicates),
        # additional logic would be needed.
        for list_field in ['education', 'experience', 'skills', 'languages', 'certifications']:
            if extracted_profile_data.get(list_field):
                # Convert list of Pydantic models to list of dicts for merging
                existing_list = [item.dict() for item in getattr(current_profile, list_field)]
                new_entries = extracted_profile_data[list_field]

                # Simple append for now.
                updated_list = existing_list + new_entries

                # Deduplicate for skills, education, experience if needed (example for skills)
                if list_field == 'skills':
                    seen = set()
                    deduplicated_list = []
                    for item in updated_list:
                        item_tuple = tuple(sorted(item.items()))  # Convert dict to sortable tuple for set
                        if item_tuple not in seen:
                            seen.add(item_tuple)
                            deduplicated_list.append(item)
                    updated_list = deduplicated_list
                # Add similar deduplication logic for other lists if necessary

                updated_profile_data[list_field] = updated_list

        final_profile = UserProfile(**updated_profile_data)
        saved_profile = await db.save_user_profile(final_profile)

        return {"profile": saved_profile.dict()}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"AI profile extraction failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
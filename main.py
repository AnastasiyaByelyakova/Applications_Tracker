from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Body
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import os
import json

from pydantic import BaseModel # Import BaseModel for request body validation

from database import Database
from models import JobApplication, UserProfile, Interview, ApplicationStatus, AIProvider
from ai_services import AIService

app = FastAPI()
db = Database()
ai_service = AIService()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Ensure uploads directory exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.on_event("startup")
async def startup_event():
    await db.connect()


@app.on_event("shutdown")
async def shutdown_event():
    await db.close()


@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("static/index.html", "r", encoding='utf-8') as f:
        return HTMLResponse(content=f.read())


# --- Job Application Endpoints ---

@app.get("/api/applications", response_model=List[JobApplication])
async def get_applications():
    return await db.get_all_applications()


@app.get("/api/applications/{application_id}", response_model=JobApplication)
async def get_application(application_id: str):
    application = await db.get_application(application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@app.post("/api/applications", response_model=JobApplication)
async def create_application(
        job_title: str = Form(...),
        company: str = Form(...),
        description: Optional[str] = Form(None),
        link: Optional[str] = Form(None),
        application_date: str = Form(..., alias="application_date"),  # Use alias for consistency
        status: ApplicationStatus = Form(ApplicationStatus.APPLIED),
        cv_file: Optional[UploadFile] = File(None),
        cover_letter: Optional[str] = Form(None)
):
    cv_file_path = None
    if cv_file:
        file_location = os.path.join(UPLOAD_DIR, cv_file.filename)
        with open(file_location, "wb+") as file_object: # Changed to 'wb+' for binary write
            file_object.write(await cv_file.read()) # Use await for async file read
        cv_file_path = file_location

    # Convert application_date string to datetime object
    try:
        app_date_obj = datetime.strptime(application_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format for application_date. Use YYYY-MM-DD.")

    application = JobApplication(
        job_title=job_title,
        company=company,
        description=description,
        link=link,
        application_date=app_date_obj,
        status=status,
        cv_file=cv_file_path,
        cover_letter=cover_letter
    )
    new_application = await db.add_application(application)
    return new_application


@app.put("/api/applications/{application_id}", response_model=JobApplication)
async def update_application(
        application_id: str,
        job_title: str = Form(...),
        company: str = Form(...),
        description: Optional[str] = Form(None),
        link: Optional[str] = Form(None),
        application_date: str = Form(..., alias="application_date"),
        status: ApplicationStatus = Form(ApplicationStatus.APPLIED),
        cv_file: Optional[UploadFile] = File(None),
        cover_letter: Optional[str] = Form(None)
):
    existing_application = await db.get_application(application_id)
    if not existing_application:
        raise HTTPException(status_code=404, detail="Application not found")

    cv_file_path = existing_application.cv_file  # Keep existing file if not new one uploaded
    if cv_file:
        file_location = os.path.join(UPLOAD_DIR, cv_file.filename)
        with open(file_location, "wb+") as file_object: # Changed to 'wb+' for binary write
            file_object.write(await cv_file.read()) # Use await for async file read
        cv_file_path = file_location

    try:
        app_date_obj = datetime.strptime(application_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format for application_date. Use YYYY-MM-DD.")

    application = JobApplication(
        id=application_id,  # Ensure ID is passed for update
        job_title=job_title,
        company=company,
        description=description,
        link=link,
        application_date=app_date_obj,
        status=status,
        cv_file=cv_file_path,
        cover_letter=cover_letter
    )
    updated_application = await db.update_application(application_id, application)
    if not updated_application:
        raise HTTPException(status_code=500, detail="Failed to update application")
    return updated_application


@app.delete("/api/applications/{application_id}")
async def delete_application(application_id: str):
    success = await db.delete_application(application_id)
    if not success:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Application deleted successfully"}


# --- User Profile Endpoints ---

@app.get("/api/profile", response_model=UserProfile)
async def get_profile():
    profile = await db.get_user_profile()
    if not profile:
        # If no profile exists, return a default empty profile structure
        # This prevents 404 and allows frontend to initialize form
        return UserProfile()
    return profile


@app.post("/api/profile", response_model=UserProfile)
async def save_profile(
        profile: str = Form(...),  # Receive profile data as a JSON string
        cv_profile_file: Optional[UploadFile] = File(None)
):
    # Parse the JSON string back into a UserProfile Pydantic model
    try:
        profile_data = json.loads(profile)
        user_profile = UserProfile(**profile_data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format for profile data.")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error parsing profile data: {e}")

    cv_file_path = user_profile.cv_profile_file  # Preserve existing path if not updated
    if cv_profile_file:
        file_location = os.path.join(UPLOAD_DIR, cv_profile_file.filename)
        with open(file_location, "wb+") as file_object: # Changed to 'wb+' for binary write
            file_object.write(await cv_profile_file.read()) # Use await for async file read
        cv_file_path = file_location
    user_profile.cv_profile_file = cv_file_path  # Update the Pydantic model

    saved_profile = await db.save_user_profile(user_profile)
    if not saved_profile:
        raise HTTPException(status_code=500, detail="Failed to save profile")
    return saved_profile


# --- Interview Endpoints ---

@app.get("/api/interviews", response_model=List[Interview])
async def get_interviews(year: Optional[int] = None, month: Optional[int] = None):
    return await db.get_interviews_by_month(year, month)


@app.get("/api/interviews/{interview_id}", response_model=Interview)
async def get_interview(interview_id: str):
    interview = await db.get_interview(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@app.post("/api/interviews", response_model=Interview)
async def create_interview(interview: Interview):
    try:
        new_interview = await db.add_interview(interview)
        return new_interview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/interviews/{interview_id}", response_model=Interview)
async def update_interview(interview_id: str, interview: Interview):
    try:
        updated_interview = await db.update_interview(interview_id, interview)
        if not updated_interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        return updated_interview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/interviews/{interview_id}")
async def delete_interview(interview_id: str):
    success = await db.delete_interview(interview_id)
    if not success:
        raise HTTPException(status_code=404, detail="Interview not found")
    return {"message": "Interview deleted successfully"}


# --- AI Service Endpoints ---

# Pydantic models for AI service request bodies
class AIAssessmentRequest(BaseModel):
    job_description: str
    profile: UserProfile
    ai_provider: AIProvider
    api_key: str

class AIRequestWithChatHistory(BaseModel):
    job_title: str
    profile: UserProfile
    chat_history: List[Dict[str, Any]]
    ai_provider: AIProvider
    api_key: str

class AICandidateInfoRequest(BaseModel):
    candidate_info: str
    ai_provider: AIProvider
    api_key: str

class AICompanyResearchRequest(BaseModel):
    company_url: str
    ai_provider: AIProvider
    api_key: str


@app.post("/api/ai/estimate-chance")
async def estimate_job_chance_api(request: AIAssessmentRequest = Body(...)):
    try:
        result = await ai_service.estimate_job_chance(
            request.job_description, request.profile, request.ai_provider, request.api_key
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/tune-cv")
async def tune_cv_api(request: AIAssessmentRequest = Body(...)):
    try:
        result = await ai_service.tune_cv(
            request.job_description, request.profile, request.ai_provider, request.api_key
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/cover-letter")
async def generate_cover_letter_api(request: AIAssessmentRequest = Body(...)):
    try:
        result = await ai_service.generate_cover_letter(
            request.job_description, request.profile, request.ai_provider, request.api_key
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/interview-qa")
async def interview_qa_chat_api(request: AIRequestWithChatHistory = Body(...)):
    try:
        response = await ai_service.interview_qa_chat(
            request.job_title, request.profile, request.chat_history, request.ai_provider, request.api_key
        )
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/skill-extractor")
async def extract_job_skills_api(request: AIAssessmentRequest = Body(...)):
    try:
        result = await ai_service.extract_job_skills(
            request.job_description, request.profile, request.ai_provider, request.api_key
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/craft-interview-questions")
async def craft_interview_questions_api(request: AICandidateInfoRequest = Body(...)):
    try:
        result = await ai_service.craft_interview_questions(
            request.candidate_info, request.ai_provider, request.api_key
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/company-research")
async def research_company_website_api(request: AICompanyResearchRequest = Body(...)):
    try:
        result = await ai_service.research_company_website(
            request.company_url, request.ai_provider, request.api_key
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/about-me-answer")
async def generate_about_me_answer_api(request: AIAssessmentRequest = Body(...)):
    try:
        result = await ai_service.generate_about_me_answer(
            request.job_description, request.profile, request.ai_provider, request.api_key
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/profile/fill-from-resume-ai")
async def fill_profile_from_resume_ai(
        resume_file: UploadFile = File(...), ai_provider: AIProvider = Form(...), api_key: str = Form(...)
):
    if not resume_file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported for resume upload.")

    pdf_content = await resume_file.read()
    try:
        # Pass raw bytes to the AI service
        extracted_profile_data = await ai_service.extract_profile_from_resume_pdf(pdf_content, ai_provider, api_key)

        # Convert the dictionary to a UserProfile model for validation and consistency
        extracted_profile = UserProfile(**extracted_profile_data)

        # Save the extracted profile to the database
        saved_profile = await db.save_user_profile(extracted_profile)

        if not saved_profile:
            raise HTTPException(status_code=500, detail="Failed to save extracted profile to database.")

        return {"message": "Profile extracted and filled successfully!", "profile": saved_profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI extraction failed: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

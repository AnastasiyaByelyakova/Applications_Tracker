from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from typing import List, Optional
from datetime import datetime, date
import os
import json
from pydantic import ValidationError  # Import ValidationError
from enum import Enum  # Import Enum for ApplicationStatus in main.py if not already there

from database import Database
from models import JobApplication, UserProfile, Interview, ApplicationStatus, AIProvider
from ai_services import AIService
import browsing  # Import the browsing tool

print("FastAPI application starting...")  # ADDED THIS LINE FOR DEBUGGING

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
async def create_application(application: JobApplication):
    try:
        # Ensure application_date is set if not provided by client
        # This check might be redundant if Pydantic's default_factory works,
        # but it acts as a safeguard.
        if application.application_date is None:
            application.application_date = datetime.now()

        # Ensure description, link, cv_file, cover_letter are not None if they are empty strings
        # This can happen if frontend sends empty string for Optional fields
        if application.description == "": application.description = None
        if application.link == "": application.link = None
        if application.cv_file == "": application.cv_file = None
        if application.cover_letter == "": application.cover_letter = None

        new_application = await db.add_application(application)
        if not new_application:
            raise HTTPException(status_code=500, detail="Failed to add application to database.")
        return new_application
    except ValidationError as e:
        print(f"Pydantic Validation Error for create_application: {e.errors()}")
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception as e:
        print(f"Error creating application: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/applications/{application_id}", response_model=JobApplication)
async def update_application(application_id: str, application: JobApplication):
    try:
        # Ensure application_date is set if not provided by client
        if application.application_date is None:
            application.application_date = datetime.now()

        # Ensure description, link, cv_file, cover_letter are not None if they are empty strings
        if application.description == "": application.description = None
        if application.link == "": application.link = None
        if application.cv_file == "": application.cv_file = None
        if application.cover_letter == "": application.cover_letter = None

        updated_application = await db.update_application(application_id, application)
        if not updated_application:
            raise HTTPException(status_code=404, detail="Application not found or failed to update")
        return updated_application
    except ValidationError as e:
        print(f"Pydantic Validation Error for update_application (ID: {application_id}): {e.errors()}")
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception as e:
        print(f"Error updating application {application_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/applications/{application_id}")
async def delete_application(application_id: str):
    success = await db.delete_application(application_id)
    if not success:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Application deleted successfully"}


@app.post("/api/upload-cv")
async def upload_cv(file: UploadFile = File(...)):
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    try:
        with open(file_location, "wb+") as file_object:
            file_object.write(await file.read())
        return {"message": "CV uploaded successfully", "path": f"/uploads/{file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload CV: {e}")


# --- User Profile Endpoints ---

@app.get("/api/profile", response_model=UserProfile)
async def get_profile():
    profile = await db.get_user_profile()
    if not profile:
        # Return a default empty profile if none exists
        return UserProfile()
    return profile


@app.post("/api/profile", response_model=UserProfile)
async def save_profile(profile: UserProfile):
    try:
        saved_profile = await db.save_user_profile(profile)
        if not saved_profile:
            raise HTTPException(status_code=500, detail="Failed to save profile.")
        return saved_profile
    except ValidationError as e:
        print(f"Pydantic Validation Error for save_profile: {e.errors()}")
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception as e:
        print(f"Error saving profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/profile/upload-cv")
async def upload_profile_cv(file: UploadFile = File(...)):
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    try:
        with open(file_location, "wb+") as file_object:
            file_object.write(await file.read())
        return {"message": "Profile CV uploaded successfully", "path": f"/uploads/{file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload profile CV: {e}")


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
        if not new_interview:
            raise HTTPException(status_code=500, detail="Failed to add interview to database.")
        return new_interview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))  # For overlap errors
    except ValidationError as e:
        print(f"Pydantic Validation Error for create_interview: {e.errors()}")
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception as e:
        print(f"Error creating interview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/interviews/{interview_id}", response_model=Interview)
async def update_interview(interview_id: str, interview: Interview):
    try:
        updated_interview = await db.update_interview(interview_id, interview)
        if not updated_interview:
            raise HTTPException(status_code=404, detail="Interview not found or failed to update")
        return updated_interview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))  # For overlap errors
    except ValidationError as e:
        print(f"Pydantic Validation Error for update_interview (ID: {interview_id}): {e.errors()}")
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception as e:
        print(f"Error updating interview {interview_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/interviews/{interview_id}")
async def delete_interview(interview_id: str):
    success = await db.delete_interview(interview_id)
    if not success:
        raise HTTPException(status_code=404, detail="Interview not found")
    return {"message": "Interview deleted successfully"}


# --- AI Service Endpoints ---

@app.post("/api/ai/estimate-chance")
async def estimate_chance_ai(job_description: str = Form(...), profile: str = Form(...),
                             ai_provider: AIProvider = Form(...), api_key: str = Form(...)):
    try:
        # Parse the profile string back to a UserProfile object
        profile_obj = UserProfile.parse_raw(profile)
        result = await ai_service.estimate_job_chance(job_description, profile_obj, ai_provider, api_key)
        return {"result": result}
    except ValidationError as e:
        print(f"Pydantic Validation Error for estimate_chance_ai: {e.errors()}")
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/tune-cv")
async def tune_cv_ai(job_description: str = Form(...), profile: str = Form(...), ai_provider: AIProvider = Form(...),
                     api_key: str = Form(...)):
    try:
        profile_obj = UserProfile.parse_raw(profile)
        result = await ai_service.tune_cv(job_description, profile_obj, ai_provider, api_key)
        return {"result": result}
    except ValidationError as e:
        print(f"Pydantic Validation Error for tune_cv_ai: {e.errors()}")
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/generate-cover-letter")
async def generate_cover_letter_ai(job_description: str = Form(...), profile: str = Form(...),
                                   ai_provider: AIProvider = Form(...), api_key: str = Form(...)):
    try:
        profile_obj = UserProfile.parse_raw(profile)
        result = await ai_service.generate_cover_letter(job_description, profile_obj, ai_provider, api_key)
        return {"result": result}
    except ValidationError as e:
        print(f"Pydantic Validation Error for generate_cover_letter_ai: {e.errors()}")
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/interview-qa")
async def interview_qa_ai(job_title: str = Form(...), profile: str = Form(...), chat_history: str = Form(...),
                          ai_provider: AIProvider = Form(...), api_key: str = Form(...)):
    try:
        profile_obj = UserProfile.parse_raw(profile)
        chat_history_list = json.loads(chat_history)  # chat_history is a JSON string of list of dicts
        result = await ai_service.interview_qa_chat(job_title, profile_obj, chat_history_list, ai_provider, api_key)
        return {"result": result}
    except ValidationError as e:
        print(f"Pydantic Validation Error for interview_qa_ai: {e.errors()}")
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/extract-skills")
async def extract_skills_ai(job_description: str = Form(...), profile: str = Form(...),
                            ai_provider: AIProvider = Form(...), api_key: str = Form(...)):
    try:
        profile_obj = UserProfile.parse_raw(profile)
        result = await ai_service.extract_job_skills(job_description, profile_obj, ai_provider, api_key)
        return {"result": result}
    except ValidationError as e:
        print(f"Pydantic Validation Error for extract_skills_ai: {e.errors()}")
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/craft-questions")
async def craft_questions_ai(candidate_info: str = Form(...), ai_provider: AIProvider = Form(...),
                             api_key: str = Form(...)):
    try:
        result = await ai_service.craft_interview_questions(candidate_info, ai_provider, api_key)
        return {"result": result}
    except ValidationError as e:
        print(f"Pydantic Validation Error for craft_questions_ai: {e.errors()}")
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/company-research")
async def company_research_ai(company_url: str = Form(...), ai_provider: AIProvider = Form(...),
                              api_key: str = Form(...)):
    try:
        # Use the browsing tool directly from here, as it's a backend operation
        # The AI service will then process the browsed content
        result = await ai_service.research_company_website(company_url, ai_provider, api_key)
        return {"result": result}
    except ValidationError as e:
        print(f"Pydantic Validation Error for company_research_ai: {e.errors()}")
        raise HTTPException(status_code=422, detail=e.errors())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/about-me-answer")
async def generate_about_me_answer_ai(job_description: str = Form(...), profile: str = Form(...),
                                      ai_provider: AIProvider = Form(...), api_key: str = Form(...)):
    try:
        profile_obj = UserProfile.parse_raw(profile)
        result = await ai_service.generate_about_me_answer(job_description, profile_obj, ai_provider, api_key)
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
    uvicorn.run(app, host="127.0.0.1", port=8000)


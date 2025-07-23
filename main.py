from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import uvicorn
from datetime import datetime
from typing import Optional, List
import os
import io  # Import io for BytesIO

from models import JobApplication, UserProfile, AIProvider
from database import Database
from ai_services import AIService

app = FastAPI(title="Job Application Monitor", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database and AI service
db = Database()
ai_service = AIService()

# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount uploads directory for serving CVs and other uploaded files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("static/index.html", "r", encoding="utf-8") as f:  # Add encoding="utf-8"
        return HTMLResponse(content=f.read())


# Job Applications endpoints
@app.get("/api/applications", response_model=List[JobApplication])
async def get_applications():
    # Await the asynchronous function call
    return await db.get_all_applications()


@app.post("/api/applications", response_model=JobApplication)
async def create_application(application: JobApplication):
    return await db.create_application(application)


@app.put("/api/applications/{app_id}")
async def update_application(app_id: str, application: JobApplication):
    # Ensure application_date is a datetime object if it comes as string
    if isinstance(application.application_date, str):
        application.application_date = datetime.fromisoformat(application.application_date)
    return await db.update_application(app_id, application)


@app.delete("/api/applications/{app_id}")
async def delete_application(app_id: str):
    return await db.delete_application(app_id)


# User Profile endpoints
@app.get("/api/profile")
async def get_profile():
    profile = await db.get_profile()
    if not profile:
        return {}
    return profile


@app.post("/api/profile")
async def save_profile(profile: UserProfile):  # Add type hint for profile
    return await db.save_profile(profile.dict())


# AI Services endpoints
@app.post("/api/estimate-chance")
async def estimate_job_chance(
        job_description: str = Form(...),
        ai_provider: AIProvider = Form(...),  # Use AIProvider enum
        api_key: str = Form(...)
):
    try:
        profile = await db.get_profile()
        if not profile:
            raise HTTPException(status_code=400,
                                detail="Profile not found. Please complete your profile first.")

        result = await ai_service.estimate_job_chance(
            job_description, UserProfile(**profile), ai_provider, api_key  # Pass UserProfile object
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tune-cv")
async def tune_cv(
        job_description: str = Form(...),
        ai_provider: AIProvider = Form(...),  # Use AIProvider enum
        api_key: str = Form(...)
):
    try:
        profile = await db.get_profile()
        if not profile:
            raise HTTPException(status_code=400, detail="Profile not found. Please complete your profile first.")

        result = await ai_service.tune_cv(
            job_description, UserProfile(**profile), ai_provider, api_key  # Pass UserProfile object
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# File upload endpoint for individual job applications
@app.post("/api/upload-cv")
async def upload_cv(file: UploadFile = File(...)):
    try:
        # Save file to uploads directory
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        return {"filename": file.filename, "path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# New File upload endpoint for user profile CV
@app.post("/api/profile/upload-cv")
async def upload_profile_cv(file: UploadFile = File(...)):
    try:
        # Save file to uploads directory
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        return {"filename": file.filename, "path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/profile/fill-from-resume-ai")
async def fill_profile_from_resume_ai(
        resume_file: UploadFile = File(...),
        ai_provider: AIProvider = Form(...),
        api_key: str = Form(...)
):
    try:
        # Read the content of the uploaded PDF file
        pdf_content = await resume_file.read()

        # Call the AI service to extract profile data from the resume
        extracted_profile = await ai_service.extract_profile_from_resume_pdf(
            pdf_content=pdf_content,
            ai_provider=ai_provider,
            api_key=api_key
        )

        # Save the extracted profile to the database
        saved_profile = await db.save_profile(extracted_profile)

        return {"message": "Profile filled successfully from resume", "profile": saved_profile}

    except Exception as e:
        print(f"Error in fill_profile_from_resume_ai: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fill profile from resume: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

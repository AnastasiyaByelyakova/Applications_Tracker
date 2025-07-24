from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import uvicorn
from datetime import datetime
from typing import Optional, List

import os
import io  # Import io for BytesIO

from models import JobApplication, UserProfile, AIProvider, Interview
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
    with open("static/index.html", "r", encoding='utf-8') as f:
        return HTMLResponse(content=f.read())


# Job Applications endpoints
@app.get("/api/applications", response_model=List[JobApplication])
async def get_applications():
    return await db.get_all_applications()


@app.get("/api/applications/{application_id}", response_model=JobApplication)
async def get_single_application(application_id: str):
    app = await db.get_application_by_id(application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@app.post("/api/applications", response_model=JobApplication)
async def create_application(application: JobApplication):
    return await db.create_application(application)


@app.put("/api/applications/{application_id}", response_model=JobApplication)
async def update_application(application_id: str, application: JobApplication):
    updated_app = await db.update_application(application_id, application)
    if not updated_app:
        raise HTTPException(status_code=404, detail="Application not found")
    return updated_app


@app.delete("/api/applications/{application_id}")
async def delete_application(application_id: str):
    if not await db.delete_application(application_id):
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Application deleted successfully"}


@app.post("/api/upload-cv")
async def upload_cv(file: UploadFile = File(...)):
    try:
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        return {"filename": file.filename, "path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload CV: {e}")


# User Profile endpoints
@app.get("/api/profile", response_model=UserProfile)
async def get_profile():
    profile = await db.get_profile()
    if not profile:
        # Return an empty profile structure if none exists
        return UserProfile()
    return profile


@app.post("/api/profile", response_model=UserProfile)
async def save_profile(profile: UserProfile):
    # Pass the Pydantic model directly to save_profile
    return await db.save_profile(profile.model_dump())


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
        # Return a 400 Bad Request for validation errors or 500 for others
        if "overlaps" in str(e):  # This is a placeholder for more specific error handling
            raise HTTPException(status_code=400, detail=f"Validation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fill profile from resume: {e}")


# AI Tools Endpoints (Keep existing)
@app.post("/api/estimate-chance")
async def estimate_chance(
        job_description: str = Form(...),
        ai_provider: AIProvider = Form(...),
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
        raise HTTPException(status_code=500, detail=f"AI Service Error: {e}")


@app.post("/api/tune-cv")
async def tune_cv(
        job_description: str = Form(...),
        ai_provider: AIProvider = Form(...),
        api_key: str = Form(...)
):
    try:
        # The AI Service needs the latest profile to tune the CV
        user_profile = await db.get_profile()
        if not user_profile:
            raise HTTPException(status_code=404, detail="User profile not found. Please fill your profile first.")

        result = await ai_service.tune_cv(job_description, user_profile, ai_provider,
                                          api_key)  # Changed from tune_cv_for_job
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Service Error: {e}")


# Interview Endpoints
@app.get("/api/interviews", response_model=List[Interview])
async def get_interviews(
        year: Optional[int] = Query(None, description="Filter interviews by year"),
        month: Optional[int] = Query(None, description="Filter interviews by month (1-12)")
):
    return await db.get_all_interviews(year=year, month=month)


@app.get("/api/interviews/{interview_id}", response_model=Interview)
async def get_single_interview(interview_id: str):
    interview = await db.get_interview_by_id(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@app.post("/api/interviews", response_model=Interview)
async def create_interview(interview: Interview):
    try:
        # job_application_id is removed from the Interview model
        return await db.create_interview(interview)
    except ValueError as e:  # Catch overlap error from database
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create interview: {e}")


@app.put("/api/interviews/{interview_id}", response_model=Interview)
async def update_interview(interview_id: str, interview: Interview):
    try:
        # job_application_id is removed from the Interview model
        updated_interview = await db.update_interview(interview_id, interview)
        if not updated_interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        return updated_interview
    except ValueError as e:  # Catch overlap error from database
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update interview: {e}")


@app.delete("/api/interviews/{interview_id}")
async def delete_interview(interview_id: str):
    if not await db.delete_interview(interview_id):
        raise HTTPException(status_code=404, detail="Interview not found")
    return {"message": "Interview deleted successfully"}


# Global startup/shutdown events
@app.on_event("startup")
async def startup_event():
    try:
        await db.connect()
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to connect to database on startup: {e}")
        # Optionally, you might want to raise the exception or exit the app
        # For now, we'll just log it and let the app continue, but API calls will fail.


@app.on_event("shutdown")
async def shutdown_event():
    await db.close()


if __name__ == "__main__":
    try:
        uvicorn.run(app, host="0.0.0.0", port=8000)
    except Exception as e:
        print(f"CRITICAL ERROR: FastAPI application failed to start or crashed: {e}")


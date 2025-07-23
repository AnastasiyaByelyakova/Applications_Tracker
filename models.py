from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ApplicationStatus(str, Enum):
    APPLIED = "Applied"
    INTERVIEW = "Interview"
    REJECTION = "Rejection"
    OFFER = "Offer"

class AIProvider(str, Enum):
    OPENAI = "openai"
    GEMINI = "gemini"
    CLAUDE = "claude"

class JobApplication(BaseModel):
    id: Optional[str] = None
    job_title: str
    company: str
    description: str
    link: str
    application_date: datetime = Field(default_factory=datetime.now)
    status: ApplicationStatus = ApplicationStatus.APPLIED
    cv_file: Optional[str] = None
    cover_letter: Optional[str] = None
    
    class Config:
        use_enum_values = True

class Education(BaseModel):
    degree: str
    institution: str
    graduation_year: int
    gpa: Optional[float] = None

class Experience(BaseModel):
    position: str
    company: str
    start_date: str
    end_date: Optional[str] = None
    description: str

class Skill(BaseModel):
    name: str
    level: str  # Beginner, Intermediate, Advanced, Expert

class UserProfile(BaseModel):
    id: Optional[str] = None
    full_name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    summary: str = ""
    education: List[Education] = []
    experience: List[Experience] = []
    skills: List[Skill] = []
    languages: List[str] = []
    certifications: List[str] = []
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    cv_profile_file: Optional[str] = None  # CV file for the profile
    
    class Config:
        use_enum_values = True

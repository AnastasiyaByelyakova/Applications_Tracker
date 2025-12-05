from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
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
    description: Optional[str] = None
    link: Optional[str] = None
    application_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: ApplicationStatus = ApplicationStatus.APPLIED
    cv_file: Optional[str] = None
    cover_letter: Optional[str] = None
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    level: str


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
    cv_profile_file: Optional[str] = None


class Interview(BaseModel):
    id: Optional[str] = None
    interview_title: str
    start_datetime: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_datetime: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    location: Optional[str] = None
    notes: Optional[str] = None
    interview_type: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }
        from_attributes = True

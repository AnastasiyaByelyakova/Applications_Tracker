import asyncpg
from typing import List, Optional, Dict, Any
import json
from datetime import datetime
from pydantic import BaseModel

from models import JobApplication, UserProfile, Education, Experience, Skill, ApplicationStatus


class Database:
    def __init__(self):
        # Database connection details - replace with your PostgreSQL credentials
        # For local development, you might use default 'postgres' user and no password
        self.db_url = "postgresql://postgres:3141@localhost:5432/applications_tracker"
        self.pool = None

    async def connect(self):
        """Establishes a connection pool to the PostgreSQL database."""
        try:
            self.pool = await asyncpg.create_pool(self.db_url)
            print("Connected to PostgreSQL database successfully.")
            await self._create_tables()
            print("Ensured tables exist.")
        except Exception as e:
            print(f"Error connecting to PostgreSQL: {e}")
            raise

    async def close(self):
        """Closes the PostgreSQL database connection pool."""
        if self.pool:
            await self.pool.close()
            print("PostgreSQL connection pool closed.")

    async def _execute(self, query: str, *args):
        """Helper to execute a database query (insert, update, delete)."""
        async with self.pool.acquire() as conn:
            await conn.execute(query, *args)

    async def _fetch_one(self, query: str, *args) -> Optional[Dict[str, Any]]:
        """Helper to fetch one row from the database and convert 'id' to string."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, *args)
            if row:
                record = dict(row)
                # Convert 'id' to string if it exists and is an integer
                if 'id' in record and isinstance(record['id'], int):
                    record['id'] = str(record['id'])
                return record
            return None

    async def _fetch_all(self, query: str, *args) -> List[Dict[str, Any]]:
        """Helper to fetch all rows from the database and convert 'id' to string."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, *args)
            result = []
            for row in rows:
                record = dict(row)
                # Convert 'id' to string if it exists and is an integer
                if 'id' in record and isinstance(record['id'], int):
                    record['id'] = str(record['id'])
                result.append(record)
            return result

    async def _create_tables(self):
        """Creates necessary tables if they don't exist."""
        async with self.pool.acquire() as conn:
            # Applications table
            await conn.execute("""
                               CREATE TABLE IF NOT EXISTS applications
                               (
                                   id
                                   SERIAL
                                   PRIMARY
                                   KEY,
                                   job_title
                                   TEXT
                                   NOT
                                   NULL,
                                   company
                                   TEXT
                                   NOT
                                   NULL,
                                   description
                                   TEXT,
                                   link
                                   TEXT,
                                   application_date
                                   TIMESTAMP
                                   NOT
                                   NULL,
                                   status
                                   TEXT
                                   NOT
                                   NULL,
                                   cv_file
                                   TEXT,
                                   cover_letter
                                   TEXT
                               );
                               """)
            # User profile table (assuming a single row for the user profile)
            await conn.execute("""
                               CREATE TABLE IF NOT EXISTS user_profile
                               (
                                   id
                                   SERIAL
                                   PRIMARY
                                   KEY,
                                   full_name
                                   TEXT,
                                   email
                                   TEXT,
                                   phone
                                   TEXT,
                                   location
                                   TEXT,
                                   summary
                                   TEXT,
                                   education
                                   JSONB,
                                   experience
                                   JSONB,
                                   skills
                                   JSONB,
                                   languages
                                   JSONB,
                                   certifications
                                   JSONB,
                                   linkedin_url
                                   TEXT,
                                   github_url
                                   TEXT,
                                   portfolio_url
                                   TEXT,
                                   cv_profile_file
                                   TEXT
                               );
                               """)

    # Job Application methods
    async def get_all_applications(self) -> List[JobApplication]:
        """Retrieves all job applications."""
        records = await self._fetch_all("SELECT * FROM applications ORDER BY application_date DESC;")
        return [JobApplication(**record) for record in records]

    async def create_application(self, application: JobApplication) -> JobApplication:
        """Creates a new job application."""
        query = """
                INSERT INTO applications (job_title, company, description, link, application_date, status, cv_file, \
                                          cover_letter)
                VALUES ($1, $2, $3, $4, $5, $6, $7, \
                        $8) RETURNING id, job_title, company, description, link, application_date, status, cv_file, cover_letter; \
                """
        record = await self._fetch_one(
            query,
            application.job_title,
            application.company,
            application.description,
            application.link,
            application.application_date,
            application.status,
            application.cv_file,
            application.cover_letter
        )
        return JobApplication(**record)

    async def update_application(self, app_id: str, application: JobApplication) -> Optional[JobApplication]:
        """Updates an existing job application."""
        query = """
                UPDATE applications
                SET job_title        = $1, \
                    company          = $2, \
                    description      = $3, \
                    link             = $4, \
                    application_date = $5, \
                    status           = $6, \
                    cv_file          = $7, \
                    cover_letter     = $8
                WHERE id = $9 RETURNING id, job_title, company, description, link, application_date, status, cv_file, cover_letter; \
                """
        record = await self._fetch_one(
            query,
            application.job_title,
            application.company,
            application.description,
            application.link,
            application.application_date,
            application.status,
            application.cv_file,
            application.cover_letter,
            int(app_id)  # Convert app_id to int for primary key lookup
        )
        return JobApplication(**record) if record else None

    async def delete_application(self, app_id: str) -> bool:
        """Deletes a job application."""
        # asyncpg's execute returns None for successful DELETE, so just return True
        await self._execute("DELETE FROM applications WHERE id = $1;", int(app_id))
        return True

    # User Profile methods
    async def get_profile(self) -> Optional[UserProfile]:
        """Retrieves the single user profile."""
        # Assuming there's only one profile, we'll always query for the first one
        record = await self._fetch_one("SELECT * FROM user_profile LIMIT 1;")
        if record:
            # Deserialize JSONB fields back to Python lists/dicts
            record['education'] = json.loads(record['education']) if record['education'] else []
            record['experience'] = json.loads(record['experience']) if record['experience'] else []
            record['skills'] = json.loads(record['skills']) if record['skills'] else []
            record['languages'] = json.loads(record['languages']) if record['languages'] else []
            record['certifications'] = json.loads(record['certifications']) if record['certifications'] else []
            return UserProfile(**record)
        return None

    async def save_profile(self, profile_data: Dict[str, Any]) -> UserProfile:
        """Saves (creates or updates) the single user profile."""
        # Serialize lists of Pydantic models to JSON strings for JSONB storage
        profile_data['education'] = json.dumps(profile_data.get('education', []))
        profile_data['experience'] = json.dumps(profile_data.get('experience', []))
        profile_data['skills'] = json.dumps(profile_data.get('skills', []))
        profile_data['languages'] = json.dumps(profile_data.get('languages', []))
        profile_data['certifications'] = json.dumps(profile_data.get('certifications', []))

        existing_profile = await self._fetch_one("SELECT id FROM user_profile LIMIT 1;")

        if existing_profile:
            # Update existing profile
            query = """
                    UPDATE user_profile
                    SET full_name       = $1, \
                        email           = $2, \
                        phone           = $3, \
                        location        = $4, \
                        summary         = $5,
                        education       = $6, \
                        experience      = $7, \
                        skills          = $8, \
                        languages       = $9, \
                        certifications  = $10,
                        linkedin_url    = $11, \
                        github_url      = $12, \
                        portfolio_url   = $13, \
                        cv_profile_file = $14
                    WHERE id = $15 RETURNING *; \
                    """
            record = await self._fetch_one(
                query,
                profile_data.get('full_name'),
                profile_data.get('email'),
                profile_data.get('phone'),
                profile_data.get('location'),
                profile_data.get('summary'),
                profile_data.get('education'),
                profile_data.get('experience'),
                profile_data.get('skills'),
                profile_data.get('languages'),
                profile_data.get('certifications'),
                profile_data.get('linkedin_url'),
                profile_data.get('github_url'),
                profile_data.get('portfolio_url'),
                profile_data.get('cv_profile_file'),
                int(existing_profile['id'])  # Ensure ID is int for WHERE clause
            )
        else:
            # Create new profile
            query = """
                    INSERT INTO user_profile (full_name, email, phone, location, summary,
                                              education, experience, skills, languages, certifications,
                                              linkedin_url, github_url, portfolio_url, cv_profile_file)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *; \
                    """
            record = await self._fetch_one(
                query,
                profile_data.get('full_name'),
                profile_data.get('email'),
                profile_data.get('phone'),
                profile_data.get('location'),
                profile_data.get('summary'),
                profile_data.get('education'),
                profile_data.get('experience'),
                profile_data.get('skills'),
                profile_data.get('languages'),
                profile_data.get('certifications'),
                profile_data.get('linkedin_url'),
                profile_data.get('github_url'),
                profile_data.get('portfolio_url'),
                profile_data.get('cv_profile_file')
            )

        if record:
            # Deserialize JSONB fields back to Python lists/dicts before returning
            record['education'] = json.loads(record['education']) if record['education'] else []
            record['experience'] = json.loads(record['experience']) if record['experience'] else []
            record['skills'] = json.loads(record['skills']) if record['skills'] else []
            record['languages'] = json.loads(record['languages']) if record['languages'] else []
            record['certifications'] = json.loads(record['certifications']) if record['certifications'] else []
            return UserProfile(**record)
        raise Exception("Failed to save profile.")

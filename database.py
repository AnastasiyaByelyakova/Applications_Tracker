import asyncpg
from typing import List, Optional, Dict, Any
import json
from datetime import datetime
from pydantic import BaseModel

from models import JobApplication, UserProfile, Education, Experience, Skill, ApplicationStatus, Interview


class Database:
    def __init__(self):
        # Database connection details - replace with your PostgreSQL credentials
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
        """Helper to fetch a single record from the database."""
        async with self.pool.acquire() as conn:
            record = await conn.fetchrow(query, *args)
            return dict(record) if record else None

    async def _fetch_all(self, query: str, *args) -> List[Dict[str, Any]]:
        """Helper to fetch multiple records from the database."""
        async with self.pool.acquire() as conn:
            records = await conn.fetch(query, *args)
            return [dict(record) for record in records]

    async def _create_tables(self):
        """Creates necessary tables if they don't exist."""
        await self._execute("""
                            CREATE TABLE IF NOT EXISTS job_applications
                            (
                                id
                                SERIAL
                                PRIMARY
                                KEY,
                                job_title
                                VARCHAR
                            (
                                255
                            ) NOT NULL,
                                company VARCHAR
                            (
                                255
                            ) NOT NULL,
                                description TEXT,
                                link TEXT,
                                application_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                                                               status VARCHAR (50) DEFAULT 'Applied',
                                cv_file TEXT,
                                cover_letter TEXT
                                );
                            """)
        # Drop and recreate user_profiles table to ensure all columns are present
        await self._execute("DROP TABLE IF EXISTS user_profiles CASCADE;")
        await self._execute("""
                            CREATE TABLE IF NOT EXISTS user_profiles
                            (
                                id
                                SERIAL
                                PRIMARY
                                KEY,
                                full_name
                                VARCHAR
                            (
                                255
                            ),
                                email VARCHAR
                            (
                                255
                            ),
                                phone VARCHAR
                            (
                                50
                            ),
                                location VARCHAR
                            (
                                255
                            ),
                                summary TEXT,
                                education JSONB DEFAULT '[]'::jsonb,
                                experience JSONB DEFAULT '[]'::jsonb,
                                skills JSONB DEFAULT '[]'::jsonb,
                                languages JSONB DEFAULT '[]'::jsonb,
                                certifications JSONB DEFAULT '[]'::jsonb,
                                linkedin_url TEXT,
                                github_url TEXT,
                                portfolio_url TEXT,
                                cv_profile_file TEXT
                                );
                            """)
        await self._execute("""
                            CREATE TABLE IF NOT EXISTS interviews
                            (
                                id
                                SERIAL
                                PRIMARY
                                KEY,
                                interview_title
                                VARCHAR
                            (
                                255
                            ) NOT NULL,
                                start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
                                end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
                                                           location VARCHAR (255),
                                notes TEXT,
                                interview_type VARCHAR
                            (
                                100
                            )
                                );
                            """)

    # --- Job Application CRUD Operations ---

    async def get_all_applications(self) -> List[JobApplication]:
        """Retrieves all job applications from the database."""
        query = "SELECT id, job_title, company, description, link, application_date, status, cv_file, cover_letter FROM job_applications;"
        records = await self._fetch_all(query)
        # Convert ID to string for Pydantic model
        for record in records:
            if 'id' in record and record['id'] is not None:
                record['id'] = str(record['id'])
        return [JobApplication(**record) for record in records]

    async def get_application(self, application_id: str) -> Optional[JobApplication]:
        """Retrieves a single job application by its ID."""
        query = "SELECT id, job_title, company, description, link, application_date, status, cv_file, cover_letter FROM job_applications WHERE id = $1;"
        record = await self._fetch_one(query, int(application_id))
        if record and 'id' in record and record['id'] is not None:
            record['id'] = str(record['id'])
        return JobApplication(**record) if record else None

    async def add_application(self, application: JobApplication) -> Optional[JobApplication]:
        """Adds a new job application to the database."""
        query = """
                INSERT INTO job_applications (job_title, company, description, link, application_date, status, cv_file, \
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
        if record and 'id' in record and record['id'] is not None:
            record['id'] = str(record['id'])
        return JobApplication(**record) if record else None

    async def update_application(self, application_id: str, application: JobApplication) -> Optional[JobApplication]:
        """Updates an existing job application."""
        query = """
                UPDATE job_applications
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
            int(application_id)
        )
        if record and 'id' in record and record['id'] is not None:
            record['id'] = str(record['id'])
        return JobApplication(**record) if record else None

    async def delete_application(self, application_id: str) -> bool:
        """Deletes a job application."""
        await self._execute("DELETE FROM job_applications WHERE id = $1;", int(application_id))
        return True

    # --- User Profile CRUD Operations ---

    async def get_user_profile(self) -> Optional[UserProfile]:
        """Retrieves the user profile. Assumes only one profile for simplicity."""
        query = """
                SELECT id, \
                       full_name, \
                       email, \
                       phone, \
                       location, \
                       summary,
                       education, \
                       experience, \
                       skills, \
                       languages, \
                       certifications,
                       linkedin_url, \
                       github_url, \
                       portfolio_url, \
                       cv_profile_file
                FROM user_profiles LIMIT 1; \
                """
        record = await self._fetch_one(query)
        if record:
            # Convert ID to string for Pydantic model
            if 'id' in record and record['id'] is not None:
                record['id'] = str(record['id'])
            # Deserialize JSONB fields back to Python objects
            record['education'] = json.loads(record['education']) if isinstance(record['education'], str) else record[
                'education']
            record['experience'] = json.loads(record['experience']) if isinstance(record['experience'], str) else \
            record['experience']
            record['skills'] = json.loads(record['skills']) if isinstance(record['skills'], str) else record['skills']
            record['languages'] = json.loads(record['languages']) if isinstance(record['languages'], str) else record[
                'languages']
            record['certifications'] = json.loads(record['certifications']) if isinstance(record['certifications'],
                                                                                          str) else record[
                'certifications']
            return UserProfile(**record)
        return None

    async def save_user_profile(self, profile: UserProfile) -> Optional[UserProfile]:
        """Saves or updates the user profile."""
        # Check if a profile already exists
        existing_profile = await self.get_user_profile()

        # Serialize list fields to JSON strings for storage
        education_json = json.dumps([edu.dict() for edu in profile.education])
        experience_json = json.dumps([exp.dict() for exp in profile.experience])
        skills_json = json.dumps([skill.dict() for skill in profile.skills])
        languages_json = json.dumps(profile.languages)
        certifications_json = json.dumps(profile.certifications)

        if existing_profile and existing_profile.id:
            # Update existing profile
            query = """
                    UPDATE user_profiles
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
                    WHERE id = $15 RETURNING id, full_name, email, phone, location, summary, education, experience, skills, languages, certifications, linkedin_url, github_url, portfolio_url, cv_profile_file; \
                    """
            record = await self._fetch_one(
                query,
                profile.full_name, profile.email, profile.phone, profile.location, profile.summary,
                education_json, experience_json, skills_json, languages_json, certifications_json,
                profile.linkedin_url, profile.github_url, profile.portfolio_url, profile.cv_profile_file,
                int(existing_profile.id)  # Ensure ID is int for DB operation
            )
        else:
            # Insert new profile
            query = """
                    INSERT INTO user_profiles (full_name, email, phone, location, summary, education, experience, \
                                               skills, languages, certifications, linkedin_url, github_url, \
                                               portfolio_url, cv_profile_file)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, \
                            $14) RETURNING id, full_name, email, phone, location, summary, education, experience, skills, languages, certifications, linkedin_url, github_url, portfolio_url, cv_profile_file; \
                    """
            record = await self._fetch_one(
                query,
                profile.full_name, profile.email, profile.phone, profile.location, profile.summary,
                education_json, experience_json, skills_json, languages_json, certifications_json,
                profile.linkedin_url, profile.github_url, profile.portfolio_url, profile.cv_profile_file
            )

        if record:
            # Convert ID to string for Pydantic model before returning
            if 'id' in record and record['id'] is not None:
                record['id'] = str(record['id'])
            # Deserialize JSONB fields back to Python objects before returning
            record['education'] = json.loads(record['education']) if isinstance(record['education'], str) else record[
                'education']
            record['experience'] = json.loads(record['experience']) if isinstance(record['experience'], str) else \
            record['experience']
            record['skills'] = json.loads(record['skills']) if isinstance(record['skills'], str) else record['skills']
            record['languages'] = json.loads(record['languages']) if isinstance(record['languages'], str) else record[
                'languages']
            record['certifications'] = json.loads(record['certifications']) if isinstance(record['certifications'],
                                                                                          str) else record[
                'certifications']
            return UserProfile(**record)
        return None

    # --- Interview CRUD Operations ---

    async def get_interviews_by_month(self, year: Optional[int] = None, month: Optional[int] = None) -> List[Interview]:
        """Retrieves interviews, optionally filtered by year and month."""
        if year and month:
            # Filter for a specific month
            query = """
                    SELECT id, interview_title, start_datetime, end_datetime, location, notes, interview_type
                    FROM interviews
                    WHERE EXTRACT(YEAR FROM start_datetime) = $1 \
                      AND EXTRACT(MONTH FROM start_datetime) = $2
                    ORDER BY start_datetime; \
                    """
            records = await self._fetch_all(query, year, month)
        else:
            # Retrieve all interviews if no filter is provided
            query = """
                    SELECT id, interview_title, start_datetime, end_datetime, location, notes, interview_type
                    FROM interviews \
                    ORDER BY start_datetime; \
                    """
            records = await self._fetch_all(query)
        # Convert ID to string for Pydantic model
        for record in records:
            if 'id' in record and record['id'] is not None:
                record['id'] = str(record['id'])
        return [Interview(**record) for record in records]

    async def get_interview(self, interview_id: str) -> Optional[Interview]:
        """Retrieves a single interview by its ID."""
        query = """
                SELECT id, interview_title, start_datetime, end_datetime, location, notes, interview_type
                FROM interviews \
                WHERE id = $1; \
                """
        record = await self._fetch_one(query, int(interview_id))
        if record and 'id' in record and record['id'] is not None:
            record['id'] = str(record['id'])
        return Interview(**record) if record else None

    async def _check_overlap(self, start_dt: datetime, end_dt: datetime, exclude_id: Optional[int] = None) -> bool:
        """Checks for overlapping interviews."""
        query = """
                SELECT COUNT(*) \
                FROM interviews
                WHERE (start_datetime, end_datetime) OVERLAPS ($1, $2) \
                """
        params = [start_dt, end_dt]
        if exclude_id is not None:
            query += " AND id != $3"
            params.append(exclude_id)

        async with self.pool.acquire() as conn:
            count = await conn.fetchval(query, *params)
        return count > 0

    async def add_interview(self, interview: Interview) -> Optional[Interview]:
        """Adds a new interview, checking for overlaps."""
        if await self._check_overlap(interview.start_datetime, interview.end_datetime):
            raise ValueError("Interview time overlaps with an existing interview.")

        query = """
                INSERT INTO interviews (interview_title, start_datetime, end_datetime, location, notes, interview_type)
                VALUES ($1, $2, $3, $4, $5, \
                        $6) RETURNING id, interview_title, start_datetime, end_datetime, location, notes, interview_type; \
                """
        record = await self._fetch_one(
            query,
            interview.interview_title,
            interview.start_datetime,
            interview.end_datetime,
            interview.location,
            interview.notes,
            interview.interview_type
        )
        if record and 'id' in record and record['id'] is not None:
            record['id'] = str(record['id'])
        return Interview(**record) if record else None

    async def update_interview(self, interview_id: str, interview: Interview) -> Optional[Interview]:
        """Updates an existing interview, checking for overlaps."""
        # Convert interview_id to int for database operations
        int_interview_id = int(interview_id)

        if await self._check_overlap(interview.start_datetime, interview.end_datetime, exclude_id=int_interview_id):
            raise ValueError("Interview time overlaps with an existing interview.")

        query = """
                UPDATE interviews
                SET interview_title = $1,
                    start_datetime  = $2,
                    end_datetime    = $3,
                    location        = $4,
                    notes           = $5,
                    interview_type  = $6
                WHERE id = $7 RETURNING id, interview_title, start_datetime, end_datetime, location, notes, interview_type;
                """
        record = await self._fetch_one(
            query,
            interview.interview_title,
            interview.start_datetime,
            interview.end_datetime,
            interview.location,
            interview.notes,
            interview.interview_type,
            int_interview_id
        )
        if record and 'id' in record and record['id'] is not None:
            record['id'] = str(record['id'])
        return Interview(**record) if record else None

    async def delete_interview(self, interview_id: str) -> bool:
        """Deletes an interview."""
        await self._execute("DELETE FROM interviews WHERE id = $1;", int(interview_id))
        return True

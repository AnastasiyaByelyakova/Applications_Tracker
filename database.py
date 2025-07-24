import asyncpg
from typing import List, Optional, Dict, Any
import json
from datetime import datetime
from pydantic import BaseModel

from models import JobApplication, UserProfile, Education, Experience, Skill, ApplicationStatus, Interview


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
            return await conn.execute(query, *args)  # Return the command tag

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
            # Interviews table - job_application_id removed
            await conn.execute("""
                               CREATE TABLE IF NOT EXISTS interviews
                               (
                                   id
                                   SERIAL
                                   PRIMARY
                                   KEY,
                                   interview_title
                                   TEXT
                                   NOT
                                   NULL,
                                   start_datetime
                                   TIMESTAMP
                                   WITH
                                   TIME
                                   ZONE
                                   NOT
                                   NULL,
                                   end_datetime
                                   TIMESTAMP
                                   WITH
                                   TIME
                                   ZONE
                                   NOT
                                   NULL,
                                   location
                                   TEXT,
                                   notes
                                   TEXT,
                                   interview_type
                                   TEXT
                               );
                               """)

    # Job Application methods (Keep existing)
    async def get_all_applications(self) -> List[JobApplication]:
        """Retrieves all job applications."""
        records = await self._fetch_all("SELECT * FROM applications ORDER BY application_date DESC;")
        return [JobApplication(**record) for record in records]

    async def get_application_by_id(self, app_id: str) -> Optional[JobApplication]:
        """Retrieves a single job application by its ID."""
        record = await self._fetch_one("SELECT * FROM applications WHERE id = $1;", int(app_id))
        return JobApplication(**record) if record else None

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
        try:
            int_app_id = int(app_id)
        except ValueError:
            print(f"Database: Invalid app_id format for deletion: {app_id}")
            return False

        # Execute the delete command and get the command tag
        command_tag = await self._execute("DELETE FROM applications WHERE id = $1;", int_app_id)

        # Parse the command tag to get the number of deleted rows
        # A successful delete will return a tag like 'DELETE 1', 'DELETE 0' if no row found
        deleted_count = 0
        if command_tag and ' ' in command_tag:
            try:
                deleted_count = int(command_tag.split(' ')[1])
            except ValueError:
                print(f"Database: Could not parse deleted count from command tag: '{command_tag}'")

        print(f"Database: DELETE command tag: '{command_tag}', Deleted count: {deleted_count}")
        return deleted_count > 0

    async def get_application(self, app_id: str) -> Optional[JobApplication]:
        """Retrieves a single job application."""
        # This method uses ObjectId from Mongita, which is incorrect for PostgreSQL.
        # It should use integer ID directly. Assuming it's not currently called or will be fixed.
        # For now, I'll update it to use int(app_id) for consistency with other PostgreSQL methods.
        try:
            record = await self._fetch_one("SELECT * FROM applications WHERE id = $1;", int(app_id))
            if record:
                return JobApplication(**record)
        except ValueError:
            print(f"Database: Invalid app_id format for get_application: {app_id}")
        return None

    # User Profile methods (Keep existing)
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
        profile_data['education'] = json.dumps(
            [edu.model_dump() if isinstance(edu, BaseModel) else edu for edu in profile_data.get('education', [])])
        profile_data['experience'] = json.dumps(
            [exp.model_dump() if isinstance(exp, BaseModel) else exp for exp in profile_data.get('experience', [])])
        profile_data['skills'] = json.dumps(
            [skill.model_dump() if isinstance(skill, BaseModel) else skill for skill in profile_data.get('skills', [])])
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

    # Interview methods
    async def get_all_interviews(self, year: Optional[int] = None, month: Optional[int] = None) -> List[Interview]:
        """
        Retrieves all scheduled interviews, optionally filtered by year and month.
        Month is 1-indexed (1 for January, 12 for December).
        """
        query = "SELECT * FROM interviews"
        params = []
        conditions = []

        if year is not None:
            conditions.append("EXTRACT(YEAR FROM start_datetime) = $1")
            params.append(year)
        if month is not None:
            conditions.append("EXTRACT(MONTH FROM start_datetime) = $" + str(len(params) + 1))
            params.append(month)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY start_datetime ASC;"

        records = await self._fetch_all(query, *params)
        return [Interview(**record) for record in records]

    async def get_interview_by_id(self, interview_id: str) -> Optional[Interview]:
        """Retrieves a single interview by its ID."""
        record = await self._fetch_one("SELECT * FROM interviews WHERE id = $1;", int(interview_id))
        return Interview(**record) if record else None

    async def _check_overlap(self, start_dt: datetime, end_dt: datetime, exclude_id: Optional[int] = None) -> bool:
        """Checks if the given time slot overlaps with any existing interviews."""
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

    async def create_interview(self, interview: Interview) -> Interview:
        """Creates a new interview, checking for overlaps."""
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
        return Interview(**record)

    async def update_interview(self, interview_id: str, interview: Interview) -> Optional[Interview]:
        """Updates an existing interview, checking for overlaps."""
        # Convert interview_id to int for database operations
        int_interview_id = int(interview_id)

        if await self._check_overlap(interview.start_datetime, interview.end_datetime, exclude_id=int_interview_id):
            raise ValueError("Interview time overlaps with an existing interview.")

        query = """
                UPDATE interviews
                SET interview_title = $1, \
                    start_datetime  = $2, \
                    end_datetime    = $3, \
                    location        = $4, \
                    notes           = $5, \
                    interview_type  = $6
                WHERE id = $7 RETURNING id, interview_title, start_datetime, end_datetime, location, notes, interview_type; \
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
        return Interview(**record) if record else None

    async def delete_interview(self, interview_id: str) -> bool:
        """Deletes an interview."""
        await self._execute("DELETE FROM interviews WHERE id = $1;", int(interview_id))
        return True


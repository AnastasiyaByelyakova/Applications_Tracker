from mongita import MongitaClientDisk
from typing import List, Optional
import os
from datetime import datetime
from bson import ObjectId
import json # Import json for serialization if needed for non-basic types

from models import JobApplication, UserProfile, Education, Experience, Skill

class Database:

    def __init__(self, db_path: str = "job_tracker_db"):
        """
        Initializes the Mongita database client.
        Data will be stored in files within the specified db_path directory.
        """
        self.client = MongitaClientDisk(db_path)
        self.db = self.client.job_tracker
        self.applications = self.db.applications
        self.profile = self.db.profile # This collection will store the single user profile
        
    def _serialize_doc(self, doc):
        """
        Converts a Mongita document (which might contain ObjectId) to a dictionary
        suitable for Pydantic models by converting ObjectId to string and adding an 'id' field.
        """
        if doc and '_id' in doc:
            doc['id'] = str(doc['_id'])
            del doc['_id']
        return doc
    
    def _prepare_for_storage(self, data: dict):
        """
        Prepares a document for storage by removing the 'id' field,
        as Mongita uses '_id' automatically.
        """
        data_copy = data.copy() # Work on a copy to avoid modifying original Pydantic model dict
        if 'id' in data_copy:
            del data_copy['id']
        return data_copy
    
    # Job Applications methods
    async def get_all_applications(self) -> List[JobApplication]:
        """Retrieves all job applications."""
        docs = list(self.applications.find())
        serialized_docs = [self._serialize_doc(doc) for doc in docs]
        return [JobApplication(**doc) for doc in serialized_docs]
    
    async def create_application(self, application: JobApplication) -> JobApplication:
        """Creates a new job application."""
        app_dict = application.dict()
        app_dict = self._prepare_for_storage(app_dict)
        
        # Convert datetime to string for storage in Mongita
        if isinstance(app_dict.get('application_date'), datetime):
            app_dict['application_date'] = app_dict['application_date'].isoformat()
        
        result = self.applications.insert_one(app_dict)
        app_dict['id'] = str(result.inserted_id) # Add the new ID to the returned dict
        return JobApplication(**app_dict)
    
    async def update_application(self, app_id: str, application: JobApplication) -> Optional[JobApplication]:
        """Updates an existing job application."""
        app_dict = application.dict()
        app_dict = self._prepare_for_storage(app_dict) # Remove 'id' if present

        # Convert datetime to string for storage
        if isinstance(app_dict.get('application_date'), datetime):
            app_dict['application_date'] = app_dict['application_date'].isoformat()

        result = self.applications.update_one(
            {"_id": ObjectId(app_id)},
            {"$set": app_dict}
        )
        if result.modified_count > 0:
            # Fetch the updated document to return the complete object with its ID
            updated_doc = self.applications.find_one({"_id": ObjectId(app_id)})
            return JobApplication(**self._serialize_doc(updated_doc))
        return None
    
    async def delete_application(self, app_id: str) -> bool:
        """Deletes a job application."""
        result = self.applications.delete_one({"_id": ObjectId(app_id)})
        return result.deleted_count > 0
    
    async def get_application(self, app_id: str) -> Optional[JobApplication]:
        """Retrieves a single job application."""
        doc = self.applications.find_one({"_id": ObjectId(app_id)})
        if doc:
            doc = self._serialize_doc(doc)
            return JobApplication(**doc)
        return None
    
    # User Profile methods (assuming a single profile for the local setup)
    async def get_profile(self) -> Optional[UserProfile]:
        """Retrieves the single user profile."""
        doc = self.profile.find_one() # There should only be one profile document
        if doc:
            doc = self._serialize_doc(doc)
            return doc
        return None
    
    async def save_profile(self, profile) :
        """Saves (creates or updates) the single user profile."""
        profile_dict = profile
        profile_dict = self._prepare_for_storage(profile_dict)
        # Check if profile exists
        existing_profile = self.profile.find_one()
        if existing_profile:
            # Update existing profile
            self.profile.update_one(
                {"_id": existing_profile["_id"]}, 
                {"$set": profile_dict}
            )
            profile_dict['id'] = str(existing_profile["_id"]) # Add existing ID for return
        else:
            # Create new profile
            result = self.profile.insert_one(profile_dict)
            profile_dict['id'] = str(result.inserted_id) # Add new ID for return
        print("profile_dict")
        return profile_dict


import openai
import google.generativeai as genai
import anthropic
from typing import Dict, Any, List
import json, re
import base64
import io  # Import io for BytesIO

from models import UserProfile, AIProvider, Education, Experience, Skill


def parse_response_to_json(response,
                           target_type='dict'):
    """
    Converts a string response to JSON format.

    Args:
        response (str): The response to be parsed.
        target_type (str): The format to convert to, either 'list' or 'dict'.

    Returns:
        Any: Parsed JSON data.
    """
    pattern = r'\{.*\}' if target_type == 'dict' else r'\[.*\]'
    json_text = re.findall(pattern, response.replace('\n', ' '), re.DOTALL)[-1]
    json_text = json_text.replace('```json', '').replace('```', '').replace("\'", " ").replace("'", '"').replace("}}",
                                                                                                                 '}')
    json_text = re.sub(r"(\w)'s", r"\1_s", json_text)
    json_text = re.sub(r'(\w)"s', r"\1_s", json_text)
    json_text = json_text.replace("%", '').replace('null', 'None')
    # if not json_text.count('}')%2==0:
    #     json_text+='}'
    json_dict = eval(json_text)
    if target_type == 'dict':
        json_dict = {key: re.sub(r"(\w)_s", r"\1's", str(value)) for key, value in json_dict.items()}
    else:
        if type(json_dict[0]) == dict:
            json_dict = [{key: re.sub(r"(\w)_s", r"\1's", str(value)) for key, value in d.items()} for d in json_dict]
    return json_dict


class AIService:

    def __init__(self):
        # Initialize clients for different AI providers
        self.openai_client = None  # Initialize lazily or with API key
        self.anthropic_client = None  # Initialize lazily or with API key

    def _format_profile_for_ai(self, profile: UserProfile) -> str:
        """Format user profile for AI consumption"""
        profile_text = f"""
        Name: {profile.full_name}
        Email: {profile.email}
        Location: {profile.location}
        Summary: {profile.summary}

        Education:
        """

        for edu in profile.education:
            profile_text += f"- {edu.degree} from {edu.institution} ({edu.graduation_year})\\n"

        profile_text += "\\nExperience:\\n"
        for exp in profile.experience:
            end_date = exp.end_date if exp.end_date else "Present"
            profile_text += f"- {exp.position} at {exp.company} ({exp.start_date} - {end_date})\\n"
            profile_text += f"  {exp.description}\\n"
            # Removed responsibilities from here

        profile_text += "\\nSkills:\\n"
        for skill in profile.skills:
            profile_text += f"- {skill.name} ({skill.level})\\n"

        if profile.languages:
            profile_text += f"\\nLanguages: {', '.join(profile.languages)}\\n"

        if profile.certifications:
            profile_text += f"\\nCertifications: {', '.join(profile.certifications)}\\n"

        if profile.linkedin_url:
            profile_text += f"\\nLinkedIn: {profile.linkedin_url}\\n"
        if profile.github_url:
            profile_text += f"\\nGitHub: {profile.github_url}\\n"
        if profile.portfolio_url:
            profile_text += f"\\nPortfolio: {profile.portfolio_url}\\n"

        return profile_text

    async def _call_ai_provider(self, prompt: str, ai_provider: str, api_key: str,
                                model_args: Dict[str, Any] = None) -> str:
        """Helper to call various AI providers"""
        if model_args is None:
            model_args = {}

        if ai_provider == AIProvider.OPENAI:
            if not self.openai_client:
                openai.api_key = api_key
            try:
                response = await openai.ChatCompletion.acreate(
                    model=model_args.get("model", "gpt-3.5-turbo"),
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=model_args.get("max_tokens", 1000)
                )
                return response.choices[0].message['content']
            except Exception as e:
                raise Exception(f"OpenAI API error: {e}")

        elif ai_provider == AIProvider.GEMINI:
            genai.configure(api_key=api_key)
            try:
                # Changed default model to "gemini-2.0-flash" as requested
                model = genai.GenerativeModel(model_name=model_args.get("model", "gemini-2.0-flash"))
                response = await model.generate_content_async(prompt)
                print(response.text)
                return response.text
            except Exception as e:
                raise Exception(f"Gemini API error: {e}")

        elif ai_provider == AIProvider.CLAUDE:
            if not self.anthropic_client:
                self.anthropic_client = anthropic.AsyncAnthropic(api_key=api_key)
            try:
                response = await self.anthropic_client.messages.create(
                    model=model_args.get("model", "claude-3-opus-20240229"),
                    max_tokens=model_args.get("max_tokens", 1000),
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except Exception as e:
                raise Exception(f"Anthropic Claude API error: {e}")
        else:
            raise ValueError("Unsupported AI provider")

    async def _call_gemini_vision(self, prompt: str, base64_pdf: str, api_key: str) -> str:
        """Helper to call Gemini Vision for PDF processing."""
        genai.configure(api_key=api_key)
        # Gemini Vision expects PDF as inline data with specific mime type
        pdf_part = {
            "mime_type": "application/pdf",
            "data": base64_pdf
        }

        try:
            # Changed default model to "gemini-2.0-flash" for consistency with other Gemini calls
            model = genai.GenerativeModel(model_name="gemini-2.0-flash")
            response = await model.generate_content_async([prompt, pdf_part])
            return response.text
        except Exception as e:
            raise Exception(f"Gemini Vision API error: {e}")

    async def estimate_job_chance(self, job_description: str, profile: UserProfile, ai_provider: AIProvider,
                                  api_key: str) -> str:
        """Estimate job chance based on profile and job description"""
        profile_text = self._format_profile_for_ai(profile)

        prompt = f"""
        Analyze the following candidate profile against the provided job description.
        Candidate Profile:
        {profile_text}

        Job Description:
        {job_description}

        Provide a detailed assessment of the candidate's job application chances, including:
        1. Overall likelihood (e.g., Low, Medium, High, Excellent)
        2. Strengths of the candidate's profile for this job
        3. Weaknesses or gaps in the candidate's profile
        4. Specific recommendations to improve chances
        5. Key skills or experiences to highlight in the application

        Format your response clearly with sections for each point.
        """

        return await self._call_ai_provider(prompt, ai_provider, api_key)

    async def tune_cv(self, job_description: str, profile: UserProfile, ai_provider: AIProvider, api_key: str) -> str:
        """Generate a tuned CV based on job description"""
        profile_text = self._format_profile_for_ai(profile)

        prompt = f"""
        Based on the following candidate profile and job description, please create a tailored CV that maximizes the chances of getting this specific job.

        Candidate Profile:
        {profile_text}

        Job Description:
        {job_description}

        Please provide:
        1. A rewritten professional summary that aligns with the job
        2. Prioritized and reworded experience descriptions that highlight relevant achievements
        3. A skills section ordered by relevance to the job
        4. Suggestions for additional sections (if any) that would strengthen the application
        5. Keywords from the job description that should be incorporated

        Make the CV compelling and specifically targeted to this role while maintaining honesty about the candidate's experience.
        """

        return await self._call_ai_provider(prompt, ai_provider, api_key)

    async def extract_profile_from_resume_pdf(self, pdf_content: bytes, ai_provider: AIProvider, api_key: str) -> dict:
        """
        Extracts user profile information from a PDF resume using AI.
        Returns a dictionary with profile data.
        """
        # Encode PDF content to base64
        base64_pdf = base64.b64encode(pdf_content).decode('utf-8')

        # The prompt for Gemini Vision, asking for structured JSON output
        prompt = """
        You are an expert resume parser. Extract the following information from the provided resume PDF and return it as a JSON object.
        Strictly adhere to the JSON schema provided below. If a field is not found, omit it or set it to an empty string/array, but do NOT
        generate placeholder values.

        JSON Schema:
        {
            "full_name": "string",
            "email": "string",
            "phone": "string",
            "location": "string",
            "summary": "string",
            "education": [
                {
                    "degree": "string",
                    "institution": "string",
                    "graduation_year": "integer",
                    "gpa": "float"
                }
            ],
            "experience": [
                {
                    "position": "string",
                    "company": "string",
                    "start_date": "string (YYYY-MM-DD)",
                    "end_date": "string (YYYY-MM-DD or 'Present')",
                    "description": "string"
                }
            ],
            "skills": [
                {
                    "name": "string",
                    "level": "string (Beginner, Intermediate, Advanced, Expert)"
                }
            ],
            "languages": ["string"],
            "certifications": ["string"],
            "linkedin_url": "string",
            "github_url": "string",
            "portfolio_url": "string"
        }

        Important notes for extraction:
        - For dates, use 'YYYY-MM-DD' format if specific day/month is available, otherwise just 'YYYY'. If 'Present' is indicated, use 'Present'.
        - Experience description should be a single string summarizing key duties and achievements. Do not break it into a list of responsibilities.
        - Skill level should be inferred if possible, otherwise use a default like 'Advanced' for common professional skills or 'Beginner' if very basic.
        - For phone, extract a clean number, e.g., "+15551234567".
        - Ensure all extracted strings are clean and well-formatted.
        - If multiple URLs of the same type (e.g., two LinkedIn profiles), pick the most prominent one.
        - GPA should be a float if available, otherwise omit.
        - Combine all relevant details for "summary" from the resume.

        Extract the profile from the following resume and return ONLY valid JSON:
        """

        try:
            # We explicitly check for Gemini here as per the prompt instructions for PDF.
            if ai_provider == AIProvider.GEMINI:
                response_text = await self._call_gemini_vision(prompt, base64_pdf, api_key)
            else:
                raise ValueError(
                    "Only Gemini is currently supported for 'Fill Profile from Resume' due to its PDF processing capabilities.")

            # Parse the response to JSON
            extracted_data = parse_response_to_json(response_text)

            # Handle the parsing of nested structures safely
            def safe_eval_list(data, key, default=None):
                if default is None:
                    default = []
                try:
                    value = data.get(key, default)
                    if isinstance(value, str):
                        return eval(value) if value else default
                    elif isinstance(value, list):
                        return value
                    else:
                        return default
                except:
                    return default

            extracted_data['experience'] = safe_eval_list(extracted_data, 'experience')
            extracted_data['skills'] = safe_eval_list(extracted_data, 'skills')
            extracted_data['education'] = safe_eval_list(extracted_data, 'education')
            extracted_data['languages'] = safe_eval_list(extracted_data, 'languages')
            extracted_data['certifications'] = safe_eval_list(extracted_data, 'certifications')

            # Post-processing and validation to fit UserProfile model
            if 'experience' in extracted_data:
                for exp in extracted_data['experience']:
                    # Ensure description is a string
                    if isinstance(exp.get('description'), list):
                        exp['description'] = " ".join(exp['description'])
                    exp['description'] = exp.get('description', '')

                    # Remove responsibilities field if it exists
                    if 'responsibilities' in exp:
                        del exp['responsibilities']

            # Ensure skills have level
            if 'skills' in extracted_data:
                for skill in extracted_data['skills']:
                    if 'level' not in skill or not skill.get('level'):
                        skill['level'] = 'Advanced'  # Default if not specified by AI

            # Filter out empty entries in lists that might result from AI not finding data
            extracted_data['education'] = [edu for edu in extracted_data.get('education', [])
                                           if edu.get('degree') and edu.get('institution')]
            extracted_data['experience'] = [exp for exp in extracted_data.get('experience', [])
                                            if exp.get('position') and exp.get('company')]
            extracted_data['skills'] = [skill for skill in extracted_data.get('skills', [])
                                        if skill.get('name')]
            extracted_data['languages'] = [lang for lang in extracted_data.get('languages', []) if lang]
            extracted_data['certifications'] = [cert for cert in extracted_data.get('certifications', []) if cert]

            return extracted_data

        except Exception as e:
            raise Exception(f"Error processing AI resume extraction: {e}")

import openai
import google.generativeai as genai
import anthropic
from typing import Dict, Any, List, Optional
import json, re
import base64
import io  # Import io for BytesIO
from urllib.parse import urlparse

# Import the browsing tool
import browsing

from models import UserProfile, AIProvider, Education, Experience, Skill


def parse_response_to_json(response: str) -> Dict[str, Any]:
    """
    Extracts a JSON string from the AI's response and parses it into a Python dictionary.
    Handles common formatting issues from LLM outputs.
    """
    # 1. Try to find a JSON block (```json ... ```)
    json_match = re.search(r'```json\s*(\{.*\}|\[.*\])\s*```', response, re.DOTALL)
    if json_match:
        json_text = json_match.group(1)
    else:
        # 2. Fallback: Try to find a standalone JSON object or array
        # This regex is more permissive to catch JSON that isn't wrapped in ```json
        json_text_match = re.search(r'(\{.*\}|\[.*\])', response, re.DOTALL)
        if json_text_match:
            json_text = json_text_match.group(0)
        else:
            raise ValueError("No JSON object or array found in the AI response.")

    # 3. Attempt to parse the extracted text as JSON
    try:
        # First, try a direct parse. This is the cleanest if the AI is well-behaved.
        parsed_data = json.loads(json_text)
        return parsed_data
    except json.JSONDecodeError as e:
        print(f"Initial JSON parse failed: {e}. Attempting cleanup...")
        print(f"Problematic JSON text: {json_text}")

        # 4. If direct parse fails, apply common LLM output fixes
        cleaned_json_text = json_text

        # Fix unescaped newlines within strings (replace with actual newline escape)
        # This is a common issue for "unterminated string literal"
        cleaned_json_text = cleaned_json_text.replace('\n', '\\n').replace('\t', '\\t')

        # Replace single quotes with double quotes for string values and keys
        # This regex is more specific to avoid replacing apostrophes within words
        # It targets single quotes that are likely intended as string delimiters
        cleaned_json_text = re.sub(r"(?<!\\)'([^']*)'(?!:)", r'"\1"', cleaned_json_text)  # For values
        cleaned_json_text = re.sub(r"([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:", r'\1"\2":',
                                   cleaned_json_text)  # For unquoted keys

        # Handle trailing commas (common in LLM JSON)
        cleaned_json_text = re.sub(r',(\s*[}\]])', r'\1', cleaned_json_text)

        # Replace Python-style None/True/False with JSON null/true/false
        cleaned_json_text = cleaned_json_text.replace('None', 'null')
        cleaned_json_text = cleaned_json_text.replace('True', 'true')
        cleaned_json_text = cleaned_json_text.replace('False', 'false')

        # Remove any leading/trailing whitespace that might interfere
        cleaned_json_text = cleaned_json_text.strip()

        # Try parsing again with the cleaned text
        try:
            parsed_data = json.loads(cleaned_json_text)
            return parsed_data
        except json.JSONDecodeError as e_cleaned:
            print(f"Cleaned JSON parse failed: {e_cleaned}")
            print(f"Cleaned problematic JSON text: {cleaned_json_text}")
            raise ValueError(f"Failed to parse AI response to JSON after cleanup: {e_cleaned}")
    except Exception as e:
        # Catch any other unexpected errors during the process
        print(f"An unexpected error occurred during JSON parsing: {e}")
        raise ValueError(f"An unexpected error occurred during JSON parsing: {e}")


class AIService:

    def __init__(self):
        # Initialize clients for different AI providers
        self.openai_client = None  # Initialize lazily or with API key
        self.anthropic_client = None  # Initialize lazily or with API key

    def _format_profile_for_ai(self, profile: UserProfile) -> str:
        """Format user profile for AI consumption"""
        profile_text = f"""
Full Name: {profile.full_name}
Email: {profile.email}
Phone: {profile.phone}
Location: {profile.location}
Summary: {profile.summary}

Education:
"""

        if not profile.education:
            profile_text += "- No education entries.\\n"
        for edu in profile.education:
            profile_text += f"- {edu.degree} from {edu.institution} ({edu.graduation_year})"
            if edu.gpa:
                profile_text += f" GPA: {edu.gpa}"
            profile_text += "\\n"

        profile_text += "\\nExperience:\\n"
        if not profile.experience:
            profile_text += "- No experience entries.\\n"
        for exp in profile.experience:
            end_date = exp.end_date if exp.end_date else "Present"
            profile_text += f"- {exp.position} at {exp.company} ({exp.start_date} - {end_date})\\n"
            profile_text += f"  Description: {exp.description}\\n"

        profile_text += "\\nSkills:\\n"
        if not profile.skills:
            profile_text += "- No skill entries.\\n"
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

    async def _call_ai_provider(self, prompt: str, ai_provider: AIProvider, api_key: str,
                                model_args: Dict[str, Any] = None,
                                messages: Optional[List[Dict[str, str]]] = None) -> str:
        """Helper to call various AI providers"""
        if model_args is None:
            model_args = {}

        # Ensure messages list is mutable for modification
        if messages is None:
            messages = []
        else:
            # Create a copy to avoid modifying the original list passed in
            messages = list(messages)

            # Append the current prompt as the latest user message
        messages.append({"role": "user", "content": prompt})

        if ai_provider == AIProvider.OPENAI:
            if not self.openai_client:
                openai.api_key = api_key
            try:
                response = await openai.ChatCompletion.acreate(
                    model=model_args.get("model", "gpt-3.5-turbo"),
                    messages=messages,
                    max_tokens=model_args.get("max_tokens", 1000)
                )
                return response.choices[0].message['content']
            except Exception as e:
                raise Exception(f"OpenAI API error: {e}")

        elif ai_provider == AIProvider.GEMINI:
            genai.configure(api_key=api_key)
            try:
                model = genai.GenerativeModel(model_name=model_args.get("model", "gemini-2.0-flash"))
                # Gemini expects messages in a specific format for chat history
                # It does not support 'system' role. Alternating 'user' and 'model' roles.
                gemini_messages = []
                for m in messages:
                    if m["role"] == "user":
                        gemini_messages.append({"role": "user", "parts": [m["content"]]})
                    elif m["role"] == "assistant":  # Assuming 'assistant' role maps to 'model' for Gemini
                        gemini_messages.append({"role": "model", "parts": [m["content"]]})
                    # Ignore 'system' role if present, as it's handled by prompt modification

                response = await model.generate_content_async(gemini_messages)
                return response.text
            except Exception as e:
                raise Exception(f"Gemini API error: {e}")

        elif ai_provider == AIProvider.CLAUDE:
            if not self.anthropic_client:
                self.anthropic_client = anthropic.AsyncAnthropic(api_key=api_key)
            try:
                # Claude expects messages in a specific format for chat history
                claude_messages = []
                for m in messages:
                    if m["role"] == "system":
                        # Claude's system message is a top-level parameter
                        # For simplicity here, we'll prepend it to the first user message if not already handled.
                        # A more robust solution might pass it as `system` parameter to Anthropic client.
                        pass
                    else:
                        claude_messages.append({"role": m["role"], "content": m["content"]})

                response = await self.anthropic_client.messages.create(
                    model=model_args.get("model", "claude-3-opus-20240229"),
                    max_tokens=model_args.get("max_tokens", 1000),
                    messages=claude_messages
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
        Based on the following candidate profile and job description, please provide suggestions on how to tailor the CV to better match the specific job.

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

        Make the suggestions compelling and specifically targeted to this role while maintaining honesty about the candidate's experience.
        """

        return await self._call_ai_provider(prompt, ai_provider, api_key)

    async def generate_cover_letter(self, job_description: str, profile: UserProfile, ai_provider: AIProvider,
                                    api_key: str) -> str:
        """Generate a cover letter for a job opening."""
        profile_text = self._format_profile_for_ai(profile)

        prompt = f"""
        Write a professional and compelling cover letter for the following job opening, tailored to the candidate's profile.

        Candidate Profile:
        {profile_text}

        Job Description:
        {job_description}

        The cover letter should:
        - Be addressed to a generic hiring manager (e.g., "Hiring Manager" or "Hiring Team").
        - Clearly state the position being applied for.
        - Highlight relevant skills and experiences from the candidate's profile that directly match the job description.
        - Demonstrate enthusiasm for the company and the role.
        - Be concise and persuasive.
        - Conclude with a strong call to action.
        """
        return await self._call_ai_provider(prompt, ai_provider, api_key)

    async def interview_qa_chat(self, job_title: str, profile: UserProfile, chat_history: List[Dict[str, str]],
                                ai_provider: AIProvider, api_key: str) -> str:
        """Engage in an interview Q&A practice chat."""
        profile_text = self._format_profile_for_ai(profile)

        system_message = f"""
        You are an interview practice chatbot. Your goal is to help the user practice for an interview for a '{job_title}' role.
        You have access to the user's profile:
        {profile_text}

        Based on the job title and the user's profile, ask relevant interview questions one by one.
        After the user provides an answer, give constructive feedback on their answer, suggest improvements, and then ask the next question.
        Start by asking a common opening question like "Tell me about yourself."
        Keep your responses concise and focused on one question or feedback at a time.
        """

        # Construct messages for the AI.
        # For Gemini, we need to avoid the 'system' role directly in the messages list.
        # Instead, we'll prepend system instructions to the first user message.

        messages_for_ai = []
        if not chat_history:
            # First turn: prepend system message to the initial user prompt
            initial_user_prompt = f"{system_message}\n\nThe user wants to practice for a '{job_title}' role. Start the interview."
            messages_for_ai.append({"role": "user", "content": initial_user_prompt})
        else:
            # Subsequent turns: add system message as context to the first message if not already done,
            # or just append the existing chat history.
            # Assuming the system message was already handled in the first turn,
            # we just append the existing chat history.
            messages_for_ai.extend(chat_history)

        # The prompt for _call_ai_provider will be the last user message from the frontend.
        # _call_ai_provider will append this to `messages_for_ai`.
        # So, we pass the existing chat history (or the initial system-infused prompt)
        # and the last user message from the frontend as the `prompt` argument.

        # The `_call_ai_provider` function expects the *current* user prompt as `prompt`
        # and the *previous* chat history as `messages`.
        # So, we take the last user message from `chat_history` as the `prompt`
        # and the rest of the `chat_history` (excluding the last one) as `messages`.

        current_user_message = chat_history[-1]["content"] if chat_history else ""
        history_for_ai = chat_history[:-1] if chat_history else []

        # If it's the very first message from the user (job title),
        # the system message needs to be part of that first user message.
        if not history_for_ai and ai_provider == AIProvider.GEMINI:
            # This is the first interaction with Gemini, so embed system message
            initial_gemini_prompt = f"{system_message}\n\n{current_user_message}"
            return await self._call_ai_provider(initial_gemini_prompt, ai_provider, api_key, messages=[])
        else:
            # For subsequent messages or other providers, use standard roles
            return await self._call_ai_provider(current_user_message, ai_provider, api_key, messages=history_for_ai)

    async def extract_job_skills(self, job_description: str, profile: UserProfile, ai_provider: AIProvider,
                                 api_key: str) -> str:
        """Extract key skills from a job description and compare with user's profile."""
        profile_skills = ", ".join([skill.name for skill in profile.skills]) if profile.skills else "No skills listed."

        prompt = f"""
        Analyze the following job description and candidate's existing skills.

        Job Description:
        {job_description}

        Candidate's Current Skills:
        {profile_skills}

        Please provide:
        1. A list of all key skills, technologies, and qualifications explicitly mentioned or strongly implied in the job description.
        2. For each key skill, indicate if the candidate possesses it based on their current skills.
        3. Highlight any significant skill gaps between the job requirements and the candidate's profile.
        4. Suggest how the candidate can phrase their existing skills to better match the job description's language.
        """
        return await self._call_ai_provider(prompt, ai_provider, api_key)

    async def craft_interview_questions(self, candidate_info: str, ai_provider: AIProvider, api_key: str) -> str:
        """Craft insightful interview questions for a candidate based on provided information."""
        prompt = f"""
        You are an experienced interviewer. Based on the following information about a candidate (which could be a job description they applied for, or a summary of their resume), generate a list of insightful interview questions.

        Candidate Information:
        {candidate_info}

        The questions should:
        - Be relevant to the information provided.
        - Aim to assess skills, experience, problem-solving abilities, and cultural fit.
        - Include a mix of behavioral, technical (if applicable), and situational questions.
        - Avoid generic questions if more specific ones can be formulated.
        - Aim for 5-10 distinct questions.
        """
        return await self._call_ai_provider(prompt, ai_provider, api_key)

    async def research_company_website(self, company_url: str, ai_provider: AIProvider, api_key: str) -> str:
        """Extract key information from a company's website using browsing tool."""
        try:
            # Use the browsing tool to fetch the content of the URL
            company_website_content = await browsing.browse(query=f"content of {company_url}", url=company_url)

            if not company_website_content:
                return "Could not retrieve content from the company website. It might be inaccessible or empty."

            prompt = f"""
            Analyze the following content extracted from a company's website.
            Extract the following key information:
            1.  **Mission Statement:** The company's core purpose or mission.
            2.  **Values:** The core principles or beliefs that guide the company.
            3.  **Work Areas/Products/Services:** What the company primarily does, its main offerings, or key departments.
            4.  **Recent Projects/Achievements (if discernible):** Any notable recent projects, successes, or milestones.
            5.  **Recent News/Updates (if discernible):** Any significant news, press releases, or announcements.

            Company Website Content (from {company_url}):
            {company_website_content[:8000]}  # Limit content to avoid token limits, adjust as needed

            Please present the information clearly, with headings for each section. If a section is not found, state "Not found" or "N/A".
            """
            return await self._call_ai_provider(prompt, ai_provider, api_key)
        except Exception as e:
            raise Exception(f"Error browsing company website or processing content: {e}")

    async def generate_about_me_answer(self, job_description: str, profile: UserProfile, ai_provider: AIProvider,
                                       api_key: str) -> str:
        """Generate a tuned 'Tell me about yourself' answer based on job description and profile."""
        profile_text = self._format_profile_for_ai(profile)

        prompt = f"""
        Craft a compelling and concise answer to the common interview question "Tell me about yourself" for a candidate applying to the following job.
        The answer should be tuned to the job description and leverage the candidate's profile.

        Candidate Profile:
        {profile_text}

        Job Description:
        {job_description}

        Your answer should:
        - Be structured as a brief narrative (e.g., present-past-future or past-present-future).
        - Highlight 2-3 key experiences, skills, or achievements most relevant to the job.
        - Connect the candidate's background directly to the requirements and goals of the target role.
        - Express enthusiasm for the position and the company.
        - Be professional and engaging.
        - Aim for a length that can be delivered in 1-2 minutes (approx. 150-250 words).
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
        ```json
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
                    "start_date": "string (YYYY-MM or YYYY-MM-DD)",
                    "end_date": "string (YYYY-MM or YYYY-MM-DD or 'Present')",
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
        ```

        Important notes for extraction:
        - For dates, use 'YYYY-MM' or 'YYYY-MM-DD' format. If 'Present' is indicated, use 'Present'.
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
            if ai_provider == AIProvider.GEMINI:
                response_text = await self._call_gemini_vision(prompt, base64_pdf, api_key)
            else:
                raise ValueError(
                    "Only Gemini is currently supported for 'Fill Profile from Resume' due to its PDF processing capabilities.")

            extracted_data = parse_response_to_json(response_text)

            # Ensure lists are lists of dicts/strings as expected by Pydantic models
            # and handle potential single string descriptions for experience
            if 'experience' in extracted_data:
                for exp in extracted_data['experience']:
                    if isinstance(exp.get('description'), list):
                        exp['description'] = " ".join(exp['description'])
                    exp['description'] = exp.get('description', '')  # Ensure it's a string, even if empty

            # Ensure skills have a level, default to 'Advanced' if missing
            if 'skills' in extracted_data:
                for skill in extracted_data['skills']:
                    if 'level' not in skill or not skill.get('level'):
                        skill['level'] = 'Advanced'

            # Filter out any empty/invalid entries that might have been parsed
            extracted_data['education'] = [
                edu for edu in extracted_data.get('education', [])
                if isinstance(edu, dict) and edu.get('degree') and edu.get('institution')
            ]
            extracted_data['experience'] = [
                exp for exp in extracted_data.get('experience', [])
                if isinstance(exp, dict) and exp.get('position') and exp.get('company')
            ]
            extracted_data['skills'] = [
                skill for skill in extracted_data.get('skills', [])
                if isinstance(skill, dict) and skill.get('name')
            ]
            extracted_data['languages'] = [lang for lang in extracted_data.get('languages', []) if lang]
            extracted_data['certifications'] = [cert for cert in extracted_data.get('certifications', []) if cert]

            return extracted_data

        except Exception as e:
            raise Exception(f"Error processing AI resume extraction: {e}")

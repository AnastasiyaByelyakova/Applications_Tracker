import openai
import google.generativeai as genai
import anthropic
from typing import Dict, Any, List, Optional
import json, re
from models import *
import io
from pypdf import PdfReader


def parse_response_to_json(response: str) -> Dict[str, Any]:
    """
    Extracts a JSON string from the AI's response and parses it into a Python dictionary.
    Handles common formatting issues from LLM outputs.
    """
    # 1. Try to find a JSON block (```json ... ```)
    json_match = re.search(r'```json\s*(\{|\[).*?(\]|\})\s*```', response, re.DOTALL)
    if json_match:
        # Extracts the content between ```json and ```
        json_text = json_match.group(0).replace("```json", "").replace("```", "").strip()
    else:
        # 2. Fallback: Try to find a standalone JSON object or array
        json_text_match = re.search(r'(\{|\[).*(\}|\[)', response, re.DOTALL)
        if json_text_match:
            json_text = json_text_match.group(0)
        else:
            raise ValueError("No JSON object or array found in the AI response.")

    # 3. Attempt to parse the extracted text as JSON
    try:
        return json.loads(json_text)
    except json.JSONDecodeError as e:
        # Fallback for common LLM JSON issues
        print(f"Initial JSON parse failed: {e}. Attempting to clean and re-parse.")
        cleaned_json_text = re.sub(r',\s*([}\]])', r'\1', json_text)
        try:
            return json.loads(cleaned_json_text)
        except json.JSONDecodeError as e_cleaned:
            raise ValueError(f"Failed to parse JSON even after cleaning: {e_cleaned}\nOriginal text: {response}")


class AIService:
    def __init__(self):
        self.openai_client = None
        self.anthropic_client = None

    def _get_openai_client(self, api_key: str):
        if not self.openai_client or self.openai_client.api_key != api_key:
            self.openai_client = openai.AsyncOpenAI(api_key=api_key)
        return self.openai_client

    def _get_anthropic_client(self, api_key: str):
        if not self.anthropic_client or self.anthropic_client.api_key != api_key:
            self.anthropic_client = anthropic.AsyncAnthropic(api_key=api_key)
        return self.anthropic_client;

    async def _call_gemini_pro(self, prompt: str, api_key: str, tools: Optional[List[Dict]] = None,
                               system_instruction: Optional[str] = None,
                               chat_history: Optional[List[Dict]] = None, json_mode: bool = False) -> str:
        genai.configure(api_key=api_key)

        gemini_history = []
        if chat_history:
            for msg in chat_history:
                role = "model" if msg["role"] == "assistant" else msg["role"]
                gemini_history.append({"role": role, "parts": [msg["content"]]})

        generation_config = genai.types.GenerationConfig(response_mime_type="application/json") if json_mode else None

        model = genai.GenerativeModel('gemini-2.5-flash', tools=tools, system_instruction=system_instruction,
                                      generation_config=generation_config)
        chat = model.start_chat(history=gemini_history)

        response = await chat.send_message_async(prompt)

        if response.candidates:
            candidate = response.candidates[0]
            if candidate.content and candidate.content.parts:
                if hasattr(candidate.content, 'tool_calls') and candidate.content.tool_calls:
                    pass
                else:
                    return candidate.content.parts[0].text
        return "No response from AI."

    async def _call_openai(self, model_name: str, prompt: str, api_key: str, chat_history: Optional[List[Dict]] = None,
                           tools: Optional[List[Dict]] = None, system_instruction: Optional[str] = None, json_mode: bool = False) -> str:
        client = self._get_openai_client(api_key)
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})

        if chat_history:
            messages.extend(chat_history)

        messages.append({"role": "user", "content": prompt})

        response_format = {"type": "json_object"} if json_mode else None

        try:
            response = await client.chat.completions.create(
                model=model_name,
                messages=messages,
                tools=tools if tools else None,
                tool_choice="auto" if tools else "none",
                response_format=response_format
            )

            response_message = response.choices[0].message
            if response_message.tool_calls:
                pass
            else:
                return response_message.content
        except Exception as e:
            raise Exception(f"An unexpected error occurred with OpenAI: {e}")

    async def _call_anthropic(self, model_name: str, prompt: str, api_key: str,
                              chat_history: Optional[List[Dict]] = None, tools: Optional[List[Dict]] = None,
                              system_instruction: Optional[str] = None) -> str:
        client = self._get_anthropic_client(api_key)

        messages = []
        if chat_history:
            for msg in chat_history:
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": prompt})

        try:
            response = await client.messages.create(
                model=model_name,
                max_tokens=2000,
                messages=messages,
                tools=tools if tools else None,
                system=system_instruction,
            )

            if response.tool_use:
                pass
            else:
                return response.content[0].text
        except anthropic.APIStatusError as e:
            raise Exception(f"Anthropic API error: {e.status_code} - {e.response.text}")
        except anthropic.APIConnectionError as e:
            raise Exception(f"Anthropic API connection error: {e}")
        except Exception as e:
            raise Exception(f"An unexpected error occurred with Anthropic: {e}")

    async def _call_ai_model(self, ai_provider: str, model_name: str, prompt: str, api_key: str,
                             chat_history: Optional[List[Dict]] = None, tools: Optional[List[Dict]] = None,
                             system_instruction: Optional[str] = None, json_mode: bool = False) -> str:
        if ai_provider == "gemini":
            return await self._call_gemini_pro(prompt, api_key, tools=tools, system_instruction=system_instruction,
                                               chat_history=chat_history, json_mode=json_mode)
        elif ai_provider == "openai":
            return await self._call_openai(model_name, prompt, api_key, chat_history=chat_history, tools=tools,
                                           system_instruction=system_instruction, json_mode=json_mode)
        elif ai_provider == "anthropic":
            if json_mode:
                prompt += "\n\nPlease ensure your entire response is a single, valid JSON object, without any surrounding text or explanation."
            return await self._call_anthropic(model_name, prompt, api_key, chat_history=chat_history, tools=tools,
                                              system_instruction=system_instruction)
        else:
            raise ValueError("Unsupported AI provider.")

    async def estimate_job_chance(self, job_description: str, user_profile: Dict[str, Any], ai_provider: str,
                                  api_key: str) -> str:
        formatted_profile = self._format_profile_for_prompt(user_profile)

        prompt = f"""
        You are an AI assistant specialized in career counseling.
        Analyze the following job description and the provided user profile to estimate the job chance.
        Provide a percentage score (e.g., 75%) and a detailed explanation of strengths, weaknesses, and actionable advice.

        Job Description:
        {job_description}

        User Profile:
        {formatted_profile}

        Provide your response in a clear, concise, and professional manner, using markdown for readability.
        """
        model_name = "gemini-pro" if ai_provider == "gemini" else "gpt-3.5-turbo" if ai_provider == "openai" else "claude-3-opus-20240229"

        return await self._call_ai_model(ai_provider, model_name, prompt, api_key)

    async def tune_cv_for_job(self, job_description: str, user_profile: Dict[str, Any], ai_provider: str,
                              api_key: str) -> str:
        formatted_profile = self._format_profile_for_prompt(user_profile)

        prompt = f"""
        You are an AI assistant specialized in CV optimization.
        Given the following job description and user profile, suggest specific improvements to the user's CV.
        Focus on tailoring keywords, rephrasing bullet points, and highlighting relevant experiences/skills.
        Provide actionable advice in markdown format.

        Job Description:
        {job_description}

        User Profile:
        {formatted_profile}

        Provide your response in a clear, concise, and professional manner, using markdown for readability.
        """
        model_name = "gemini-pro" if ai_provider == "gemini" else "gpt-3.5-turbo" if ai_provider == "openai" else "claude-3-opus-20240229"
        return await self._call_ai_model(ai_provider, model_name, prompt, api_key)

    async def generate_cover_letter(self, job_description: str, user_profile: Dict[str, Any], ai_provider: str,
                                    api_key: str) -> str:
        formatted_profile = self._format_profile_for_prompt(user_profile)

        prompt = f"""
        You are an AI assistant that writes professional cover letters.
        Generate a compelling cover letter based on the following job description and user's profile.
        The cover letter should be professional, concise, and highlight relevant skills and experiences.
        Address it to "Hiring Manager".

        Job Description:
        {job_description}

        User Profile:
        {formatted_profile}

        Provide the full cover letter in markdown format.
        """
        model_name = "gemini-pro" if ai_provider == "gemini" else "gpt-3.5-turbo" if ai_provider == "openai" else "claude-3-opus-20240229"
        return await self._call_ai_model(ai_provider, model_name, prompt, api_key)

    async def interview_qa(self, job_title: str, user_profile: Dict[str, Any], chat_history: List[Dict],
                           ai_provider: str, api_key: str) -> str:
        formatted_profile = self._format_profile_for_prompt(user_profile)

        current_user_message = chat_history[-1]['content'] if chat_history else ""
        cleaned_history = chat_history[:-1] if chat_history else []

        system_instruction = f"""
        You are an AI interview coach. Your goal is to help the user practice for an interview for a '{job_title}' role.
        You have access to their profile:
        {formatted_profile}

        When the user asks a question, provide a realistic interview question.
        When the user provides an answer, evaluate it based on their profile and the job title, offering constructive feedback.
        Keep your responses concise and to the point.
        """

        model_name = "gemini-pro" if ai_provider == "gemini" else "gpt-3.5-turbo" if ai_provider == "openai" else "claude-3-opus-20240229"

        return await self._call_ai_model(ai_provider, model_name, current_user_message, api_key,
                                         chat_history=cleaned_history, system_instruction=system_instruction)

    async def extract_job_skills(self, job_description: str, user_profile: Dict[str, Any], ai_provider: str,
                                 api_key: str) -> str:
        formatted_profile = self._format_profile_for_prompt(user_profile)

        prompt = f"""
        You are an AI assistant specialized in skill extraction and analysis.
        Given the following job description, extract a comprehensive list of key skills required for the role.
        Then, compare these required skills with the user's provided profile and highlight any gaps or strong matches.
        Categorize skills (e.g., Technical, Soft, Domain-specific).
        Provide your response in markdown format.

        Job Description:
        {job_description}

        User Profile:
        {formatted_profile}

        Provide your response in a clear, concise, and professional manner, using markdown for readability.
        """
        model_name = "gemini-pro" if ai_provider == "gemini" else "gpt-3.5-turbo" if ai_provider == "openai" else "claude-3-opus-20240229"
        return await self._call_ai_model(ai_provider, model_name, prompt, api_key)

    async def craft_interview_questions(self, candidate_info: str, ai_provider: str, api_key: str) -> str:
        prompt = f"""
        You are an AI assistant that helps recruiters and hiring managers.
        Based on the following candidate information (e.g., resume summary, specific experiences, or job title),
        craft a list of insightful and relevant interview questions.
        Include a mix of behavioral, technical, and situational questions.

        Candidate Information:
        {candidate_info}

        Provide the questions in a clear, numbered list using markdown.
        """
        model_name = "gemini-pro" if ai_provider == "gemini" else "gpt-3.5-turbo" if ai_provider == "openai" else "claude-3-opus-20240229"
        return await self._call_ai_model(ai_provider, model_name, prompt, api_key)

    async def research_company_website(self, website_text: str, ai_provider: str, api_key: str) -> str:
        tools = None

        prompt = f"""
        You are an AI assistant specialized in company research.
        Your task is to extract key information from the provided website text.
        Focus on identifying the company's mission, values, main products/services, recent news or achievements, and general culture.

        Website Content:
        {website_text}

        Summarize the key findings in a structured markdown format.
        If you cannot find relevant information, state that clearly.
        """
        model_name = "gemini-pro" if ai_provider == "gemini" else "gpt-4-turbo" if ai_provider == "openai" else "claude-3-opus-20240229"
        return await self._call_ai_model(ai_provider, model_name, prompt, api_key, tools=tools)

    async def generate_about_me_answer(self, job_description: str, user_profile: Dict[str, Any], ai_provider: str,
                                       api_key: str) -> str:
        formatted_profile = self._format_profile_for_prompt(user_profile)

        prompt = f"""
        You are an AI interview coach. Your task is to help the user craft a compelling "Tell me about yourself" (About Me) answer.
        The answer should be tailored to the provided job description and highlight relevant aspects of the user's profile.
        Structure the answer using the "Past-Present-Future" framework (or similar, e.g., "Skills-Experience-Goals").

        Job Description:
        {job_description}

        User Profile:
        {formatted_profile}

        Provide the "About Me" answer in markdown format.
        """
        model_name = "gemini-pro" if ai_provider == "gemini" else "gpt-3.5-turbo" if ai_provider == "openai" else "claude-3-opus-20240229"
        return await self._call_ai_model(ai_provider, model_name, prompt, api_key)

    async def fill_profile_from_resume(self, resume_content: bytes, ai_provider: str, api_key: str) -> Dict[str, Any]:
        resume_text = ""
        try:
            pdf_reader = PdfReader(io.BytesIO(resume_content))
            for page in pdf_reader.pages:
                resume_text += page.extract_text()
        except Exception as e:
            try:
                resume_text = resume_content.decode('utf-8')
            except UnicodeDecodeError:
                raise Exception("Failed to read resume file. Please ensure it is a valid PDF or text file.")

        prompt = f"""
        You are an AI assistant specialized in parsing resumes.
        Extract information from the provided resume text and return it as a JSON object that strictly follows the UserProfile model.
        Fields: full_name, email, phone, location, summary, education (list of objects with degree, institution, graduation_year, gpa), experience (list of objects with position, company, start_date, end_date, description), skills (list of objects with name, level), languages (list of strings), certifications (list of strings), linkedin_url, github_url, portfolio_url.
        Return ONLY the JSON object.

        Resume Content:
        {resume_text}
        """
        model_name = "gemini-1.5-flash" if ai_provider == "gemini" else "gpt-4-turbo-preview" if ai_provider == "openai" else "claude-3-opus-20240229"

        ai_response_text = await self._call_ai_model(ai_provider, model_name, prompt, api_key, json_mode=True)

        parsed_profile: Dict[str, Any]

        try:
            parsed_profile = json.loads(ai_response_text)
        except json.JSONDecodeError:
            print("Direct JSON parsing failed. Falling back to regex-based parsing.")
            try:
                parsed_profile = parse_response_to_json(ai_response_text)
            except ValueError as e:
                raise Exception(f"Failed to parse AI response into JSON for profile: {e}. Raw AI response: {ai_response_text}")

        if parsed_profile.get('education') and isinstance(parsed_profile['education'], list):
            for edu in parsed_profile['education']:
                if isinstance(edu, dict) and edu.get('gpa') == '':
                    edu['gpa'] = None

        if parsed_profile.get('summary') is None:
            parsed_profile['summary'] = ''

        if parsed_profile.get('skills') and isinstance(parsed_profile['skills'], list):
            for skill in parsed_profile['skills']:
                if isinstance(skill, dict) and skill.get('level') is None:
                    skill['level'] = ''

        return parsed_profile

    def _format_profile_for_prompt(self, profile_data: Dict[str, Any]) -> str:
        """Formats the user profile dictionary into a readable string for AI prompts."""
        formatted_str = "--- User Profile ---\n"
        for key, value in profile_data.items():
            if value:
                if isinstance(value, list) and key in ['education', 'experience', 'skills', 'languages', 'certifications']:
                    if key == 'education':
                        formatted_str += "Education:\n"
                        for item in value:
                            formatted_str += f"  - Degree: {item.get('degree', '')}, Institution: {item.get('institution', '')}, Year: {item.get('graduation_year', '')}, GPA: {item.get('gpa', '')}\n"
                    elif key == 'experience':
                        formatted_str += "Experience:\n"
                        for item in value:
                            formatted_str += f"  - Position: {item.get('position', '')}, Company: {item.get('company', '')}, Dates: {item.get('start_date', '')} - {item.get('end_date', '')}, Description: {item.get('description', '')}\n"
                    elif key == 'skills':
                        formatted_str += "Skills:\n"
                        for item in value:
                            formatted_str += f"  - {item.get('name', '')} ({item.get('level', '')})\n"
                    elif key == 'languages':
                        formatted_str += f"Languages: {', '.join(value)}\n"
                    elif key == 'certifications':
                        formatted_str += f"Certifications: {', '.join(value)}\n"
                elif isinstance(value, (str, int, float)):
                    formatted_str += f"{key.replace('_', ' ').title()}: {value}\n"
        formatted_str += "--------------------"
        return formatted_str

import openai
import google.generativeai as genai
import anthropic
from typing import Dict, Any, List, Optional
import json, re
from models import * # Ensure UserProfile model is imported

def parse_response_to_json(response: str) -> Dict[str, Any]:
    """
    Extracts a JSON string from the AI's response and parses it into a Python dictionary.
    Handles common formatting issues from LLM outputs.
    """
    # 1. Try to find a JSON block (```json ... ```)
    json_match = re.search(r'```json\s*(\{|\[).*?(\]|\})\s*```', response, re.DOTALL)
    if json_match:
        json_text = json_match.group(1) + json_match.group(2)  # Reconstruct the full JSON
    else:
        # 2. Fallback: Try to find a standalone JSON object or array
        # This regex is more permissive to catch JSON that isn't wrapped in ```json
        json_text_match = re.search(r'(\{|\[).*?(\]|\})', response, re.DOTALL)
        if json_text_match:
            json_text = json_text_match.group(0)
        else:
            raise ValueError("No JSON object or array found in the AI response.")

    # 3. Attempt to parse the extracted text as JSON
    try:
        # First, try a direct parse. This might fail if there are trailing commas or other non-standard JSON.
        return json.loads(json_text)
    except json.JSONDecodeError as e:
        # Fallback for common LLM JSON issues (e.g., trailing commas, unquoted keys/values)
        print(f"Initial JSON parse failed: {e}. Attempting to clean and re-parse.")
        # A more robust cleaning might involve a dedicated library or more complex regex
        # For now, a simple attempt to remove trailing commas in objects/arrays
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
                               chat_history: Optional[List[Dict]] = None) -> str:
        genai.configure(api_key=api_key)

        # Prepare history for Gemini
        gemini_history = []
        if chat_history:
            for msg in chat_history:
                # Gemini expects 'parts' to be a list, even for single text parts
                gemini_history.append({"role": msg["role"], "parts": [msg["content"]]})

        model = genai.GenerativeModel('gemini-2.0-flash', tools=tools, system_instruction=system_instruction)
        chat = model.start_chat(history=gemini_history)

        response = chat.send_message(prompt)

        return "\n".join(i.text for i in response.candidates[0].content.parts)
        return "No response from AI."

    async def _call_openai(self, model_name: str, prompt: str, api_key: str, chat_history: Optional[List[Dict]] = None,
                           tools: Optional[List[Dict]] = None, system_instruction: Optional[str] = None) -> str:
        client = self._get_openai_client(api_key)
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})

        if chat_history:
            messages.extend(chat_history)

        messages.append({"role": "user", "content": prompt})

        try:
            response = await client.chat.completions.create(
                model=model_name,
                messages=messages,
                tools=tools if tools else None,
                tool_choice="auto" if tools else "none",
            )

            response_message = response.choices[0].message
            if response_message.tool_calls:
                tool_outputs = []
                for tool_call in response_message.tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    print(f"OpenAI calling tool: {function_name} with args: {function_args}")

                    # Dynamically call the tool function
                    if function_name == "google_search":
                        # Ensure 'queries' is a list as expected by google_search.search
                        queries = function_args.get('queries')
                        if not isinstance(queries, list):
                            queries = [queries] if queries is not None else []
                        search_results = google_search.search(queries=queries)
                        tool_outputs.append({
                            "tool_call_id": tool_call.id,
                            "output": {"search_results": [sr.dict() for sr in search_results]}
                        })
                    elif function_name == "browsing":
                        browsing_result = await browsing.browse(query=function_args.get('query'),
                                                                url=function_args.get('url'))
                        tool_outputs.append({
                            "tool_call_id": tool_call.id,
                            "output": {"browsing_result": browsing_result}
                        })
                    else:
                        tool_outputs.append({
                            "tool_call_id": tool_call.id,
                            "output": {"error": f"Unknown tool: {function_name}"}
                        })

                # Add assistant's tool calls and tool outputs to messages
                messages.append(response_message)
                for output in tool_outputs:
                    messages.append({
                        "tool_call_id": output["tool_call_id"],
                        "role": "tool",
                        "name": tool_call.function.name,  # Assuming name is the same as function_name
                        "content": json.dumps(output["output"])
                    })

                # Send back to the model with tool outputs
                second_response = await client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                )
                return second_response.choices[0].message.content
            else:
                return response_message.content
        except openai.APIStatusError as e:
            raise Exception(f"OpenAI API error: {e.status_code} - {e.response}")
        except openai.APIConnectionError as e:
            raise Exception(f"OpenAI API connection error: {e}")
        except Exception as e:
            raise Exception(f"An unexpected error occurred with OpenAI: {e}")

    async def _call_anthropic(self, model_name: str, prompt: str, api_key: str,
                              chat_history: Optional[List[Dict]] = None, tools: Optional[List[Dict]] = None,
                              system_instruction: Optional[str] = None) -> str:
        client = self._get_anthropic_client(api_key)

        messages = []
        if chat_history:
            # Anthropic expects history as alternating user/assistant roles
            for msg in chat_history:
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": prompt})

        try:
            response = await client.messages.create(
                model=model_name,
                max_tokens=2000,
                messages=messages,
                tools=tools if tools else None,
                system=system_instruction,  # Anthropic system instruction
            )

            if response.tool_use:  # Anthropic's way of indicating tool calls
                tool_outputs = []
                for tool_use in response.tool_use:
                    tool_name = tool_use.name
                    tool_input = tool_use.input
                    print(f"Anthropic calling tool: {tool_name} with input: {tool_input}")

                    # Dynamically call the tool function
                    if tool_name == "google_search":
                        # Ensure 'queries' is a list as expected by google_search.search
                        queries = tool_input.get('queries')
                        if not isinstance(queries, list):
                            queries = [queries] if queries is not None else []
                        search_results = google_search.search(queries=queries)
                        tool_outputs.append({
                            "tool_use_id": tool_use.id,
                            "content": {"search_results": [sr.dict() for sr in search_results]}
                        })
                    elif tool_name == "browsing":
                        browsing_result = await browsing.browse(query=tool_input.get('query'),
                                                                url=tool_input.get('url'))
                        tool_outputs.append({
                            "tool_use_id": tool_use.id,
                            "content": {"browsing_result": browsing_result}
                        })
                    else:
                        tool_outputs.append({
                            "tool_use_id": tool_use.id,
                            "content": {"error": f"Unknown tool: {tool_name}"}
                        })

                # Send tool outputs back to the model
                messages.append(response.content)  # Add the tool_use content from assistant
                messages.append({"role": "user", "content": tool_outputs})  # Send tool results as user message

                second_response = await client.messages.create(
                    model=model_name,
                    max_tokens=2000,
                    messages=messages,
                )
                return second_response.content[0].text
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
                             system_instruction: Optional[str] = None) -> str:
        if ai_provider == "gemini":
            return self._call_gemini_pro(prompt,
                                         api_key,
                                         tools=tools,
                                         system_instruction=system_instruction,
                                               chat_history=chat_history)
        elif ai_provider == "openai":
            return await self._call_openai(model_name, prompt, api_key, chat_history=chat_history, tools=tools,
                                           system_instruction=system_instruction)
        elif ai_provider == "anthropic":
            return await self._call_anthropic(model_name, prompt, api_key, chat_history=chat_history, tools=tools,
                                              system_instruction=system_instruction)
        else:
            raise ValueError("Unsupported AI provider.")

    # Modified to accept Dict[str, Any] for user_profile
    async def estimate_job_chance(self, job_description: str, user_profile: Dict[str, Any], ai_provider: str, api_key: str) -> str:
        # profile_data = json.loads(user_profile) # REMOVED: main.py now sends dict directly
        formatted_profile = self._format_profile_for_prompt(user_profile) # Use user_profile directly

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
        model_name = "gemini-2.0-flash" if ai_provider == "gemini" else "gpt-3.5-turbo" if ai_provider == "openai" else "claude-3-opus-20240229"  # Default models

        return await self._call_ai_model(ai_provider, model_name, prompt, api_key)

    # Modified to accept Dict[str, Any] for user_profile
    async def tune_cv_for_job(self, job_description: str, user_profile: Dict[str, Any], ai_provider: str, api_key: str) -> str:
        # profile_data = json.loads(user_profile) # REMOVED
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
        model_name = "gemini-2.0-flash" if ai_provider == "gemini" else "gpt-3.5-turbo" if ai_provider == "openai" else "claude-3-opus-20240229"  # Default models
        return await self._call_ai_model(ai_provider, model_name, prompt, api_key)

    # Modified to accept Dict[str, Any] for user_profile
    async def generate_cover_letter(self, job_description: str, user_profile: Dict[str, Any], ai_provider: str,
                                    api_key: str) -> str:
        # profile_data = json.loads(user_profile) # REMOVED
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
        model_name = "gemini-2.0-flash" if ai_provider == "gemini" else "gpt-3.5-turbo" if ai_provider == "openai" else "claude-3-opus-20240229"  # Default models
        return await self._call_ai_model(ai_provider, model_name, prompt, api_key)

    # Modified to accept List[Dict] for chat_history, and Dict[str, Any] for user_profile
    async def interview_qa(self, job_title: str, user_profile: Dict[str, Any], chat_history: List[Dict], ai_provider: str,
                           api_key: str) -> str:
        # profile_data = json.loads(user_profile) # REMOVED
        formatted_profile = self._format_profile_for_prompt(user_profile)
        # history = json.loads(chat_history)  # REMOVED: chat_history is already a list of dicts

        # Constructing the full prompt for the AI based on history and new user input
        # The last message in history is the current user's message
        current_user_message = chat_history[-1]['content'] if chat_history else ""

        # Remove the last user message from history for passing to AI models
        # as it's passed as the 'prompt' argument.
        cleaned_history = chat_history[:-1] if chat_history else []

        system_instruction = f"""
        You are an AI interview coach. Your goal is to help the user practice for an interview for a '{job_title}' role.
        You have access to their profile:
        {formatted_profile}

        When the user asks a question, provide a realistic interview question.
        When the user provides an answer, evaluate it based on their profile and the job title, offering constructive feedback.
        Keep your responses concise and to the point.
        """

        model_name = "gemini-2.0-flash" if ai_provider == "gemini" else "gpt-3.5-turbo" if ai_provider == "openai" else "claude-3-opus-20240229"  # Default models

        return await self._call_ai_model(ai_provider, model_name, current_user_message, api_key,
                                         chat_history=cleaned_history, system_instruction=system_instruction)

    # Modified to accept Dict[str, Any] for user_profile
    async def extract_job_skills(self, job_description: str, user_profile: Dict[str, Any], ai_provider: str, api_key: str) -> str:
        # profile_data = json.loads(user_profile) # REMOVED
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
        model_name = "gemini-2.0-flash" if ai_provider == "gemini" else "gpt-3.5-turbo" if ai_provider == "openai" else "claude-3-opus-20240229"  # Default models
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
        model_name = "gemini-2.0-flash" if ai_provider == "gemini" else "gpt-3.5-turbo" if ai_provider == "openai" else "claude-3-opus-20240229"  # Default models
        return await self._call_ai_model(ai_provider, model_name, prompt, api_key)

    async def research_company_website(self, company_url: str, ai_provider: str, api_key: str) -> str:
        # Define the tools available to the model
        tools = [
            {
                "function_declarations": [
                    {
                        "name": "browsing",
                        "description": "Browse a given URL and return its text content.",
                        "parameters": {
                            "type": "OBJECT",
                            "properties": {
                                "query": {"type": "STRING",
                                          "description": "A search query related to the content you want to find on the page."},
                                "url": {"type": "STRING", "description": "The URL to browse."}
                            },
                            "required": ["url"]
                        }
                    }
                ]
            }
        ]

        prompt = f"""
        You are an AI assistant specialized in company research.
        Your task is to extract key information from the provided company website URL.
        Focus on identifying the company's mission, values, main products/services, recent news or achievements, and general culture.
        Use the 'browsing' tool to fetch the content of the URL.

        Company Website URL: {company_url}

        After browsing, summarize the key findings in a structured markdown format.
        If you cannot access the URL or find relevant information, state that clearly.
        """
        model_name = "gemini-2.0-flash" if ai_provider == "gemini" else "gpt-4-turbo" if ai_provider == "openai" else "claude-3-opus-20240229"  # Models capable of tool use

        # Call the AI model with the browsing tool
        return await self._call_ai_model(ai_provider, model_name, prompt, api_key, tools=tools)

    # Modified to accept Dict[str, Any] for user_profile
    async def generate_about_me_answer(self, job_description: str, user_profile: Dict[str, Any], ai_provider: str,
                                       api_key: str) -> str:
        # profile_data = json.loads(user_profile) # REMOVED
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
        model_name = "gemini-2.0-flash" if ai_provider == "gemini" else "gpt-3.5-turbo" if ai_provider == "openai" else "claude-3-opus-20240229"  # Default models
        return self._call_ai_model(ai_provider, model_name, prompt, api_key)

    async def fill_profile_from_resume(self, resume_content: bytes, ai_provider: str, api_key: str) -> Dict[str, Any]:
        print(f"fill_profile_from_resume called. AI Provider: {ai_provider}")

        resume_text = ""
        try:
            # Attempt to decode bytes to string. This will work if resume_content is plain text.
            resume_text = resume_content.decode('utf-8')
            print("Successfully decoded resume content to UTF-8 text.")
        except UnicodeDecodeError:
            # If it's a binary PDF, direct decode will fail.
            # Here you would integrate a PDF text extraction library.
            # For now, we'll indicate that it's binary data to the LLM.
            print("Could not decode resume content as UTF-8. Assuming binary PDF content.")
            # If using models that accept image/PDF data directly (like some Gemini Vision models),
            # you'd pass the raw bytes here. For text-only models, you MUST extract text first.
            # Let's assume for this prompt, the LLM is smart enough to handle the binary data hint,
            # or that the user will provide text/a simple PDF.
            resume_text = "The provided resume content is a binary file (e.g., PDF). Please extract information from it. If direct text extraction is not possible for you, state that."


        print(f"Resume text for AI processing (first 200 chars): {resume_text[:200]}...")

        prompt = f"""
        You are an AI assistant specialized in parsing resumes.
        Extract the following information from the provided resume text and return it as a JSON object.
        Ensure the JSON structure matches the UserProfile model fields:
        full_name, email, phone, location, summary, education (list of objects with degree, institution, graduation_year, gpa), experience (list of objects with position, company, start_date, end_date, description), skills (list of objects with name, level), languages (list of strings), certifications (list of strings), linkedin_url, github_url, portfolio_url, cv_profile_file (should be null).

        If a field is not found or applicable, set it to null or an empty array as appropriate.
        For dates (start_date, end_date in experience), use YYYY-MM format if possible.
        For skills, infer level if not explicitly stated (Beginner, Intermediate, Advanced, Expert).

        Resume Content:
        {resume_text}

        Return ONLY the JSON object. Do not include any other text or markdown formatting outside the JSON.
        """
        model_name = "gemini-2.0-flash" if ai_provider == "gemini" else "gpt-4-turbo-preview" if ai_provider == "openai" else "claude-3-opus-20240229"  # Models best for structured output

        # Call AI model to get JSON response
        ai_response_text = self._call_ai_model(ai_provider, model_name, prompt, api_key)

        print(f"Raw AI response for profile fill: {ai_response_text}")

        # Parse the JSON response
        try:
            parsed_profile = parse_response_to_json(ai_response_text)
            print(f"Parsed profile data from AI: {parsed_profile}")
            return parsed_profile
        except ValueError as e:
            raise Exception(
                f"Failed to parse AI response into JSON for profile: {e}. Raw AI response: {ai_response_text}")

    def _format_profile_for_prompt(self, profile_data: Dict[str, Any]) -> str:
        """Formats the user profile dictionary into a readable string for AI prompts."""
        formatted_str = "--- User Profile ---\n"
        for key, value in profile_data.items():
            if value:  # Only include non-empty fields
                if isinstance(value, list) and key in ['education', 'experience', 'skills', 'languages',
                                                       'certifications']:
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

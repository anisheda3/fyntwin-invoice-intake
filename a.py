from google import genai
from backend.config import get_settings

settings = get_settings()
client = genai.Client(api_key=settings.gemini_api_key)
for model in client.models.list():
    if "embedContent" in model.supported_actions:
        print(model.name)
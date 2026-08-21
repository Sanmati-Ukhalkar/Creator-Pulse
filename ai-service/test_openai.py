import os
import sys
from openai import OpenAI

# Load env variables manually from .env
with open(".env", "r") as f:
    for line in f:
        if line.strip() and not line.startswith("#"):
            k, v = line.strip().split("=", 1)
            os.environ[k] = v

api_key = os.environ.get("OPENAI_API_KEY")
print("API Key starts with:", api_key[:15] if api_key else "None")

client = OpenAI(api_key=api_key)

try:
    print("Sending test request to OpenAI...")
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": "Hello! Respond with 'OK' if you see this."}
        ]
    )
    print("Response:", completion.choices[0].message.content)
except Exception as e:
    print("Error calling OpenAI:", e)

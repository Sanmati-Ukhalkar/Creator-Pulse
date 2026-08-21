import os
import sys

# Load env variables manually from .env
with open(".env", "r") as f:
    for line in f:
        if line.strip() and not line.startswith("#"):
            k, v = line.strip().split("=", 1)
            os.environ[k] = v

print("Importing langchain...")
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

print("Initializing ChatOpenAI...")
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

print("Invoking ChatOpenAI...")
res = llm.invoke([HumanMessage(content="Hello! Respond with OK.")])
print("Response:", res.content)

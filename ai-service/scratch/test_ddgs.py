import asyncio
from duckduckgo_search import DDGS

def test_ddgs():
    try:
        print("Testing DDGS text search...")
        with DDGS() as ddgs:
            results = list(ddgs.text("AI in healthcare news", max_results=5, safesearch='off'))
        print(f"Got {len(results)} results!")
        for r in results:
            print(r['title'])
    except Exception as e:
        print(f"Error: {e}")

test_ddgs()

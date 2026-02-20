import httpx
from bs4 import BeautifulSoup
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)


async def scrape_article(url: str) -> dict:
    """
    Scrape and clean an article from a URL.
    
    Extracts the main content, removes navigation/scripts/ads,
    and returns clean text suitable for LLM context.
    
    Returns:
        dict with keys: title, content, word_count
        Returns empty values on failure (never crashes).
    """
    settings = get_settings()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                url,
                headers={
                    "User-Agent": "CreatorPulse/1.0 (Content Research Bot)"
                },
                follow_redirects=True,
            )
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "lxml")

        # Remove unwanted elements that add noise
        for tag in soup(
            [
                "script", "style", "nav", "header", "footer",
                "aside", "form", "iframe", "noscript", "svg",
                "button", "input", "select", "textarea",
            ]
        ):
            tag.decompose()

        # Extract title (try multiple sources)
        title = ""
        if soup.title and soup.title.string:
            title = soup.title.string
        elif soup.find("h1"):
            title = soup.find("h1").get_text(strip=True)

        # Extract main content (priority: article > main > body)
        content_tag = (
            soup.find("article")
            or soup.find("main")
            or soup.find("body")
        )

        if not content_tag:
            return {"title": title, "content": "", "word_count": 0}

        # Get clean text from semantic elements
        paragraphs = content_tag.find_all(["p", "h2", "h3", "h4", "li", "blockquote"])
        content = "\n\n".join(
            p.get_text(strip=True)
            for p in paragraphs
            if p.get_text(strip=True) and len(p.get_text(strip=True)) > 20
        )

        # Truncate if too long for LLM context
        if len(content) > settings.MAX_ARTICLE_LENGTH:
            content = content[: settings.MAX_ARTICLE_LENGTH] + "..."

        return {
            "title": title.strip(),
            "content": content,
            "word_count": len(content.split()),
        }

    except httpx.HTTPError as e:
        logger.warning(f"Failed to scrape {url}: {e}")
        return {"title": "", "content": "", "word_count": 0}
    except Exception as e:
        logger.error(f"Scraper error for {url}: {e}")
        return {"title": "", "content": "", "word_count": 0}

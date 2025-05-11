from newspaper import Article
import json

urls = [
    "https://genius.com/Rihanna-work-lyrics",
    "https://genius.com/Drake-in-my-feelings-lyrics",
    "https://genius.com/Drake-gods-plan-lyrics" ,
    "https://genius.com/Drake-hotline-bling-lyrics",
    "https://genius.com/Drake-hold-on-were-going-home-lyrics"
    "https://genius.com/Travis-scott-goosebumps-lyrics",
    "https://genius.com/Travis-scott-highest-in-the-room-lyrics",
    "https://genius.com/Travis-scott-stargazing-lyrics",
    "https://genius.com/Travis-scott-90210-lyrics"




    # Add more URLs here
]

scraped_articles = []

for url in urls:
    try:
        article = Article(url)
        article.download()
        article.parse()

        title = article.title.strip() if article.title else "Untitled"
        text = article.text.strip()

        if not text:
            raise ValueError("No text content extracted")

        scraped_articles.append({
            "title": title,
            "text": text,
            "url": url
        })

        print(f"✅ Scraped: {title}")

    except Exception as e:
        print(f"❌ Failed to scrape {url} — {type(e).__name__}: {e}")

# Save to file
with open("articles.json", "w", encoding="utf-8") as f:
    json.dump(scraped_articles, f, indent=2, ensure_ascii=False)

print(f"\n✅ Saved {len(scraped_articles)} articles to articles.json")

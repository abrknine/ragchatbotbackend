from newspaper import Article
import json

urls = [
    "https://www.bbc.com/news/articles/cx202gvxgj7o",
    "https://www.bbc.com/news/articles/clyzg8ygeezo",
    "https://www.bbc.com/news/articles/cwy6w6507wqo",
    "https://www.bbc.com/news/topics/cx3ezqn30pmt",
    "https://www.bbc.com/news/articles/clyn617xv4no",
    "https://www.bbc.com/news/articles/cj6868pdpw4o",
    "https://www.bbc.com/news/articles/cd020710v1ko",
    "https://www.bbc.com/news/articles/cjrndypy3l4o",
    "https://www.bbc.com/news/articles/cvg9d913v20o",
    "https://www.bbc.com/news/live/cwy3jnl3nvwt",
    "https://www.bbc.com/news/live/cwyneele13qt",
    "https://www.bbc.com/news/articles/c30q09638n8o",
    "https://www.bbc.com/news/articles/c62g2d3xlj2o",
    "https://www.bbc.com/news/articles/cd7v7pdr095o",
    "https://www.bbc.co.uk/news/live/cwyneele13qt?page=4",
    "https://www.bbc.com/news/videos/cx262wl9z91o",
    "https://www.bbc.com/news/articles/c78j8vdlg38o",
    "https://www.bbc.com/sport/cricket/articles/ce8g8xkv3m5o",
    "https://www.bbc.com/news/articles/cn4wk22vk4zo",
    "https://www.bbc.com/news/articles/c93g3jk39dko",
    "https://www.bbc.com/news/world/asia/india",
    "https://www.bbc.co.uk/newsround/articles/c30q0j4lrggo",
    "https://www.bbc.com/news/articles/cjewen7w192o",
    "https://www.bbc.com/news/topics/czl084npwj2t",
    "https://www.bbc.com/news/articles/c0l0l21x9n1o",
    "https://www.bbc.com/news/articles/cvgnw9kydgqo",
    "https://www.bbc.com/news/articles/c39j3p14mg4o",
    "https://www.bbc.com/news/articles/cwynx7kgyqvo",
    "https://www.bbc.com/news/articles/ce8g2njm2d2o",
    "https://www.bbc.com/news/topics/c008ql15vpyt",
    "https://www.bbc.com/news/articles/cgjlxxd5vvjo",
    "https://www.bbc.com/news/world-south-asia-11693674",
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

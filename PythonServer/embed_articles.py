from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import json

# === Load your scraped articles ===
with open("articles.json", "r", encoding="utf-8") as f:
    articles = json.load(f)

# === Load sentence-transformer model (384-d vectors) ===
model = SentenceTransformer("all-MiniLM-L6-v2")  # Fast and lightweight

# === Connect to Qdrant Cloud ===
qdrant = QdrantClient(
    url="https://bb9fbc81-0ff2-48dd-a79e-05363cb09f2d.us-west-1-0.aws.cloud.qdrant.io",
    api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.tIUqiAefdWs7Ok1KnQBZNKYKQnOMOUIAZ3LsPU3_xH4"
) 

collection_name = "history-articles"
embedding_dim = 384

# === Create collection if not exists ===
if not qdrant.collection_exists(collection_name):
    qdrant.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=embedding_dim, distance=Distance.COSINE),
    )

# === Prepare and encode points ===
points = []
for i, article in enumerate(articles):
    try:
        vector = model.encode(article["text"])
        points.append(
            PointStruct(
                id=i,
                vector=vector,
                payload={
                    "title": article.get("title", ""),
                    "text": article.get("text", ""),
                    "url": article.get("url", "")
                }
            )
        )
    except Exception as e:
        print(f"❌ Skipped article #{i} due to error: {e}")

# === Helper: Batch points ===
def batch(iterable, batch_size=100):
    for i in range(0, len(iterable), batch_size):
        yield iterable[i:i + batch_size]

# === Upload to Qdrant in batches ===
if points:
    for i, batch_points in enumerate(batch(points, batch_size=100)):
        try:
            qdrant.upsert(collection_name=collection_name, points=batch_points)
            print(f"✅ Uploaded batch #{i+1} with {len(batch_points)} points")
        except Exception as e:
            print(f"❌ Failed to upload batch #{i+1}: {e}")
else:
    print("⚠️ No points to upload.")

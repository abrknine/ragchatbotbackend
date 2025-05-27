# filename: main.py
from fastapi import FastAPI, Request
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import SearchRequest, Filter, FieldCondition, MatchValue
import uvicorn

# === Setup ===
app = FastAPI()
model = SentenceTransformer("all-MiniLM-L6-v2")
qdrant = QdrantClient(
    url="https://bb9fbc81-0ff2-48dd-a79e-05363cb09f2d.us-west-1-0.aws.cloud.qdrant.io",
    api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.tIUqiAefdWs7Ok1KnQBZNKYKQnOMOUIAZ3LsPU3_xH4"
)
collection_name = "history-articles"

# === Data Models ===
class QueryRequest(BaseModel):
    prompt: str
    top_k: int = 2

# === Routes ===
@app.post("/embed")
async def embed_text(req: QueryRequest):
    vector = model.encode(req.prompt).tolist()
    return {"vector": vector}

@app.post("/search")
async def search_text(req: QueryRequest):
    vector = model.encode(req.prompt).tolist()
    hits = qdrant.search(
        collection_name=collection_name,
        query_vector=vector,
        limit=req.top_k  
    )
    return {
        "results": [
            {"score": hit.score, "payload": hit.payload}
            for hit in hits
        ]
    }

# === Run ===
# Use this for local testing, or run with uvicorn CLI
# uvicorn main:app --reload --port 8000
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

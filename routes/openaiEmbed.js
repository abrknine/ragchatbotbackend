const express = require('express');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // use if not using Node 18+
require('dotenv').config();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const COLLECTION_NAME = 'pixelai-services';
const EMBEDDING_DIM = 1536;
const QDRANT_URL = 'https://bb9fbc81-0ff2-48dd-a79e-05363cb09f2d.us-west-1-0.aws.cloud.qdrant.io';

router.post('/embed-and-upload', async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../service.json');
    const services = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(services);

    const points = await Promise.all(
      services.map(async (service, index) => {
        const content = `${service.title}\n${service.description}\n${service.features.join(', ')}`;
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: content,
        });

        return {
          id: index,
          vector: embeddingResponse.data[0].embedding,
          payload: {
            title: service.title,
            description: service.description,
            features: service.features,
          },
        };
      })
    );

    // Optional: Delete and recreate collection to ensure it's fresh
    await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
      method: 'DELETE',
      headers: {
        'api-key': process.env.QDRANT_API_KEY,
      },
    });

    await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
      method: 'PUT',
      headers: {
        'api-key': process.env.QDRANT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vectors: {
          size: EMBEDDING_DIM,
          distance: 'Cosine',
        },
      }),
    });

    // Upload points via PUT
    const uploadResponse = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points`, {
      method: 'PUT',
      headers: {
        'api-key': process.env.QDRANT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ points }),
    });

    const uploadResult = await uploadResponse.json();

    res.json({ success: true, message: 'Services embedded and uploaded to Qdrant successfully.', uploadResult });
  } catch (error) {
    console.error('❌ Error in /embed-and-upload:', error.message);
    res.status(500).json({ error: 'Failed to embed and upload services.', details: error.message });
  }
});

router.post('/search', async (req, res) => {
  const { prompt, top_k = 2 } = req.body;
     

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const embedRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: prompt,
    });

    const [{ embedding }] = embedRes.data;

    const searchResponse = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/search`, {
      method: 'POST',
      headers: {
        'api-key': process.env.QDRANT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vector: embedding,
        limit: top_k,
        with_payload: true,
      }),
    });

    const searchResult = await searchResponse.json();

    res.json({ results: searchResult.result || [] });
  } catch (error) {
    console.error('❌ Error in /search:', error.message);
    res.status(500).json({ error: 'Failed to search in Qdrant', details: error.message });
  }
});

module.exports = router;

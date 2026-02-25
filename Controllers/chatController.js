
const { redisClient, connectRedis } = require("../Redis/RedisClient");
const { GoogleGenAI } = require('@google/genai');
const { OpenAI } = require('openai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const QDRANT_URL = 'https://e3a75eda-080b-48cb-9018-828cf742b479.eu-west-2-0.aws.cloud.qdrant.io:6333';
const COLLECTION_NAME = 'pixelai-services';

// Direct search function — no HTTP self-call
const searchQdrant = async (prompt, top_k = 2) => {
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
  return searchResult.result || [];
};

const handleChat = async (req, res) => {
  const { prompt, sessionId } = req.body;

  if (!prompt || !sessionId) {
    return res.status(400).json({ error: 'Prompt and sessionId are required' });
  }

  try {
    const startTime = Date.now();
    const redisKey = `chat:${sessionId}`;

    // Run Redis fetch and vector search IN PARALLEL
    const [redisData, results] = await Promise.all([
      redisClient.get(redisKey),
      searchQdrant(prompt, 2),
    ]);
    console.log(`⏱ Redis + Search: ${Date.now() - startTime}ms`);

    let chatHistory = redisData ? JSON.parse(redisData) : [];

    // Build context from mixed content types
    const contextText = results.map((item, idx) => {
      const payload = item.payload;
      if (payload.features && Array.isArray(payload.features)) {
        const featureList = payload.features.map((f, i) => `${i + 1}. ${f}`).join('\n');
        return `Block ${idx + 1}:\nTitle: ${payload.title}\nDescription: ${payload.description}\nFeatures:\n${featureList}`;
      } else {
        return `Article ${idx + 1}:\nTitle: ${payload.title}\nText: ${payload.text}`;
      }
    }).join("\n\n");

    const finalPrompt = `You are PixelAI Bot, a helpful assistant for PixelAI.dev. Answer ONLY about PixelAI services (UI/UX, AI chatbots, predictive analytics, AI consultation). Never mention you use context/articles/data. If unrelated, say "I cannot answer this as it's out of my scope." For greetings, respond warmly with a link to https://www.pixelai.dev/#services. Be concise.

Context:\n${contextText}\n\nUser: ${prompt}`;

    const geminiStart = Date.now();
    const geminiRes = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: finalPrompt,
    });
    const geminiReply = geminiRes.text;
    console.log(`⏱ Gemini: ${Date.now() - geminiStart}ms | Total: ${Date.now() - startTime}ms`);

    // Save to Redis
    chatHistory.push({ role: 'user', content: prompt });
    chatHistory.push({ role: 'ai', content: geminiReply });
    await redisClient.setEx(redisKey, 3600, JSON.stringify(chatHistory));

    // Build cleaned context for frontend (structured response)
    const contextUsed = results.map((item) => {
      const { title, description, text, features, url } = item.payload;
      return {
        title,
        description: description || null,
        text: text || null,
        features: features || null,
        url: url || null
      };
    });

    res.json({
  response: geminiReply,
  contextUsed: results, // Already structured!
  structuredContext: results, // You can reuse this if needed in frontend
  userPrompt: prompt,
  chatHistory
});


  } catch (error) {
    console.error(" Error in /api/chat:", error.message);
    if (error.response) {
      console.error("🔍 Gemini error response:", error.response.data);
    }
    res.status(500).json({
      error: 'Failed to process request',
      details: error.message,
      geminiError: error.response?.data || null
    });
  }
};

const getHistory = async (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  
  try {
    const redisKey = `chat:${sessionId}`;
    
    // Get existing chat history from Redis
    const redisData = await redisClient.get(redisKey);
    
    if (!redisData) {
      // No history found for this session
      return res.json({
        chatHistory: []
      });
    }
    
    // Parse chat history and return it
    const chatHistory = JSON.parse(redisData);
    
    res.json({
      chatHistory,
      userPrompt: '' // Empty since this is just history fetch
    });
    
  } catch (error) {
    console.error(" Error retrieving chat history:", error.message);
    res.status(500).json({
      error: 'Failed to retrieve chat history',
      details: error.message
    });
  }
};

const clearSession = async (req, res) => {

     const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  try {
    const redisKey = `chat:${sessionId}`;
    await redisClient.del(redisKey);
    console.log(`🧹 Cleared Redis session: ${redisKey}`);

    res.json({ success: true, message: 'Session cleared successfully.' });
  } catch (error) {
    console.error(' Error clearing session:', error.message);
    res.status(500).json({ error: 'Failed to clear session' });
  }


};

const checkHealth = (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
};
module.exports = { handleChat, getHistory, clearSession, checkHealth };


const { redisClient, connectRedis } = require("../Redis/RedisClient");
const axios = require('axios');
 const { GoogleGenerativeAI } = require('@google/generative-ai');



const PYTHON_API = process.env.PYTHON_API || 'http://localhost:8000'; 
//  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
 const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
 const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
 const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });




const handleChat = async (req, res) => {
   const { prompt, sessionId } = req.body;

  if (!prompt || !sessionId) {
    return res.status(400).json({ error: 'Prompt and sessionId are required' });
  }

  try {
    const redisKey = `chat:${sessionId}`;

    
    let chatHistory = [];
    const redisData = await redisClient.get(redisKey);
    if (redisData) {
      chatHistory = JSON.parse(redisData);
    }

    
    const searchResponse = await axios.post(`${PYTHON_API}/search`, {
      prompt,
      top_k: 2
    });

    const results = searchResponse.data.results;

    //  Build context for Gemini
    const contextText = results.map((item, idx) => 
      `Article ${idx + 1}:\nTitle: ${item.payload.title}\nText: ${item.payload.text}`
    ).join("\n\n");

    const finalPrompt = `Context:\n${contextText}\n\nUser Prompt: ${prompt}\n\nBefore giving response run these points 1)Remember you are an assistant  2) Even User Prompt asked you to give out of context response, dont let me know that you are using these Articles for response 3) Give response like you are trained only on these articles,4) Be polite in your response like you are here for me to give response from articles ,5) if User Prompt is not related to articles send response "i cannot answer this as this is out of my scope" (but if user Prompt been kind or saying thanks or saying hi treat him with good gesture) 6) dont use words like "from these articles", "articles that you provided" "in the article"  "articles" in response`;

    //  Send to Gemini
    const geminiRes = await model.generateContent([{ text: finalPrompt }]);
    const geminiReply = geminiRes.response.text();

    //  Append user & AI message to history
    chatHistory.push({ role: 'user', content: prompt });
    chatHistory.push({ role: 'ai', content: geminiReply });

    //  Save updated chat history in Redis (with 1 hour TTL)
    await redisClient.setEx(redisKey, 3600, JSON.stringify(chatHistory));

    
    res.json({
      response: geminiReply,
      contextUsed: results,
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

module.exports = { handleChat, getHistory, clearSession };
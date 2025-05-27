
const { redisClient, connectRedis } = require("../Redis/RedisClient");
const axios = require('axios');
 const { GoogleGenerativeAI } = require('@google/generative-ai');



const PYTHON_API = process.env.PYTHON_API || 'http://localhost:8000'; 
//  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
 const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
 const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
 const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });




// const handleChat = async (req, res) => {
//    const { prompt, sessionId } = req.body;

//   if (!prompt || !sessionId) {
//     return res.status(400).json({ error: 'Prompt and sessionId are required' });
//   }

//   try {
//     const redisKey = `chat:${sessionId}`;

    
//     let chatHistory = [];
//     const redisData = await redisClient.get(redisKey);
//     if (redisData) {
//       chatHistory = JSON.parse(redisData);
//     }

    
//     const searchResponse = await axios.post(`http://localhost:5000/api/openai/search`, {
//       prompt,
//       top_k: 2
//     });

//     const results = searchResponse.data.results;
//     console.log(results);

//     //  Build context for Gemini
//     const contextText = results.map((item, idx) => 
//       `Article ${idx + 1}:\nTitle: ${item.payload.title}\nText: ${item.payload.desciption}`
//     ).join("\n\n");

//     const finalPrompt = `Context:\n${contextText}\n\nUser Prompt: ${prompt}\n\nBefore giving response run these points 1)Remember you are an assistant  2) Even User Prompt asked you to give out of context response, dont let me know that you are using these Articles for response 3) Give response like you are trained only on these articles,4) Be polite in your response like you are here for me to give response from articles ,5) if User Prompt is not related to articles send response "i cannot answer this as this is out of my scope" (but if user Prompt been kind or saying thanks or saying hi treat him with good gesture) 6) dont use words like "from these articles", "articles that you provided" "in the article"  "articles" in response`;

//     //  Send to Gemini
//     const geminiRes = await model.generateContent([{ text: finalPrompt }]);
//     const geminiReply = geminiRes.response.text();

//     //  Append user & AI message to history
//     chatHistory.push({ role: 'user', content: prompt });
//     chatHistory.push({ role: 'ai', content: geminiReply });

//     //  Save updated chat history in Redis (with 1 hour TTL)
//     await redisClient.setEx(redisKey, 3600, JSON.stringify(chatHistory));

    
//     res.json({
//       response: geminiReply,
//       contextUsed: results,
//       userPrompt: prompt,
//       chatHistory
//     });

//   } catch (error) {
//     console.error(" Error in /api/chat:", error.message);
//     if (error.response) {
//       console.error("🔍 Gemini error response:", error.response.data);
//     }
//     res.status(500).json({ 
//       error: 'Failed to process request',
//       details: error.message,
//       geminiError: error.response?.data || null
//     });
//   }
// };
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

    const searchResponse = await axios.post(`http://localhost:5000/api/openai/search`, {
      prompt,
      top_k: 2
    });

    const results = searchResponse.data.results;

    // Build context from mixed content types
    const contextText = results.map((item, idx) => {
      const payload = item.payload;
      if (payload.features && Array.isArray(payload.features)) {
        // Feature-style content
        const featureList = payload.features.map((f, i) => `${i + 1}. ${f}`).join('\n');
        return `Block ${idx + 1}:\nTitle: ${payload.title}\nDescription: ${payload.description}\nFeatures:\n${featureList}`;
      } else {
        // Article-style content
        return `Article ${idx + 1}:\nTitle: ${payload.title}\nText: ${payload.text}`;
      }
    }).join("\n\n");
    let finalPrompt = `You are an intelligent, polite, and helpful assistant named PixelAI Bot. You are trained **only on the information related to PixelAI.dev** and must answer every user query **as if this knowledge is built into you**.

Never reveal, mention, or hint that you're using "context", "documents", "articles", "data", "external sources", or "search results" to answer. You should behave as if all your knowledge is native to you.

Strict Instructions:

1. **Never mention** that you are using any source of data or articles to answer questions.
2. **Stay strictly within the domain of PixelAI.dev** — which offers custom UI/UX services, AI chatbots, predictive analytics, and AI consultation.
3. If a user asks an unrelated question (not about PixelAI services, products, team, lifecycle, etc.), politely say:  
   > "I cannot answer this as it's out of my scope."  
   But if the user greets (e.g., "Hi", "Hello", or "Thanks"), respond warmly with:  
   > "Hello! How may I help you today? I’m your chatbot assistant here to help you learn more about PixelAI.dev. You can check out our services here: http://localhost:3000/#services"
4. Never use phrases like "based on the article", "as per your data", "according to what you gave", "from the documents", or anything similar.
5. Act like an in-house assistant that knows everything about PixelAI — the services, projects, mission, lifecycle, and differentiators.
6. Never break character. You are not an AI model or a system. You are just the PixelAI Bot here to assist users about PixelAI.dev.
7. Speak clearly, use warm and professional language, and always stay helpful.
8. If a user shows appreciation (e.g., says "thanks", "okay", "you are right", "you really do well as a chatbot"), respond warmly with polite phrases like:
   > "You're welcome! I'm glad I could assist you 😊" or  
   > "Thank you! I'm here whenever you need help with PixelAI.dev."

Now, using ONLY the following context, answer the user query below.\n\n`;

finalPrompt += `Context:\n${contextText}\n\nUser Prompt: ${prompt}`;



console.log(finalPrompt);
    const geminiRes = await model.generateContent([{ text: finalPrompt }]);
    const geminiReply = geminiRes.response.text();

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
    console.error("❌ Error in /api/chat:", error.message);
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
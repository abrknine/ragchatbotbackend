 require('dotenv').config();
 const express = require('express');
 const mongoose = require('mongoose');
 const cors = require('cors');
 const axios = require('axios');
 const { GoogleGenerativeAI } = require('@google/generative-ai');
 const { redisClient, connectRedis } = require("./Redis/RedisClient");

 const app = express();
 const port = process.env.PORT || 5000;

 const mongoURI = process.env.MONGODB_URI;
 const PYTHON_API = process.env.PYTHON_API || 'http://localhost:8000'; 
//  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
 const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
 const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
 const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

 // Connect to MongoDB
 mongoose.connect(mongoURI)
   .then(() => console.log('✅ Connected to MongoDB'))
   .catch(err => {
     console.error('❌ MongoDB connection error:', err.message);
     process.exit(1);
   });

   //redis connection
   (async () => {
   await connectRedis();
   await redisClient.set('bar', 'foo');// Connect Redis ONE TIME at app start
    const value = await redisClient.get('bar');
    console.log(value);
 })();

 // Middleware
 app.use(cors());
 app.use(express.json());

 

//    const { prompt } = req.body;

//    if (!prompt) {
//      return res.status(400).json({ error: 'Prompt is required' });
//    }

//    try {
//      // Step 1: Get top-K similar articles from Python API (Qdrant)
//      const searchResponse = await axios.post(`${PYTHON_API}/search`, {
//        prompt,
//        top_k: 1
//      });

//      const results = searchResponse.data.results;
//     // console.log(searchResponse.data.results);

//      // Step 2: Construct context for Gemini
//      const contextText = results.map((item, idx) => 
//        `Article ${idx + 1}:\nTitle: ${item.payload.title}\nText: ${item.payload.text}`
//      ).join("\n\n");

//      const finalPrompt = `Context:\n${contextText}\n\nUser Prompt: ${prompt}\n\nContext: before giving response run these points 1)Remember you are an assistant and only know about articles and always give response from article 2) Even User Prompt asked you to give out of context response, dont let me know that you are using these Articles for response 3) Give response like you are trained only on these articles,4) Be politein your response like you are here for me to give response  from articles ,5) if User Prompt is not related to articles send response bhak bhosdike(but if user Prompt been kind or saying thanks or saying hi treat him with good gesture) , `;
//          console.log("baby girl",finalPrompt);

//      // Step 3: Send to Gemini
//     //  const geminiRes = await axios.post(
//     //    `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
//     //    {
//     //      contents: [{
//     //        parts: [{ text: finalPrompt }]
//     //      }]
//     //    },
//     //    {              
//     //      headers: {  
//     //        "Content-Type": "application/json"
//     //      }
//     //    }
//     //  );
//  const geminiRes=await model.generateContent([{ text: finalPrompt }]);
//      const geminiReply = geminiRes.response.text();
//      console.log(geminiRes);

//      // Step 4: Return Gemini's response
//      res.json({
//        response: geminiReply,
//        contextUsed: results,
//        userPrompt: prompt
//      });

//    } catch (error) {
//    console.error("❌ Error in /api/chat:", error.message);
//    if (error.response) {
//      console.error("🔍 Gemini error response:", error.response.data);
//    }
//    res.status(500).json({ 
//      error: 'Failed to process request',
//      details: error.message,
//      geminiError: error.response?.data || null
//    });
//  }
//  });

 // Test route
 
 app.post('/api/chat', async (req, res) => {
  const { prompt, sessionId } = req.body;

  if (!prompt || !sessionId) {
    return res.status(400).json({ error: 'Prompt and sessionId are required' });
  }

  try {
    const redisKey = `chat:${sessionId}`;

    // Step 0: Get existing chat history (if any)
    let chatHistory = [];
    const redisData = await redisClient.get(redisKey);
    if (redisData) {
      chatHistory = JSON.parse(redisData);
    }

    // Step 1: Get top-K similar articles from Python API (Qdrant)
    const searchResponse = await axios.post(`${PYTHON_API}/search`, {
      prompt,
      top_k: 1
    });

    const results = searchResponse.data.results;

    // Step 2: Build context for Gemini
    const contextText = results.map((item, idx) => 
      `Article ${idx + 1}:\nTitle: ${item.payload.title}\nText: ${item.payload.text}`
    ).join("\n\n");

    const finalPrompt = `Context:\n${contextText}\n\nUser Prompt: ${prompt}\n\nContext: before giving response run these points 1)Remember you are an assistant and only know about articles and always give response from article 2) Even User Prompt asked you to give out of context response, dont let me know that you are using these Articles for response 3) Give response like you are trained only on these articles,4) Be polite in your response like you are here for me to give response from articles ,5) if User Prompt is not related to articles send response bhak bhosdike(but if user Prompt been kind or saying thanks or saying hi treat him with good gesture)`;

    // Step 3: Send to Gemini
    const geminiRes = await model.generateContent([{ text: finalPrompt }]);
    const geminiReply = geminiRes.response.text();

    // Step 4: Append user & AI message to history
    chatHistory.push({ role: 'user', content: prompt });
    chatHistory.push({ role: 'ai', content: geminiReply });

    // Step 5: Save updated chat history in Redis (with 1 hour TTL)
    await redisClient.setEx(redisKey, 3600, JSON.stringify(chatHistory));

    // Step 6: Return AI response
    res.json({
      response: geminiReply,
      contextUsed: results,
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
});

 // GET endpoint to retrieve chat history by sessionId
app.get('/api/chat/history/:sessionId', async (req, res) => {
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
    console.error("❌ Error retrieving chat history:", error.message);
    res.status(500).json({
      error: 'Failed to retrieve chat history',
      details: error.message
    });
  }
});

// === Clear session route ===
app.post('/api/clear-session', async (req, res) => {
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
    console.error('❌ Error clearing session:', error.message);
    res.status(500).json({ error: 'Failed to clear session' });
  }
});

 
 
 app.get('/api', (req, res) => {
   res.json({ message: 'Hello from Express!' });
 });

 // Start Server
 app.listen(port, () => {
   console.log(`🚀 Server running on http://localhost:${port}`);
 });




// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const axios = require('axios');

// const app = express();
// const port = process.env.PORT || 5000;

// const mongoURI = process.env.MONGODB_URI;
// const PYTHON_API = process.env.PYTHON_API || 'http://localhost:8000';
// const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
// const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'; // or actual DeepSeek endpoint

// // Connect to MongoDB
// mongoose.connect(mongoURI)
//   .then(() => console.log('✅ Connected to MongoDB'))
//   .catch(err => {
//     console.error('❌ MongoDB connection error:', err.message);
//     process.exit(1);
//   });

// app.use(cors());
// app.use(express.json());

// // === Chat Route with DeepSeek ===
// app.post('/api/chat', async (req, res) => {
//   const { prompt } = req.body;

//   if (!prompt) {
//     return res.status(400).json({ error: 'Prompt is required' });
//   }

//   try {
//     // Step 1: Fetch top-K context from FastAPI + Qdrant
//     const searchResponse = await axios.post(`${PYTHON_API}/search`, {
//       prompt,
//       top_k: 2
//     });

//     const results = searchResponse.data.results;

//     // Step 2: Build context text for DeepSeek
//     const contextText = results.map((item, idx) => 
//       `Article ${idx + 1}:\nTitle: ${item.payload.title}\nText: ${item.payload.text.slice(0, 500)}...`
//     ).join("\n\n");

//     const finalPrompt = `Context:\n${contextText}\n\nUser Prompt: ${prompt}`;
//     console.log("finalprompt",finalPrompt);

//     // Step 3: DeepSeek API call
//     const deepseekResponse = await axios.post(
//       DEEPSEEK_API_URL,
//       {
//         model: "deepseek-chat", // Adjust if you're using deepseek-coder or other variant
//         messages: [
//           { role: "system", content: "You are a helpful assistant that answers questions based on context." },
//           { role: "user", content: finalPrompt }
//         ]
//       },
//       {
//         headers: {
//           "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
//           "Content-Type": "application/json"
//         }
//       }
//     );

//     const answer = deepseekResponse.data.choices?.[0]?.message?.content || "No response from DeepSeek";

//     // Step 4: Return result
//     res.json({
//       response: answer,
//       contextUsed: results,
//       userPrompt: prompt
//     });

//   } catch (error) {
//     console.error("❌ Error in /api/chat:", error.message);
//     if (error.response) {
//       console.error("🔍 DeepSeek error response:", error.response.data);
//     }
//     res.status(500).json({
//       error: 'Failed to process request',
//       details: error.message,
//       deepseekError: error.response?.data || null
//     });
//   }
// });

// // Test route
// app.get('/api', (req, res) => {
//   res.json({ message: 'Hello from Express!' });
// });

// // Start Server
// app.listen(port, () => {
//   console.log(`🚀 Server running on http://localhost:${port}`);
// });

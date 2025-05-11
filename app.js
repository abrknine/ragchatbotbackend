 require('dotenv').config();
 const express = require('express');
 const mongoose = require('mongoose');
 const cors = require('cors');
 const { redisClient, connectRedis } = require("./Redis/RedisClient");
 const routes = require('./routes/ChatRoute');



 const app = express();
 const port = process.env.PORT || 5000;
 const mongoURI = process.env.MONGODB_URI;
 

 

 // Connect to MongoDB
 mongoose.connect(mongoURI)
   .then(() => console.log(' Connected to MongoDB'))
   .catch(err => {
     console.error(' MongoDB connection error:', err.message);
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

 


 
 
 app.use('/api/chat',  routes);


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

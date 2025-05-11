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
 
 app.use(express.json());


 const allowedOrigins = [
  "http://localhost:5173",         // dev
   // production frontend
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));


 


 
 
 app.use('/api/chat',  routes);


 app.get('/api', (req, res) => {
   res.json({ message: 'Hello from Express!' });
 });
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});


 // Start Server
 app.listen(port, () => {
   console.log(`Server running on port ${port}`);
 });



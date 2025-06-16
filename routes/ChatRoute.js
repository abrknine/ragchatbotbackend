const express = require('express');
const router = express.Router();
const { 
  handleChat, 
  getHistory, 
  clearSession ,
  checkHealth
} = require('../Controllers/chatController');

router.post('/', handleChat);
router.get('/history/:sessionId', getHistory);
router.post('/clear-session', clearSession);
router.get('/health', checkHealth);


module.exports = router;
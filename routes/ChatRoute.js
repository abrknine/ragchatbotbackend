const express = require('express');
const router = express.Router();
const { 
  handleChat, 
  getHistory, 
  clearSession 
} = require('../Controllers/chatController');

router.post('/', handleChat);
router.get('/history/:sessionId', getHistory);
router.post('/clear-session', clearSession);

module.exports = router;


import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Trash2 } from 'lucide-react';

export default function ChatbotUI() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [chatData, setChatData] = useState({
    response: '',
    contextUsed: [],
    userPrompt: '',
    chatHistory: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isClearingSession, setIsClearingSession] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Generate or retrieve sessionId on component mount
  useEffect(() => {
    // Check if sessionId exists in localStorage
    let existingSessionId = localStorage.getItem('chatSessionId');
    
    // If no sessionId, generate a temporary one (we'll use a timestamp + random string for now)
    if (!existingSessionId) {
      existingSessionId = `temp-user-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem('chatSessionId', existingSessionId);
    }
    
    setSessionId(existingSessionId);
  }, []);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 300);
    }
  }, [isOpen]);

  // Auto scroll to bottom when chat history changes
  useEffect(() => {
    scrollToBottom();
  }, [chatData.chatHistory]);

  // Initial fetch of chat history when component mounts and chat opens
  useEffect(() => {
    if (isOpen && sessionId) {
      fetchInitialChatHistory();
    }
  }, [isOpen, sessionId]);

  const fetchInitialChatHistory = async () => {
    if (!sessionId) return;
    
    try {
      // Call an API endpoint dedicated to retrieving chat history
      const response = await fetch(`https://ragchatbotbackend.onrender.com/api/chat/history/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      if (data.chatHistory && data.chatHistory.length > 0) {
        setChatData(data);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // 🔥 Warm up backend server when sessionId becomes available
useEffect(() => {
  console.log('Warmup effect triggered with sessionId:', sessionId);
  if (sessionId) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    fetch('https://ragchatbotbackend.onrender.com/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'hi',
        sessionId: sessionId,
      }),
      signal: controller.signal,
    })
      .then((response) => {
        console.log('Warmup request status:', response.status);
        clearTimeout(timeoutId);
        return response.json();
      })
      .then((data) => {
        console.log('Warmup request response:', data);
      })
      .catch((err) => {
        console.error('Warmup request failed:', err.message);
      });
  }
}, [sessionId]);



  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !sessionId) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // Call your backend API with prompt and sessionId
      const response = await fetch('https://ragchatbotbackend.onrender.com/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: userMessage,
          sessionId: sessionId 
        }),
      });
      
      const data = await response.json();
      
      // Update chat data with new response from API
      setChatData(data);
    } catch (error) {
      console.error('Error:', error);
      // Append error message to chat history
      setChatData(prev => ({
        ...prev,
        chatHistory: [
          ...(prev.chatHistory || []),
          { role: 'user', content: userMessage },
          { role: 'ai', content: 'Sorry, I encountered an error processing your request.' }
        ]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSession = async () => {
    if (!sessionId || isClearingSession) return;
    
    setIsClearingSession(true);
    
    try {
      // Call the clear session API endpoint
      const response = await fetch('https://ragchatbotbackend.onrender.com/api/chat/clear-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Clear the chat history in UI
        setChatData({
          response: '',
          contextUsed: [],
          userPrompt: '',
          chatHistory: []
        });
      } else {
        console.error('Failed to clear session:', data.error);
      }
    } catch (error) {
      console.error('Error clearing session:', error);
    } finally {
      setIsClearingSession(false);
    }
  };

  // Animation classes
  const chatContainerClasses = `fixed bottom-4 right-4 z-50 flex flex-col transition-all duration-300 ease-in-out ${
    isOpen 
      ? 'w-80 md:w-96 h-96 rounded-lg shadow-xl' 
      : 'w-16 h-16 rounded-full shadow-lg'
  }`;

  return (
    <div className={chatContainerClasses}>
      {!isOpen ? (
        // Chat button (closed state)
        <button 
          onClick={toggleChat}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-full h-full flex items-center justify-center transition-all duration-200"
        >
          <MessageSquare size={24} />
        </button>
      ) : (
        // Chat interface (open state)
        <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium">Chat Assistant</h3>
              <button
                onClick={handleClearSession}
                disabled={isClearingSession || chatData.chatHistory.length === 0}
                className={`ml-2 p-1 rounded hover:bg-blue-700 transition-colors ${
                  isClearingSession || chatData.chatHistory.length === 0 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                }`}
                title="Clear chat history"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <button 
              onClick={toggleChat}
              className="text-white hover:text-blue-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Messages area */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            {(!chatData.chatHistory || chatData.chatHistory.length === 0) ? (
              <div className="flex h-full items-center justify-center text-gray-500 text-sm">
                Send a message to start chatting!
              </div>
            ) : (
              chatData.chatHistory.map((message, index) => (
                <div 
                  key={index} 
                  className={`mb-4 animate-fade-in ${
                    message.role === 'user' ? 'flex justify-end' : 'flex justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-200 text-gray-800 p-3 rounded-lg rounded-bl-none max-w-xs md:max-w-md">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input area */}
          <div className="p-3 bg-white border-t border-gray-200">
            <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-blue-400">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 outline-none"
                disabled={isLoading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmit(e);
                  }
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isLoading}
                className={`px-3 text-white bg-blue-600 flex items-center justify-center ${
                  !inputValue.trim() || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS animation through regular style tags in your CSS file or use this component-level approach */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fadeIn 0.3s ease-out forwards;
          }
        `
      }} />
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles, Trash2, Key, BarChart2, DollarSign, Folder, Search } from 'lucide-react';
import { sendAIChatPrompt, type ChatMessage } from '../../lib/aiChatService';
import './AIChatbotModal.css';

interface AIChatbotModalProps {
  businessId?: number;
}

export const AIChatbotModal: React.FC<AIChatbotModalProps> = ({ businessId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load saved chat history & API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('easyrecords_gemini_api_key') || (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
    setApiKey(savedKey);

    const savedHistory = localStorage.getItem('easyrecords_ai_chat_history');
    if (savedHistory) {
      try {
        setMessages(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse saved chat history:', e);
      }
    } else {
      // Welcome message
      setMessages([
        {
          id: 'welcome-msg',
          sender: 'bot',
          text: `👋 **வணக்கம் / Welcome to EasyBot!**\n\nநான் உங்கள் EasyRecords App Data-வை analyse செய்ய தயார். என்னிடம் உங்கள் registers, numeric totals, records அல்லது summaries பற்றி ஏதேனும் கேள்விகள் கேட்கலாம்.\n\n*Try a quick prompt below:*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: 'local',
        },
      ]);
    }
  }, []);

  // Save messages to localStorage when updated
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('easyrecords_ai_chat_history', JSON.stringify(messages.slice(-30)));
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSaveApiKey = () => {
    localStorage.setItem('easyrecords_gemini_api_key', apiKey.trim());
    setShowKeyConfig(false);
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'bot',
        text: apiKey.trim()
          ? '🔑 **Gemini API Key updated successfully!** Future requests will utilize full Gemini AI capabilities.'
          : 'ℹ️ API Key cleared. Operating on local high-precision Smart Data Engine.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'system',
      },
    ]);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || inputPrompt).trim();
    if (!promptToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputPrompt('');
    setIsLoading(true);

    try {
      const result = await sendAIChatPrompt(promptToSend, businessId, apiKey);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: result.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: result.source,
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: '❌ Sorry, an error occurred while analyzing data. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'system',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('easyrecords_ai_chat_history');
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'bot',
        text: '🧹 **Chat history cleared!** How can I assist you with your app data?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'local',
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /** Render markdown-style bold and formatted text */
  const renderFormattedText = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return (
        <span key={idx}>
          {formattedParts}
          {idx < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          className="ai-floating-trigger"
          onClick={() => setIsOpen(true)}
          title="EasyBot AI Assistant"
        >
          <Sparkles size={18} />
          <span>EasyBot</span>
          <span className="ai-badge-dot"></span>
        </button>
      )}

      {/* Floating Chatbot Window */}
      {isOpen && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <div className="ai-avatar-icon">
                <Bot size={20} />
              </div>
              <div>
                <h4 className="ai-chat-title">EasyBot</h4>
                <div className="ai-chat-subtitle">
                  <span className="ai-badge-dot" style={{ width: 6, height: 6 }}></span>
                  Live App Data Analyzer
                </div>
              </div>
            </div>
            <div className="ai-header-actions">
              <button
                className="ai-icon-btn"
                onClick={() => setShowKeyConfig(!showKeyConfig)}
                title="Configure Gemini API Key"
              >
                <Key size={15} />
              </button>
              <button
                className="ai-icon-btn"
                onClick={handleClearHistory}
                title="Clear Chat History"
              >
                <Trash2 size={15} />
              </button>
              <button
                className="ai-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Close Chat"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* API Key Config Bar */}
          {showKeyConfig && (
            <div className="ai-apikey-bar">
              <Key size={14} color="#64748b" />
              <input
                type="password"
                className="ai-apikey-input"
                placeholder="Optional Gemini API Key (AI-xxxxx)"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
              <button className="ai-chip" onClick={handleSaveApiKey} style={{ background: '#3b82f6', color: '#fff', border: 'none' }}>
                Save
              </button>
            </div>
          )}

          {/* Quick Suggestion Chips */}
          <div className="ai-chips-wrapper">
            <button className="ai-chip" onClick={() => handleSendMessage('📊 Give me an overall summary of my workspace data')}>
              <BarChart2 size={13} /> Summary
            </button>
            <button className="ai-chip" onClick={() => handleSendMessage('💰 Show total sales, expenses, and amounts calculated')}>
              <DollarSign size={13} /> Totals
            </button>
            <button className="ai-chip" onClick={() => handleSendMessage('📂 List all active registers and entry counts')}>
              <Folder size={13} /> Registers
            </button>
            <button className="ai-chip" onClick={() => handleSendMessage('🔍 Check for any pending or due items')}>
              <Search size={13} /> Pending
            </button>
          </div>

          {/* Messages Body */}
          <div className="ai-messages-body">
            {messages.map(msg => (
              <div key={msg.id} className={`ai-msg ${msg.sender}`}>
                <div className="ai-msg-bubble">{renderFormattedText(msg.text)}</div>
                <div className="ai-msg-meta">
                  <span>{msg.timestamp}</span>
                  {msg.source && <span className="ai-source-badge">{msg.source}</span>}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="ai-msg bot">
                <div className="ai-msg-bubble">
                  <div className="ai-typing-indicator">
                    <span className="ai-typing-dot"></span>
                    <span className="ai-typing-dot"></span>
                    <span className="ai-typing-dot"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Redesigned Integrated Input Footer Bar */}
          <div className="ai-chat-footer">
            <div className="ai-input-wrapper">
              <textarea
                className="ai-chat-textarea"
                placeholder="Ask EasyBot anything about your data..."
                rows={1}
                value={inputPrompt}
                onChange={e => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                className="ai-send-btn"
                onClick={() => handleSendMessage()}
                disabled={!inputPrompt.trim() || isLoading}
                title="Send Message"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

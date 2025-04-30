import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { ChatMessage } from '../types/webrtc';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-semibold mb-4 hidden lg:block">Chat</h3>
      
      <div className="flex-grow overflow-y-auto mb-4 space-y-3 max-h-[50vh] lg:max-h-[60vh]">
        {messages.length === 0 ? (
          <p className="text-slate-400 text-sm italic text-center my-8">
            No messages yet. Say hello!
          </p>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className={`message-enter-active rounded-lg p-3 max-w-[85%] ${
                msg.isLocal 
                  ? 'bg-teal-700 ml-auto' 
                  : 'bg-slate-700 mr-auto'
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              <span className="text-xs text-slate-300 opacity-70 mt-1 block">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="flex items-center">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow bg-slate-700 rounded-l-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button 
          type="submit" 
          className="bg-teal-600 hover:bg-teal-700 py-2 px-4 rounded-r-lg transition-colors"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
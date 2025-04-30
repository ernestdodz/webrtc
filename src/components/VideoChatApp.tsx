import React, { useState, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, MessageSquare, X, RefreshCw } from 'lucide-react';
import VideoDisplay from './VideoDisplay';
import ChatPanel from './ChatPanel';
import ConnectionStatus from './ConnectionStatus';
import { useWebRTC } from '../hooks/useWebRTC';

const VideoChatApp: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  const { 
    localStream, 
    remoteStream, 
    connectionState, 
    connectToRandomPeer, 
    disconnectPeer,
    toggleVideo,
    toggleAudio,
    sendChatMessage,
    chatMessages
  } = useWebRTC();

  useEffect(() => {
    // Initialize connection on component mount
    connectToRandomPeer();
    
    // Cleanup on unmount
    return () => {
      disconnectPeer();
    };
  }, []);

  // Handle toggling video
  const handleToggleVideo = () => {
    toggleVideo();
    setIsVideoEnabled(!isVideoEnabled);
  };

  // Handle toggling audio
  const handleToggleAudio = () => {
    toggleAudio();
    setIsAudioEnabled(!isAudioEnabled);
  };

  // Handle skipping to next user
  const handleSkip = () => {
    disconnectPeer();
    connectToRandomPeer();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-teal-400 mb-2">ConnectNow</h1>
        <p className="text-slate-300 max-w-lg mx-auto">
          Meet new people through random video chats. Click 'Next' to connect with someone new.
        </p>
      </header>
      
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 fade-in">
          <div className="relative">
            <ConnectionStatus state={connectionState} />
            
            {/* Main video display area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local video */}
              <VideoDisplay 
                stream={localStream} 
                isMuted={true} 
                isLocal={true} 
                isVideoEnabled={isVideoEnabled}
              />
              
              {/* Remote video */}
              <VideoDisplay 
                stream={remoteStream} 
                isMuted={false} 
                isLocal={false} 
                isVideoEnabled={true}
              />
            </div>
            
            {/* Controls */}
            <div className="flex justify-center mt-6 space-x-4">
              <button 
                onClick={handleToggleVideo} 
                className={`action-button p-3 rounded-full ${isVideoEnabled ? 'bg-teal-600 hover:bg-teal-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
              </button>
              
              <button 
                onClick={handleToggleAudio} 
                className={`action-button p-3 rounded-full ${isAudioEnabled ? 'bg-teal-600 hover:bg-teal-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
              </button>
              
              <button 
                onClick={handleSkip} 
                className="action-button p-3 bg-blue-600 hover:bg-blue-700 rounded-full"
              >
                <RefreshCw size={24} />
              </button>
              
              <button 
                onClick={() => setIsChatOpen(!isChatOpen)} 
                className="action-button p-3 bg-slate-700 hover:bg-slate-600 rounded-full"
              >
                <MessageSquare size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Chat panel */}
        <div className={`bg-slate-800 rounded-lg p-4 transition-all duration-300 ${isChatOpen ? 'opacity-100' : 'opacity-0 lg:opacity-100 hidden lg:block'}`}>
          {isChatOpen && (
            <div className="flex justify-between items-center mb-4 md:hidden">
              <h3 className="text-lg font-semibold">Chat</h3>
              <button onClick={() => setIsChatOpen(false)} className="p-1">
                <X size={20} />
              </button>
            </div>
          )}
          <ChatPanel messages={chatMessages} onSendMessage={sendChatMessage} />
        </div>
      </main>
      
      <footer className="mt-8 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} ConnectNow. Enjoy safe and respectful conversations.</p>
      </footer>
    </div>
  );
};

export default VideoChatApp;
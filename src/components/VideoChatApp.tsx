import React, { useState, useEffect } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MessageSquare,
  X,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import VideoDisplay from "./VideoDisplay";
import ChatPanel from "./ChatPanel";
import ConnectionStatus from "./ConnectionStatus";
import { useWebRTC } from "../hooks/useWebRTC";

interface VideoChatAppProps {
  roomId: string;
  username: string;
  onBackToHome: () => void;
  isRoomCreator: boolean;
}

const VideoChatApp: React.FC<VideoChatAppProps> = ({
  roomId,
  username,
  onBackToHome,
  isRoomCreator,
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  const {
    localStream,
    remoteStream,
    connectionState,
    connectToRoom,
    disconnectPeer,
    toggleVideo,
    toggleAudio,
    sendChatMessage,
    chatMessages,
    remoteUsername,
  } = useWebRTC();

  useEffect(() => {
    // Initialize connection on component mount
    // Pass reuseExisting: true to enable same-device testing
    connectToRoom(roomId, username, isRoomCreator, { reuseExisting: true });

    // Cleanup on unmount
    return () => {
      disconnectPeer();

      // If this is the last instance, clear the stream ID from localStorage
      if (isRoomCreator) {
        localStorage.removeItem("webrtc-test-stream-id");
      }
    };
  }, [roomId, username, isRoomCreator, connectToRoom, disconnectPeer]);

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

  // Copy room ID to clipboard
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-6 flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-4">
          <button
            onClick={onBackToHome}
            className="flex items-center text-slate-300 hover:text-teal-400 transition-colors"
          >
            <ArrowLeft size={20} className="mr-1" />
            <span>Back</span>
          </button>
          <h1 className="text-3xl font-bold text-teal-400">ConnectNow</h1>
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>

        <div className="bg-slate-800 rounded-lg p-3 mb-4 flex items-center justify-between w-full max-w-md">
          <div>
            <div className="text-sm text-slate-400">Room ID:</div>
            <div className="font-mono font-medium">{roomId}</div>
          </div>
          <button
            onClick={copyRoomId}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
            title="Copy room ID"
          >
            {isCopied ? (
              <Check size={18} className="text-green-400" />
            ) : (
              <Copy size={18} />
            )}
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 fade-in">
          <div className="relative">
            <ConnectionStatus state={connectionState} />

            {/* Main video display area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local video */}
              <div className="relative">
                <VideoDisplay
                  stream={localStream}
                  isMuted={true}
                  isLocal={true}
                  isVideoEnabled={isVideoEnabled}
                />
                <div className="absolute bottom-3 left-0 right-0 text-center">
                  <span className="bg-black/50 px-3 py-1 rounded-full text-sm">
                    {username} (You)
                  </span>
                </div>
              </div>

              {/* Remote video */}
              <div className="relative">
                <VideoDisplay
                  stream={remoteStream}
                  isMuted={false}
                  isLocal={false}
                  isVideoEnabled={true}
                />
                {remoteStream && remoteUsername && (
                  <div className="absolute bottom-3 left-0 right-0 text-center">
                    <span className="bg-black/50 px-3 py-1 rounded-full text-sm">
                      {remoteUsername}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center mt-6 space-x-4">
              <button
                onClick={handleToggleVideo}
                className={`action-button p-3 rounded-full ${
                  isVideoEnabled
                    ? "bg-teal-600 hover:bg-teal-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
              </button>

              <button
                onClick={handleToggleAudio}
                className={`action-button p-3 rounded-full ${
                  isAudioEnabled
                    ? "bg-teal-600 hover:bg-teal-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
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
        <div
          className={`bg-slate-800 rounded-lg p-4 transition-all duration-300 ${
            isChatOpen
              ? "opacity-100"
              : "opacity-0 lg:opacity-100 hidden lg:block"
          }`}
        >
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
        <p>
          © {new Date().getFullYear()} ConnectNow. Enjoy safe and respectful
          conversations.
        </p>
      </footer>
    </div>
  );
};

export default VideoChatApp;

import React, { useRef, useEffect } from 'react';
import { UserRound } from 'lucide-react';

interface VideoDisplayProps {
  stream: MediaStream | null;
  isMuted: boolean;
  isLocal: boolean;
  isVideoEnabled: boolean;
}

const VideoDisplay: React.FC<VideoDisplayProps> = ({ 
  stream, 
  isMuted, 
  isLocal,
  isVideoEnabled 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`video-container relative aspect-video bg-slate-800 rounded-lg overflow-hidden ${stream ? 'connected' : ''}`}>
      {stream ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMuted}
            className={`w-full h-full object-cover ${(!isVideoEnabled && isLocal) ? 'hidden' : 'block'}`}
          />
          {(!isVideoEnabled && isLocal) && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-700">
              <UserRound size={64} className="text-slate-400" />
              <p className="absolute bottom-4 text-sm text-slate-300">Camera is off</p>
            </div>
          )}
          <div className="absolute bottom-2 left-2 text-xs bg-black/50 px-2 py-1 rounded-md">
            {isLocal ? 'You' : 'Stranger'}
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <UserRound size={64} className="text-slate-600 mb-2" />
          <p className="text-slate-400">{isLocal ? 'Loading camera...' : 'Waiting to connect...'}</p>
        </div>
      )}
    </div>
  );
};

export default VideoDisplay;
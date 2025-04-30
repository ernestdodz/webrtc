import React, { useRef, useEffect } from "react";
import { UserRound } from "lucide-react";

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
  isVideoEnabled,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      console.log(
        `Setting ${isLocal ? "local" : "remote"} video srcObject, tracks:`,
        stream
          .getTracks()
          .map((t) => `${t.kind}:${t.id}`)
          .join(", ")
      );

      // Set the stream as srcObject
      videoRef.current.srcObject = stream;

      // Ensure video plays when ready
      const playVideo = () => {
        if (videoRef.current) {
          videoRef.current.play().catch((err) => {
            console.warn(
              `Error playing ${isLocal ? "local" : "remote"} video:`,
              err
            );
          });
        }
      };

      // Try to play immediately
      playVideo();

      // Also try when loadedmetadata fires
      videoRef.current.onloadedmetadata = playVideo;
    }
  }, [stream, isLocal]);

  // Determine if we should show the video element
  const showVideo = stream && (isLocal ? isVideoEnabled : true);

  // Determine the appropriate status message
  const getStatusMessage = () => {
    if (!stream) {
      return isLocal ? "Loading camera..." : "Waiting to connect...";
    }
    if (!isVideoEnabled && isLocal) {
      return "Camera is off";
    }
    return "";
  };

  return (
    <div
      className={`video-container relative aspect-video bg-slate-800 rounded-lg overflow-hidden ${
        stream ? "connected" : ""
      }`}
    >
      {/* Video element - always render it but conditionally show/hide */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className={`w-full h-full object-cover ${
          showVideo ? "block" : "hidden"
        }`}
      />

      {/* Show placeholder when no stream or camera is off */}
      {!showVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-700">
          <UserRound size={64} className="text-slate-400 mb-2" />
          <p className="text-sm text-slate-300">{getStatusMessage()}</p>
        </div>
      )}

      {/* Always show the label if we have a stream */}
      {stream && (
        <div className="absolute bottom-2 left-2 text-xs bg-black/50 px-2 py-1 rounded-md">
          {isLocal ? "You" : "Peer"}
        </div>
      )}
    </div>
  );
};

export default VideoDisplay;

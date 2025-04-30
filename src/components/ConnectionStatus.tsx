import React from "react";
import { ConnectionState } from "../types/webrtc";

interface ConnectionStatusProps {
  state: ConnectionState;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ state }) => {
  // Determine if the status indicator should pulse
  const shouldPulse = [
    "connecting",
    "waiting",
    "finding",
    "initializing",
  ].includes(state);

  // Get the appropriate color for the status indicator
  const getStatusColor = () => {
    switch (state) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "waiting":
        return "bg-blue-500";
      case "finding":
        return "bg-blue-500";
      case "disconnected":
        return "bg-slate-500";
      case "failed":
        return "bg-red-500";
      case "permission-denied":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

  // Get the appropriate text for the status
  const getStatusText = () => {
    switch (state) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "disconnected":
        return "Disconnected";
      case "failed":
        return "Connection failed";
      case "finding":
        return "Finding someone...";
      case "waiting":
        return "Waiting for someone to join...";
      case "permission-denied":
        return "Camera access denied";
      default:
        return "Initializing...";
    }
  };

  return (
    <div className="flex items-center justify-center mb-4 slide-in">
      <div
        className={`w-3 h-3 rounded-full ${getStatusColor()} mr-2 ${
          shouldPulse ? "animate-pulse" : ""
        }`}
      ></div>
      <span className="text-sm font-medium">{getStatusText()}</span>
    </div>
  );
};

export default ConnectionStatus;

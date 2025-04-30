import React from 'react';
import { ConnectionState } from '../types/webrtc';

interface ConnectionStatusProps {
  state: ConnectionState;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ state }) => {
  const getStatusColor = () => {
    switch (state) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500 pulse';
      case 'disconnected':
        return 'bg-slate-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-blue-500 pulse';
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'failed':
        return 'Connection failed';
      case 'finding':
        return 'Finding someone...';
      default:
        return 'Initializing...';
    }
  };

  return (
    <div className="flex items-center justify-center mb-4 slide-in">
      <div className={`w-3 h-3 rounded-full ${getStatusColor()} mr-2`}></div>
      <span className="text-sm font-medium">{getStatusText()}</span>
    </div>
  );
};

export default ConnectionStatus;
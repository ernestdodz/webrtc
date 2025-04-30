import React from 'react';
import { useEffect } from 'react';
import VideoChatApp from './components/VideoChatApp';
import './App.css';

function App() {
  useEffect(() => {
    // Update the page title
    document.title = 'ConnectNow | Random Video Chat';
    
    // Update favicon
    const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (link) {
      link.href = '/video-icon.svg';
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <VideoChatApp />
    </div>
  );
}

export default App;
import { useEffect, useState } from "react";
import VideoChatApp from "./components/VideoChatApp";
import HomeScreen from "./components/HomeScreen"; // Correct casing
import "./App.css";
import React from "react";

function App() {
  const [currentScreen, setCurrentScreen] = useState<"home" | "chat">("home");
  const [roomId, setRoomId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [isRoomCreator, setIsRoomCreator] = useState<boolean>(false);

  useEffect(() => {
    // Update the page title
    document.title = "ConnectNow | Video Chat";

    // Update favicon
    const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (link) {
      link.href = "/video-icon.svg";
    }
  }, []);

  const handleCreateRoom = (username: string) => {
    // Generate a random room ID
    const newRoomId = Math.random().toString(36).substring(2, 8);
    setRoomId(newRoomId);
    setUsername(username);
    setIsRoomCreator(true);
    setCurrentScreen("chat");
  };

  const handleJoinRoom = (roomId: string, username: string) => {
    setRoomId(roomId);
    setUsername(username);
    setIsRoomCreator(false);
    setCurrentScreen("chat");
  };

  const handleBackToHome = () => {
    setCurrentScreen("home");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {currentScreen === "home" ? (
        <HomeScreen
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      ) : (
        <VideoChatApp
          roomId={roomId}
          username={username}
          isRoomCreator={isRoomCreator}
          onBackToHome={handleBackToHome}
        />
      )}
    </div>
  );
}

export default App;

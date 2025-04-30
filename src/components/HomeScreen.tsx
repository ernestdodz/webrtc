import React, { useState } from "react";
import { Users, UserPlus } from "lucide-react";

interface HomeScreenProps {
  onJoinRoom: (roomId: string, username: string) => void;
  onCreateRoom: (username: string) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  onJoinRoom,
  onCreateRoom,
}) => {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [joinMode, setJoinMode] = useState<"create" | "join">("create");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      alert("Please enter a username");
      return;
    }

    if (joinMode === "join") {
      if (!roomId.trim()) {
        alert("Please enter a room ID");
        return;
      }
      onJoinRoom(roomId, username);
    } else {
      onCreateRoom(username);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-teal-400 mb-2">ConnectNow</h1>
        <p className="text-slate-300">
          Video chat with friends or meet new people
        </p>
      </div>

      <div className="bg-slate-800 rounded-lg p-6 shadow-lg">
        <div className="flex mb-6">
          <button
            className={`flex-1 py-3 flex items-center justify-center gap-2 ${
              joinMode === "create"
                ? "bg-teal-600 text-white"
                : "bg-slate-700 text-slate-300"
            } rounded-l-lg transition-colors`}
            onClick={() => setJoinMode("create")}
          >
            <UserPlus size={18} />
            <span>Create Room</span>
          </button>
          <button
            className={`flex-1 py-3 flex items-center justify-center gap-2 ${
              joinMode === "join"
                ? "bg-teal-600 text-white"
                : "bg-slate-700 text-slate-300"
            } rounded-r-lg transition-colors`}
            onClick={() => setJoinMode("join")}
          >
            <Users size={18} />
            <span>Join Room</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              Your Name
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              placeholder="Enter your name"
              required
            />
          </div>

          {joinMode === "join" && (
            <div className="mb-4">
              <label
                htmlFor="roomId"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Room ID
              </label>
              <input
                type="text"
                id="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full p-3 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                placeholder="Enter room ID"
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
          >
            {joinMode === "create" ? "Create New Room" : "Join Room"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default HomeScreen;

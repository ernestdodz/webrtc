import { useState, useEffect, useRef, useCallback } from "react";
import { useSignaling } from "./useSignaling";
import { ChatMessage, ConnectionState } from "../types/webrtc";

export const useWebRTC = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("initializing");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [remoteUsername, setRemoteUsername] = useState<string | null>(null);

  // Store local username for sharing
  const localUsername = useRef<string>("");

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannel = useRef<RTCDataChannel | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  const {
    connect: connectSignaling,
    disconnect: disconnectSignaling,
    sendSignal,
    onSignalReceived,
  } = useSignaling();

  // Process pending ICE candidates
  const processPendingCandidates = useCallback(() => {
    if (!peerConnection.current?.remoteDescription) return;

    pendingCandidates.current.forEach((candidate) => {
      peerConnection.current
        ?.addIceCandidate(new RTCIceCandidate(candidate))
        .catch((error) =>
          console.error("Error adding pending ICE candidate:", error)
        );
    });
    pendingCandidates.current = [];
  }, []);

  // Disconnect peer connection
  const disconnectPeer = useCallback(() => {
    if (dataChannel.current) {
      dataChannel.current.close();
      dataChannel.current = null;
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    disconnectSignaling();
    setRemoteStream(null);
    setConnectionState("disconnected");
    pendingCandidates.current = [];
  }, [disconnectSignaling]);

  // Initialize local media stream
  const initLocalStream = useCallback(
    async (options?: { reuseExisting?: boolean }) => {
      // Check if we should try to reuse an existing stream (for same-device testing)
      if (options?.reuseExisting) {
        // Try to get existing stream from localStorage (for same-device testing)
        try {
          // Check if there's a stream ID stored in localStorage
          const existingStreamId = localStorage.getItem(
            "webrtc-test-stream-id"
          );

          if (existingStreamId) {
            console.log(
              "Using existing stream ID for testing:",
              existingStreamId
            );

            // Get the actual stream using getUserMedia
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });

            // Store the stream ID in localStorage for other tabs to use
            if (!existingStreamId) {
              localStorage.setItem("webrtc-test-stream-id", "stream-exists");
            }

            setLocalStream(stream);
            setConnectionState("initializing");
            return stream;
          }
        } catch (err) {
          console.warn(
            "Failed to reuse existing stream, falling back to new stream",
            err
          );
        }
      }

      // Normal path - get a new stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // Store the stream ID in localStorage for other tabs to use
        localStorage.setItem("webrtc-test-stream-id", "stream-exists");

        setLocalStream(stream);
        setConnectionState("initializing");
        return stream;
      } catch (error: any) {
        console.error("Error accessing media devices:", error);

        // Handle permission denial specifically
        if (
          error.name === "NotAllowedError" ||
          error.message.includes("Permission dismissed")
        ) {
          setConnectionState("permission-denied");
        } else {
          setConnectionState("failed");
        }

        return null;
      }
    },
    []
  );

  // Retry getting media permissions
  const retryMediaAccess = useCallback(async () => {
    setConnectionState("initializing");
    return initLocalStream();
  }, [initLocalStream]);

  // Initialize peer connection
  const initPeerConnection = useCallback(
    (stream: MediaStream) => {
      try {
        // Create new RTCPeerConnection
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });

        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Setup data channel for text chat
        const dc = pc.createDataChannel("chat", { ordered: true });
        dataChannel.current = dc;

        // Handle data channel events
        dc.onopen = () => {
          console.log("Data channel opened");
          // Send username when data channel opens
          if (localUsername.current) {
            // Add a small delay to ensure the channel is fully ready
            setTimeout(() => {
              if (dc.readyState === "open") {
                dc.send(
                  JSON.stringify({
                    type: "username",
                    username: localUsername.current,
                  })
                );
                console.log("Sent username:", localUsername.current);
              }
            }, 500);
          }
        };
        dc.onclose = () => console.log("Data channel closed");
        dc.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "chat") {
              setChatMessages((prev) => [
                ...prev,
                {
                  text: data.message,
                  isLocal: false,
                  timestamp: new Date(),
                },
              ]);
            } else if (data.type === "username") {
              setRemoteUsername(data.username);
            }
          } catch (error) {
            console.error("Error parsing data channel message:", error);
          }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            sendSignal({
              type: "ice-candidate",
              candidate: event.candidate,
            });
          }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
          switch (pc.connectionState) {
            case "connected":
              setConnectionState("connected");
              break;
            case "disconnected":
            case "closed":
              setConnectionState("disconnected");
              break;
            case "failed":
              setConnectionState("failed");
              break;
            case "connecting":
              setConnectionState("connecting");
              break;
            default:
              break;
          }
        };

        // Handle remote tracks
        pc.ontrack = (event) => {
          setRemoteStream(new MediaStream(event.streams[0].getTracks()));
        };

        // Handle remote data channel
        pc.ondatachannel = (event) => {
          dataChannel.current = event.channel;
          console.log("Remote data channel received");

          event.channel.onmessage = (e) => {
            try {
              const data = JSON.parse(e.data);
              console.log("Received data channel message:", data.type);

              if (data.type === "chat") {
                setChatMessages((prev) => [
                  ...prev,
                  {
                    text: data.message,
                    isLocal: false,
                    timestamp: new Date(),
                  },
                ]);
              } else if (data.type === "username") {
                console.log("Received remote username:", data.username);
                setRemoteUsername(data.username);
              }
            } catch (error) {
              console.error("Error parsing data channel message:", error);
            }
          };
        };

        peerConnection.current = pc;
        return pc;
      } catch (error) {
        console.error("Error creating peer connection:", error);
        setConnectionState("failed");
        return null;
      }
    },
    [sendSignal]
  );

  // Create and send offer
  const createOffer = useCallback(async () => {
    if (!peerConnection.current) return;

    try {
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      sendSignal({
        type: "offer",
        offer,
      });
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  }, [sendSignal]);

  // Handle received offer and create answer
  const handleOffer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      if (!peerConnection.current) return;

      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        sendSignal({
          type: "answer",
          answer,
        });

        // Process any pending ICE candidates after setting remote description
        processPendingCandidates();
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    },
    [sendSignal, processPendingCandidates]
  );

  // Handle received answer
  const handleAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      if (!peerConnection.current) return;

      try {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        // Process any pending ICE candidates after setting remote description
        processPendingCandidates();
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    },
    [processPendingCandidates]
  );

  // Handle received ICE candidate
  const handleIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      if (!peerConnection.current) return;

      try {
        // If remote description is not set, queue the candidate
        if (!peerConnection.current.remoteDescription) {
          pendingCandidates.current.push(candidate);
          return;
        }

        await peerConnection.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    },
    []
  );

  // Connect to a random peer
  const connectToRandomPeer = useCallback(async () => {
    // Clean up any existing connection
    if (peerConnection.current) {
      disconnectPeer();
    }

    setConnectionState("finding");
    setChatMessages([]);

    // Initialize local stream if needed
    let stream = localStream;
    if (!stream) {
      stream = await initLocalStream();
      if (!stream) return;
    }

    // Initialize new peer connection
    const pc = initPeerConnection(stream);
    if (!pc) return;

    // Connect to signaling server and wait for match
    connectSignaling();
  }, [
    connectSignaling,
    disconnectPeer,
    initLocalStream,
    initPeerConnection,
    localStream,
  ]);

  // Connect to a specific room
  const connectToRoom = useCallback(
    async (
      roomId: string,
      username: string,
      isRoomCreator: boolean,
      options?: { reuseExisting?: boolean }
    ) => {
      // Store username for sharing
      localUsername.current = username;

      // Clean up any existing connection
      if (peerConnection.current) {
        disconnectPeer();
      }

      setConnectionState(isRoomCreator ? "waiting" : "connecting");
      setChatMessages([]);

      // Check if we're testing on the same device
      const isSameDeviceTest =
        options?.reuseExisting ||
        (localStorage.getItem("webrtc-test-stream-id") && !isRoomCreator);

      // Initialize local stream if needed
      let stream = localStream;
      if (!stream) {
        // If we're the second tab in a same-device test, try to reuse the stream
        stream = await initLocalStream({ reuseExisting: isSameDeviceTest });
        if (!stream) return;
      }

      // Initialize new peer connection
      const pc = initPeerConnection(stream);
      if (!pc) return;

      // Connect to signaling server with room ID
      connectSignaling(roomId, isRoomCreator);

      // Log for debugging
      console.log(
        `Connected to room ${roomId} as ${
          isRoomCreator ? "creator" : "joiner"
        }, same-device test: ${isSameDeviceTest}`
      );
    },
    [
      connectSignaling,
      disconnectPeer,
      initLocalStream,
      initPeerConnection,
      localStream,
    ]
  );

  // Toggle video tracks
  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
  }, [localStream]);

  // Toggle audio tracks
  const toggleAudio = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
  }, [localStream]);

  // Send chat message
  const sendChatMessage = useCallback((text: string) => {
    if (dataChannel.current && dataChannel.current.readyState === "open") {
      const messageData = {
        type: "chat",
        message: text,
      };

      dataChannel.current.send(JSON.stringify(messageData));

      // Add message to local chat history
      setChatMessages((prev) => [
        ...prev,
        {
          text,
          isLocal: true,
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  // Handle received signals
  useEffect(() => {
    const handleSignal = (signal: any) => {
      switch (signal.type) {
        case "offer":
          handleOffer(signal.offer);
          break;
        case "answer":
          handleAnswer(signal.answer);
          break;
        case "ice-candidate":
          handleIceCandidate(signal.candidate);
          break;
        case "matched":
          createOffer();
          break;
        case "disconnect":
          disconnectPeer();
          break;
        default:
          break;
      }
    };

    onSignalReceived(handleSignal);

    return () => {
      // Cleanup
    };
  }, [
    createOffer,
    disconnectPeer,
    handleAnswer,
    handleIceCandidate,
    handleOffer,
    onSignalReceived,
  ]);

  // Init local stream on component mount
  useEffect(() => {
    if (!localStream) {
      initLocalStream();
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [initLocalStream, localStream]);

  return {
    localStream,
    remoteStream,
    connectionState,
    connectToRandomPeer,
    connectToRoom,
    disconnectPeer,
    toggleVideo,
    toggleAudio,
    sendChatMessage,
    chatMessages,
    remoteUsername,
    retryMediaAccess,
  };
};

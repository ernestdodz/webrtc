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
              "Same-device testing: Using existing stream ID for testing"
            );

            // Get the actual stream using getUserMedia with exact same constraints
            // to ensure we get the same camera device
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });

            console.log(
              "Successfully acquired camera stream for same-device testing"
            );

            // Store the stream ID in localStorage for other tabs to use
            localStorage.setItem("webrtc-test-stream-id", "stream-exists");

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
        console.log("Requesting new media stream");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        console.log("Successfully acquired new camera stream");

        // Store the stream ID in localStorage for other tabs to use
        // This helps the joiner tab know that it's a same-device test
        localStorage.setItem("webrtc-test-stream-id", "stream-exists");

        // Log the tracks we got
        stream.getTracks().forEach((track) => {
          console.log(
            `Got track: ${track.kind}, enabled: ${track.enabled}, id: ${track.id}`
          );
        });

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
          console.log(
            "Remote track received:",
            event.track.kind,
            event.track.id
          );

          // Create a new MediaStream with all tracks from the remote stream
          const newRemoteStream = new MediaStream();
          event.streams[0].getTracks().forEach((track) => {
            console.log(
              `Adding remote track to stream: ${track.kind}, id: ${track.id}`
            );
            newRemoteStream.addTrack(track);
          });

          // Set the remote stream state
          setRemoteStream(newRemoteStream);

          // Always update connection state to connected when we receive tracks
          // This ensures the UI shows connected state even if the connection state
          // hasn't updated yet
          console.log(
            "Setting connection state to connected on track received"
          );
          setConnectionState("connected");
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
        console.log("Received offer, setting remote description");
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(offer)
        );

        // Update connection state to reflect progress
        setConnectionState("connecting");

        console.log("Creating answer");
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        console.log("Sending answer to peer");
        sendSignal({
          type: "answer",
          answer,
        });

        // Process any pending ICE candidates after setting remote description
        processPendingCandidates();
      } catch (error) {
        console.error("Error handling offer:", error);
        setConnectionState("failed");
      }
    },
    [sendSignal, processPendingCandidates]
  );

  // Handle received answer
  const handleAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      if (!peerConnection.current) return;

      try {
        console.log("Received answer, setting remote description");
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );

        // Update connection state to reflect progress
        setConnectionState("connecting");
        console.log(
          "Connection state updated to connecting after receiving answer"
        );

        // Process any pending ICE candidates after setting remote description
        processPendingCandidates();
      } catch (error) {
        console.error("Error handling answer:", error);
        setConnectionState("failed");
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
    // Using a random room ID for random peer connection
    const randomRoomId = Math.random().toString(36).substring(2, 8);
    connectSignaling(randomRoomId, true); // Connect as creator
    console.log(`Connected to random room: ${randomRoomId}`);
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

      // Set initial connection state based on role
      setConnectionState(isRoomCreator ? "waiting" : "connecting");
      setChatMessages([]);

      // Check if we're testing on the same device
      // Either explicitly requested via options or detected via localStorage
      const isSameDeviceTest = Boolean(
        options?.reuseExisting ||
          (localStorage.getItem("webrtc-test-stream-id") && !isRoomCreator)
      );

      console.log("Same device test detected:", isSameDeviceTest);

      // Initialize local stream if needed
      let stream = localStream;
      if (!stream) {
        console.log("No local stream, initializing...");
        // If we're the second tab in a same-device test, try to reuse the stream
        stream = await initLocalStream({ reuseExisting: isSameDeviceTest });
        if (!stream) {
          console.error("Failed to initialize local stream");
          return;
        }
      }

      // Initialize new peer connection
      const pc = initPeerConnection(stream);
      if (!pc) {
        console.error("Failed to initialize peer connection");
        return;
      }

      console.log(
        `Connecting to room ${roomId} as ${
          isRoomCreator ? "creator" : "joiner"
        }`
      );

      // For same-device testing, add a small delay before connecting to signaling
      // This helps ensure both tabs are ready before attempting to connect
      if (isSameDeviceTest && !isRoomCreator) {
        console.log(
          "Adding delay for same-device joiner before connecting to signaling"
        );

        // Shorter delay for better user experience
        setTimeout(() => {
          // Connect to signaling server with room ID
          connectSignaling(roomId, isRoomCreator);

          console.log(
            `Connected to room ${roomId} as joiner, same-device test: ${isSameDeviceTest}`
          );
        }, 500);
      } else {
        // Connect to signaling server with room ID
        connectSignaling(roomId, isRoomCreator);

        console.log(
          `Connected to room ${roomId} as ${
            isRoomCreator ? "creator" : "joiner"
          }, same-device test: ${isSameDeviceTest}`
        );
      }
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

  // Define signal types for better type safety
  type Signal =
    | { type: "offer"; offer: RTCSessionDescriptionInit; timestamp?: number }
    | { type: "answer"; answer: RTCSessionDescriptionInit; timestamp?: number }
    | {
        type: "ice-candidate";
        candidate: RTCIceCandidateInit;
        timestamp?: number;
      }
    | { type: "matched"; timestamp?: number }
    | { type: "disconnect"; timestamp?: number }
    | { type: "join-room"; timestamp?: number };

  // Handle received signals
  useEffect(() => {
    const handleSignal = (signal: Signal) => {
      console.log("Processing signal:", signal.type);

      switch (signal.type) {
        case "offer":
          console.log("Received offer signal, handling...");
          handleOffer(signal.offer);
          break;
        case "answer":
          console.log("Received answer signal, handling...");
          handleAnswer(signal.answer);
          break;
        case "ice-candidate":
          console.log("Received ICE candidate signal, handling...");
          handleIceCandidate(signal.candidate);
          break;
        case "matched":
          console.log("Received matched signal, creating offer...");
          // When matched, the creator creates an offer to initiate the connection
          createOffer();
          break;
        case "disconnect":
          console.log("Received disconnect signal, disconnecting peer...");
          disconnectPeer();
          break;
        default:
          console.log("Received unknown signal type:", (signal as any).type);
          break;
      }
    };

    // Set up signal handler
    onSignalReceived(handleSignal as any); // Type cast needed due to any in useSignaling

    return () => {
      // Cleanup - nothing needed here as useSignaling handles its own cleanup
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

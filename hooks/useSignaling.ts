import { useCallback, useEffect, useRef } from "react";

// In a real application, you would use a real signaling server
// For this demo, we'll simulate one with a simple mock implementation
export const useSignaling = () => {
  const isConnected = useRef(false);
  const signalCallback = useRef<((signal: any) => void) | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // Mock implementation of finding a peer
  // In a real app, this would connect to an actual signaling server
  const findPeer = useCallback(() => {
    // Clear previous timeout if it exists
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    // Simulating a delay in finding a peer (1-3 seconds)
    const delay = 1000 + Math.random() * 2000;

    timeoutRef.current = window.setTimeout(() => {
      if (signalCallback.current && isConnected.current) {
        // Notify that a peer has been found
        signalCallback.current({
          type: "matched",
        });
      }
    }, delay);
  }, []);

  // Connect to signaling service
  const connect = useCallback(() => {
    isConnected.current = true;
    console.log("Connected to signaling service");
    findPeer();
  }, [findPeer]);

  // Disconnect from signaling service
  const disconnect = useCallback(() => {
    isConnected.current = false;

    // Clear timeout if it exists
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    console.log("Disconnected from signaling service");
  }, []);

  // Helper function to parse SDP and extract media line order
  const parseSDPMediaOrder = (sdp: string): string[] => {
    const mediaLines = sdp
      .split("\r\n")
      .filter((line) => line.startsWith("m="));
    return mediaLines.map((line) => line.split(" ")[1]);
  };

  // Helper function to generate mock SDP answer with matching media order
  const createMatchingAnswer = (offerSdp: string): string => {
    const mediaOrder = parseSDPMediaOrder(offerSdp);

    // Base SDP components
    const sdpBase =
      "v=0\r\n" +
      "o=- 1 2 IN IP4 127.0.0.1\r\n" +
      "s=-\r\n" +
      "t=0 0\r\n" +
      "a=group:BUNDLE";

    // Add media indices to BUNDLE line
    const bundleLine =
      mediaOrder.map((_, index) => ` ${index}`).join("") + "\r\n";

    // Media section templates
    const audioSection =
      "m=audio 9 UDP/TLS/RTP/SAVPF 111\r\n" +
      "c=IN IP4 0.0.0.0\r\n" +
      "a=rtcp:9 IN IP4 0.0.0.0\r\n" +
      "a=ice-ufrag:mock\r\n" +
      "a=ice-pwd:mockpwd\r\n" +
      "a=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00\r\n" +
      "a=setup:active\r\n" +
      "a=mid:0\r\n" +
      "a=sendrecv\r\n" +
      "a=rtcp-mux\r\n" +
      "a=rtpmap:111 opus/48000/2\r\n";

    const videoSection =
      "m=video 9 UDP/TLS/RTP/SAVPF 96\r\n" +
      "c=IN IP4 0.0.0.0\r\n" +
      "a=rtcp:9 IN IP4 0.0.0.0\r\n" +
      "a=ice-ufrag:mock\r\n" +
      "a=ice-pwd:mockpwd\r\n" +
      "a=fingerprint:sha-256 00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00\r\n" +
      "a=setup:active\r\n" +
      "a=mid:1\r\n" +
      "a=sendrecv\r\n" +
      "a=rtcp-mux\r\n" +
      "a=rtpmap:96 VP8/90000\r\n";

    // Build answer SDP with matching media order
    let answerSdp = sdpBase + bundleLine;
    mediaOrder.forEach((media, index) => {
      if (media === "audio") {
        answerSdp += audioSection.replace("a=mid:0", `a=mid:${index}`);
      } else if (media === "video") {
        answerSdp += videoSection.replace("a=mid:1", `a=mid:${index}`);
      }
    });

    return answerSdp;
  };

  // Send signal to peer
  const sendSignal = useCallback((signal: any) => {
    // In a real app, this would send the signal to the actual peer via server
    console.log("Sending signal:", signal);

    // Simulate receiving response with a small delay
    if (isConnected.current && signalCallback.current) {
      window.setTimeout(() => {
        if (!isConnected.current || !signalCallback.current) return;

        // Handle different signal types for the mock implementation
        switch (signal.type) {
          case "offer":
            signalCallback.current({
              type: "answer",
              answer: {
                type: "answer",
                sdp: createMatchingAnswer(signal.offer.sdp),
              },
            });
            break;
          case "ice-candidate":
            // Just simulate receiving the same candidate back
            signalCallback.current({
              type: "ice-candidate",
              candidate: signal.candidate,
            });
            break;
          default:
            break;
        }
      }, 200 + Math.random() * 300);
    }
  }, []);

  // Set callback for receiving signals
  const onSignalReceived = useCallback((callback: (signal: any) => void) => {
    signalCallback.current = callback;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendSignal,
    onSignalReceived,
  };
};

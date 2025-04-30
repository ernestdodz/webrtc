import { useCallback, useEffect, useRef } from "react";

// Use localStorage for signaling between tabs
const SIGNAL_STORAGE_PREFIX = "webrtc-signal-";

export const useSignaling = () => {
  const roomId = useRef<string | null>(null);
  const isConnected = useRef(false);
  const signalCallback = useRef<((signal: any) => void) | null>(null);
  const isCreator = useRef(false);

  // Connect to a specific room
  const connect = useCallback((roomIdParam: string, isRoomCreator: boolean) => {
    roomId.current = roomIdParam;
    isCreator.current = isRoomCreator;
    isConnected.current = true;

    console.log(
      `Connected to room: ${roomIdParam} as ${
        isRoomCreator ? "creator" : "joiner"
      }`
    );

    // If joining a room, send a join signal to notify the creator
    if (!isRoomCreator) {
      // Small delay to ensure the creator has set up listeners
      setTimeout(() => {
        const joinSignal = {
          type: "join-room",
          timestamp: Date.now(),
        };

        localStorage.setItem(
          `${SIGNAL_STORAGE_PREFIX}${roomIdParam}-join`,
          JSON.stringify(joinSignal)
        );

        // Trigger storage event for other tabs
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: `${SIGNAL_STORAGE_PREFIX}${roomIdParam}-join`,
            newValue: JSON.stringify(joinSignal),
          })
        );
      }, 500);
    }
  }, []);

  // Disconnect from room
  const disconnect = useCallback(() => {
    if (roomId.current) {
      console.log(`Disconnected from room: ${roomId.current}`);

      // Send disconnect signal
      if (isConnected.current) {
        const disconnectSignal = {
          type: "disconnect",
          timestamp: Date.now(),
        };

        localStorage.setItem(
          `${SIGNAL_STORAGE_PREFIX}${roomId.current}-${
            isCreator.current ? "creator" : "joiner"
          }`,
          JSON.stringify(disconnectSignal)
        );

        // Trigger storage event for other tabs
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: `${SIGNAL_STORAGE_PREFIX}${roomId.current}-${
              isCreator.current ? "creator" : "joiner"
            }`,
            newValue: JSON.stringify(disconnectSignal),
          })
        );
      }
    }

    isConnected.current = false;
    roomId.current = null;
  }, []);

  // Send signal to peer
  const sendSignal = useCallback((signal: any) => {
    if (!roomId.current || !isConnected.current) return;

    // Add timestamp to prevent duplicate processing
    const signalWithTimestamp = {
      ...signal,
      timestamp: Date.now(),
    };

    // Store in localStorage with role-specific key
    // Creator signals go to creator channel, joiner signals go to joiner channel
    const storageKey = `${SIGNAL_STORAGE_PREFIX}${roomId.current}-${
      isCreator.current ? "creator" : "joiner"
    }`;

    localStorage.setItem(storageKey, JSON.stringify(signalWithTimestamp));

    // Manually trigger storage event for other tabs on same origin
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: storageKey,
        newValue: JSON.stringify(signalWithTimestamp),
      })
    );

    console.log("Sent signal:", signal.type);
  }, []);

  // Set callback for receiving signals
  const onSignalReceived = useCallback((callback: (signal: any) => void) => {
    signalCallback.current = callback;
  }, []);

  // Listen for storage events (signals from other tabs)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (
        !event.key ||
        !event.newValue ||
        !roomId.current ||
        !isConnected.current
      )
        return;

      // Check if this is a signal for our room
      const joinKey = `${SIGNAL_STORAGE_PREFIX}${roomId.current}-join`;
      const creatorKey = `${SIGNAL_STORAGE_PREFIX}${roomId.current}-creator`;
      const joinerKey = `${SIGNAL_STORAGE_PREFIX}${roomId.current}-joiner`;

      // Only process signals from the other role
      // Creator listens to joiner channel, joiner listens to creator channel
      const relevantKey = isCreator.current ? joinerKey : creatorKey;

      if (event.key === joinKey && isCreator.current) {
        // Room creator receives join notification
        if (signalCallback.current) {
          signalCallback.current({ type: "matched" });
        }
      } else if (event.key === relevantKey) {
        // Process signal from the other peer
        try {
          const signal = JSON.parse(event.newValue);
          if (signalCallback.current) {
            signalCallback.current(signal);
          }
        } catch (error) {
          console.error("Error parsing signal:", error);
        }
      }
    };

    // Add event listener
    window.addEventListener("storage", handleStorageChange);

    // Also listen for manually dispatched events (for same-tab testing)
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
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

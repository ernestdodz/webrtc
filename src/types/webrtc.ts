export type ConnectionState =
  | "initializing"
  | "permission-denied"
  | "finding"
  | "waiting"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed";

export interface ChatMessage {
  text: string;
  isLocal: boolean;
  timestamp: Date;
}

import { HocuspocusProvider } from "@hocuspocus/provider";

export interface InviteSignal {
  targetUserId: string;
  token: string;
  sentAt: number;
}

export interface LobbyUser {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
  joinedAt: number;
  inviteSignal?: InviteSignal | null;
}

export interface LobbyVisitor {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
  joinedAt: number;
  inviteStatus: "idle" | "sending" | "sent";
}

export interface LobbyContextValue {
  provider: HocuspocusProvider | null;
  connected: boolean;
  self: LobbyUser | null;
  visitors: LobbyVisitor[];
}

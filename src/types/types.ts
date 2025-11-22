export interface BoardConfig {
  boardId: string;
  boardName: string;
  minZapAmount: number;
  lightningAddress: string;
  creatorPubkey: string;
  isExplorable?: boolean;
  createdAt: number;
}

export interface ZapMessage {
  id: string;
  boardId: string;
  content: string;
  zapAmount: number;
  sender?: string;
  displayName?: string;
  timestamp: number;
}

export interface NWCInfo {
  pubkey: string;
  relay: string;
  secret: string;
}

export interface StoredBoard {
  boardId: string;
  config: BoardConfig;
  createdAt: number;
}

export interface WindowNostr {
  getPublicKey(): Promise<string>;
  signEvent(event: any): Promise<any>;
}

declare global {
  interface Window {
    nostr?: WindowNostr;
  }
}

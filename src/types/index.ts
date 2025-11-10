export interface BoardConfig {
  boardId: string;
  displayName: string;
  minZapAmount: number;
  lightningAddress: string;
  creatorPubkey: string;
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
  encryptedNwcString: string,
  config: BoardConfig;
  createdAt: number;
}
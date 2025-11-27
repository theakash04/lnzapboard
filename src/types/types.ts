export interface BoardConfig {
  boardId: string;
  boardName: string;
  minZapAmount: number;
  lightningAddress: string;
  creatorPubkey: string;
  nip05Identifier?: string;
  isExplorable?: boolean;
  logoUrl?: string;
  customSlug?: string;
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

export interface SlugReservation {
  slug: string;
  boardId: string;
  userPubkey: string;
  paymentHash: string;
  amount: number;
  reservedAt: number;
  eventId: string;
}


export interface SlugAvailability {
  available: boolean;
  reason?: string;
  existingReservation?: SlugReservation
}

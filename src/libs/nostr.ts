import { SimplePool, finalizeEvent } from "nostr-tools";
import type { Event, Filter } from "nostr-tools";
import type { BoardConfig, ZapMessage } from "../types/types";
import { parseZapReceipt } from "./nip57";

export const DEFAULT_RELAYS = ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.snort.social"];

let poolInstance: SimplePool | null = null;

export function getPool(): SimplePool {
  if (!poolInstance) {
    poolInstance = new SimplePool();
  }
  return poolInstance;
}

// Publish board config to Nostr relays
export async function publishBoardConfig(
  config: BoardConfig,
  privateKey: Uint8Array | null,
  isExplorable: boolean = false
): Promise<void> {
  const pool = getPool();

  // Base tags that are always included
  const baseTags = [
    ["d", config.boardId],
    ["title", config.boardName],
    ["ln", config.lightningAddress],
    ["min_zap", config.minZapAmount.toString()],
  ];

  // Conditionally add 'zapboard' tag based on isExplorable
  const tags = isExplorable ? [...baseTags, ["t", "zapboard"]] : baseTags;

  const event = {
    kind: 30078,
    created_at: Math.floor(Date.now() / 1000),
    tags: tags,
    content: JSON.stringify({
      boardName: config.boardName,
      minZapAmount: config.minZapAmount,
      lightningAddress: config.lightningAddress,
      createdAt: config.createdAt,
      isExplorable: config.isExplorable,
    }),
  };
  console.log("EVENT:", event);

  let signedEvent: Event;
  if (privateKey === null) {
    if (!window.nostr) {
      throw new Error("Nostr extension not found");
    }
    signedEvent = await window.nostr.signEvent(event);
  } else {
    signedEvent = finalizeEvent(event, privateKey);
  }
  const pubs = pool.publish(DEFAULT_RELAYS, signedEvent);

  await Promise.race([Promise.all(pubs), new Promise(resolve => setTimeout(resolve, 5000))]);
}

/**
 * Fetch board config from Nostr relays
 */
export async function fetchBoardConfig(boardId: string): Promise<BoardConfig | null> {
  const pool = getPool();

  return new Promise(resolve => {
    let sub: any;

    const timeout = setTimeout(() => {
      if (sub) sub.close();
      resolve(null);
    }, 5000);

    const filter: Filter = {
      kinds: [30078],
      "#d": [boardId],
    };

    sub = pool.subscribeMany(DEFAULT_RELAYS, filter, {
      onevent(event: Event) {
        clearTimeout(timeout);
        if (sub) sub.close();

        try {
          const content = JSON.parse(event.content) as BoardConfig;
          const lnTag = event.tags.find(t => t[0] === "ln");
          const minZapTag = event.tags.find(t => t[0] === "min_zap");

          const config: BoardConfig = {
            boardId,
            boardName: content.boardName,
            minZapAmount: parseInt(minZapTag?.[1] || "1000"),
            lightningAddress: lnTag?.[1] || "",
            creatorPubkey: event.pubkey,
            createdAt: content.createdAt,
            isExplorable: content.isExplorable,
          };
          resolve(config);
        } catch (err) {
          console.error("Failed to parse board config !:", err);
          resolve(null);
        }
      },
      oneose() {
        clearTimeout(timeout);
        if (sub) sub.close();
        resolve(null);
      },
    });
  });
}

//  Fetch all board configs
export async function fetchAllBoards(): Promise<BoardConfig[]> {
  const pool = getPool();

  return new Promise(resolve => {
    const boards: BoardConfig[] = [];
    const seen = new Set<string>();
    let sub: any;

    const timeout = setTimeout(() => {
      if (sub) sub.close();
      resolve(boards);
    }, 5000);

    // Relay-indexed tag filtering
    const filter: Filter = {
      kinds: [30078],
      "#t": ["zapboard"],
      limit: 100,
    };

    sub = pool.subscribeMany(DEFAULT_RELAYS, filter, {
      onevent(event: Event) {
        if (seen.has(event.id)) return;
        seen.add(event.id);

        try {
          const content = JSON.parse(event.content) as BoardConfig;
          const boardIdTag = event.tags.find(t => t[0] === "d");
          const lnTag = event.tags.find(t => t[0] === "ln");
          const minZapTag = event.tags.find(t => t[0] === "min_zap");

          const boardId = boardIdTag?.[1];
          if (!boardId) return;

          const config: BoardConfig = {
            boardId,
            boardName: content.boardName,
            minZapAmount: parseInt(minZapTag?.[1] || "1000"),
            lightningAddress: lnTag?.[1] || "",
            creatorPubkey: event.pubkey,
            createdAt: content.createdAt,
            isExplorable: content.isExplorable,
          };

          boards.push(config);
        } catch (err) {
          console.error("Failed to parse board event:", err);
        }
      },
      oneose() {
        clearTimeout(timeout);
        if (sub) sub.close();
        resolve(boards);
      },
    });
  });
}

export function subscribeToZapMessages(
  boardId: string,
  recipientPubkey: string,
  onMessage: (message: ZapMessage) => void
): () => void {
  const pool = getPool();
  const seenIds = new Set<string>(); // Client-side deduplication

  const filter: Filter = {
    kinds: [9735],
    "#p": [recipientPubkey], // Zaps to the board creator
    // No 'since' - load all historical zaps
  };

  const sub = pool.subscribeMany(DEFAULT_RELAYS, filter, {
    onevent(event: Event) {
      // Deduplicate at subscription level
      if (seenIds.has(event.id)) return;
      seenIds.add(event.id);

      try {
        const zapInfo = parseZapReceipt(event);

        if (!zapInfo) {
          console.log("Could not parse zap receipt");
          return;
        }

        // Filter for this board only
        if (zapInfo.boardId !== boardId) {
          return;
        }

        const message: ZapMessage = {
          id: event.id,
          boardId,
          content: zapInfo.message,
          zapAmount: zapInfo.amount,
          sender: zapInfo.sender,
          displayName: zapInfo.displayName,
          timestamp: event.created_at * 1000,
        };

        onMessage(message);
      } catch (error) {
        console.error("Failed to process zap receipt:", error);
      }
    },
  });

  console.log("Subscribed to zap receipts for:", recipientPubkey);
  return () => sub.close();
}

/**
 * Monitor zap receipts in real-time for payment detection
 */
export function monitorZapReceipts(
  boardId: string,
  recipientPubkey: string,
  onNewZap: (message: ZapMessage) => void
): () => void {
  const pool = getPool();
  const seenIds = new Set<string>();

  const filter: Filter = {
    kinds: [9735],
    "#p": [recipientPubkey],
    since: Math.floor(Date.now() / 1000), // Only new zaps from now
  };

  const sub = pool.subscribeMany(DEFAULT_RELAYS, filter, {
    onevent(event: Event) {
      // Deduplicate
      if (seenIds.has(event.id)) return;
      seenIds.add(event.id);

      try {
        const zapInfo = parseZapReceipt(event);

        if (!zapInfo) {
          console.log("Could not parse zap receipt");
          return;
        }

        // Filter for this board only
        if (zapInfo.boardId !== boardId) {
          return;
        }
        console.log("New zap detected:", zapInfo);

        const message: ZapMessage = {
          id: event.id,
          boardId,
          content: zapInfo.message,
          zapAmount: zapInfo.amount,
          sender: zapInfo.sender,
          displayName: zapInfo.displayName,
          timestamp: event.created_at * 1000,
        };

        onNewZap(message);
      } catch (error) {
        console.error("Failed to process zap receipt:", error);
      }
    },
  });

  console.log("Monitoring new zap receipts for:", recipientPubkey);
  return () => sub.close();
}

/**
 * Verify if a user is eligible to create an explorable board
 * Requirements:
 * - Must have NIP-05 identifier in kind 0 (profile metadata)
 * - Must follow at least 10 people (kind 3 contact list)
 * - Has paid the premium fee
 */
export async function verifyUserEligibility(
  pubkey: string
): Promise<{ eligible: boolean; reason?: string; nip05?: string }> {
  const pool = getPool();

  return new Promise(resolve => {
    let kind0Event: Event | null = null;
    let kind3Event: Event | null = null;
    let sub: any;

    const timeout = setTimeout(() => {
      if (sub) sub.close();

      // Check eligibility after timeout
      const result = checkEligibility(kind0Event, kind3Event);
      resolve(result);
    }, 5000);

    // Query for kind 0 (profile) and kind 3 (contacts) events
    const filter: Filter = {
      kinds: [0, 3],
      authors: [pubkey],
      limit: 2,
    };

    sub = pool.subscribeMany(DEFAULT_RELAYS, filter, {
      onevent(event: Event) {
        if (event.kind === 0) {
          kind0Event = event;
        } else if (event.kind === 3) {
          kind3Event = event;
        }

        // If we have both events, check eligibility immediately
        if (kind0Event && kind3Event) {
          clearTimeout(timeout);
          if (sub) sub.close();
          const result = checkEligibility(kind0Event, kind3Event);
          resolve(result);
        }
      },
      oneose() {
        clearTimeout(timeout);
        if (sub) sub.close();
        const result = checkEligibility(kind0Event, kind3Event);
        resolve(result);
      },
    });
  });
}

// Check eligibility based on fetched events
function checkEligibility(
  kind0Event: Event | null,
  kind3Event: Event | null
): { eligible: boolean; reason?: string; nip05?: string } {
  // Check if profile exists
  if (!kind0Event) {
    return {
      eligible: false,
      reason: "No profile found. Please create a Nostr profile first.",
    };
  }

  // Parse profile metadata
  let profileData: any;
  try {
    profileData = JSON.parse(kind0Event.content);
  } catch (err) {
    return {
      eligible: false,
      reason: "Invalid profile data",
    };
  }

  // Check for NIP-05
  const nip05 = profileData.nip05;
  if (!nip05 || !nip05.trim()) {
    return {
      eligible: false,
      reason: "NIP-05 identifier required. Please add one to your profile.",
    };
  }

  // Check if contact list exists
  if (!kind3Event) {
    return {
      eligible: false,
      reason: "No contact list found. Please follow at least 10 users.",
    };
  }

  // Count follows
  const followCount = kind3Event.tags.filter(tag => tag[0] === "p").length;

  if (followCount < 10) {
    return {
      eligible: false,
      reason: `You need to follow at least 10 users. Currently following: ${followCount}`,
    };
  }

  // All checks passed
  return {
    eligible: true,
    nip05,
  };
}

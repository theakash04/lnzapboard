import { DEFAULT_RELAYS, getPool } from "./nostr";
import { type Filter, type Event } from "nostr-tools";
import { generateInvoice, parseZapReceipt } from "./nip57";

export const PREMIUM_AMOUNT = 10;
const PREMIUM_RECIPIENT_PUBKEY = "72bdbc57bdd6dfc4e62685051de8041d148c3c68fe42bf301f71aa6cf53e52fb";
export const PREMIUM_LIGHTNING_ADDRESS = "zapit@coinos.io";

// Generate Lightning payment URI for premium board
export async function generatePremiumInvoice(boardId: string, userPubkey: string) {
  const res = generateInvoice({
    lightningAddress: PREMIUM_LIGHTNING_ADDRESS,
    amount: PREMIUM_AMOUNT,
    message: `premium-board-${boardId.slice(0, 8)}-${userPubkey.slice(0, 8)}`,
    boardId,
    recipientPubkey: PREMIUM_RECIPIENT_PUBKEY,
  });
  if (!res) throw new Error("Failed to generate invoice");

  return res;
}

/**
 * - Monitor for premium payment confirmation
 * - Uses existing monitorZapReceipts approach
 */
export function monitorPremiumPayment(
  boardId: string,
  userPubkey: string,
  onConfirmed: () => void,
  onError: (error: string) => void
): () => void {
  const pool = getPool();
  const seenIds = new Set<string>();
  const expectedComment = `premium-board-${boardId}-${userPubkey.slice(0, 8)}`;

  console.log("Monitoring for premium payment with comment:", expectedComment);

  const filter: Filter = {
    kinds: [9735],
    "#p": [PREMIUM_RECIPIENT_PUBKEY], // Zaps to mist@coinos.io
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

        // Check if amount is sufficient
        if (zapInfo.amount < PREMIUM_AMOUNT) {
          console.log("Payment amount too low:", zapInfo.amount);
          return;
        }

        // Check if comment matches our expected pattern
        const message = zapInfo.message.toLowerCase();
        if (
          message.includes(`premium-board-${boardId.toLowerCase()}`) ||
          message.includes(userPubkey.slice(0, 8).toLowerCase())
        ) {
          console.log("Premium payment confirmed!", zapInfo);
          onConfirmed();
          sub.close();
        }
      } catch (error) {
        console.error("Failed to process zap receipt:", error);
      }
    },
  });

  console.log("Monitoring premium payment for board:", boardId);

  // Timeout after 5 minutes
  const timeout = setTimeout(() => {
    sub.close();
    onError("Payment confirmation timeout - please try again or contact support");
  }, 300000);

  return () => {
    clearTimeout(timeout);
    sub.close();
  };
}

// Verify if premium payment was made (check historical zaps)
export async function verifyPremiumPayment(boardId: string, userPubkey: string): Promise<boolean> {
  const pool = getPool();

  return new Promise(resolve => {
    let found = false;
    let sub: any;

    const timeout = setTimeout(() => {
      if (sub) sub.close();
      resolve(found);
    }, 5000);

    // Look for zaps >= 3900 sats to mist@coinos.io
    const filter: Filter = {
      kinds: [9735],
      "#p": [PREMIUM_RECIPIENT_PUBKEY],
      limit: 100,
    };

    sub = pool.subscribeMany(DEFAULT_RELAYS, filter, {
      onevent(event: Event) {
        try {
          const zapInfo = parseZapReceipt(event);

          if (!zapInfo) return;

          // Check amount
          if (zapInfo.amount < PREMIUM_AMOUNT) return;

          // Check if message matches
          const message = zapInfo.message.toLowerCase();
          if (
            message.includes(`premium-board-${boardId.toLowerCase()}`) ||
            message.includes(userPubkey.slice(0, 8).toLowerCase())
          ) {
            found = true;
            clearTimeout(timeout);
            if (sub) sub.close();
            resolve(true);
          }
        } catch (err) {
          console.error("Error parsing zap:", err);
        }
      },
      oneose() {
        clearTimeout(timeout);
        if (sub) sub.close();
        resolve(found);
      },
    });
  });
}

// Get premium payment details for display
export function getPremiumPaymentDetails() {
  return {
    amount: PREMIUM_AMOUNT,
    recipient: PREMIUM_LIGHTNING_ADDRESS,
    amountMsats: PREMIUM_AMOUNT * 1000,
  };
}

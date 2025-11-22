import { makeZapRequest, validateZapRequest } from "nostr-tools/nip57";
import { generateSecretKey, finalizeEvent } from "nostr-tools";
import type { EventTemplate } from "nostr-tools";

interface GenerateInvoiceParams {
  lightningAddress: string;
  amount: number;
  message: string;
  boardId: string;
  recipientPubkey: string;
  displayName?: string;
}

// Generate a Lightning invoice with zap request
export async function generateInvoice(params: GenerateInvoiceParams): Promise<{
  invoice: string;
  zapRequest: any;
} | null> {
  const { lightningAddress, amount, message, boardId, recipientPubkey, displayName } = params;

  try {
    // Parse Lightning address
    const [username, domain] = lightningAddress.split("@");
    if (!username || !domain) {
      throw new Error("Invalid Lightning address");
    }

    // Generate ephemeral keypair for this zap
    const senderPrivkey = generateSecretKey();
    // const senderPubkey = getPublicKey(senderPrivkey);

    // Fetch LNURL endpoint
    const lnurlUrl = `https://${domain}/.well-known/lnurlp/${username}`;
    const lnurlResponse = await fetch(lnurlUrl);

    if (!lnurlResponse.ok) {
      throw new Error("Lightning address not found");
    }

    const lnurlData = await lnurlResponse.json();

    // Check if zaps are supported
    if (!lnurlData.allowsNostr || !lnurlData.nostrPubkey) {
      throw new Error("This Lightning address does not support zaps");
    }

    // Create zap request
    const zapRequestTemplate: EventTemplate = makeZapRequest({
      pubkey: recipientPubkey,
      amount: amount * 1000, // millisats
      //   comment: message,
      relays: ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.snort.social"],
    });

    zapRequestTemplate.content = message;

    // Add custom board tag
    zapRequestTemplate.tags.push(["board", boardId]);

    if (params.displayName) {
      zapRequestTemplate.tags.push(["displayName", displayName!]);
    }

    // Sign the zap request
    const signedZapRequest = finalizeEvent(zapRequestTemplate, senderPrivkey);

    // Validate zap request
    const validationError = validateZapRequest(JSON.stringify(signedZapRequest));
    if (validationError) {
      throw new Error(`Invalid zap request: ${validationError}`);
    }

    // Request invoice from LNURL callback
    const callbackUrl = new URL(lnurlData.callback);
    callbackUrl.searchParams.set("amount", (amount * 1000).toString());
    callbackUrl.searchParams.set("nostr", JSON.stringify(signedZapRequest));
    // callbackUrl.searchParams.set('comment', message);

    const invoiceResponse = await fetch(callbackUrl.toString());

    if (!invoiceResponse.ok) {
      throw new Error("Failed to get invoice");
    }

    const invoiceData = await invoiceResponse.json();

    if (invoiceData.status === "ERROR") {
      throw new Error(invoiceData.reason || "Invoice generation failed");
    }

    if (!invoiceData.pr) {
      throw new Error("No invoice returned");
    }

    return {
      invoice: invoiceData.pr,
      zapRequest: signedZapRequest,
    };
  } catch (error) {
    console.error("Generate invoice error:", error);
    throw error;
  }
}

/**
 * Parse a zap receipt to extract the message
 */
export function parseZapReceipt(zapReceipt: any): {
  amount: number;
  message: string;
  sender?: string;
  boardId?: string;
  displayName?: string;
} | null {
  try {
    // Find the description tag (contains zap request)
    const descriptionTag = zapReceipt.tags.find((t: string[]) => t[0] === "description");
    if (!descriptionTag || !descriptionTag[1]) {
      return null;
    }

    // Parse zap request
    const zapRequest = JSON.parse(descriptionTag[1]);

    // Extract message from content
    const message = zapRequest.content || "";

    // Extract board ID from custom tag
    const boardTag = zapRequest.tags?.find((t: string[]) => t[0] === "board");
    const boardId = boardTag?.[1];

    // Extract displayName tag
    const displayNameTag = zapRequest.tags?.find((t: string[]) => t[0] === "displayName");
    const displayName = displayNameTag?.[1] || "Anonymous";
    console.log("parseZapReq> displayName:", displayName);

    // Extract amount from zap request
    const amountTag = zapRequest.tags?.find((t: string[]) => t[0] === "amount");
    const amountMillisats = amountTag?.[1] ? parseInt(amountTag[1]) : 0;
    const amount = Math.floor(amountMillisats / 1000);

    return {
      amount,
      message,
      sender: zapRequest.pubkey,
      boardId,
      displayName,
    };
  } catch (error) {
    console.error("Failed to parse zap receipt:", error);
    return null;
  }
}

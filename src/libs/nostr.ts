import { SimplePool, finalizeEvent, generateSecretKey } from 'nostr-tools';
import type { Event, Filter } from 'nostr-tools';
import type { BoardConfig, ZapMessage } from '../types';
import { parseZapReceipt } from './nip57';

export const DEFAULT_RELAYS = [
    'wss://relay.damus.io',
    "wss://debugrelay.angor.online",
    'wss://nos.lol',
    'wss://relay.snort.social',
];

let poolInstance: SimplePool | null = null;

export function getPool(): SimplePool {
    if (!poolInstance) {
        poolInstance = new SimplePool();
    }
    return poolInstance;
}

/**
 * Publish board config to Nostr relays
 */
export async function publishBoardConfig(
    config: BoardConfig,
    privateKey: Uint8Array
): Promise<void> {
    const pool = getPool();

    const event = {
        kind: 30078,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
            ['d', config.boardId],
            ['title', config.displayName],
            ['ln', config.lightningAddress],
            ['min_zap', config.minZapAmount.toString()],
        ],
        content: JSON.stringify({
            displayName: config.displayName,
            minZapAmount: config.minZapAmount,
            lightningAddress: config.lightningAddress,
            createdAt: config.createdAt,
        }),
    };

    const signedEvent = finalizeEvent(event, privateKey);
    const pubs = pool.publish(DEFAULT_RELAYS, signedEvent);

    await Promise.race([
        Promise.all(pubs),
        new Promise(resolve => setTimeout(resolve, 5000))
    ]);
}

/**
 * Fetch board config from Nostr relays
 */
export async function fetchBoardConfig(
    boardId: string
): Promise<BoardConfig | null> {
    const pool = getPool();

    return new Promise((resolve) => {
        let sub: any;

        const timeout = setTimeout(() => {
            if (sub) sub.close();
            resolve(null);
        }, 5000);

        const filter: Filter = {
            kinds: [30078],
            '#d': [boardId],
        };

        sub = pool.subscribeMany(
            DEFAULT_RELAYS,
            filter,
            {
                onevent(event: Event) {
                    clearTimeout(timeout);
                    if (sub) sub.close();

                    try {
                        const content = JSON.parse(event.content);
                        const lnTag = event.tags.find(t => t[0] === 'ln');
                        const minZapTag = event.tags.find(t => t[0] === 'min_zap');

                        const config: BoardConfig = {
                            boardId,
                            displayName: content.displayName,
                            minZapAmount: parseInt(minZapTag?.[1] || '1000'),
                            lightningAddress: lnTag?.[1] || '',
                            creatorPubkey: event.pubkey,
                            createdAt: content.createdAt,
                        };
                        resolve(config);
                    } catch (err) {
                        console.error('Failed to parse board config !:', err);
                        resolve(null);
                    }
                },
                oneose() {
                    clearTimeout(timeout);
                    if (sub) sub.close();
                    resolve(null);
                }
            }
        );
    });
}

/**
 * Subscribe to messages for a board
 * Uses #e tag for efficient relay-side filtering
 */
export function subscribeToMessages(
    boardId: string,
    onMessage: (message: ZapMessage) => void
): () => void {
    const pool = getPool();

    const filter: Filter = {
        kinds: [1337],
        '#e': [boardId], // Indexed tag for relay filtering
        since: Math.floor(Date.now() / 1000) - 86400,
    };

    const sub = pool.subscribeMany(
        DEFAULT_RELAYS,
        filter,
        {
            onevent(event: Event) {
                try {
                    const amountTag = event.tags.find(t => t[0] === 'amount');
                    const senderTag = event.tags.find(t => t[0] === 'sender');
                    const displayNameTag = event.tags.find(t => t[0] === 'displayName');

                    const message: ZapMessage = {
                        id: event.id,
                        boardId,
                        content: event.content,
                        zapAmount: parseInt(amountTag?.[1] || '0', 10),
                        sender: senderTag?.[1],
                        displayName: displayNameTag?.[1] || "Anonymous",
                        timestamp: event.created_at * 1000,
                    };
                    onMessage(message);
                } catch (err) {
                    console.error('Failed to parse message:', err);
                }
            },
        }
    );

    return () => sub.close();
}

/**
 * Publish a message event
 * Uses #e tag to reference the board
 */
export async function publishMessage(
    boardId: string,
    content: string,
    zapAmount: number,
    sender: string | undefined,
    privateKey: Uint8Array,
    displayName?: string
): Promise<void> {
    const pool = getPool();

    const event = {
        kind: 1337,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
            ['e', boardId], // Use indexed 'e' tag
            ['amount', zapAmount.toString()],
            ...(sender ? [['sender', sender]] : []),
            ...(displayName ? [["displayName",displayName]]: []),
        ],
        content,
    };

    const signedEvent = finalizeEvent(event, privateKey);

    const pubs = pool.publish(DEFAULT_RELAYS, signedEvent);

    await Promise.race([
        Promise.all(pubs),
        new Promise(resolve => setTimeout(resolve, 3000))
    ]);
}

/**
 * Monitor zap receipts for a board
 */
export function monitorZapReceipts(
    boardId: string,
    recipientPubkey: string,
    onNewMessage: (message: ZapMessage) => void
): () => void {
    const pool = getPool();

    const filter: Filter = {
        kinds: [9735],
        '#p': [recipientPubkey],
        since: Math.floor(Date.now() / 1000),
    };

    const sub = pool.subscribeMany(
        DEFAULT_RELAYS,
        filter,
        {
            onevent: async (event: Event) => {
                console.log('Zap receipt received:', event);

                try {
                    const zapInfo = parseZapReceipt(event);
                    
                    if (!zapInfo) {
                        console.log(" Could not parse zap receipt");
                        return;
                    }

                    if (zapInfo.boardId !== boardId) {
                        console.log('Zap not for this board');
                        return;
                    }

                    console.log('Zap for this board:', zapInfo);

                    const privateKey = generateSecretKey();
                    await publishMessage(
                        boardId,
                        zapInfo.message,
                        zapInfo.amount,
                        zapInfo.sender,
                        privateKey,
                        zapInfo.displayName
                    );

                    const message: ZapMessage = {
                        id: event.id,
                        boardId,
                        content: zapInfo.message,
                        zapAmount: zapInfo.amount,
                        sender: zapInfo.sender,
                        timestamp: event.created_at * 1000,
                    };

                    onNewMessage(message);
                } catch (error) {
                    console.error("Failed to process zap receipt:", error);
                }
            },
        }
    );

    console.log("Monitoring zap receipts for pubkey:", recipientPubkey);
    return () => sub.close();
}
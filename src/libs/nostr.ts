import { SimplePool, finalizeEvent, generateSecretKey } from 'nostr-tools';
import type { Event, Filter } from 'nostr-tools';
import type { BoardConfig, ZapMessage } from '../types';
import { parseZapReceipt } from './nip57';

export const DEFAULT_RELAYS = [
    'wss://relay.damus.io',
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

export function subscribeToZapMessages(
    boardId: string,
    recipientPubkey: string,
    onMessage: (message: ZapMessage) => void
): () => void {
    const pool = getPool();
    const seenIds = new Set<string>(); // Client-side deduplication

    const filter: Filter = {
        kinds: [9735],
        '#p': [recipientPubkey], // Zaps to the board creator
        // No 'since' - load all historical zaps
    };

    const sub = pool.subscribeMany(
        DEFAULT_RELAYS,
        filter,
        {
            onevent(event: Event) {
                // Deduplicate at subscription level
                if (seenIds.has(event.id)) return;
                seenIds.add(event.id);

                try {
                    const zapInfo = parseZapReceipt(event);
                    
                    if (!zapInfo) {
                        console.log('Could not parse zap receipt');
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
                    console.error('Failed to process zap receipt:', error);
                }
            },
        }
    );

    console.log('Subscribed to zap receipts for:', recipientPubkey);
    return () => sub.close();
}
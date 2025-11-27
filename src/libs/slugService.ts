import { verifyEvent, type Event } from "nostr-tools";
import type { SlugReservation, SlugAvailability } from "../types/types";
import { getPool, DEFAULT_RELAYS } from "./nostr";
import { safeLocalStorage } from "./safeStorage";

const SLUG_KIND = 30079;
export const SLUG_PRICE = parseInt(import.meta.env.VITE_SLUG_PRICE || "2100");

const SLUG_CACHE_KEY = "slug-cache";

// Get slug cache from localStorage
function getSlugCache(): Record<string, string> {
    const cache = safeLocalStorage.getItem(SLUG_CACHE_KEY);
    return cache ? JSON.parse(cache) : {};
}

// Save slug to cache
function cacheSlug(slug: string, boardId: string) {
    const cache = getSlugCache();
    cache[slug] = boardId;
    safeLocalStorage.setItem(SLUG_CACHE_KEY, JSON.stringify(cache));
}

// Get boardId from cache
function getCachedBoardId(slug: string): string | null {
    const cache = getSlugCache();
    return cache[slug] || null;
}

// Validate slug format
export function validateSlug(slug: string): { valid: boolean; error?: string } {
    if (!slug || slug.length < 3) {
        return { valid: false, error: "Slug must be at least 3 characters long" };
    }

    if (slug.length > 30) {
        return { valid: false, error: "Slug must be less than 30 characters" };
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
        return { valid: false, error: "Slug can only contain lowercase letters, numbers, and hyphens" };
    }

    if (slug.startsWith("-") || slug.endsWith("-")) {
        return { valid: false, error: "Slug cannot start or end with a hyphen" };
    }

    if (slug.includes("--")) {
        return { valid: false, error: "Slug cannot contain consecutive hyphens" };
    }

    // Reserved slugs
    const reserved = ["create", "pay", "board", "explore", "settings", "api", "admin", "zapme", "i"];
    if (reserved.includes(slug)) {
        return { valid: false, error: "This slug is reserved" };
    }

    return { valid: true };
}

// Check if slug is available
export async function checkSlugAvailability(slug: string): Promise<SlugAvailability> {
    const validation = validateSlug(slug);
    if (!validation.valid) {
        return { available: false, reason: validation.error };
    }

    const pool = getPool();

    return new Promise((resolve) => {
        let sub: any;
        const timeout = setTimeout(() => {
            if (sub) sub.close();
            resolve({ available: true });
        }, 5000);

        const filter = {
            kinds: [SLUG_KIND],
            "#d": [slug],
            limit: 1
        };

        sub = pool.subscribeMany(DEFAULT_RELAYS, filter, {
            onevent: (event: Event) => {
                clearTimeout(timeout);
                if (sub) sub.close();

                if (!verifyEvent(event)) {
                    resolve({ available: true });
                    return;
                }

                const reservation = parseSlugReservation(event);
                if (reservation) {
                    resolve({
                        available: false,
                        reason: "This slug is already taken",
                        existingReservation: reservation
                    });
                } else {
                    resolve({ available: true });
                }
            },
            oneose: () => {
                clearTimeout(timeout);
                if (sub) sub.close();
                resolve({ available: true });
            }
        });
    });
}

// Parse event into SlugReservation
function parseSlugReservation(event: Event): SlugReservation | null {
    try {
        const slugTag = event.tags.find(t => t[0] === "d");
        const boardIdTag = event.tags.find(t => t[0] === "b");
        const paymentHashTag = event.tags.find(t => t[0] === "payment");
        const amountTag = event.tags.find(t => t[0] === "amount");

        if (!slugTag?.[1] || !boardIdTag?.[1] || !paymentHashTag?.[1]) {
            return null;
        }

        return {
            slug: slugTag[1],
            boardId: boardIdTag[1],
            userPubkey: event.pubkey,
            paymentHash: paymentHashTag[1],
            amount: parseInt(amountTag?.[1] || SLUG_PRICE.toString()),
            reservedAt: event.created_at * 1000,
            eventId: event.id
        };
    } catch (error) {
        console.error("Failed to parse slug reservation:", error);
        return null;
    }
}

// Reserve a slug (after payment)
export async function reserveSlug(
    slug: string,
    boardId: string,
    paymentHash: string
): Promise<{ success: boolean; error?: string; eventId?: string }> {

    // Verify slug is still available
    const availability = await checkSlugAvailability(slug);
    if (!availability.available) {
        return { success: false, error: availability.reason || "Slug is no longer available" };
    }

    if (!window.nostr) {
        return { success: false, error: "Nostr extension required" };
    }

    try {
        const event = {
            kind: SLUG_KIND,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ["d", slug],
                ["b", boardId],
                ["payment", paymentHash],
                ["amount", SLUG_PRICE.toString()],
                ["t", "zapboard-slug"]
            ],
            content: JSON.stringify({
                reservedAt: Date.now(),
                // customUrl: `https://zapit.space/b/${slug}`
            })
        };

        const signedEvent = await window.nostr.signEvent(event);

        if (!verifyEvent(signedEvent)) {
            return { success: false, error: "Invalid event signature" };
        }

        const pool = getPool();
        const pubs = pool.publish(DEFAULT_RELAYS, signedEvent);

        await Promise.race([
            Promise.all(pubs),
            new Promise(resolve => setTimeout(resolve, 5000))
        ]);

        // Cache the slug locally
        cacheSlug(slug, boardId);

        return { success: true, eventId: signedEvent.id };
    } catch (error) {
        console.error("Failed to reserve slug:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to reserve slug" };
    }
}

// Resolve slug to board ID
export async function resolveSlug(slug: string): Promise<string | null> {
    // Check cache first
    const cachedBoardId = getCachedBoardId(slug);
    if (cachedBoardId) {
        console.log("Slug resolved from cache:", slug, "->", cachedBoardId);
        return cachedBoardId;
    }

    // Query Nostr if not in cache
    const pool = getPool();

    return new Promise((resolve) => {
        let sub: any;
        const timeout = setTimeout(() => {
            if (sub) sub.close();
            resolve(null);
        }, 5000);

        const filter = {
            kinds: [SLUG_KIND],
            "#d": [slug],
            limit: 10 // Get multiple in case of collision
        };

        const events: Event[] = [];

        sub = pool.subscribeMany(DEFAULT_RELAYS, filter, {
            onevent: (event: Event) => {
                if (verifyEvent(event)) {
                    events.push(event);
                }
            },
            oneose: () => {
                clearTimeout(timeout);
                if (sub) sub.close();

                if (events.length === 0) {
                    resolve(null);
                    return;
                }

                // If collision, take oldest event (first-come-first-served)
                const oldest = events.sort((a, b) => a.created_at - b.created_at)[0];
                const reservation = parseSlugReservation(oldest);

                if (reservation) {
                    // Cache the result
                    cacheSlug(slug, reservation.boardId);
                    resolve(reservation.boardId);
                } else {
                    resolve(null);
                }
            }
        });
    });
}

// Get slug for a board ID
export async function getSlugForBoard(boardId: string): Promise<string | null> {
    const pool = getPool();

    return new Promise((resolve) => {
        let sub: any;
        const timeout = setTimeout(() => {
            if (sub) sub.close();
            resolve(null);
        }, 5000);

        const filter = {
            kinds: [SLUG_KIND],
            "#b": [boardId],
            limit: 1
        };

        sub = pool.subscribeMany(DEFAULT_RELAYS, filter, {
            onevent: (event: Event) => {
                clearTimeout(timeout);
                if (sub) sub.close();

                if (!verifyEvent(event)) {
                    resolve(null);
                    return;
                }

                const reservation = parseSlugReservation(event);
                if (reservation) {
                    // Update cache
                    cacheSlug(reservation.slug, boardId);
                    resolve(reservation.slug);
                } else {
                    resolve(null);
                }
            },
            oneose: () => {
                clearTimeout(timeout);
                if (sub) sub.close();
                resolve(null);
            }
        });
    });
}

// Clear slug cache 
export function clearSlugCache() {
    safeLocalStorage.setItem(SLUG_CACHE_KEY, JSON.stringify({}));
}
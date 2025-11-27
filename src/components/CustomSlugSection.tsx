import { useState, useEffect } from "react";
import { FaCheck, FaTimes, FaSpinner, FaCopy } from "react-icons/fa";
import { BsLightning, BsLink45Deg } from "react-icons/bs";
import { MdVerified } from "react-icons/md";
import {
  validateSlug,
  checkSlugAvailability,
  reserveSlug,
  getSlugForBoard,
  SLUG_PRICE,
} from "../libs/slugService";
import { generateSlugInvoice, monitorSlugPayment } from "../libs/payments";
import { QRCodeSVG } from "qrcode.react";
import type { BoardConfig, StoredBoard } from "../types/types";
import { publishBoardConfig } from "../libs/nostr";
import { safeLocalStorage } from "../libs/safeStorage";

interface CustomSlugSectionProps {
  boardId: string;
  userPubkey: string;
  currentSlug?: string;
}

export default function CustomSlugSection({
  boardId,
  userPubkey,
  currentSlug,
}: CustomSlugSectionProps) {
  const [slug, setSlug] = useState(currentSlug || "");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [existingSlug, setExistingSlug] = useState<string | null>(currentSlug || null);
  const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null);

  // Payment states
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [invoice, setInvoice] = useState("");
  const [isWaitingPayment, setIsWaitingPayment] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [invoiceCopied, setInvoiceCopied] = useState(false);
  const [isReserving, setIsReserving] = useState(false);

  // Load existing slug on mount
  useEffect(() => {
    const loadExistingSlug = async () => {
      const slug = await getSlugForBoard(boardId);
      if (slug) {
        setExistingSlug(slug);
        setSlug(slug);
      }
    };
    loadExistingSlug();
  }, [boardId]);

  // Load boardConfig
  useEffect(() => {
    const boards: StoredBoard[] = JSON.parse(safeLocalStorage.getItem("boards") || "[]");
    const b = boards.find(b => b.boardId === boardId);
    if (b) setBoardConfig(b.config);
  }, [boardId]);

  // Debounced availability check
  useEffect(() => {
    if (!slug || slug === existingSlug) {
      setAvailable(null);
      setError("");
      return;
    }

    const validation = validateSlug(slug);
    if (!validation.valid) {
      setError(validation.error || "Invalid slug");
      setAvailable(false);
      return;
    }

    const timer = setTimeout(() => {
      checkAvailability();
    }, 500);

    return () => clearTimeout(timer);
  }, [slug, existingSlug]);

  const checkAvailability = async () => {
    setChecking(true);
    setError("");

    try {
      const result = await checkSlugAvailability(slug);
      setAvailable(result.available);
      if (!result.available) {
        setError(result.reason || "Slug is taken");
      }
    } catch (err) {
      setError("Failed to check availability");
      setAvailable(null);
    } finally {
      setChecking(false);
    }
  };

  const handleClaim = async () => {
    if (!available) return;

    try {
      const res = await generateSlugInvoice(boardId, slug, userPubkey);
      if (!res) {
        setError("Failed to generate invoice");
        return;
      }

      setInvoice(res.invoice);
      setShowPaymentQR(true);
      setIsWaitingPayment(true);

      monitorSlugPayment(
        boardId,
        slug,
        res.hash,
        async () => {
          setIsPaid(true);
          setIsWaitingPayment(false);

          // Reserve the slug
          setIsReserving(true);
          const result = await reserveSlug(slug, boardId, res.hash);

          if (result.success) {
            setExistingSlug(slug);

            setTimeout(() => {
              setShowPaymentQR(false);
              setIsReserving(false);
            }, 2000);
          } else {
            setError(result.error || "Failed to reserve slug");
            setIsReserving(false);
          }
        },
        error => {
          setError(error);
          setIsWaitingPayment(false);
        }
      );
    } catch (err) {
      setError("Payment error");
    }

    // Publish as replaceable event (kind 30078)
    if (!boardConfig) {
      setError("Board config not loaded");
      return;
    }
      console.log(JSON.stringify(boardConfig));
      console.log("customSlug: ", slug);
    const updatedConfig: BoardConfig = {
      ...boardConfig,
      customSlug: slug,
    };
    await publishBoardConfig(updatedConfig, null, true);

    const boards: StoredBoard[] = JSON.parse(safeLocalStorage.getItem("boards") || "[]");
    const boardIndex = boards.findIndex(b => b.boardId === boardId);
    if (boardIndex !== -1) {
      boards[boardIndex].config = updatedConfig;
      safeLocalStorage.setItem("boards", JSON.stringify(boards));
    }
    setBoardConfig(updatedConfig);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusIcon = () => {
    if (checking) return <FaSpinner className="animate-spin text-yellow-text/90" />;
    if (available === true) return <FaCheck className="text-green-400" />;
    if (available === false) return <FaTimes className="text-red-400" />;
    return null;
  };

  return (
    <div className="card-style p-8 border-2 border-violet-300/20 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <BsLink45Deg className="text-yellow-text/90 text-3xl" />
        <h2 className="text-white font-bold text-2xl">Custom URL</h2>
        <MdVerified className="text-violet-300 text-xl" />
      </div>

      <p className="text-gray-400 mb-6">
        Get a personalized board URL like{" "}
        <span className="text-violet-300 font-mono">https://zapit.space/b/{`<your-name>`}</span> for
        only <span className="text-yellow-text/90 font-bold">{SLUG_PRICE} sats</span>.
      </p>

      {existingSlug ? (
        <div className="bg-green-500/10 border border-green-500/30 p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-green-400 font-semibold mb-2">✓ Custom URL Active</p>
              <div className="flex items-center gap-2">
                <code className="text-white text-lg">https://zapit.space/b/{existingSlug}</code>
                <button
                  onClick={() => {
                    copyToClipboard(`${window.location.origin}/b/${existingSlug}`);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Copy custom URL"
                >
                  <FaCopy />
                </button>
              </div>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-3">
            Want to change it? Enter a new slug below and claim it.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <label className="block text-white font-semibold mb-2">
            {existingSlug ? "Change Your Slug" : "Choose Your Slug"}
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">
                zapit.space/b/
              </span>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase())}
                placeholder="bitcoin-conf"
                className="w-full pl-36 pr-12 py-3 bg-blackish text-white placeholder-gray-600 border-2 border-border-purple focus:border-yellow-text/80 focus:outline-none transition-colors font-mono"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">{getStatusIcon()}</div>
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            3-30 characters: lowercase letters, numbers, and hyphens only
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {available && slug !== existingSlug && (
          <div className="p-3 bg-green-500/10 border border-green-500/30">
            <p className="text-green-400 text-sm">✓ This slug is available!</p>
          </div>
        )}

        {slug !== existingSlug && (
          <button
            onClick={handleClaim}
            disabled={!available || checking}
            className="w-full bg-yellow-text/90 hover:bg-yellow-text disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-blackish font-bold py-4 px-6 text-lg uppercase tracking-wide transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,223,32,0.3)] transform hover:scale-[1.02] disabled:transform-none flex items-center justify-center gap-2"
          >
            <BsLightning />
            {existingSlug
              ? `Change to "${slug}" for ${SLUG_PRICE} sats`
              : `Claim for ${SLUG_PRICE} sats`}
          </button>
        )}
      </div>

      {showPaymentQR && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="card-style p-6 max-w-md w-full">
            <h2 className="text-yellow-text/90 font-bold text-xl mb-4">Claim Custom URL</h2>
            <p className="text-white text-sm mb-4">
              Pay <span className="text-yellow-text/90 font-bold">{SLUG_PRICE} sats</span> to claim{" "}
              <span className="text-violet-300 font-mono">https://zapit.space/b/{slug}</span>
            </p>

            <div className="bg-white p-4 mb-4">
              <QRCodeSVG value={invoice} size={220} level="M" className="mx-auto w-full h-auto" />
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(invoice);
                setInvoiceCopied(true);
                setTimeout(() => setInvoiceCopied(false), 2000);
              }}
              className="w-full mb-4 bg-violet-300/10 hover:bg-violet-300/20 text-violet-300 font-bold py-3 text-sm border border-violet-300/30 hover:border-violet-300/50 transition-all duration-300 flex items-center justify-center gap-2"
            >
              {invoiceCopied ? (
                <>
                  <FaCheck />
                  Copied!
                </>
              ) : (
                <>
                  <FaCopy />
                  Copy Invoice
                </>
              )}
            </button>

            {isWaitingPayment && (
              <div className="mb-4 p-3 bg-yellow-text/10 border border-yellow-text/30">
                <p className="text-yellow-text/90 text-center text-sm animate-pulse">
                  ⚡ Waiting for payment...
                </p>
              </div>
            )}

            {isPaid && !isReserving && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30">
                <p className="text-green-400 text-center text-sm font-bold">✓ Payment Confirmed!</p>
              </div>
            )}

            {isReserving && (
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30">
                <p className="text-blue-400 text-center text-sm animate-pulse">
                  Reserving your custom URL...
                </p>
              </div>
            )}

            <button
              onClick={() => {
                setShowPaymentQR(false);
                setIsWaitingPayment(false);
              }}
              disabled={isReserving}
              className="w-full bg-transparent hover:bg-gray-700/30 text-white font-bold py-3 text-sm border-2 border-gray-600 hover:border-gray-500 transition-all duration-300 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

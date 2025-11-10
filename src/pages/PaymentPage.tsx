import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { fetchBoardConfig } from "../libs/nostr";
import { generateInvoice } from "../libs/nip57";
import type { BoardConfig } from "../types";
import RetroFrame from "../components/Frame";
import { FaCopy } from "react-icons/fa";

function PaymentPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();

  const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [amount, setAmount] = useState<number>(1000);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Preset amount options
  const PRESET_AMOUNTS = [
    21, 69, 121, 420, 1000, 2100, 4200, 10000, 21000, 42000, 69000, 100000,
    210000, 500000, 1000000,
  ];

  // Load board config
  useEffect(() => {
    const loadBoard = async () => {
      if (!boardId) return;

      setLoading(true);
      try {
        const config = await fetchBoardConfig(boardId);

        if (!config) {
          setError("Board not found");
          return;
        }

        setBoardConfig(config);
        setAmount(config.minZapAmount);
      } catch (err) {
        setError("Failed to load board");
      } finally {
        setLoading(false);
      }
    };

    loadBoard();
  }, [boardId]);

  // NEW: Get valid preset amounts based on minZapAmount
  const getValidPresets = () => {
    if (!boardConfig) return [];
    return PRESET_AMOUNTS.filter(
      (amt) => amt >= boardConfig.minZapAmount
    ).slice(0, 5);
  };

  const handleSendZap = async () => {
    if (!boardConfig || !boardId) return;

    if (amount < boardConfig.minZapAmount) {
      setError(`Minimum amount is ${boardConfig.minZapAmount} sats`);
      return;
    }

    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      console.log("Creating zap request...");

      // Create zap request and generate invoice
      const invoiceData = await generateInvoice({
        lightningAddress: boardConfig.lightningAddress,
        amount,
        message,
        boardId,
        recipientPubkey: boardConfig.creatorPubkey,
        displayName: displayName.trim() || "Anonymous",
      });
      console.log(invoiceData)

      if (!invoiceData || !invoiceData.invoice) {
        throw new Error("Failed to generate invoice");
      }

      setInvoice(invoiceData.invoice);
    } catch (err) {
      console.error("Zap error:", err);
      setError(err instanceof Error ? err.message : "Failed to create zap");
    } finally {
      setProcessing(false);
    }
  };

  const openInWallet = () => {
    if (!invoice) return;
    window.location.href = `lightning:${invoice}`;
  };

  const handleCopy = () => {
    if (invoice != null) {
      navigator.clipboard.writeText(invoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Format large numbers
  const formatAmount = (amt: number) => {
    if (amt >= 1000000) return `${(amt / 1000000).toFixed(1)}M`;
    if (amt >= 1000) return `${(amt / 1000).toFixed(1)}K`;
    return amt.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <RetroFrame>
          <div className="text-white text-xl">Loading...</div>
        </RetroFrame>
      </div>
    );
  }

  if (error && !boardConfig) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <RetroFrame>
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-6 py-4 ">
            {error}
          </div>
        </RetroFrame>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <RetroFrame className="max-w-lg w-full sm:w-lg">
        {!invoice ? (
          // Step 1: Input form
          <div className="bg-white/10 backdrop-blur-lg p-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              ⚡ Send a Zap
            </h2>
            <p className="text-gray-300 mb-6">to {boardConfig?.displayName}</p>

            <div className="space-y-6">
              {/* Username */}
              <div>
                <label className="block text-white mb-2 font-medium">
                  Your Name (optional)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Anonymous"
                  maxLength={50}
                  className="w-full px-4 py-3 bg-white/20 text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:border-blue-500 text-lg"
                />
                <p className="text-gray-400 text-sm mt-2">
                  Leave empty to post anonymously
                </p>
              </div>
              {/* Amount selection with preset buttons */}
              <div>
                <label className="block text-white mb-2 font-medium">
                  Amount (sats)
                </label>

                {!showCustomAmount ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {getValidPresets().map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setAmount(preset)}
                          className={`px-2 py-1 font-bold text-lg transition-all ${
                            amount === preset
                              ? "bg-orange-500 text-white border-2 border-orange-400"
                              : "bg-white/20 text-white border border-white/30 hover:bg-white/30"
                          }`}
                        >
                          {formatAmount(preset)}
                        </button>
                      ))}
                    <button
                      onClick={() => setShowCustomAmount(true)}
                      className="w-full px-2 py-1 bg-white/10 text-white border border-white/30 hover:bg-white/20 text-sm transition-colors"
                    >
                      Custom Amount
                    </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      min={boardConfig?.minZapAmount}
                      className="w-full px-4 py-3 bg-white/20 text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:border-orange-500 text-lg"
                    />
                    <button
                      onClick={() => setShowCustomAmount(false)}
                      className="w-full px-4 py-2 bg-white/10 text-white border border-white/30 hover:bg-white/20 text-sm transition-colors"
                    >
                      Back to Presets
                    </button>
                  </div>
                )}

                <p className="text-gray-400 text-sm mt-2">
                  Minimum: {boardConfig?.minZapAmount} sats
                </p>
              </div>

              <div>
                <label className="block text-white mb-2 font-medium">
                  Your Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask a question or leave a comment..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-4 py-3  bg-white/20 text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:border-yellow-500 resize-none"
                />
                <p className="text-gray-400 text-sm mt-2">
                  {message.length}/500 characters
                </p>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 ">
                  {error}
                </div>
              )}

              <button
                onClick={handleSendZap}
                disabled={processing}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white font-bold py-4  text-lg transition-colors"
              >
                {processing ? "Generating Invoice..." : `Zap ${amount} sats ⚡`}
              </button>

              <button
                onClick={() => navigate(`/board/${boardId}`)}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-3  transition-colors"
              >
                Back to Board
              </button>
            </div>
          </div>
        ) : (
          // Step 2: Show invoice
          <div className="bg-white/10 backdrop-blur-lg  p-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Scan to Pay</h2>
            <p className="text-gray-300 mb-6">{amount.toLocaleString()} sats</p>
            <div className="flex flex-col items-center justify-center pb-3 gap-2">
              <div className="bg-white p-6">
                <QRCodeSVG
                  value={invoice}
                  size={300}
                  level="M"
                  className="mx-auto"
                  style={{ width: "100%", height: "auto" }}
                />
              </div>
              {!copied ? (
                <div
                  className="flex gap-2 items-center text-sm cursor-pointer text-yellow-400 hover:text-yellow-300 transition-colors"
                  onClick={handleCopy}
                >
                  copy invoice addr <FaCopy size={20} />
                </div>
              ) : (
                <div className="text-green-300 text-sm text-center md:text-right">
                  {copied ? "lnrunl invoice copied!" : ""}
                </div>
              )}
            </div>

            <button
              onClick={openInWallet}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4  text-lg mb-3 transition-colors"
            >
              Open in Wallet
            </button>

            <button
              onClick={() => {
                setInvoice(null);
                setMessage("");
              }}
              className="w-full bg-white/20 hover:bg-white/30 text-white font-bold py-3  transition-colors"
            >
              Create Another Zap
            </button>

            <p className="text-gray-400 text-sm mt-6">
              After payment, your message will appear on the board
            </p>
          </div>
        )}
      </RetroFrame>
    </div>
  );
}

export default PaymentPage;

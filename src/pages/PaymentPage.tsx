import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { fetchBoardConfig, monitorZapReceipts } from "../libs/nostr";
import { generateInvoice } from "../libs/nip57";
import type { BoardConfig, ZapMessage } from "../types/types";
import { FaCopy, FaCheckCircle } from "react-icons/fa";
import { BsLightning } from "react-icons/bs";
import Loading from "../components/Loading";

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
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState("");

  const MAX_MESSAGE_LENGTH = 132;

  // Preset amount options
  const PRESET_AMOUNTS = [
    21, 69, 121, 420, 1000, 2100, 4200, 10000, 21000, 42000, 69000, 100000, 210000, 500000, 1000000,
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

  // Monitor for payment success after invoice is generated
  useEffect(() => {
    if (!invoice || !boardId || !boardConfig) return;

    console.log("Starting to monitor for payment...");

    const unsubscribe = monitorZapReceipts(
      boardId,
      boardConfig.creatorPubkey,
      (zapMessage: ZapMessage) => {
        if (zapMessage.content === message && zapMessage.zapAmount === amount) {
          console.log("Payment detected!", zapMessage);
          setPaymentSuccess(true);

          setTimeout(() => {
            navigate(`/board/${boardId}`);
          }, 3000);
        }
      }
    );

    return () => unsubscribe();
  }, [invoice, boardId, boardConfig, message, amount, navigate]);

  // Get valid preset amounts based on minZapAmount
  const getValidPresets = () => {
    if (!boardConfig) return [];
    return PRESET_AMOUNTS.filter(amt => amt >= boardConfig.minZapAmount).slice(0, 6);
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

    if (message.length > MAX_MESSAGE_LENGTH) {
      setError(`Message must be ${MAX_MESSAGE_LENGTH} characters or less`);
      return;
    }

    setProcessing(true);
    setError("");

    try {
      console.log("Creating zap request...");

      const invoiceData = await generateInvoice({
        lightningAddress: boardConfig.lightningAddress,
        amount,
        message,
        boardId,
        recipientPubkey: boardConfig.creatorPubkey,
        displayName: displayName.trim() || "Anonymous",
      });

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
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Format large numbers
  const formatAmount = (amt: number) => {
    if (amt >= 1000000) return `${(amt / 1000000).toFixed(1)}M`;
    if (amt >= 1000) return `${(amt / 1000).toFixed(1)}K`;
    return amt.toString();
  };

  if (loading) {
    return <Loading />;
  }

  if (error && !boardConfig) {
    return (
      <div className="min-h-screen bg-blackish flex items-center justify-center p-4">
        <div className="card-style p-4 sm:p-6 border-red-500/30">
          <p className="text-red-400 text-sm sm:text-base text-center">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blackish flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md">
        {!invoice ? (
          // Step 1: Input form
          <div className="card-style p-5 sm:p-7">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">⚡ Zap Message</h2>
              <p className="text-gray-400 text-sm">
                to <span className="text-yellow-text/90">{boardConfig?.boardName}</span>
              </p>
            </div>

            <div className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-white mb-2 font-medium text-sm">
                  Your Name <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Anonymous"
                  maxLength={50}
                  className="w-full px-4 py-3 bg-blackish text-white placeholder-gray-600 border-2 border-border-purple focus:border-yellow-text/80 focus:outline-none transition-colors text-base"
                />
              </div>

              {/* Amount selection */}
              <div>
                <label className="block text-white mb-2 font-medium text-sm">Amount (sats)</label>

                {!showCustomAmount ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {getValidPresets().map(preset => (
                        <button
                          key={preset}
                          onClick={() => setAmount(preset)}
                          className={`py-3 font-bold text-sm transition-all ${
                            amount === preset
                              ? "bg-yellow-text/90 text-blackish"
                              : "bg-transparent text-gray-400 border-2 border-border-purple hover:border-violet-300/30 hover:text-gray-300"
                          }`}
                        >
                          {formatAmount(preset)}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowCustomAmount(true)}
                      className="w-full py-2.5 bg-transparent text-violet-300 border border-violet-300/30 hover:border-violet-300/50 text-sm transition-colors font-medium cursor-pointer"
                    >
                      Custom Amount
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(Number(e.target.value))}
                      min={boardConfig?.minZapAmount}
                      className="w-full px-4 py-3 bg-blackish text-white placeholder-gray-600 border-2 border-border-purple focus:border-yellow-text/80 focus:outline-none transition-colors text-base"
                    />
                    <button
                      onClick={() => setShowCustomAmount(false)}
                      className="w-full py-2.5 bg-transparent text-gray-400 border border-border-purple hover:border-violet-300/30 text-sm transition-colors cursor-pointer"
                    >
                      Back to Presets
                    </button>
                  </div>
                )}

                <p className="text-gray-500 text-xs mt-2">Min: {boardConfig?.minZapAmount} sats</p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-white mb-2 font-medium text-sm">Your Message</label>
                <textarea
                  value={message}
                  onChange={e => {
                    if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                      setMessage(e.target.value);
                    }
                  }}
                  placeholder="Ask a question or leave a comment..."
                  rows={4}
                  maxLength={MAX_MESSAGE_LENGTH}
                  className="w-full px-4 py-3 bg-blackish text-white placeholder-gray-600 border-2 border-border-purple focus:border-yellow-text/80 focus:outline-none transition-colors resize-none text-base"
                />
                <p
                  className={`text-xs mt-2 ${
                    message.length >= MAX_MESSAGE_LENGTH ? "text-yellow-text/80" : "text-gray-500"
                  }`}
                >
                  {message.length}/{MAX_MESSAGE_LENGTH} characters
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleSendZap}
                disabled={processing}
                className="w-full bg-yellow-text/90 hover:bg-yellow-text disabled:bg-gray-700 disabled:text-gray-500 text-blackish font-bold py-4 text-base uppercase tracking-wide transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,223,32,0.3)] cursor-pointer"
              >
                {processing ? "Generating..." : `⚡ Zap ${amount.toLocaleString()} sats`}
              </button>

              <button
                onClick={() => navigate(`/board/${boardId}`)}
                className="w-full bg-transparent hover:bg-gray-700/30 text-white font-bold py-3 text-sm border-2 border-gray-600 hover:border-gray-500 transition-all duration-300 cursor-pointer"
              >
                Back to Board
              </button>
            </div>
          </div>
        ) : (
          // Step 2: Show invoice
          <div className="card-style p-5 sm:p-7">
            {!paymentSuccess ? (
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-3 border border-violet-300/20 bg-violet-300/5 text-violet-300 text-xs uppercase tracking-wider">
                    <BsLightning className="text-yellow-text/90" />
                    <span>Lightning Invoice</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Scan to Pay</h2>
                  <p className="text-yellow-text/90 text-xl sm:text-2xl font-bold">
                    {amount.toLocaleString()} sats
                  </p>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center mb-6">
                  <div className="bg-white p-4 mb-3 w-full max-w-[280px]">
                    <QRCodeSVG value={invoice} size={280} level="M" className="w-full h-auto" />
                  </div>

                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 text-sm text-violet-300 hover:text-violet-200 transition-colors"
                  >
                    {!copied ? (
                      <>
                        <FaCopy /> Copy Invoice
                      </>
                    ) : (
                      <>
                        <FaCheckCircle /> Copied!
                      </>
                    )}
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={openInWallet}
                    className="w-full bg-yellow-text/90 hover:bg-yellow-text text-blackish font-bold py-4 text-base uppercase tracking-wide transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,223,32,0.3)] cursor-pointer"
                  >
                    Open in Wallet
                  </button>

                  <button
                    onClick={() => {
                      setInvoice(null);
                      setMessage("");
                    }}
                    className="w-full bg-transparent hover:bg-gray-700/30 text-white font-bold py-3 text-sm border-2 border-gray-600 hover:border-gray-500 transition-all duration-300 cursor-pointer"
                  >
                    Create Another Zap
                  </button>
                </div>

                <p className="text-gray-500 text-xs text-center mt-6 flex items-center justify-center gap-2">
                  <span className="inline-block w-2 h-2 bg-yellow-text/90 rounded-full animate-pulse"></span>
                  Waiting for payment...
                </p>
              </>
            ) : (
              // Success State
              <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                <div className="animate-[scale-in_0.5s_ease-out] mb-6">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-green-500/10 flex items-center justify-center">
                    <FaCheckCircle className="text-green-400 text-5xl sm:text-6xl" />
                  </div>
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold text-green-400 mb-3 animate-[fade-in_0.5s_ease-out_0.3s_both]">
                  Payment Success!
                </h2>

                <p className="text-gray-300 text-base sm:text-lg mb-2 animate-[fade-in_0.5s_ease-out_0.5s_both]">
                  Your message has been sent ⚡
                </p>

                <p className="text-gray-500 text-sm animate-[fade-in_0.5s_ease-out_0.7s_both]">
                  Redirecting to board...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentPage;

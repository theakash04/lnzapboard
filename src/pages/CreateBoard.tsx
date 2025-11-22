import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { validateLightningAddress } from "../libs/lighting";
import { generateBoardId, generateEphemeralKeys } from "../libs/crypto";
import type { BoardConfig, StoredBoard } from "../types/types";
import { publishBoardConfig, verifyUserEligibility } from "../libs/nostr";
import { generatePremiumInvoice, monitorPremiumPayment, PREMIUM_AMOUNT } from "../libs/payments";
import NostrLoginOverlay from "../components/NostrLoginOverlay";
import { BsLightning, BsShieldCheck } from "react-icons/bs";
import { FiInfo } from "react-icons/fi";
import { MdVerified } from "react-icons/md";
import { QRCodeSVG } from "qrcode.react";
import { FaCheck, FaCopy } from "react-icons/fa";

function CreateBoard() {
  const navigate = useNavigate();

  // Board settings
  const [boardName, setBoardName] = useState("");
  const [lightningAddress, setLightningAddress] = useState("");
  const [minZapAmount, setMinZapAmount] = useState(1000);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [invoiceCopied, setInvoiceCopied] = useState(false);

  // Explorable board state
  const [isExplorable, setIsExplorable] = useState(false);
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [userPubkey, setUserPubkey] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Eligibility verification states
  const [isVerifyingEligibility, setIsVerifyingEligibility] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [eligibilityError, setEligibilityError] = useState("");

  // Payment states
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [premiumInvoice, setPremiumInvoice] = useState("");
  const [isWaitingPayment, setIsWaitingPayment] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  // Load existing boards from localStorage
  const [prevBoards, setPrevBoards] = useState<StoredBoard[]>([]);
  const [showPrevBoards, setShowPrevBoards] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<StoredBoard>();

  // Generate board ID
  const boardId = generateBoardId();

  useEffect(() => {
    const boards: StoredBoard[] = JSON.parse(localStorage.getItem("boards") || "[]");
    if (boards.length) setPrevBoards(boards);
  }, []);

  // Handle explorable toggle
  const handleExplorableToggle = (checked: boolean) => {
    if (checked && !isLoggedIn) {
      setShowLoginOverlay(true);
    } else if (!checked) {
      setIsExplorable(false);
      setIsLoggedIn(false);
      setUserPubkey("");
      setIsPaid(false);
      setShowPaymentQR(false);
    }
  };

  const handleLoginSuccess = async (pubkey: string) => {
    setUserPubkey(pubkey);
    setIsLoggedIn(true);
    setIsExplorable(true);
    setShowLoginOverlay(false);

    setIsVerifyingEligibility(true);
    setEligibilityError("");

    try {
      const result = await verifyUserEligibility(pubkey);

      if (result.eligible) {
        setIsEligible(true);
        showPaymentModal(boardId, pubkey);
      } else {
        setIsEligible(false);
        setIsExplorable(false);
        setEligibilityError(result.reason || "Not eligible to create explorable board");
      }
    } catch (err) {
      setIsEligible(false);
      setIsExplorable(false);
      setEligibilityError("Failed to verify eligibility. Please try again.");
    } finally {
      setIsVerifyingEligibility(false);
    }
  };

  const showPaymentModal = async (boardId: string, pubkey: string) => {
    const res = await generatePremiumInvoice(boardId, pubkey);
    setPremiumInvoice(res!.invoice);
    setShowPaymentQR(true);
    setIsWaitingPayment(true);

    monitorPremiumPayment(
      boardId,
      pubkey,
      () => {
        setIsPaid(true);
        setIsWaitingPayment(false);
        setShowPaymentQR(false);
      },
      error => {
        setError(error);
        setIsWaitingPayment(false);
      }
    );
  };

  const handleLoginClose = () => {
    setShowLoginOverlay(false);
    if (!isLoggedIn) {
      setIsExplorable(false);
    }
    setEligibilityError("");
  };

  const handleCreateBoard = async () => {
    if (!boardName.trim()) {
      setError("Please enter a board name");
      return;
    }

    if (!lightningAddress.trim()) {
      setError("Please enter a Lightning address");
      return;
    }

    if (isExplorable && !isPaid) {
      setError("Please complete payment to create explorable board");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const validation = await validateLightningAddress(lightningAddress);
      if (!validation.valid) {
        setError(validation.error || "Invalid Lightning address");
        setIsCreating(false);
        return;
      }

      let privateKey: Uint8Array | null = null;
      let publicKey: string;

      if (isExplorable && isLoggedIn) {
        publicKey = userPubkey;
        privateKey = null;
      } else {
        const keys = generateEphemeralKeys();
        privateKey = keys.privateKey;
        publicKey = keys.publicKey;
      }

      const boardConfig: BoardConfig = {
        boardId,
        boardName,
        minZapAmount,
        lightningAddress,
        creatorPubkey: publicKey,
        createdAt: Date.now(),
        isExplorable: isExplorable && isPaid,
      };

      await publishBoardConfig(boardConfig, privateKey, isExplorable && isPaid);

      const boards: StoredBoard[] = JSON.parse(localStorage.getItem("boards") || "[]");
      boards.push({
        boardId,
        config: boardConfig,
        createdAt: Date.now(),
      });
      localStorage.setItem("boards", JSON.stringify(boards));

      navigate(`/board/${boardId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create board");
    } finally {
      setIsCreating(false);
    }
  };

  const isCreateButtonEnabled = () => {
    const hasBasicInfo = boardName.trim() && lightningAddress.trim();
    if (!isExplorable) {
      return hasBasicInfo;
    }
    return hasBasicInfo && isLoggedIn && isEligible && isPaid;
  };

  const renderPaymentQR = () => {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="card-style p-6 max-w-md w-full">
          <h2 className="text-yellow-text/90 font-bold text-xl mb-4">Premium Board Payment</h2>
          <p className="text-white text-sm mb-4">
            Pay <span className="text-yellow-text/90 font-bold">{PREMIUM_AMOUNT} sats</span> to
            unlock premium features
          </p>

          <div className="bg-white p-4 mb-4">
            <QRCodeSVG
              value={premiumInvoice}
              size={220}
              level="M"
              className="mx-auto w-full h-auto"
            />
          </div>

          {/* Copy Invoice Button */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(premiumInvoice);
              setInvoiceCopied(true);
              setTimeout(() => setInvoiceCopied(false), 2000);
            }}
            className="w-full mb-4 bg-violet-300/10 hover:bg-violet-300/20 text-violet-300 font-bold py-3 text-sm border border-violet-300/30 hover:border-violet-300/50 transition-all duration-300 flex items-center justify-center gap-2"
          >
            {invoiceCopied ? (
              <>
                <FaCheck className="transition-all duration-300" />
                Copied!
              </>
            ) : (
              <>
                <FaCopy className="transition-all duration-300" />
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

          {isPaid && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30">
              <p className="text-green-400 text-center text-sm font-bold">✓ Payment Confirmed!</p>
            </div>
          )}

          <button
            onClick={() => {
              setShowPaymentQR(false);
              setIsExplorable(false);
              setIsLoggedIn(false);
              setIsPaid(false);
            }}
            className="w-full bg-transparent hover:bg-gray-700/30 text-white font-bold py-3 text-sm border-2 border-gray-600 hover:border-gray-500 transition-all duration-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const renderPreviousBoardsModal = () => (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="card-style p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-yellow-text/90 font-bold text-xl mb-4">Select a Previous Board</h2>

        <div className="space-y-3 mb-4">
          {prevBoards.map(board => {
            const isSelected = selectedBoard?.boardId === board.boardId;
            return (
              <button
                key={board.boardId}
                onClick={() => setSelectedBoard(board)}
                className={`w-full text-left font-bold py-3 px-4 uppercase border-2 transition-all duration-300 ${
                  isSelected
                    ? "bg-yellow-text/90 text-blackish border-yellow-text/90"
                    : "bg-transparent text-gray-400 border-border-purple hover:border-violet-300/30 hover:text-gray-300"
                }`}
              >
                {board.config.boardName}
              </button>
            );
          })}
        </div>

        {selectedBoard && (
          <div className="space-y-3">
            <button
              onClick={() => navigate(`/board/${selectedBoard.boardId}`)}
              className="w-full bg-yellow-text/90 hover:bg-yellow-text text-blackish font-bold py-3 uppercase transition-all duration-300"
            >
              Open Board
            </button>

            <button
              onClick={() => {
                if (confirm(`Delete "${selectedBoard.config.boardName}"?`)) {
                  const updatedBoards = prevBoards.filter(b => b.boardId !== selectedBoard.boardId);
                  localStorage.setItem("boards", JSON.stringify(updatedBoards));
                  setPrevBoards(updatedBoards);
                  setSelectedBoard(undefined);
                }
              }}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-3 uppercase border border-red-500/30 transition-all duration-300"
            >
              Delete Board
            </button>
          </div>
        )}

        <button
          onClick={() => {
            setShowPrevBoards(false);
            setSelectedBoard(undefined);
          }}
          className="w-full mt-4 bg-transparent hover:bg-gray-700/30 text-white font-bold py-3 text-sm border-2 border-gray-600 hover:border-gray-500 transition-all duration-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-blackish relative overflow-hidden">
      <div className="relative z-10 px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-12 md:py-16 lg:py-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 text-white">
              Set Up Your <span className="text-yellow-text/90">Board</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
              Create a live message board in seconds
            </p>
          </div>

          {/* Main Form Card */}
          <div className="card-style p-6 sm:p-8 md:p-10 lg:p-12 mb-6 sm:mb-8">
            <form
              onSubmit={e => e.preventDefault()}
              className="space-y-6 sm:space-y-7 md:space-y-8"
            >
              {/* Board Name */}
              <div>
                <label className="block text-white font-bold mb-2 sm:mb-3 text-sm sm:text-base md:text-lg">
                  Board Name
                  <span className="text-yellow-text/90 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={boardName}
                  onChange={e => setBoardName(e.target.value)}
                  placeholder="Bitcoin Conference Q&A"
                  className="w-full px-4 sm:px-5 md:px-6 py-3 sm:py-4 md:py-5 bg-blackish text-white placeholder-gray-600 border-2 border-border-purple focus:border-yellow-text/80 focus:outline-none transition-colors text-sm sm:text-base md:text-lg"
                />
                <p className="text-gray-500 text-xs sm:text-sm mt-2">
                  Choose a descriptive name for your board
                </p>
              </div>

              {/* Lightning Address */}
              <div>
                <label className="block text-white font-bold mb-2 sm:mb-3 text-sm sm:text-base md:text-lg">
                  Lightning Address
                  <span className="text-yellow-text/90 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={lightningAddress}
                    onChange={e => setLightningAddress(e.target.value)}
                    placeholder="zapit@coinos.io"
                    className="w-full px-4 sm:px-5 md:px-6 py-3 sm:py-4 md:py-5 bg-blackish text-white placeholder-gray-600 border-2 border-border-purple focus:border-yellow-text/80 focus:outline-none transition-colors text-sm sm:text-base md:text-lg font-mono"
                  />
                  <BsLightning className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-text/50 text-lg sm:text-xl md:text-2xl" />
                </div>
                <p className="text-gray-500 text-xs sm:text-sm mt-2">
                  Where you'll receive zap payments
                </p>
              </div>

              {/* Minimum Zap Amount */}
              <div>
                <label className="block text-white font-bold mb-2 sm:mb-3 text-sm sm:text-base md:text-lg">
                  Minimum Zap Amount (sats)
                  <span className="text-yellow-text/90 ml-1">*</span>
                </label>
                <input
                  type="number"
                  value={minZapAmount}
                  onChange={e => setMinZapAmount(Number(e.target.value))}
                  min="1"
                  className="w-full px-4 sm:px-5 md:px-6 py-3 sm:py-4 md:py-5 bg-blackish text-white border-2 border-border-purple focus:border-yellow-text/80 focus:outline-none transition-colors text-sm sm:text-base md:text-lg"
                />
                <p className="text-gray-500 text-xs sm:text-sm mt-2">
                  Minimum amount users must zap to send a message
                </p>
              </div>

              {/* Explorable Toggle */}
              <div className="card-style p-4 sm:p-5 md:p-6 border-violet-300/20">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MdVerified className="text-yellow-text/90 text-lg sm:text-xl md:text-2xl" />
                      <label className="text-white font-bold text-sm sm:text-base md:text-lg">
                        Make Board Explorable (Premium)
                      </label>
                    </div>

                    <div className="mb-3 p-3 ">
                      <p className="text-violet-300 font-semibold text-xs md:text-base mb-2">
                        Eligibility Requirements:
                      </p>
                      <ul className="text-gray-400 text-xs md:text-base space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-text/90 shrink-0">•</span>
                          <span>NIP-05 identified</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-text/90 shrink-0">•</span>
                          <span>10+ following on Nostr</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-text/90 shrink-0">•</span>
                          <span>Pay for premium features</span>
                        </li>
                      </ul>
                    </div>

                    {/* Status Messages */}
                    {isLoggedIn && isEligible && !isPaid && (
                      <div className="flex items-center gap-2 text-yellow-text/90 text-xs sm:text-sm">
                        <BsShieldCheck />
                        <span>Payment required</span>
                      </div>
                    )}
                    {isVerifyingEligibility && (
                      <div className="flex items-center gap-2 text-yellow-text/90 text-xs sm:text-sm">
                        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-yellow-text/90 border-t-transparent"></div>
                        <span>Verifying eligibility...</span>
                      </div>
                    )}
                    {isPaid && (
                      <div className="flex items-center gap-2 text-green-400 text-xs sm:text-sm">
                        <BsShieldCheck />
                        <span>✓ Payment confirmed</span>
                      </div>
                    )}
                    {eligibilityError && (
                      <div className="flex items-start gap-2 text-red-400 text-xs sm:text-sm">
                        <FiInfo className="shrink-0 mt-0.5" />
                        <span>{eligibilityError}</span>
                      </div>
                    )}
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={isExplorable}
                      onChange={e => handleExplorableToggle(e.target.checked)}
                      disabled={isVerifyingEligibility || isExplorable}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 sm:w-14 sm:h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-text/90 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 sm:after:h-6 sm:after:w-6 after:transition-all peer-checked:bg-yellow-text/90 peer-disabled:opacity-50"></div>
                  </label>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 sm:p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="flex-1 bg-transparent hover:bg-gray-700/30 text-white font-bold py-3 sm:py-4 md:py-5 px-6 sm:px-8 text-sm sm:text-base md:text-lg uppercase tracking-wide border-2 border-gray-600 hover:border-gray-500 transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateBoard}
                  disabled={isCreating || !isCreateButtonEnabled()}
                  className="flex-1 bg-yellow-text/90 hover:bg-yellow-text disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-blackish font-bold py-3 sm:py-4 md:py-5 px-6 sm:px-8 text-sm sm:text-base md:text-lg uppercase tracking-wide transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,223,32,0.3)] transform hover:scale-[1.02] disabled:transform-none disabled:shadow-none"
                >
                  {isCreating ? "Creating..." : "Create Board"}
                </button>
              </div>
            </form>
          </div>

          {/* Previous Boards Button */}
          {prevBoards.length > 0 && (
            <button
              onClick={() => setShowPrevBoards(true)}
              className="w-full bg-transparent hover:bg-gray-700/30 text-white font-bold py-3 text-sm border-2 border-gray-600 hover:border-gray-500 transition-all duration-300"
            >
              Use Previous Board ({prevBoards.length})
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      {showLoginOverlay && (
        <NostrLoginOverlay onSuccess={handleLoginSuccess} onClose={handleLoginClose} />
      )}
      {showPrevBoards && renderPreviousBoardsModal()}
      {showPaymentQR && renderPaymentQR()}
    </div>
  );
}

export default CreateBoard;

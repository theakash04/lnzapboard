import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { fetchBoardConfig, subscribeToZapMessages, publishBoardConfig } from "../libs/nostr";
import type { BoardConfig, ZapMessage, StoredBoard } from "../types/types";
import { FaLink, FaVolumeMute, FaVolumeUp } from "react-icons/fa";

import generalMsgSfx from "../assets/sounds/general-msg.wav";
import top1Sfx from "../assets/sounds/top1.wav";
import top2Sfx from "../assets/sounds/top2.wav";
import top3Sfx from "../assets/sounds/top3.wav";
import Loading from "../components/Loading";
import { BsLightning } from "react-icons/bs";
import { RiVerifiedBadgeFill } from "react-icons/ri";
import { MdSettings, MdVerified } from "react-icons/md";
import NostrLoginOverlay from "../components/NostrLoginOverlay";
import { verifyUserEligibility } from "../libs/nostr";
import { generatePremiumInvoice, monitorPremiumPayment, PREMIUM_AMOUNT } from "../libs/payments";
import { FaCheck, FaCopy } from "react-icons/fa";
import { FiInfo } from "react-icons/fi";
import { safeLocalStorage } from "../libs/safeStorage";
import { GiArmorUpgrade, GiConfirmed } from "react-icons/gi";
import { IoWarning } from "react-icons/io5";
import { HiMenu, HiX } from "react-icons/hi";

const RANK_COLORS = [
  {
    bg: "bg-orange-500",
    text: "text-orange-500",
    glow: "shadow-orange-500/50",
    light: "text-orange-300",
  },
  {
    bg: "bg-orange-400",
    text: "text-orange-400",
    glow: "shadow-orange-400/50",
    light: "text-orange-200/80",
  },
  {
    bg: "bg-orange-300",
    text: "text-orange-300",
    glow: "shadow-orange-300/50",
    light: "text-orange-100/70",
  },
];

// helper
const renderMessageWithLinks = (txt: string) => {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;

  const parts = txt.split(urlRegex);

  return parts.map((part: string, index: number) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith("http") ? part : `https://${part}`;

      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-300/60 hover:text-violet-300/70 underline decoration-violet-200/50 hover:decoration-violet-200 transition-all wrap-break-word"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

export default function BoardDisplay({ boardIdProp }: { boardIdProp?: string } = {}) {
  const navigate = useNavigate();
  const { boardId: boardIdParam } = useParams<{ boardId: string }>();
  const boardId = boardIdProp || boardIdParam;
  const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null);
  const [messages, setMessages] = useState<ZapMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevLeaders, setPrevLeaders] = useState<string[]>([]);
  const [error, setError] = useState("");

  const [volume, setVolume] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const isLeaderboardSoundPlayingRef = useRef(false);
  const [highlightedRows, setHighlightedRows] = useState<string[]>([]);
  const [promotedUsers, setPromotedUsers] = useState<string[]>([]);

  // States for making board explorable
  const [canUpgrade, setCanUpgrade] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [isVerifyingEligibility, setIsVerifyingEligibility] = useState(false);
  const [eligibilityError, setEligibilityError] = useState("");
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [premiumInvoice, setPremiumInvoice] = useState("");
  const [isWaitingPayment, setIsWaitingPayment] = useState(false);
  const [invoiceCopied, setInvoiceCopied] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const loadBoard = async () => {
      if (!boardId) return;

      setLoading(true);
      try {
        const config = await fetchBoardConfig(boardId);
        if (config) {
          setBoardConfig(config);
          // Check if this board can be upgraded
          checkCanUpgrade(boardId, config);
        } else {
          const boards = JSON.parse(safeLocalStorage.getItem("boards") || "[]");
          const board = boards.find((b: any) => b.boardId === boardId);
          if (board) {
            setBoardConfig(board.config);
            // Check if this board can be upgraded
            checkCanUpgrade(boardId, board.config);
          } else {
            setError("Board not found");
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load board");
      } finally {
        setLoading(false);
      }
    };
    loadBoard();
  }, [boardId]);

  // Check if board can be upgraded (exists in safeLocalStorage && not explorable)
  const checkCanUpgrade = (boardId: string, config: BoardConfig) => {
    const boards: StoredBoard[] = JSON.parse(safeLocalStorage.getItem("boards") || "[]");
    const ownedBoard = boards.find(b => b.boardId === boardId);

    if (ownedBoard && !config.isExplorable) {
      setCanUpgrade(true);
    }
  };

  useEffect(() => {
    if (!boardId || !boardConfig) return;

    const unsubscribe = subscribeToZapMessages(
      boardId,
      boardConfig.creatorPubkey,
      (message: ZapMessage) => {
        setMessages(prev => {
          if (prev.find(m => m.id === message.id)) return prev;

          if (!isMuted && !isLeaderboardSoundPlayingRef.current) {
            const audio = new Audio(generalMsgSfx);
            audio.volume = volume;
            audio.play().catch(() => {});
          }

          return [...prev, message];
        });
      }
    );

    return () => unsubscribe();
  }, [boardId, boardConfig]);

  const totalSats = useMemo(() => messages.reduce((sum, m) => sum + m.zapAmount, 0), [messages]);
  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => b.timestamp - a.timestamp),
    [messages]
  );
  const leaderboard = useMemo(
    () => [...messages].sort((a, b) => b.zapAmount - a.zapAmount).slice(0, 3),
    [messages]
  );

  useEffect(() => {
    const currentLeaderIds = leaderboard.map(m => m.id);

    leaderboard.forEach((msg, idx) => {
      const wasInTop3 = prevLeaders.includes(msg.id);
      const prevIndex = prevLeaders.indexOf(msg.id);
      const movedUp = wasInTop3 && prevIndex > idx;

      if (!wasInTop3 || movedUp) {
        setHighlightedRows(prev => [...prev, msg.id]);
        setTimeout(() => setHighlightedRows(prev => prev.filter(id => id !== msg.id)), 2000);

        setPromotedUsers(prev => [...prev, msg.id]);
        setTimeout(() => setPromotedUsers(prev => prev.filter(id => id !== msg.id)), 3000);

        const sound = idx === 0 ? top1Sfx : idx === 1 ? top2Sfx : idx === 2 ? top3Sfx : null;
        if (sound && !isMuted) {
          const audio = new Audio(sound);
          audio.volume = volume;
          audio.play().catch(() => {});
          isLeaderboardSoundPlayingRef.current = true;
          setTimeout(() => (isLeaderboardSoundPlayingRef.current = false), 1500);
        }
      }
    });
    setPrevLeaders(currentLeaderIds);
  }, [leaderboard, isMuted, volume]);

  // Handle "Make Board Explorable" button click - show warning first
  const handleMakeExplorable = () => {
    setShowWarningModal(true);
  };

  // User confirms they understand the warning - proceed to login
  const handleConfirmUpgrade = () => {
    setShowWarningModal(false);
    setShowLoginOverlay(true);
  };

  // Handle successful Nostr login for upgrade
  const handleLoginSuccess = async (pubkey: string) => {
    setShowLoginOverlay(false);
    setIsVerifyingEligibility(true);
    setEligibilityError("");

    try {
      const result = await verifyUserEligibility(pubkey);

      if (result.eligible) {
        // User is eligible, show payment modal
        setIsVerifyingEligibility(false);
        await showPaymentModal(boardId!, pubkey);
      } else {
        // User is not eligible
        setIsVerifyingEligibility(false);
        setEligibilityError(result.reason || "Not eligible to create explorable board");
      }
    } catch (err) {
      setIsVerifyingEligibility(false);
      setEligibilityError("Failed to verify eligibility. Please try again.");
    }
  };

  // Show payment modal and monitor for payment
  const showPaymentModal = async (boardId: string, pubkey: string) => {
    try {
      const res = await generatePremiumInvoice(boardId, pubkey);
      if (!res) {
        setError("Failed to generate payment invoice");
        return;
      }

      setPremiumInvoice(res.invoice);
      setShowPaymentQR(true);
      setIsWaitingPayment(true);

      // Monitor for payment confirmation
      monitorPremiumPayment(
        boardId,
        pubkey,
        () => {
          // Payment confirmed! Now upgrade the board
          setIsWaitingPayment(false);
          setIsPaymentConfirmed(true);
          setTimeout(() => {
            upgradeToExplorable(pubkey);
          }, 2000);
        },
        error => {
          setError(error);
          setIsWaitingPayment(false);
        }
      );
    } catch (err) {
      setError("Failed to initiate payment");
    }
  };

  // Publish updated board config with user's real pubkey and isExplorable=true
  const upgradeToExplorable = async (userPubkey: string) => {
    if (!boardConfig || !boardId || !userPubkey) {
      console.error("Missing required data:", { boardConfig, boardId, userPubkey });
      setError("Missing required data for upgrade");
      setIsUpgrading(false);
      return;
    }

    setIsUpgrading(true);

    try {
      // Create new board config with user's real pubkey
      const updatedConfig: BoardConfig = {
        ...boardConfig,
        creatorPubkey: userPubkey, // Replace ephemeral key with real user pubkey
        isExplorable: true,
      };

      // Publish updated config (will create new event with user's pubkey)
      // privateKey = null means use window.nostr to sign
      await publishBoardConfig(updatedConfig, null, true);

      // Update safeLocalStorage
      const boards: StoredBoard[] = JSON.parse(safeLocalStorage.getItem("boards") || "[]");
      const boardIndex = boards.findIndex(b => b.boardId === boardId);

      if (boardIndex !== -1) {
        boards[boardIndex].config = updatedConfig;
        safeLocalStorage.setItem("boards", JSON.stringify(boards));
      }

      // Update local state
      setBoardConfig(updatedConfig);
      setShowPaymentQR(false);
      setCanUpgrade(false);

      // Reset all upgrade-related states
      setEligibilityError("");

      // Reload page to start fresh subscription with new pubkey
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upgrade board");
    } finally {
      setIsUpgrading(false);
    }
  };

  // Handle login overlay close
  const handleLoginClose = () => {
    setShowLoginOverlay(false);
    setEligibilityError("");
  };

  // Handle cancel during payment
  const handleCancelPayment = () => {
    setShowPaymentQR(false);
    setIsWaitingPayment(false);
    setIsPaymentConfirmed(false);
    setEligibilityError("");
  };

  const formatTimeAgo = (timestamp: number) => {
    const sec = Math.floor((Date.now() - timestamp) / 1000);
    if (sec < 60) return "Now";
    if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
    return `${Math.floor(sec / 86400)} days ago`;
  };

  // Render warning modal before upgrade
  const renderWarningModal = () => (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="card-style p-6 max-w-md w-full">
        <h2 className="text-yellow-text/90 font-bold text-xl mb-4 flex items-center gap-2">
          <MdVerified className="text-2xl" />
          Make Board Explorable
        </h2>

        <div className="mb-6 space-y-3">
          <p className="text-white text-sm">Upgrading to explorable will:</p>
          <ul className="text-gray-400 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-400 shrink-0">✓</span>
              <span>Make your board discoverable to all users</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 shrink-0">✓</span>
              <span>Associate board with your nostr npub</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 shrink-0">✓</span>
              <span>Enable premium features</span>
            </li>
          </ul>

          <div className="bg-red-500/10 border border-red-500/30 p-3 mt-4">
            <p className="text-red-400 text-sm font-bold mb-2 flex items-center justify-start gap-2">
              <IoWarning />
              Important Warning:
            </p>
            <p className="text-red-400 text-sm">
              Previous messages sent to the anonymous board will NOT be restored. Only new zaps sent
              after the upgrade will appear. This board will use a new creator identity (your Nostr
              pubkey).
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowWarningModal(false)}
            className="flex-1 bg-transparent hover:bg-gray-700/30 text-white font-bold py-3 text-sm border-2 border-gray-600 hover:border-gray-500 transition-all duration-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmUpgrade}
            className="flex-1 bg-yellow-text/90 hover:bg-yellow-text text-blackish font-bold py-3 text-sm transition-all duration-300"
          >
            I Understand, Continue
          </button>
        </div>
      </div>
    </div>
  );

  // Render payment QR modal
  const renderPaymentQR = () => {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="card-style p-6 max-w-md w-full">
          <h2 className="text-yellow-text/90 font-bold text-xl mb-4">Premium Board Payment</h2>
          <p className="text-white text-sm mb-4">
            Pay <span className="text-yellow-text/90 font-bold">{PREMIUM_AMOUNT} sats</span> to
            unlock explorable status
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

          {/* Payment Status */}
          {isWaitingPayment && (
            <div className="mb-4 p-3 bg-yellow-text/10 border border-yellow-text/30">
              <p className="text-yellow-text/90 text-center text-sm animate-pulse flex items-center justify-center gap-2">
                <BsLightning /> Waiting for payment...
              </p>
            </div>
          )}

          {/* Payment Success */}
          {isPaymentConfirmed && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30">
              <p className="text-green-400 text-center text-sm font-bold flex items-center justify-center gap-2">
                <GiConfirmed /> Payment Confirmed!
              </p>
            </div>
          )}

          {/* Upgrading Status */}
          {isUpgrading && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30">
              <p className="text-blue-400 text-center text-sm animate-pulse flex items-center justify-center gap-2">
                <GiArmorUpgrade /> Upgrading board...
              </p>
            </div>
          )}

          <button
            onClick={handleCancelPayment}
            disabled={isUpgrading}
            className="w-full bg-transparent hover:bg-gray-700/30 text-white font-bold py-3 text-sm border-2 border-gray-600 hover:border-gray-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <Loading />;
  if (error || !boardConfig)
    return (
      <div className="min-h-screen text-red-600 text-xl p-10">{error || "Board not found"}</div>
    );

  return (
    <div className="min-h-screen bg-blackish p-6 lg:p-10">
      <div className="w-full mx-auto space-y-6">
        {/* Show "Make Board Explorable" button for non-explorable boards */}
        {canUpgrade && (
          <div className="card-style p-2 border-2 border-yellow-text/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MdVerified className="text-yellow-text/90 text-2xl shrink-0" />
                <div>
                  <p className="text-white/90 font-bold text-sm sm:text-base">
                    Want to make this board discoverable? (Premium)
                  </p>
                  <p className="text-gray-400 text-xs sm:text-sm">
                    Upgrade to explorable and reach more users
                  </p>
                </div>
              </div>
              <button
                onClick={handleMakeExplorable}
                className="bg-blackish border border-yellow-400/70 rounded-sm hover:bg-yellow-400 hover:text-blackish text-yellow-400/70 font-bold py-2 px-6 text-sm whitespace-nowrap transition-all duration-300"
              >
                Make Explorable
              </button>
            </div>
          </div>
        )}

        {/* Show eligibility error if user tried to upgrade but not eligible */}
        {eligibilityError && (
          <div className="card-style p-4 border-2 border-red-500/30 bg-red-500/10">
            <div className="flex items-start gap-3">
              <FiInfo className="text-red-400 text-xl shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-bold text-sm mb-1">Eligibility Check Failed</p>
                <p className="text-red-400 text-xs">{eligibilityError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Show verifying eligibility status */}
        {isVerifyingEligibility && (
          <div className="card-style p-4 border-2 border-yellow-text/30 bg-yellow-text/10">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-text/90 border-t-transparent"></div>
              <p className="text-yellow-text/90 text-sm">Verifying eligibility...</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          {/* left column */}
          <div className="lg:col-span-2 flex flex-col gap-3 sm:gap-4 md:gap-5">
            {/* Board name + logo + volume + settings */}
            <div className="card-style p-4 flex sm:flex-row flex-col justify-between items-center gap-4 relative min-h-20 sm:min-h-0">
              {/* Hamburger Menu - Left Side */}
              <div className="absolute left-2 sm:left-4 top-4 sm:top-1/2 sm:-translate-y-1/2 z-50 ">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="text-gray-300 hover:text-yellow-text transition-all duration-300 p-2 hover:bg-gray-800/30 rounded-lg active:scale-95 cursor-pointer"
                  title="Menu"
                  aria-label="Toggle menu"
                >
                  <div className="relative w-6 h-6 sm:max-proj:w-7 sm:max-proj:h-7 proj:w-12 proj:h-12">
                    {/* Hamburger Icon */}
                    <HiMenu
                      size={24}
                      className={`absolute inset-0 sm:w-7 sm:h-7 proj:text-5xl transition-all duration-300 ${
                        isMenuOpen
                          ? "opacity-0 rotate-180 scale-50"
                          : "opacity-100 rotate-0 scale-100"
                      }`}
                    />
                    {/* Close Icon */}
                    <HiX
                      size={24}
                      className={`absolute inset-0 sm:w-7 sm:h-7 proj:text-5xl transition-all duration-300  ${
                        isMenuOpen
                          ? "opacity-100 rotate-0 scale-100"
                          : "opacity-0 -rotate-180 scale-50"
                      }`}
                    />
                  </div>
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className="fixed inset-0 cursor-pointer z-40 animate-fadeIn"
                      onClick={() => setIsMenuOpen(false)}
                      aria-hidden="true"
                    />

                    {/* Menu Content */}
                    <div className="absolute left-0 top-full mt-2 bg-blackish backdrop-blur-sm border border-border-purple rounded-lg shadow-2xl p-3 sm:p-4 z-50 w-60 sm:min-w-[280px] animate-slideDown">
                      <div className="space-y-3 sm:space-y-4">
                        {/* Volume Controls */}
                        <div className="space-y-2">
                          <p className="text-gray-400 text-xs sm:text-sm font-semibold uppercase tracking-wide">
                            Volume
                          </p>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <button
                              onClick={() => setIsMuted(!isMuted)}
                              className="text-violet-300 hover:text-violet-200 transition-all hover:scale-110 active:scale-95"
                              aria-label={isMuted ? "Unmute" : "Mute"}
                            >
                              {isMuted ? (
                                <FaVolumeMute size={20} className="sm:w-6 sm:h-6" />
                              ) : (
                                <FaVolumeUp size={20} className="sm:w-6 sm:h-6" />
                              )}
                            </button>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={volume}
                              onChange={e => setVolume(parseFloat(e.target.value))}
                              className="flex-1 accent-violet-400 cursor-pointer"
                              aria-label="Volume slider"
                            />
                            <span className="text-gray-400 text-xs sm:text-sm min-w-[2.5ch] sm:min-w-[3ch] font-mono">
                              {Math.round(volume * 100)}%
                            </span>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-border-purple" />

                        {/* Settings Button */}
                        {boardConfig.isExplorable && (
                          <button
                            onClick={() => {
                              navigate(`/settings/${boardId}`);
                              setIsMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2 sm:gap-3 text-sm sm:text-base text-gray-300 hover:text-yellow-text hover:bg-card-bg p-2 sm:p-2.5 rounded-lg transition-all duration-200 active:scale-98 cursor-pointer"
                          >
                            <MdSettings size={20} className="sm:w-6 sm:h-6 shrink-0" />
                            <span>Board Settings</span>
                          </button>
                        )}

                        {/* Copy Link Button */}
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/board/${boardId}`;
                            navigator.clipboard.writeText(url);
                            setIsMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 sm:gap-3 text-sm sm:text-base text-gray-300 hover:text-yellow-text hover:bg-card-bg p-2 sm:p-2.5 rounded-lg transition-all duration-200 active:scale-98 cursor-pointer"
                        >
                          <FaLink size={18} className="sm:w-5 sm:h-5 shrink-0" />
                          <span>Copy Board URL</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Board Name - Centered with proper spacing */}
              <div className="w-full flex items-center justify-center px-10 sm:px-0 sm:max-2xl:ml-20">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:max-proj:text-4xl proj:text-8xl text-center font-semibold text-yellow-300">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                    {/* Logo */}
                    {boardConfig.logoUrl && (
                      <img
                        src={boardConfig.logoUrl}
                        alt={`${boardConfig.boardName} logo`}
                        className="w-12 h-10 sm:w-16 sm:h-14 md:w-20 md:h-16 proj:w-28 proj:h-24 object-contain rounded-lg bg-white/10"
                        onError={e => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}

                    <span className="animate-pulse wrap-break-words text-center leading-tight proj:text-6xl flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                      {boardConfig.boardName}
                      {boardConfig.isExplorable && (
                        <RiVerifiedBadgeFill className="text-base sm:max-md:text-lg md:max-proj:text-xl proj:text-5xl text-violet-300 inline-block ml-1" />
                      )}
                    </span>
                  </div>
                </h2>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card-style flex flex-col gap-2 p-4 text-center font-semibold text-yellow-500">
                <span className="text-md lg:max-proj:text-lg proj:text-3xl">Total Sats</span>
                <span className="text-yellow-300/90 text-xl lg:max-proj:text-2xl proj:text-7xl">
                  {totalSats}
                </span>
              </div>
              <div className="card-style flex flex-col gap-2 p-4 text-center font-semibold text-yellow-500">
                <span className="text-md lg:max-proj:text-lg proj:text-3xl">Total Messages</span>
                <span className="text-yellow-300/90 text-xl lg:max-proj:text-2xl proj:text-7xl">
                  {messages.length}
                </span>
              </div>
            </div>
            {/* Live messages */}
            <div className="card-style p-6 overflow-y-auto h-full max-h-[70vh] scrollbar-custom">
              {sortedMessages.length === 0 ? (
                <p className="text-yellow-600/60 text-xl proj:text-5xl text-center h-full flex items-center justify-center">
                  Waiting for messages…
                </p>
              ) : (
                sortedMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`bg-blackish border-border-purple border p-4 mb-4 transition-all ease-linear flex flex-col ${
                      highlightedRows.includes(msg.id) ? "border-yellow-200/60" : ""
                    }`}
                  >
                    <div className="font-bold flex justify-between items-center gap-5">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:max-proj:w-8 sm:max-proj:h-8 proj:w-12 proj:h-12 bg-violet-300/80 rounded-full flex items-center justify-center">
                          <span className="text-black text-md sm:max-proj:text-lg proj:text-2xl font-bold">
                            {msg.displayName?.[0]?.toUpperCase() || "A"}
                          </span>
                        </div>
                        <span className="text-violet-300/80 font-medium text-sm sm:max-lg:text-base lg:max-proj:text-lg proj:text-3xl">
                          {msg.displayName || "Anonymous"}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-yellow-400/90 proj:text-3xl">
                          {msg.zapAmount.toLocaleString()} sats
                        </span>
                        <div className="text-gray-600 text-xs lg:max-proj:text-mid proj:text-xl">
                          {formatTimeAgo(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-400/90 text-xl proj:text-4xl pt-4 max-w-[1600px] whitespace-normal wrap-break-word">
                      {renderMessageWithLinks(msg.content)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Right column */}
          <div className="space-y-6">
            {/* QR Section */}
            <div className="bg-card-bg p-6 shadow-lg text-center">
              <a
                href={`${window.location.origin}/pay/${boardId}`}
                target="_blank"
                className="hover:opacity-75"
              >
                <QRCodeSVG
                  value={`${window.location.origin}/pay/${boardId}`}
                  size={window.innerWidth < 640 ? 180 : window.innerWidth < 2000 ? 290 : 600}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                  className="mx-auto border-5 border-white"
                />
              </a>
            </div>
            {/* Leaderboard */}
            <div className="bg-card-bg p-6 rounded-lg">
              <h3 className="font-bold text-xl proj:text-6xl text-violet-300/90 mb-6 flex items-center justify-center">
                Top Zappers <BsLightning color="#ffdf20" />
              </h3>
              <div className="space-y-3">
                {leaderboard.map((m, i) => {
                  const rankColor = RANK_COLORS[i];
                  const isPromoted = promotedUsers.includes(m.id);

                  return (
                    <div
                      key={m.id}
                      className={`p-2 rounded-lg border transition-all duration-300 ${
                        isPromoted
                          ? `border-${rankColor.text.split("-")[1]}-400 ${rankColor.glow}`
                          : "border-border-purple"
                      } ${highlightedRows.includes(m.id) ? "" : "bg-blackish"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col justify-between items-start w-full p-2">
                          <div className="flex items-center justify-center w-full">
                            <div className="w-full flex items-center justify-start gap-2">
                              <div
                                className={`w-6 h-6 proj:w-10 proj:h-10 ${rankColor.bg} rounded-full flex items-center justify-center font-bold proj:text-2xl text-blackish shadow-lg`}
                              >
                                {i + 1}
                              </div>
                              <div className={`font-bold ${rankColor.text} text-lg proj:text-2xl`}>
                                {m.displayName || "Anon"}
                              </div>
                            </div>
                            <div
                              className={`font-bold ${rankColor.text} text-2xl proj:text-5xl flex items-baseline gap-2`}
                            >
                              {m.zapAmount.toLocaleString()}{" "}
                              <span className="text-lg proj:text-xl">sats</span>
                            </div>
                          </div>
                          <div>
                            {m.content && (
                              <div
                                className={`text-2xl proj:text-3xl ${rankColor.light} mt-1 w-full text-wrap wrap-break-word`}
                              >
                                {renderMessageWithLinks(m.content)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showWarningModal && renderWarningModal()}
      {showLoginOverlay && (
        <NostrLoginOverlay onSuccess={handleLoginSuccess} onClose={handleLoginClose} />
      )}
      {showPaymentQR && renderPaymentQR()}
    </div>
  );
}

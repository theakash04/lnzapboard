import { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { fetchBoardConfig, subscribeToZapMessages } from "../libs/nostr";
import type { BoardConfig, ZapMessage } from "../types/types";
import { FaLink, FaVolumeMute, FaVolumeUp } from "react-icons/fa";

import generalMsgSfx from "../assets/sounds/general-msg.wav";
import top1Sfx from "../assets/sounds/top1.wav";
import top2Sfx from "../assets/sounds/top2.wav";
import top3Sfx from "../assets/sounds/top3.wav";
import Loading from "../components/Loading";
import { BsLightning } from "react-icons/bs";
import { RiVerifiedBadgeFill } from "react-icons/ri";

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

export default function BoardDisplay() {
  const { boardId } = useParams<{ boardId: string }>();
  const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null);
  const [messages, setMessages] = useState<ZapMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevLeaders, setPrevLeaders] = useState<string[]>([]);
  const [error, setError] = useState("");

  const [volume, setVolume] = useState(0.2);
  const [isMuted, setIsMuted] = useState(false);
  const isLeaderboardSoundPlayingRef = useRef(false);
  const [highlightedRows, setHighlightedRows] = useState<string[]>([]);
  const [promotedUsers, setPromotedUsers] = useState<string[]>([]);

  useEffect(() => {
    const loadBoard = async () => {
      if (!boardId) return;

      setLoading(true);
      try {
        const config = await fetchBoardConfig(boardId);
        if (config) {
          setBoardConfig(config);
        } else {
          const boards = JSON.parse(localStorage.getItem("boards") || "[]");
          const board = boards.find((b: any) => b.boardId === boardId);
          if (board) setBoardConfig(board.config);
          else setError("Board not found");
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

      // Check if user is new to top 3 or moved up
      if (!wasInTop3 || movedUp) {
        // Highlight row
        setHighlightedRows(prev => [...prev, msg.id]);
        setTimeout(() => setHighlightedRows(prev => prev.filter(id => id !== msg.id)), 2000);

        // Add to promoted users for name highlight
        setPromotedUsers(prev => [...prev, msg.id]);
        setTimeout(() => setPromotedUsers(prev => prev.filter(id => id !== msg.id)), 3000);

        // Play sound
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

  const formatTimeAgo = (timestamp: number) => {
    const sec = Math.floor((Date.now() - timestamp) / 1000);
    if (sec < 60) return "Now";
    if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
    return `${Math.floor(sec / 86400)} days ago`;
  };

  if (loading) return <Loading />;
  if (error || !boardConfig)
    return (
      <div className="min-h-screen text-red-600 text-xl p-10">{error || "Board not found"}</div>
    );

  return (
    <div className="min-h-screen bg-blackish p-6 lg:p-10">
      {/* Full container */}
      <div className="w-full mx-auto space-y-6">
        {/* Board name + volume */}
        <div className="card-style p-4 flex sm:flex-row flex-col justify-between items-center gap-4">
          <h2 className="text-4xl lg:max-proj:text-4xl proj:text-8xl text-center w-full font-semibold text-yellow-300 flex items-center justify-center gap-2">
            <div className=" flex items-center justify-center gap-2">
              <span className="animate-pulse">{boardConfig.boardName}</span>
              {boardConfig.isExplorable && (
                <RiVerifiedBadgeFill className="text-xl proj:text-7xl text-violet-300" />
              )}
            </div>
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const url = `${window.location.origin}/board/${boardId}`;
                navigator.clipboard.writeText(url);
              }}
              className="text-gray-300 hover:text-gray-200 opacity-90 hover:opacity-100 transition-all duration-300"
              title="Copy board URL"
            >
              <FaLink
                size={20}
                className="text-gray-400 hover:text-yellow-400/60 ease-in-out transition-all duration-300"
              />
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-violet-300 hover:text-violet-200 opacity-65"
            >
              {isMuted ? <FaVolumeMute size={24} /> : <FaVolumeUp size={24} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              className="w-32 accent-violet-400 opacity-60"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          <div className="lg:col-span-2 flex flex-col gap-3 sm:gap-4 md:gap-5">
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
                    <p className="text-slate-400/90 text-xl proj:text-4xl pt-4 max-w-[1600px] whitespace-normal break-all">
                      {msg.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Right column */}
          <div className="space-y-6">
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
                                className={`text-2xl proj:text-3xl ${rankColor.light} mt-1 w-full text-wrap break-all`}
                              >
                                {m.content}
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

            {/* QR Section */}
            <div className="bg-card-bg p-6 shadow-lg text-center">
              <h3 className="font-bold text-xl proj:text-4xl text-violet-300 mb-4">Scan to Zap</h3>
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
                  className="mx-auto border-2 border-white"
                />
              </a>
              <div className="text-yellow-300 mt-3 proj:text-3xl">
                Min: {boardConfig.minZapAmount} sats
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

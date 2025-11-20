import { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { fetchBoardConfig, subscribeToZapMessages } from "../libs/nostr";
import type { BoardConfig, ZapMessage } from "../types/types";
import { FaVolumeMute, FaVolumeUp } from "react-icons/fa";

import generalMsgSfx from "../assets/sounds/general-msg.wav";
import top1Sfx from "../assets/sounds/top1.wav";
import top2Sfx from "../assets/sounds/top2.wav";
import top3Sfx from "../assets/sounds/top3.wav";

const RANK_COLORS = [
  {
    bg: "bg-orange-500",
    text: "text-orange-500",
    glow: "shadow-orange-500/50",
    light: "text-orange-300/90",
  },
  {
    bg: "bg-yellow-600",
    text: "text-yellow-600",
    glow: "shadow-yellow-600/50",
    light: "text-yellow-300/90",
  },
  {
    bg: "bg-yellow-300",
    text: "text-yellow-300",
    glow: "shadow-yellow-300/50",
    light: "text-yellow-300/90",
  }, // 3rd place
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
        setMessages((prev) => {
          if (prev.find((m) => m.id === message.id)) return prev;

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

  const totalSats = useMemo(
    () => messages.reduce((sum, m) => sum + m.zapAmount, 0),
    [messages]
  );
  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => b.timestamp - a.timestamp),
    [messages]
  );
  const leaderboard = useMemo(
    () => [...messages].sort((a, b) => b.zapAmount - a.zapAmount).slice(0, 3),
    [messages]
  );

  useEffect(() => {
    const currentLeaderIds = leaderboard.map((m) => m.id);

    leaderboard.forEach((msg, idx) => {
      const wasInTop3 = prevLeaders.includes(msg.id);
      const prevIndex = prevLeaders.indexOf(msg.id);
      const movedUp = wasInTop3 && prevIndex > idx;

      // Check if user is new to top 3 or moved up
      if (!wasInTop3 || movedUp) {
        // Highlight row
        setHighlightedRows((prev) => [...prev, msg.id]);
        setTimeout(
          () =>
            setHighlightedRows((prev) => prev.filter((id) => id !== msg.id)),
          2000
        );

        // Add to promoted users for name highlight
        setPromotedUsers((prev) => [...prev, msg.id]);
        setTimeout(
          () => setPromotedUsers((prev) => prev.filter((id) => id !== msg.id)),
          3000
        );

        // Play sound
        const sound =
          idx === 0
            ? top1Sfx
            : idx === 1
            ? top2Sfx
            : idx === 2
            ? top3Sfx
            : null;
        if (sound && !isMuted) {
          const audio = new Audio(sound);
          audio.volume = volume;
          audio.play().catch(() => {});
          isLeaderboardSoundPlayingRef.current = true;
          setTimeout(
            () => (isLeaderboardSoundPlayingRef.current = false),
            1500
          );
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

  if (loading)
    return (
      <div className="min-h-screen bg-blackish flex items-center justify-center text-xl text-gray-900">
        Loading...
      </div>
    );
  if (error || !boardConfig)
    return (
      <div className="min-h-screen text-red-600 text-xl p-10">
        {error || "Board not found"}
      </div>
    );

  return (
    <div className="min-h-screen bg-blackish p-6 lg:p-10">
      {/* Full container */}
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Board name + volume */}
        <div className="card-style p-4 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-yellow-300">
            {boardConfig.boardName}
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-violet-300 hover:text-violet-200"
            >
              {isMuted ? <FaVolumeMute size={24} /> : <FaVolumeUp size={24} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-32 accent-violet-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 h-full ">
          <div className="col-span-2 flex flex-col gap-4 ">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card-style flex flex-col gap-2 p-4 text-center font-semibold text-yellow-500">
                <span>Total Sats</span>
                <span className="text-yellow-text text-2xl">{totalSats}</span>
              </div>
              <div className="card-style flex flex-col gap-2 p-4 text-center font-semibold text-yellow-500">
                <span>Total Messages</span>
                <span className="text-yellow-text text-2xl">
                  {messages.length}
                </span>
              </div>
            </div>
            {/* Live messages */}
            <div className="card-style p-6 overflow-y-auto h-full max-h-[70vh] scrollbar-custom">
              {sortedMessages.length === 0 ? (
                <p className="text-yellow-text text-xl">
                  Waiting for messages…
                </p>
              ) : (
                sortedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`bg-blackish border-border-purple border p-4 mb-4 transition-all ease-linear ${
                      highlightedRows.includes(msg.id)
                        ? "border-yellow-200/60"
                        : ""
                    }`}
                  >
                    <div className="font-bold flex justify-between items-center gap-5">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-violet-300/80 rounded-full flex items-center justify-center">
                          <span className="text-black text-md sm:text-lg font-bold">
                            {msg.displayName?.[0]?.toUpperCase() || "A"}
                          </span>
                        </div>
                        <span className="text-violet-300/80 font-medium text-sm sm:text-base">
                          {msg.displayName || "Anonymous"}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-yellow-400/90">
                          {msg.zapAmount.toLocaleString()} sats
                        </span>
                        <div className="text-gray-600 text-xs">
                          {formatTimeAgo(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-400/90 text-xl pt-4 whitespace-normal break-all">
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
              <h3 className="font-bold text-xl text-violet-300/90 mb-4">
                Top Zappers
              </h3>
              <div className="space-y-3">
                {leaderboard.map((m, i) => {
                  const rankColor = RANK_COLORS[i];
                  const isPromoted = promotedUsers.includes(m.id);

                  return (
                    <div
                      key={m.id}
                      className={`p-3 rounded-lg border transition-all duration-300 ${
                        isPromoted
                          ? `border-${rankColor.text.split("-")[1]}-400 ${
                              rankColor.glow
                            }`
                          : ""
                      } ${
                        highlightedRows.includes(m.id) ? "" : "bg-blackish/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-6 h-6 ${rankColor.bg} rounded-full flex items-center justify-center font-bold text-white shadow-lg`}
                          >
                            {i + 1}
                          </div>
                          <div>
                            <div
                              className={`font-bold ${rankColor.text} text-lg`}
                            >
                              {m.displayName || "Anon"}
                            </div>
                            {m.content && (
                              <div
                                className={`text-2xl ${rankColor.light} mt-1 max-w-[150px] truncate`}
                              >
                                {m.content}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={`font-bold ${rankColor.text} text-2xl`}>
                          {m.zapAmount.toLocaleString()}{" "}
                          <span className="text-lg">sats</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* QR Section */}
            <div className="bg-card-bg  p-6 shadow-lg text-center">
              <h3 className="font-bold text-xl text-violet-300 mb-4">
                Scan to Zap
              </h3>
              <a
                href={`${window.location.origin}/pay/${boardId}`}
                target="_blank"
                className="hover:opacity-75"
              >
                <QRCodeSVG
                  value={`${window.location.origin}/pay/${boardId}`}
                  size={230}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                  className="mx-auto"
                />
              </a>
              <div className="text-yellow-300 mt-3">
                Min: {boardConfig.minZapAmount} sats
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

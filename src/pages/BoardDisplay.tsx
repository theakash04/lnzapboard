import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import {
  fetchBoardConfig,
  subscribeToZapMessages,
} from "../libs/nostr";
import type { BoardConfig, ZapMessage } from "../types";

function BoardDisplay() {
  const { boardId } = useParams<{ boardId: string }>();
  const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null);
  const [messages, setMessages] = useState<ZapMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load board config from Nostr or localStorage
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

  /*
   * Single subscription to zap receipts
   * Loads all historical zaps and listens for new ones
   */
  useEffect(() => {
    if (!boardId || !boardConfig) return;

    console.log("Starting zap subscription for board:", boardId);

    const unsubscribe = subscribeToZapMessages(
      boardId,
      boardConfig.creatorPubkey,
      (message: ZapMessage) => {
        console.log("Received zap message:", message);
        setMessages((prev) => {
          // Deduplicate by message ID
          if (prev.find((m) => m.id === message.id)) {
            console.log("Duplicate message ignored:", message.id);
            return prev;
          }
          console.log("Adding new message to state");
          return [...prev, message];
        });
      }
    );

    return () => {
      console.log("Cleaning up zap subscription");
      unsubscribe();
    };
  }, [boardId, boardConfig]);

  // FIXED: Use useMemo to prevent re-calculation on every render
  // This calculates totalSats from messages array (single source of truth)
  const totalSats = useMemo(() => {
    return messages.reduce((sum, msg) => sum + msg.zapAmount, 0);
  }, [messages]);

  // Sort messages for feed - memoized to prevent re-sorting on every render
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => b.timestamp - a.timestamp);
  }, [messages]);

  // Top 3 leaderboard - memoized to prevent re-calculation
  const leaderboard = useMemo(() => {
    return [...messages]
      .sort((a, b) => b.zapAmount - a.zapAmount)
      .slice(0, 3);
  }, [messages]);

  // // Calc totalSats
  // const total = messages.reduce((sum, msg) => sum + msg.zapAmount, 0);
  // setTotalSats(total);

  // // Sort messages for feed
  // const sortedMessages = [...messages].sort((a, b) => {
  //   return b.timestamp - a.timestamp;
  // });

  // // Top 3 leaderboard
  // const leaderboard = [...messages]
  //   .sort((a, b) => b.zapAmount - a.zapAmount)
  //   .slice(0, 3);

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  // const satsToUSD = (sats: number) => {
  //   const btcPrice = 100_000;
  //   const btc = sats / 100_000_000;
  //   return (btc * btcPrice).toFixed(8);
  // };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-yellow-300 text-xl font-mono flex justify-center items-center">
        Loading board...
      </div>
    );
  }

  if (error || !boardConfig) {
    return (
      <div className="min-h-screen text-red-400 text-xl font-mono">
        {error || "Board not found"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8 flex flex-col items-center">
      <div className="w-full max-w-7xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-yellow-400 uppercase">
            {boardConfig.displayName}
          </h1>
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="mb-6 border-2 border-dashed border-yellow-300 p-4 bg-black">
            <h2 className="text-yellow-300 font-bold mb-2 animate-bounce">
              Top Zappers <span className="text-3xl">⚡</span>{" "}
            </h2>
            <table className="w-full text-left text-yellow-200">
              <thead>
                <tr>
                  <th className="pb-2">#</th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Message</th>
                  <th className="pb-2">Sats</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((msg, idx) => {
                  // Determine background color based on rank
                  let bgClass = "bg-yellow-800"; // default
                  if (idx === 0) bgClass = "bg-yellow-500 text-black"; // top 1
                  else if (idx === 1)
                    bgClass = "bg-yellow-200 text-black"; // top 2
                  else if (idx === 2) bgClass = "bg-yellow-100 text-black"; // top 3
                  return (
                    <tr key={msg.id} className="border-t border-yellow-500 ">
                      <td className="py-1">{idx + 1}</td>
                      <td>{msg.displayName || "Anon"}</td>
                      <td>{msg.content}</td>
                      <td className={`${bgClass} font-bold text-center`}>
                        {msg.zapAmount.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Messages feed */}
          <div className="lg:col-span-2 max-h-[60vh] overflow-y-auto pr-2 space-y-4 scrollbar-custom">
            {sortedMessages.length === 0 ? (
              <div className="border-2 border-yellow-500 p-12 text-center bg-black">
                <div className="text-6xl mb-4">⚡</div>
                <p className="text-yellow-300 text-xl">
                  Waiting for messages...
                </p>
                <p className="text-yellow-500 text-sm mt-2">
                  Scan the QR code to send a zap with your message
                </p>
              </div>
            ) : (
              sortedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-black border-2 border-yellow-500 p-6 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                        <span className="text-black text-xl font-bold">
                          {msg.displayName?.[0]?.toUpperCase() || "A"}
                        </span>
                      </div>
                      <span className="text-yellow-200 font-medium">
                        {msg.displayName || "Anonymous"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-yellow-400 text-black font-bold px-4 py-1 rounded-full">
                        {msg.zapAmount.toLocaleString()} sats
                      </span>
                      <span className="text-yellow-500 text-sm">
                        {formatTimeAgo(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                  <p className="text-yellow-100 text-lg leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Stats + QR */}
          <div className="lg:col-span-1 space-y-6">
            {/* Total Sats */}
            <div className="border-2 border-yellow-500 p-8 text-center bg-black">
              <div className="text-yellow-400 text-sm uppercase tracking-wide mb-2">
                Total Sats
              </div>
              <div className="text-6xl font-bold text-yellow-200 mb-2">
                {totalSats}
              </div>
              <div className="text-2xl text-yellow-400 mb-1">sats</div>
            </div>

            {/* QR Code */}
            <div className="border-2 border-yellow-500 p-6 bg-black">
              <div className="bg-black p-4 rounded-lg mb-4 border border-yellow-400">
                <a
                  href={`${window.location.origin}/pay/${boardId}`}
                  target="_blank"
                  className="hover:opacity-75"
                >
                  <QRCodeSVG
                    value={`${window.location.origin}/pay/${boardId}`}
                    size={256}
                    level="M"
                    className="mx-auto"
                    style={{ width: "100%", height: "auto" }}
                  />
                </a>
              </div>
              <p className="text-center text-yellow-300 font-bold text-lg">
                Scan to send a zap
              </p>
              <p className="text-center text-yellow-500 text-sm mt-2">
                Min: {boardConfig.minZapAmount} sats
              </p>
            </div>

            {/* Message Count */}
            <div className="border-2 border-yellow-500 p-6 text-center bg-black">
              <div className="text-4xl font-bold text-yellow-400">
                {messages.length}
              </div>
              <div className="text-yellow-300 mt-2">
                {messages.length === 1 ? "Message" : "Messages"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BoardDisplay;

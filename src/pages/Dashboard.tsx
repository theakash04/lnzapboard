import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import { createNWCInstance } from "../libs/nwc";
import type { BoardConfig } from "../types/types";
import RetroFrame from "../components/Frame";

function Dashboard() {
  const { boardId } = useParams<{ boardId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null);
  const [nwcString, setNwcString] = useState("");
  const [nwcConnected, setNwcConnected] = useState(false);
  const [showNwcInput, setShowNwcInput] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");

  // URLs for sharing
  const boardUrl = `${window.location.origin}/board/${boardId}`;
  const dashboardUrl = window.location.href;

  // Load board config from localStorage
  useEffect(() => {
    const boards = JSON.parse(localStorage.getItem("boards") || "[]");
    const board = boards.find((b: any) => b.boardId === boardId);

    if (!board) {
      setError("Board not found");
      return;
    }

    setBoardConfig(board.config);

    // If NWC string was passed from creation, use it
    const stateNwc = (location.state as any)?.nwcString;
    if (stateNwc) {
      setNwcString(stateNwc);
      setShowNwcInput(false);
      connectNWC(stateNwc);
    }
  }, [boardId, location.state]);

  const connectNWC = async (nwcStr: string) => {
    setIsConnecting(true);
    setError("");

    try {
      const nwc = await createNWCInstance(nwcStr);
      const info = await nwc.getInfo();
      console.log(info);

      setNwcConnected(true);
      setShowNwcInput(false);

      // Start listening for payments
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect NWC");
      setNwcConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = () => {
    if (!nwcString.trim()) {
      setError("Please enter your NWC connection string");
      return;
    }
    connectNWC(nwcString);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Show toast notification
  };

  if (error && !boardConfig) {
    return <div className="text-red-400 text-xl font-mono">{error}</div>;
  }

  if (!boardConfig) {
    return <div className="text-yellow-300 text-xl font-mono">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-yellow-200 p-4 font-mono">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/create")}
            className="text-yellow-400 hover:text-yellow-200 mb-4 transition-colors"
          >
            ◀ Back
          </button>
          <h1 className="text-4xl font-bold mb-2 text-yellow-300">{boardConfig.boardName}</h1>
          <p className="text-yellow-500">
            Created {new Date(boardConfig.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* NWC Connection */}
        {showNwcInput && (
          <RetroFrame className="mb-6 border-solid">
            <h3 className="text-yellow-300 font-bold mb-2">Connect Your Wallet</h3>
            <p className="text-yellow-500 text-sm mb-4">
              Enter your NWC string to start receiving zaps
            </p>

            <div className="flex gap-4">
              <input
                type="password"
                value={nwcString}
                onChange={e => setNwcString(e.target.value)}
                placeholder="nostr+walletconnect://..."
                className="flex-1 px-4 py-3 rounded bg-black border border-yellow-500 text-yellow-200 placeholder-yellow-700 focus:outline-none focus:border-yellow-400"
              />
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-800 text-black font-bold px-6 py-3 rounded transition-colors"
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </button>
            </div>

            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </RetroFrame>
        )}

        {nwcConnected && (
          <RetroFrame className="mb-6 border-green-500 text-green-300">
            ✅ Wallet connected and monitoring for zaps
          </RetroFrame>
        )}

        {/* Board URLs */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <RetroFrame className="flex flex-col justify-between h-full">
            <h3 className="text-yellow-300 font-bold mb-2">Public Display Link</h3>
            <p className="text-yellow-500 text-sm mb-4">
              Share this on screen/projector for audience
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={boardUrl}
                readOnly
                className="flex-1 px-4 py-2 rounded bg-black border border-yellow-500 text-yellow-200 text-sm"
              />
              <button
                onClick={() => copyToClipboard(boardUrl)}
                className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded transition-colors"
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => window.open(boardUrl, "_blank")}
              className="mt-3 w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2 rounded transition-colors"
            >
              Open Display →
            </button>
          </RetroFrame>

          <RetroFrame className="flex flex-col justify-between h-full">
            <h3 className="text-yellow-300 font-bold mb-2">Dashboard Link</h3>
            <p className="text-yellow-500 text-sm mb-4">
              Keep this private for managing your board
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={dashboardUrl}
                readOnly
                className="flex-1 px-4 py-2 rounded bg-black border border-yellow-500 text-yellow-200 text-sm"
              />
              <button
                onClick={() => copyToClipboard(dashboardUrl)}
                className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded transition-colors"
              >
                Copy
              </button>
            </div>
          </RetroFrame>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

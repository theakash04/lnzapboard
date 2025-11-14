import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { validateLightningAddress } from "../libs/lighting";
import {
  decryptNwc,
  encryptNwc,
  generateBoardId,
  generateEphemeralKeys,
} from "../libs/crypto";
import type { BoardConfig, StoredBoard } from "../types";
import { validateNWC } from "../libs/nwc";
import { publishBoardConfig } from "../libs/nostr";
import RetroFrame from "../components/Frame";
import NostrLoginOverlay from "../components/NostrLoginOverlay";

function CreateBoard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"info" | "usePrevious" | "nwc">("info");

  // Board settings
  const [boardName, setBoardName] = useState("");
  const [minZapAmount, setMinZapAmount] = useState(1000);

  // NWC string + password
  const [nwcString, setNwcString] = useState("");
  const [password, setPassword] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");

  // Explorable board state
  const [isExplorable, setIsExplorable] = useState(false);
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [userPubkey, setUserPubkey] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Load existing boards from localStorage
  const [prevBoards, setPrevBoards] = useState<StoredBoard[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<StoredBoard>();
  const [selectedBoardPassword, setSelectedBoardPassword] = useState("");

  useEffect(() => {
    const boards: StoredBoard[] = JSON.parse(
      localStorage.getItem("boards") || "[]"
    );
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
    }
  };

  // Handle successful login
  const handleLoginSuccess = (pubkey: string) => {
    setUserPubkey(pubkey);
    setIsLoggedIn(true);
    setIsExplorable(true);
    setShowLoginOverlay(false);
  };

  // Handle login modal close
  const handleLoginClose = () => {
    setShowLoginOverlay(false);
    // Reset toggle if they cancelled login
    if (!isLoggedIn) {
      setIsExplorable(false);
    }
  };

  const handleNext = async () => {
    if (!boardName.trim()) setError("Please enter a board name");

    setError("");
    setIsValidating(false);

    setIsValidating(false);
    setStep("nwc");
  };

  const handleCreateBoard = async () => {
    if (!nwcString.trim()) {
      setError("Please paste your NWC connection string");
      return;
    }

    if (!password.trim()) {
      setError("Please set a password");
      return;
    }

    if (isExplorable && !isLoggedIn) {
      setError("Please sign in with extension to make board explorable");
      return;
    }

    setIsValidating(true);
    setError("");

    try {
      // Step 1: Validate NWC
      const nwcValidation = await validateNWC(nwcString);
      if (!nwcValidation.valid) {
        throw new Error(nwcValidation.error || "Invalid NWC connection");
      }

      // Step : Extract lub16 from nwc
      const lightningAddress =
        new URL(
          nwcString.replace("nostr+walletconnect://", "https://")
        ).searchParams.get("lud16") || "";

      const validation = await validateLightningAddress(lightningAddress);

      if (!validation.valid) {
        setError(validation.error || "Invalid Lightning address");
        setIsValidating(false);
        return;
      }

      // Step 2: Handle Keys 
      let privateKey: Uint8Array | null = null;
      let publicKey: string;

      if (isExplorable && isLoggedIn) {
        publicKey = userPubkey;
        privateKey = null; // use extension for signing
      } else {
        const keys = generateEphemeralKeys();
        privateKey = keys.privateKey;
        publicKey = keys.publicKey;
      }

      // Step 3: Generate board ID
      const boardId = generateBoardId();

      // Step 4: Create board config
      const boardConfig: BoardConfig = {
        boardId,
        boardName,
        minZapAmount,
        lightningAddress,
        creatorPubkey: publicKey,
        createdAt: Date.now(),
      };

      // Step 5: Publish to Nostr
      await publishBoardConfig(boardConfig, privateKey, isExplorable);

      // Encrypt NWC string with password
      const encryptedNWC = encryptNwc(nwcString, password);

      // Step 6: Store in localStorage
      const boards: StoredBoard[] = JSON.parse(
        localStorage.getItem("boards") || "[]"
      );
      boards.push({
        boardId,
        config: boardConfig,
        encryptedNwcString: encryptedNWC,
        createdAt: Date.now(),
      });
      localStorage.setItem("boards", JSON.stringify(boards));

      // Step 6: Navigate to dashboard
      // We'll pass the NWC string via URL state (not stored)
      navigate(`/dashboard/${boardId}`, {
        state: { nwcString },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create board");
    } finally {
      setIsValidating(false);
    }
  };

  // Check if create button should be enabled
  const isCreateButtonEnabled = () => {
    const hasBasicInfo = nwcString.trim() && password.trim();
    if (!isExplorable) {
      return hasBasicInfo;
    }
    // If explorable, also need to be logged in
    return hasBasicInfo && isLoggedIn;
  };

  const renderUsePreviousStep = () => (
    <div className="space-y-4">
      <h2 className="text-yellow-300 font-bold mb-2">Select a Board</h2>

      {prevBoards.map((board) => {
        const isSelected = selectedBoard?.boardId === board.boardId;
        return (
          <div key={board.boardId} className="space-y-2">
            <button
              onClick={() => {
                setSelectedBoard(board);
                setSelectedBoardPassword("");
                setError("");
              }}
              // highlight and show-arrow
              className={`w-full flex justify-between items-center font-bold py-2 px-3 uppercase border-2 transition-all duration-200 ${
                isSelected
                  ? "bg-yellow-100 text-black border-yellow-300"
                  : "bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-300"
              }`}
            >
              <span>{board.config.boardName}</span>
              {/*  Show arrow if selected */}
              {isSelected && <span className="text-black text-lg">◀</span>}
            </button>
          </div>
        );
      })}

      {selectedBoard && (
        <form onSubmit={(e) => e.preventDefault()} className="space-y-2 mt-4">
          <input
            type="text"
            value={selectedBoardPassword}
            onChange={(e) => setSelectedBoardPassword(e.target.value)}
            placeholder="Enter password for this board"
            className="w-full px-4 py-3 bg-black border-2 border-yellow-400 text-white placeholder-yellow-700 focus:outline-none focus:border-brightGreen"
          />
          <button
            onClick={() => {
              try {
                const decryptedNWC = decryptNwc(
                  selectedBoard.encryptedNwcString,
                  selectedBoardPassword
                );
                navigate(`/dashboard/${selectedBoard.boardId}`, {
                  state: { nwcString: decryptedNWC },
                });
              } catch {
                setError("Incorrect password or failed to decrypt NWC");
              }
            }}
            className="w-full bg-green-400 hover:bg-green-600 text-black font-bold py-2 uppercase border-2 border-green-300 transition-all duration-200"
          >
            Use Board
          </button>

          {/* Delete button */}
          <button
            onClick={() => {
              const confirmDelete = confirm(
                `Are you sure you want to delete "${selectedBoard.config.boardName}"?`
              );
              if (!confirmDelete) return;

              const updatedBoards = prevBoards.filter(
                (b) => b.boardId !== selectedBoard.boardId
              );
              localStorage.setItem("boards", JSON.stringify(updatedBoards));
              setPrevBoards(updatedBoards);
              setSelectedBoard(undefined);
              setError("");
            }}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 uppercase border-2 border-red-400 transition-all duration-200"
          >
            Delete Board
          </button>
        </form>
      )}

      <button
        onClick={() => setStep("info")}
        className="w-full bg-black border-2 border-yellow-400 text-yellow-300 font-bold py-3 uppercase hover:bg-gray-500 hover:text-white transition-all duration-200"
      >
        Back
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-black p-8 flex items-center justify-center">
      <div className="w-full h-full max-w-5xl mx-auto">
        <RetroFrame className="h-full">
          <div className="max-w-lg w-full mx-auto p-8">
            {(step === "info" || step === "nwc") && (
              <h2 className="text-3xl font-bold text-yellow-400 mb-6 uppercase">
                Create Your Board
              </h2>
            )}
            {step === "info" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-yellow-300 mb-2">
                    Board Name
                  </label>
                  <input
                    type="text"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    placeholder="Bitcoin Conference Q&A"
                    className="w-full px-4 py-3 bg-black text-white placeholder-gray-400 border-2 border-yellow-400 focus:outline-none focus:border-brightGreen"
                  />
                </div>

                <div>
                  <label className="block text-yellow-300 mb-2">
                    Minimum Zap Amount (sats)
                  </label>
                  <input
                    type="number"
                    value={minZapAmount}
                    onChange={(e) => setMinZapAmount(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-black text-white border-2 border-yellow-400 focus:outline-none focus:border-brightGreen"
                  />
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  onClick={handleNext}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 uppercase border-2 border-yellow-300 transition-all duration-200"
                >
                  Next
                </button>

                {/* ==== User Previous Boards Button ==== */}
                {prevBoards.length > 0 && (
                  <button
                    onClick={() => setStep("usePrevious")}
                    className="w-full bg-black border-2 border-yellow-400 text-yellow-300 font-bold py-3 uppercase hover:bg-gray-500 hover:text-white transition-all duration-200 mt-2"
                  >
                    Use Previous Board
                  </button>
                )}
              </div>
            )}
            {step === "nwc" && (
              // Enter Nwc String
              <div className="space-y-4">
                <div>
                  <label className="block text-yellow-300 mb-2">
                    NWC Connection String
                  </label>
                  <textarea
                    value={nwcString}
                    onChange={(e) => setNwcString(e.target.value)}
                    placeholder="nostr+walletconnect://..."
                    rows={4}
                    className="w-full px-4 py-3 bg-black text-white placeholder-gray-400 border-2 border-yellow-400 focus:outline-none focus:border-brightGreen font-mono text-sm resize-none"
                  />
                </div>

                {/* // Set Password */}
                <div>
                  <label className="block text-yellow-300 mb-2">
                    Set Password
                  </label>
                  <textarea
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="enter password"
                    rows={4}
                    className="w-full h-12 px-4 py-3  bg-black text-white placeholder-gray-400 border-2 border-yellow-400 focus:outline-none focus:border-brightGreen font-mono text-sm resize-none"
                  />
                </div>

                {/* Explorable Toggle */}
                <div className="bg-black border-2 border-yellow-400 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-yellow-300 font-bold">
                        Make Board Explorable
                      </label>
                      <p className="text-gray-400 text-sm mt-1">
                        Allow others to discover your board publicly
                      </p>
                      {isLoggedIn && (
                        <p className="text-green-400 text-sm mt-1">
                          Connected with extension
                        </p>
                      )}
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isExplorable}
                        onChange={(e) =>
                          handleExplorableToggle(e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep("info")}
                    className="flex-1 bg-black border-2 border-yellow-400 text-yellow-300 font-bold py-3 uppercase hover:bg-yellow-500 hover:text-black transition-all duration-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCreateBoard}
                    disabled={isValidating}
                    className="flex-1 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-600 text-black font-bold py-3 uppercase border-2 border-yellow-300 transition-all duration-200"
                  >
                    {isValidating ? "Creating..." : "Create Board"}
                  </button>
                </div>
              </div>
            )}
            {/* render previous board step */}
            {step === "usePrevious" && renderUsePreviousStep()}{" "}
          </div>
        </RetroFrame>
      </div>
      {/* Login Overlay */}
      {showLoginOverlay && (
        <NostrLoginOverlay
          onSuccess={handleLoginSuccess}
          onClose={handleLoginClose}
        />
      )}
    </div>
  );
}

export default CreateBoard;

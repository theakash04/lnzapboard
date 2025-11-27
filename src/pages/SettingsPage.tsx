import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { MdVerified, MdSettings } from "react-icons/md";
import { FiInfo, FiTrash2 } from "react-icons/fi";
import { BsLightning, BsImage } from "react-icons/bs";
import { fetchBoardConfig, publishBoardConfig } from "../libs/nostr";
import { validateLightningAddress } from "../libs/lighting";
import type { BoardConfig, StoredBoard } from "../types/types";
import { safeLocalStorage } from "../libs/safeStorage";
import NostrLoginOverlay from "../components/NostrLoginOverlay";
import Loading from "../components/Loading";
import CustomSlugSection from "../components/CustomSlugSection";

export default function SettingsPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();

  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userPubkey, setUserPubkey] = useState<string>("");

  const [boardConfig, setBoardConfig] = useState<BoardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [boardName, setBoardName] = useState("");
  const [lightningAddress, setLightningAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [minZapAmount, setMinZapAmount] = useState(1000);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const loadBoard = async () => {
      if (!boardId) return;

      setLoading(true);
      try {
        const config = await fetchBoardConfig(boardId);
        if (config) {
          setBoardConfig(config);
          setBoardName(config.boardName);
          setLightningAddress(config.lightningAddress);
          setMinZapAmount(config.minZapAmount);
          setLogoUrl(config.logoUrl || "");
        } else {
          setError("Board not found");
        }
      } catch (err) {
        setError("Failed to load board");
      } finally {
        setLoading(false);
      }
    };
    loadBoard();
  }, [boardId]);

  const handleLoginClick = () => {
    setShowLoginOverlay(true);
  };

  const handleLoginSuccess = async (pubkey: string) => {
    setShowLoginOverlay(false);
    setUserPubkey(pubkey);

    // Verify that logged-in pubkey matches board creator
    if (boardConfig && pubkey === boardConfig.creatorPubkey) {
      setIsAuthorized(true);
      setError("");
    } else {
      setError(
        "You are not the owner of this board. The logged-in pubkey does not match the board creator."
      );
      setIsAuthorized(false);
    }
  };

  const handleLoginClose = () => {
    setShowLoginOverlay(false);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  const handleSaveSettings = async () => {
    if (!boardConfig || !userPubkey) return;

    if (!boardName.trim()) {
      setError("Board name is required");
      return;
    }

    if (!lightningAddress.trim()) {
      setError("Lightning address is required");
      return;
    }

    if (minZapAmount < 1) {
      setError("Minimum zap amount must be at least 1 sat");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const validation = await validateLightningAddress(lightningAddress);
      if (!validation.valid) {
        setError(validation.error || "Invalid Lightning address");
        setIsSaving(false);
        return;
      }

      const updatedConfig: BoardConfig = {
        ...boardConfig,
        boardName,
        lightningAddress,
        minZapAmount,
        logoUrl: logoUrl.trim() || undefined,
      };

      // Publish as replaceable event (kind 30078)
      await publishBoardConfig(updatedConfig, null, true);

      const boards: StoredBoard[] = JSON.parse(safeLocalStorage.getItem("boards") || "[]");
      const boardIndex = boards.findIndex(b => b.boardId === boardId);
      if (boardIndex !== -1) {
        boards[boardIndex].config = updatedConfig;
        safeLocalStorage.setItem("boards", JSON.stringify(boards));
      }

      setBoardConfig(updatedConfig);
      showSuccess("Settings saved successfully! Changes will be visible shortly.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFromExplore = async () => {
    if (!boardConfig || !userPubkey) return;

    setIsDeleting(true);
    setError("");

    try {
      const updatedConfig: BoardConfig = {
        ...boardConfig,
        isExplorable: false,
      };

      // Publish replaceable event without "zapboard" tag
      await publishBoardConfig(updatedConfig, null, false);

      const boards: StoredBoard[] = JSON.parse(safeLocalStorage.getItem("boards") || "[]");
      const boardIndex = boards.findIndex(b => b.boardId === boardId);
      if (boardIndex !== -1) {
        boards[boardIndex].config = updatedConfig;
        safeLocalStorage.setItem("boards", JSON.stringify(boards));
      }

      showSuccess("Board removed from explore page!");
      setTimeout(() => {
        navigate(`/board/${boardId}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove from explore");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) return <Loading />;

  if (!boardConfig) {
    return (
      <div className="min-h-screen bg-blackish flex items-center justify-center p-4">
        <div className="card-style p-8 max-w-md w-full text-center">
          <FiInfo className="text-red-400 text-4xl mx-auto mb-4" />
          <h2 className="text-white text-2xl font-bold mb-2">Board Not Found</h2>
          <p className="text-red-400 mb-6">{error || "Unable to load board"}</p>
          <button
            onClick={() => navigate("/")}
            className="bg-yellow-text/90 hover:bg-yellow-text text-blackish font-bold py-3 px-6 w-full transition-all duration-300"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Login Required Screen
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-blackish flex items-center justify-center p-4">
        <div className="card-style p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-yellow-text/10">
            <MdSettings className="text-yellow-text/90 text-4xl" />
          </div>

          <h2 className="text-white text-2xl font-bold mb-2">Board Settings</h2>
          <p className="text-gray-400 mb-6">Login with Nostr to manage this board's settings</p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleLoginClick}
            className="w-full bg-yellow-text/90 hover:bg-yellow-text text-blackish font-bold py-4 px-6 mb-4 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,223,32,0.3)]"
          >
            Login with Nostr Extension
          </button>

          <button
            onClick={() => navigate(`/board/${boardId}`)}
            className="w-full bg-transparent hover:bg-gray-700/30 text-white font-bold py-3 px-6 border-2 border-gray-600 hover:border-gray-500 transition-all duration-300"
          >
            Back to Board
          </button>
        </div>

        {showLoginOverlay && (
          <NostrLoginOverlay onSuccess={handleLoginSuccess} onClose={handleLoginClose} />
        )}
      </div>
    );
  }

  // Settings Page (Authorized)
  return (
    <div className="min-h-screen bg-blackish p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <MdSettings className="text-yellow-text/90 text-4xl" />
            <h1 className="text-4xl font-bold text-white">Board Settings</h1>
            <MdVerified className="text-violet-300 text-3xl" />
          </div>
          <p className="text-gray-400 text-lg">Manage your explorable board settings</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30">
            <p className="text-green-400 text-center font-semibold">{successMessage}</p>
          </div>
        )}

        <div className="card-style p-8 mb-6">
          <div className="space-y-6">
            <div>
              <label className="block text-white font-bold mb-3 text-lg">
                Board Name
                <span className="text-yellow-text/90 ml-1">*</span>
              </label>
              <input
                type="text"
                value={boardName}
                onChange={e => setBoardName(e.target.value)}
                placeholder="Bitcoin Conference Q&A"
                className="w-full px-6 py-4 bg-blackish text-white placeholder-gray-600 border-2 border-border-purple focus:border-yellow-text/80 focus:outline-none transition-colors text-lg"
              />
              <p className="text-gray-500 text-sm mt-2">
                This name will be displayed on the explore page and board header
              </p>
            </div>

            <div>
              <label className="block text-white font-bold mb-3 text-lg">
                Board Logo URL
                <span className="text-gray-500 ml-2 text-sm font-normal">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-6 py-4 bg-blackish text-white placeholder-gray-600 border-2 border-border-purple focus:border-yellow-text/80 focus:outline-none transition-colors text-lg"
                />
                <BsImage className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-2xl" />
              </div>
              <p className="text-gray-500 text-sm mt-2">
                Add a logo to make your board stand out (displayed next to board name)
              </p>
              {logoUrl && (
                <div className="mt-3 p-4 bg-blackish border border-border-purple">
                  <p className="text-gray-400 text-sm mb-2">Preview:</p>
                  <img
                    src={logoUrl}
                    alt="Board logo preview"
                    className="w-20 h-20 object-contain bg-white/10 rounded"
                    onError={() => setError("Invalid image URL - please check the link")}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-white font-bold mb-3 text-lg">
                Lightning Address
                <span className="text-yellow-text/90 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={lightningAddress}
                  onChange={e => setLightningAddress(e.target.value)}
                  placeholder="zapit@coinos.io"
                  className="w-full px-6 py-4 bg-blackish text-white placeholder-gray-600 border-2 border-border-purple focus:border-yellow-text/80 focus:outline-none transition-colors text-lg font-mono"
                />
                <BsLightning className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-text/50 text-2xl" />
              </div>
              <p className="text-gray-500 text-sm mt-2">All zaps will be sent to this address</p>
            </div>

            <div>
              <label className="block text-white font-bold mb-3 text-lg">
                Minimum Zap Amount (sats)
                <span className="text-yellow-text/90 ml-1">*</span>
              </label>
              <input
                type="number"
                value={minZapAmount}
                onChange={e => setMinZapAmount(Number(e.target.value))}
                min="1"
                className="w-full px-6 py-4 bg-blackish text-white border-2 border-border-purple focus:border-yellow-text/80 focus:outline-none transition-colors text-lg"
              />
              <p className="text-gray-500 text-sm mt-2">
                Users must zap at least this amount to post a message
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full bg-yellow-text/90 hover:bg-yellow-text disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-blackish font-bold py-5 px-8 text-lg uppercase tracking-wide transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,223,32,0.3)] transform hover:scale-[1.02] disabled:transform-none"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        {/* Custom URL Section */}
        <CustomSlugSection
          boardId={boardId!}
          userPubkey={userPubkey}
          currentSlug={boardConfig.customSlug}
          ></CustomSlugSection>
                

        <div className="card-style p-8 border-2 border-red-500/30 mb-6">
          <h2 className="text-red-400 font-bold text-2xl mb-4 flex items-center gap-2">
            <FiTrash2 />
            Danger Zone
          </h2>
          <p className="text-gray-400 mb-4">
            Remove this board from the explore page. Your board will still be accessible via direct
            link, but will no longer appear in public listings.
          </p>
          <p className="text-yellow-400/80 text-sm mb-4">
            ⚠️ This action will make your board private but won't delete existing messages.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-3 px-6 border border-red-500/30 transition-all duration-300 disabled:opacity-50"
          >
            {isDeleting ? "Removing..." : "Remove from Explore Page"}
          </button>
        </div>

        <button
          onClick={() => navigate(`/board/${boardId}`)}
          className="w-full bg-transparent hover:bg-gray-700/30 text-white font-bold py-4 text-lg border-2 border-gray-600 hover:border-gray-500 transition-all duration-300"
        >
          Back to Board
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="card-style p-6 max-w-md w-full">
            <h2 className="text-red-400 font-bold text-xl mb-4">Confirm Removal</h2>
            <p className="text-white mb-4">
              Are you sure you want to remove this board from the explore page?
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Your board will no longer be discoverable, but will remain accessible via direct link.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-transparent hover:bg-gray-700/30 text-white font-bold py-3 border-2 border-gray-600 hover:border-gray-500 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFromExplore}
                disabled={isDeleting}
                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-3 border border-red-500/30 transition-all duration-300 disabled:opacity-50"
              >
                {isDeleting ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

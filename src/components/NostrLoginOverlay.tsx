import { useState } from "react";
import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

interface NostrLoginOverlayProps {
  onSuccess: (pubkey: string) => void;
  onClose: () => void;
}

function NostrLoginOverlay({ onSuccess, onClose }: NostrLoginOverlayProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setStatus("loading");
    setError("");

    try {
      // Check if window.nostr exists (NIP-07)
      if (!window.nostr) {
        throw new Error("No Nostr extension found. Please install nos2x or Alby extension.");
      }

      // Request public key from extension
      const pubkey = await window.nostr.getPublicKey();

      if (!pubkey) {
        throw new Error("Failed to get public key from extension");
      }

      // Show success animation
      setStatus("success");

      // Wait for animation then close and callback
      setTimeout(() => {
        onSuccess(pubkey);
      }, 2000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to connect extension");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="card-style max-w-md w-full p-6 sm:p-8 relative">
        {/* Close button - only show when not loading or success */}
        {status !== "loading" && status !== "success" && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold transition-colors"
          >
            ×
          </button>
        )}

        {/* Idle State - Login Prompt */}
        {status === "idle" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Connect Nostr Extension
              </h2>
              <p className="text-gray-400 text-sm sm:text-base">
                To make your board explorable, sign in with your Nostr extension
              </p>
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-yellow-text/90 hover:bg-yellow-text text-blackish font-bold py-3 sm:py-4 text-sm sm:text-base uppercase tracking-wide transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,223,32,0.3)] cursor-pointer"
            >
              Connect Extension
            </button>
          </div>
        )}

        {/* Loading State */}
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mb-6 rounded-full border-4 border-yellow-text/20 border-t-yellow-text/90 animate-spin"></div>
            <p className="text-yellow-text/90 text-base sm:text-lg font-semibold mb-2">
              Waiting for extension...
            </p>
            <p className="text-gray-400 text-xs sm:text-sm">
              Please approve the connection request
            </p>
          </div>
        )}

        {/* Success State */}
        {status === "success" && (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12">
            <div className="animate-[scale-in_0.5s_ease-out] mb-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-green-500/10 flex items-center justify-center">
                <FaCheckCircle className="text-green-400 text-5xl sm:text-6xl" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-green-400 mb-3 animate-[fade-in_0.5s_ease-out_0.3s_both] text-center">
              Connected Successfully!
            </h2>
            <p className="text-gray-300 text-sm sm:text-base animate-[fade-in_0.5s_ease-out_0.5s_both]">
              Your board will be explorable
            </p>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <FaExclamationTriangle className="text-red-400 text-3xl sm:text-4xl" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-red-400 uppercase text-center">
                Connection Failed
              </h2>
            </div>
            <p className="text-red-300 text-center text-sm sm:text-base">{error}</p>
            <div className="card-style border-violet-300/20 p-4">
              <p className="text-violet-300 font-bold mb-3 text-sm sm:text-base">
                Recommended Extensions:
              </p>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-yellow-text/90">•</span> nos2x (Chrome/Firefox)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-text/90">•</span> Alby (Chrome/Firefox)
                </li>
              </ul>
            </div>
            <div className="flex gap-3 sm:gap-4">
              <button
                onClick={onClose}
                className="flex-1 bg-transparent hover:bg-gray-700/30 text-white font-bold py-3 text-sm sm:text-base uppercase border-2 border-gray-600 hover:border-gray-500 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleLogin}
                className="flex-1 bg-yellow-text/90 hover:bg-yellow-text text-blackish font-bold py-3 text-sm sm:text-base uppercase transition-all duration-300"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NostrLoginOverlay;

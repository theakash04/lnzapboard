import { useState } from "react";
import { FaCheckCircle, FaSpinner, FaExclamationTriangle } from "react-icons/fa";

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
        throw new Error(
          "No Nostr extension found. Please install nos2x or Alby extension."
        );
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
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-black border-4 border-yellow-400 max-w-md w-full p-8 relative">
        {/* Close button - only show when not loading or success */}
        {status !== "loading" && status !== "success" && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-yellow-400 hover:text-yellow-300 text-2xl font-bold"
          >
            ×
          </button>
        )}

        {/* Idle State - Login Prompt */}
        {status === "idle" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-yellow-400 uppercase text-center">
              Connect Nostr Extension
            </h2>
            <p className="text-gray-300 text-center">
              To make your board explorable, sign in with your Nostr extension
            </p>
            <button
              onClick={handleLogin}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 uppercase border-2 border-yellow-300 transition-all duration-200"
            >
              Connect Extension
            </button>
          </div>
        )}

        {/* Loading State */}
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-8">
            <FaSpinner className="text-yellow-400 animate-spin" size={80} />
            <p className="text-yellow-300 text-lg mt-6">
              Waiting for extension...
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Please approve the connection request
            </p>
          </div>
        )}

        {/* Success State */}
        {status === "success" && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-[scale-in_0.5s_ease-out]">
              <FaCheckCircle className="text-green-400 animate-pulse" size={100} />
            </div>
            <h2 className="text-3xl font-bold text-green-400 mt-6 mb-2 animate-[fade-in_0.5s_ease-out_0.3s_both]">
              Connected Successfully!
            </h2>
            <p className="text-gray-300 text-base animate-[fade-in_0.5s_ease-out_0.5s_both]">
              Your board will be explorable
            </p>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <FaExclamationTriangle className="text-red-400" size={60} />
              <h2 className="text-2xl font-bold text-red-400 uppercase text-center mt-4">
                Connection Failed
              </h2>
            </div>
            <p className="text-red-300 text-center">{error}</p>
            <div className="bg-gray-900 border border-yellow-400 p-4">
              <p className="text-yellow-300 font-bold mb-2">Recommended Extensions:</p>
              <ul className="text-gray-300 space-y-1">
                <li>• nos2x (Chrome/Firefox)</li>
                <li>• Alby (Chrome/Firefox)</li>
              </ul>
            </div>
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 bg-black border-2 border-yellow-400 text-yellow-300 font-bold py-3 uppercase hover:bg-gray-900 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleLogin}
                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 uppercase border-2 border-yellow-300 transition-all duration-200"
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
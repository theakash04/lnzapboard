import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FaCopy } from "react-icons/fa";
import { BsLightning, BsShieldCheck } from "react-icons/bs";
import { SiBitcoin } from "react-icons/si";
import { RiSecurePaymentLine } from "react-icons/ri";
import { BiWorld } from "react-icons/bi";

function ZapMe() {
  const [showOnChain, setShowOnChain] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedNpub, setCopiedNpub] = useState(false);

  const LIGHTNING_ADDRESS = "mist@coinos.io";
  const BITCOIN_ADDRESS = "bc1q6cxtna4zdqh999q06v3dhhafcnk9s6kavw8wut";
  const NPUB = "npub1kuzk93p4mea2yxehddet03szwx2h4uw3wqz3ehvqrwj9ssd0tetqs5adr6";

  const handleCopy = (text: string, type: "address" | "npub") => {
    navigator.clipboard.writeText(text);
    if (type === "address") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopiedNpub(true);
      setTimeout(() => setCopiedNpub(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-blackish flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 sm:mb-6 border border-violet-300/20 bg-violet-300/5 backdrop-blur-sm text-violet-300 text-xs sm:text-sm uppercase tracking-wider">
            <BsLightning className="text-yellow-text" />
            <span>Support Open Source Tech</span>
          </div>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-md mx-auto">
            Your support motivates me to keep building cool, open, freedom-focused technology.
            Together, we can make peer-to-peer the default.
          </p>
        </div>

        {/* Main Card */}
        <div className="card-style p-6 sm:p-8">
          {/* Bitcoin Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-3 rounded-full bg-yellow-text/10">
              <SiBitcoin className="text-4xl sm:text-5xl text-yellow-text" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Bitcoin Only</h2>
            <p className="text-xs sm:text-sm text-gray-500">
              No Stripe, No PayPal. Just peer-to-peer electronic cash.
            </p>
          </div>

          {/* Toggle Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setShowOnChain(false)}
              className={`py-3 px-4 text-sm font-bold transition-all duration-300 ${
                !showOnChain
                  ? "bg-yellow-text text-blackish"
                  : "bg-transparent text-gray-500 border-2 border-border-purple hover:border-violet-300/30"
              }`}
            >
              <BsLightning className="inline mr-2" />
              Lightning
            </button>
            <button
              onClick={() => setShowOnChain(true)}
              className={`py-3 px-4 text-sm font-bold transition-all duration-300 ${
                showOnChain
                  ? "bg-yellow-text text-blackish"
                  : "bg-transparent text-gray-500 border-2 border-border-purple hover:border-violet-300/30"
              }`}
            >
              <SiBitcoin className="inline mr-2" />
              On-Chain
            </button>
          </div>

          {/* Address Display */}
          <div className="mb-4">
            <div className="text-center text-yellow-text/80 text-xs uppercase tracking-wider mb-2 font-bold">
              {showOnChain ? "Bitcoin Address" : "Lightning Address"}
            </div>
            <div className="bg-blackish border border-border-purple p-3 mb-3">
              <code className="text-yellow-text text-xs sm:text-sm font-mono break-all block text-center">
                {showOnChain ? BITCOIN_ADDRESS : LIGHTNING_ADDRESS}
              </code>
            </div>

            <button
              onClick={() =>
                handleCopy(showOnChain ? BITCOIN_ADDRESS : LIGHTNING_ADDRESS, "address")
              }
              className="w-full bg-yellow-text hover:bg-yellow-text/90 text-blackish font-bold py-3 text-sm uppercase transition-all duration-300 flex items-center justify-center gap-2"
            >
              <FaCopy />
              {copied ? "Copied!" : "Copy Address"}
            </button>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4">
              <QRCodeSVG
                value={showOnChain ? BITCOIN_ADDRESS : LIGHTNING_ADDRESS}
                size={180}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>

          {/* Nostr Section */}
          <div className="border-t border-border-purple pt-6 mb-6">
            <h3 className="text-center text-violet-300 font-bold text-sm uppercase tracking-wider mb-3">
              Find Me on Nostr
            </h3>

            <div className="bg-blackish border border-border-purple p-3 relative group">
              <code className="text-violet-300/90 text-xs font-mono break-all block text-center pr-8">
                {NPUB}
              </code>

              <button
                onClick={() => handleCopy(NPUB, "npub")}
                className="absolute top-2 right-2 text-violet-300/50 hover:text-violet-300 transition-colors"
                title="Copy npub"
              >
                <FaCopy className="text-sm" />
              </button>
            </div>

            {copiedNpub && <div className="text-center text-xs text-violet-300 mt-2">Copied!</div>}
          </div>

          {/* Why Bitcoin Section */}
          <div className="border-t border-border-purple pt-6">
            <h3 className="text-center text-white font-bold text-base uppercase tracking-wider mb-4">
              Why Bitcoin?
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 mb-2 rounded-full bg-yellow-text/10">
                  <RiSecurePaymentLine className="text-xl sm:text-2xl text-yellow-text" />
                </div>
                <div className="text-yellow-text font-bold text-xs mb-1">No Censorship</div>
                <div className="text-gray-500 text-xs">Can't be blocked</div>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 mb-2 rounded-full bg-yellow-text/10">
                  <BsShieldCheck className="text-xl sm:text-2xl text-yellow-text" />
                </div>
                <div className="text-yellow-text font-bold text-xs mb-1">No KYC</div>
                <div className="text-gray-500 text-xs">Private</div>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 mb-2 rounded-full bg-yellow-text/10">
                  <BiWorld className="text-xl sm:text-2xl text-yellow-text" />
                </div>
                <div className="text-yellow-text font-bold text-xs mb-1">Global</div>
                <div className="text-gray-500 text-xs">Works anywhere</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-500 italic text-sm">"Be Free."</p>
        </div>
      </div>
    </div>
  );
}

export default ZapMe;

import { BsCheck, BsX, BsLightning } from "react-icons/bs";
import { FiZap } from "react-icons/fi";
import { AiOutlineLink } from "react-icons/ai";
import { MdVerified } from "react-icons/md";
import { BiGlobe } from "react-icons/bi";
import { useNavigate } from "react-router";

function Pricing() {
  const navigate = useNavigate();

  const features = [
    {
      name: "Anonymous Board Creation",
      basic: true,
      premium: true,
    },
    {
      name: "Share via Link",
      basic: true,
      premium: true,
    },
    {
      name: "Instant Board Messaging",
      basic: true,
      premium: true,
    },
    {
      name: "Verified Badge",
      basic: false,
      premium: true,
      icon: <MdVerified className="inline ml-1 text-yellow-text" />,
    },
    {
      name: "Featured on Explore Page",
      basic: false,
      premium: true,
      icon: <BiGlobe className="inline ml-1 text-yellow-text" />,
    },
    {
      name: "Custom Board URL",
      basic: false,
      premium: true,
    },
    {
      name: "Short Shareable URL",
      basic: false,
      premium: true,
      icon: <AiOutlineLink className="inline ml-1 text-yellow-text" />,
    },
  ];

  return (
    <div className="min-h-screen bg-blackish relative overflow-hidden">
      <div className="relative z-10 px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h1 className="text-3xl sm:max-md:text-xl md:max-lg:text-4xl lg:max-proj:text-6xl proj:text-7xl font-bold mb-4 sm:mb-6 text-white">
              Choose Your <span className="text-yellow-text">Plan</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl proj:text-4xl text-gray-400 max-w-3xl mx-auto">
              Start for free or upgrade to Premium for advanced features and visibility
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10 mb-12 sm:mb-16 md:mb-20 max-w-5xl mx-auto">
            {/* Basic Plan */}
            <div className="card-style p-6 sm:p-8 md:p-10 lg:p-12 proj:p-16 relative group hover:border-gray-600/50 transition-all duration-500">
              <div className="mb-6 sm:mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 proj:w-20 proj:h-20 rounded-full bg-gray-700/50 flex items-center justify-center">
                    <FiZap className="text-xl sm:text-2xl proj:text-4xl text-gray-400" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl proj:text-6xl font-bold text-white">
                    Basic
                  </h3>
                </div>
                <p className="text-sm sm:text-base md:text-lg proj:text-2xl text-gray-500 mb-6">
                  Perfect for getting started
                </p>
                <div className="flex items-baseline gap-2 mb-6 sm:mb-8">
                  <span className="text-4xl sm:text-5xl md:text-6xl proj:text-8xl font-bold text-white">
                    Free
                  </span>
                  <span className="text-base sm:text-lg md:text-xl proj:text-3xl text-gray-500">
                    forever
                  </span>
                </div>
                <button
                  onClick={() => navigate("/create")}
                  className="w-full bg-transparent hover:bg-gray-700/30 text-white font-bold py-3 sm:py-4 md:py-5 proj:py-8 px-6 text-sm sm:text-base md:text-lg proj:text-3xl uppercase tracking-wide border-2 border-gray-600 hover:border-gray-500 transition-all duration-300"
                >
                  Get Started
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4 md:space-y-5 proj:space-y-8">
                <h4 className="text-sm sm:text-base md:text-lg proj:text-2xl font-bold text-gray-400 uppercase tracking-wider mb-4">
                  What's Included:
                </h4>
                {features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 text-sm sm:text-base md:text-lg proj:text-2xl"
                  >
                    {feature.basic ? (
                      <BsCheck className="text-gray-400 shrink-0 text-xl sm:text-2xl proj:text-4xl mt-1" />
                    ) : (
                      <BsX className="text-gray-700 shrink-0 text-xl sm:text-2xl proj:text-4xl mt-1" />
                    )}
                    <span className={feature.basic ? "text-gray-400" : "text-gray-700"}>
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Plan */}
            <div className="card-style p-6 sm:p-8 md:p-10 lg:p-12 proj:p-16 relative group hover:border-yellow-text/50 transition-all duration-500 border-yellow-text/30">
              {/* Popular Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-text text-blackish px-4 sm:px-6 py-1 sm:py-2 text-xs sm:text-sm md:text-base proj:text-2xl font-bold uppercase tracking-wider">
                Popular
              </div>

              <div className="mb-6 sm:mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 proj:w-20 proj:h-20 rounded-full bg-yellow-text/10 flex items-center justify-center">
                    <BsLightning className="text-xl sm:text-2xl proj:text-4xl text-yellow-text" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl proj:text-6xl font-bold text-white">
                    Premium
                  </h3>
                </div>
                <p className="text-sm sm:text-base md:text-lg proj:text-2xl text-gray-400 mb-6">
                  For serious board creators
                </p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl sm:text-5xl md:text-6xl proj:text-8xl font-bold text-yellow-text">
                    3,900
                  </span>
                  <span className="text-base sm:text-lg md:text-xl proj:text-3xl text-gray-400">
                    sats
                  </span>
                </div>
                <p className="text-xs sm:text-sm md:text-base proj:text-xl text-gray-500 mb-6 sm:mb-8">
                  One-time payment per-board
                </p>
                <button
                  onClick={() => navigate("/create")}
                  className="w-full bg-yellow-text hover:bg-yellow-text/90 text-blackish font-bold py-3 sm:py-4 md:py-5 proj:py-8 px-6 text-sm sm:text-base md:text-lg proj:text-3xl uppercase tracking-wide transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,223,32,0.4)] transform hover:scale-[1.02]"
                >
                  Upgrade to Premium
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4 md:space-y-5 proj:space-y-8">
                <h4 className="text-sm sm:text-base md:text-lg proj:text-2xl font-bold text-gray-400 uppercase tracking-wider mb-4">
                  What's Included:
                </h4>
                {features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 text-sm sm:text-base md:text-lg proj:text-2xl"
                  >
                    <BsCheck className="text-yellow-text shrink-0 text-xl sm:text-2xl proj:text-4xl mt-1" />
                    <span className="text-gray-300">
                      {feature.name}
                      {feature.premium && !feature.basic && feature.icon}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pricing;

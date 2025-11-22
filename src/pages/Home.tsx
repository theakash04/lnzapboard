import { useNavigate } from "react-router";
import { FiZap } from "react-icons/fi";
import { BsLightning, BsPerson, BsArrowRight } from "react-icons/bs";
import { BiLink } from "react-icons/bi";
import Pricing from "../components/PricingModel";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-blackish relative overflow-hidden">
      {/* Subtle background gradient accent */}

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl w-full mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16 sm:mb-20 md:mb-24 lg:mb-28">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 sm:mb-8 border border-violet-300/20 bg-violet-300/5 backdrop-blur-sm text-violet-300 text-xs sm:text-sm md:text-md proj:text-2xl uppercase tracking-wider">
              <BsLightning className="text-yellow-text" />
              <span>Powered by Bitcoin Lightning and Nostr</span>
            </div>

            <h1 className="text-6xl xl:max-proj:text-7xl proj:text-[12rem] font-bold mb-2 sm:max-md:mb-4 md:mb-6 leading-tight">
              <span className="text-yellow-text">Zap</span>
              <span className="text-violet-200">it</span>
            </h1>

            <p className="text-md sm:max-md:text-base md:max-lg:text-lg lg:max-proj:text-2xl proj:text-5xl text-gray-400 mb-8 sm:max-md:mb-10 md:mb-14 leading-relaxed max-w-4xl mx-auto px-4">
              Create live message boards powered by instant Bitcoin payments.
              <span className="text-yellow-text/80"> No accounts, no hassle</span>
              —just real-time engagement for your events and communities.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-5 md:gap-6">
              <button
                onClick={() => navigate("/create")}
                className="group w-full sm:w-auto bg-yellow-text hover:bg-yellow-text/90 text-blackish font-bold py-2 sm:max-md:py-2 md:max-proj:py-6 proj:py-10 px-2 sm:max-md:px-6 md:max-lg:px-8 lg:max-proj:px-10 proj:px-24 text-base md:max-lg:text-lg lg:max-proj:text-xl proj:text-2xl uppercase tracking-wide transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,223,32,0.4)] transform hover:scale-[1.02] flex items-center justify-center gap-3 cursor-pointer"
              >
                Create Your Board
                <BsArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate("/explore")}
                className="w-full sm:w-auto bg-transparent hover:bg-yellow-text/5 text-yellow-text font-bold py-2 sm:max-md:py-2 md:max-proj:py-6 proj:py-10 px-2 sm:max-md:px-6 md:max-lg:px-8 lg:max-proj:px-10 proj:px-24 text-base md:max-lg:text-lg lg:max-proj:text-xl proj:text-2xl uppercase tracking-wide border-2 border-yellow-text/50 hover:border-yellow-text transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,223,32,0.2)] cursor-pointer"
              >
                Explore Boards
              </button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-7 mb-12 sm:mb-16 md:mb-20">
            {/* Feature 1 */}
            <div className="card-style group hover:border-yellow-text/30 transition-all duration-500 p-6 sm:p-7 md:p-8 lg:p-9 proj:p-14 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-br from-yellow-text/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 proj:w-32 proj:h-32 mb-4 sm:mb-5 md:mb-6 proj:mb-10 text-3xl sm:text-4xl md:text-5xl proj:text-7xl text-yellow-text transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <FiZap />
                </div>
                <h3 className="text-white font-bold mb-3 sm:mb-4 proj:mb-6 uppercase text-sm sm:text-base md:text-lg lg:text-xl proj:text-3xl tracking-wider">
                  Instant Setup
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm md:text-base proj:text-2xl leading-relaxed">
                  Paste your NWC connection and you're live in seconds
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="card-style group hover:border-yellow-text/30 transition-all duration-500 p-6 sm:p-7 md:p-8 lg:p-9 proj:p-14 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-br from-yellow-text/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 proj:w-32 proj:h-32 mb-4 sm:mb-5 md:mb-6 proj:mb-10 text-3xl sm:text-4xl md:text-5xl proj:text-7xl text-yellow-text transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <BsLightning />
                </div>
                <h3 className="text-white font-bold mb-3 sm:mb-4 proj:mb-6 uppercase text-sm sm:text-base md:text-lg lg:text-xl proj:text-3xl tracking-wider">
                  Real-Time
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm md:text-base proj:text-2xl leading-relaxed">
                  Messages appear the moment payment confirms
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="card-style group hover:border-yellow-text/30 transition-all duration-500 p-6 sm:p-7 md:p-8 lg:p-9 proj:p-14 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-br from-yellow-text/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 proj:w-32 proj:h-32 mb-4 sm:mb-5 md:mb-6 proj:mb-10 text-3xl sm:text-4xl md:text-5xl proj:text-7xl text-yellow-text transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <BsPerson />
                </div>
                <h3 className="text-white font-bold mb-3 sm:mb-4 proj:mb-6 uppercase text-sm sm:text-base md:text-lg lg:text-xl proj:text-3xl tracking-wider">
                  No Sign-Up
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm md:text-base proj:text-2xl leading-relaxed">
                  Fully decentralized with no registration required
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="card-style group hover:border-yellow-text/30 transition-all duration-500 p-6 sm:p-7 md:p-8 lg:p-9 proj:p-14 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-br from-yellow-text/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 proj:w-32 proj:h-32 mb-4 sm:mb-5 md:mb-6 proj:mb-10 text-3xl sm:text-4xl md:text-5xl proj:text-7xl text-yellow-text transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <BiLink />
                </div>
                <h3 className="text-white font-bold mb-3 sm:mb-4 proj:mb-6 uppercase text-sm sm:text-base md:text-lg lg:text-xl proj:text-3xl tracking-wider">
                  Easy Access
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm md:text-base proj:text-2xl leading-relaxed">
                  Share via link for instant participation
                </p>
              </div>
            </div>
          </div>

          {/* Use Cases Section */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl proj:text-7xl font-bold text-white mb-4 sm:mb-6 md:mb-8">
              Perfect For
            </h2>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-5">
              {[
                "Live Events",
                "Q&A Sessions",
                "Conferences",
                "Streams",
                "Meetups",
                "Workshops",
              ].map(useCase => (
                <div
                  key={useCase}
                  className="px-5 sm:px-6 md:px-8 proj:px-12 py-2 sm:py-3 md:py-4 proj:py-6 bg-card-bg border border-border-purple hover:border-violet-300/30 text-gray-400 hover:text-yellow-text text-xs sm:text-sm md:text-base lg:text-lg proj:text-3xl transition-all duration-300 cursor-default"
                >
                  {useCase}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Pricing />
    </div>
  );
}

export default Home;

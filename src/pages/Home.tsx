import { useNavigate } from "react-router";
import RetroFrame from "../components/Frame";
import { FiTarget } from "react-icons/fi";
import { BsLightning, BsPerson } from "react-icons/bs";

function Home() {
  const navigate = useNavigate();

  return (
    <RetroFrame>
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-3xl w-full mx-auto text-center py-8">
          <h1 className="text-5xl font-bold mb-4 text-yellow-400">
            Lightning Zap Board
          </h1>
          <p className="text-lg text-white/80 mb-10 tracking-wide">
            Create a live message board powered by Bitcoin Lightning payments.
            <br />
            Perfect for Q&A sessions, live events, and interactive displays.
          </p>

          <div className="flex justify-center gap-4">
            {/* Explore Button */}
            <button
              onClick={() => navigate("/explore")}
              className=" hover:bg-yellow-500 hover:text-black text-yellow-400 font-bold py-4 px-10 text-lg uppercase border-2 border-yellow-300 transition-all duration-200 hover:shadow-[0_0_10px_#ffff00]"
            >
              Explore Boards
            </button>

            {/* Create Board Button */}
            <button
              onClick={() => navigate("/create")}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-4 px-10 text-lg uppercase border-2 border-yellow-300 transition-all duration-200 hover:shadow-[0_0_10px_#ffff00]"
            >
              Create Your Board
            </button>
          </div>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-black flex flex-col justify-center items-center border-2 border-yellow-500 p-6 text-center">
              <div className="text-4xl text-center text-brightGreen mb-3">
                <FiTarget />
              </div>
              <h3 className="text-yellow-300 font-bold mb-2 uppercase">
                Simple Setup
              </h3>
              <p className="text-white text-sm">
                Just paste your NWC string and get a shareable board link
              </p>
            </div>

            <div className="bg-black border-2 border-yellow-500 p-6 flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-3 text-brightGreen">
                <BsLightning />
              </div>
              <h3 className="text-yellow-300 font-bold mb-2 uppercase">
                Real-time Messages
              </h3>
              <p className="text-white text-sm">
                Messages appear instantly when someone zaps
              </p>
            </div>

            <div className="bg-black border-2 border-yellow-500 p-6 flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-3 text-brightGreen">
                <BsPerson />
              </div>
              <h3 className="text-yellow-300 font-bold mb-2 uppercase">
                No Account Needed
              </h3>
              <p className="text-white text-sm">
                Fully decentralized, no sign-ups required
              </p>
            </div>
          </div>
        </div>
      </div>
    </RetroFrame>
  );
}

export default Home;

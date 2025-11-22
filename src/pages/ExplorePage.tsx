import { useEffect, useState } from "react";
import { fetchAllBoards } from "../libs/nostr";
import type { BoardConfig } from "../types/types";
import BoardCard from "../components/BoardCard";
import { useNavigate } from "react-router";
import { BsLightning, BsGrid3X3 } from "react-icons/bs";
import { FiSearch } from "react-icons/fi";

export default function ExploreBoards() {
  const [boards, setBoards] = useState<BoardConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAllBoards();
        setBoards(data.filter((board: BoardConfig) => board.boardName && board.isExplorable));
      } catch (err) {
        console.error("Failed to fetch boards:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filter boards based on search query
  const filteredBoards = boards.filter(board =>
    board.boardName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-blackish relative overflow-hidden">
      <div className="relative z-10 px-4 sm:px-6 md:px-8 lg:px-12 py-8 sm:py-12 md:py-16">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8 sm:mb-10 md:mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-3 border border-violet-300/20 bg-violet-300/5 backdrop-blur-sm text-violet-300 text-xs uppercase tracking-wider">
                  <BsGrid3X3 className="text-yellow-text/90" />
                  <span>Discover Boards</span>
                </div>
                <h1 className="text-lg sm:max-md:text-xl md:max-lg:text-2xl lg:max-proj:text-4xl proj:text-6xl font-bold text-white mb-2">
                  Explore <span className="text-yellow-text/90">Boards</span>
                </h1>
                <p className="text-sm sm:text-base text-gray-400">
                  Discover live Zap boards from the community
                </p>
              </div>

              <button
                onClick={() => navigate("/")}
                className="self-start sm:self-auto bg-transparent hover:bg-gray-700/30 text-white font-bold py-3 px-6 text-sm border-2 border-gray-600 hover:border-gray-500 transition-all duration-300"
              >
                Back
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search boards..."
                className="w-full pl-12 pr-4 py-3 bg-card-bg text-white placeholder-gray-600 border-2 border-border-purple focus:border-yellow-text/80 focus:outline-none transition-colors text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 mb-4 rounded-full border-4 border-yellow-text/20 border-t-yellow-text/90 animate-spin"></div>
              <p className="text-gray-400 text-sm sm:text-base">Loading boards...</p>
            </div>
          ) : filteredBoards.length === 0 ? (
            // Empty State
            <div className="card-style p-8 sm:p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-yellow-text/10">
                <BsLightning className="text-4xl text-yellow-text/90" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                {searchQuery ? "No boards found" : "No boards yet"}
              </h3>
              <p className="text-gray-400 text-sm sm:text-base mb-6">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Be the first to create a board!"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => navigate("/create")}
                  className="bg-yellow-text/90 hover:bg-yellow-text text-blackish font-bold py-3 px-8 text-sm uppercase tracking-wide transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,223,32,0.3)]"
                >
                  Create Board
                </button>
              )}
            </div>
          ) : (
            // Boards Grid
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-gray-400 text-sm">
                  {filteredBoards.length} {filteredBoards.length === 1 ? "board" : "boards"} found
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
                {filteredBoards.map((board: BoardConfig) => (
                  <BoardCard
                    key={board.boardId}
                    board={board}
                    onClick={() => navigate(`/board/${board.boardId}`)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

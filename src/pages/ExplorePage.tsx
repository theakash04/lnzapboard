import { useEffect, useState } from "react";
import { fetchAllBoards } from "../libs/nostr";
import type { BoardConfig } from "../types";
import BoardCard from "../components/BoardCard";
import RetroFrame from "../components/Frame";
import { useNavigate } from "react-router";

export default function ExploreBoards() {
  const [boards, setBoards] = useState<BoardConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAllBoards();
        setBoards(data);
      } catch (err) {
        console.error("Failed to fetch boards:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <RetroFrame>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-yellow-400">Explore Boards</h1>
          <button
            onClick={() => navigate("/")}
            className="text-xm text-yellow-400 hover:text-yellow-300 px-4 py-2 rounded-lg"
          >
            ◀ Back
          </button>
        </div>

        {loading ? (
          <div className="text-center text-yellow-400 py-12">Loading boards...</div>
        ) : boards.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            No boards found yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {boards.map((board) => (
              <BoardCard
                key={board.boardId}
                board={board}
                onClick={() => navigate(`/board/${board.boardId}`)}
              />
            ))}
          </div>
        )}
      </RetroFrame>
    </div>
  );
}

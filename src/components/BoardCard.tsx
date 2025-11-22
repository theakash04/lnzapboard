import { BsLightning } from "react-icons/bs";
import type { BoardConfig } from "../types/types";
import { BiChevronRight } from "react-icons/bi";

interface BoardCardProps {
  board: BoardConfig;
  onClick: () => void;
}

function formatDate(timestamp: number): String {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const year = date.getFullYear();

  // Add ordinal suffix (st, nd, rd, th)
  const suffix = (day: number): string => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  return `${day}${suffix(day)} ${month}, ${year}`;
}

export default function BoardCard({ board, onClick }: BoardCardProps) {
  return (
    <button
      onClick={onClick}
      className="card-style p-5 sm:p-6 text-left hover:border-yellow-text/30 transition-all duration-500 group w-full relative overflow-hidden"
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-linear-to-br from-yellow-text/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-1 truncate group-hover:text-yellow-text/90 transition-colors">
              {board.boardName}
            </h3>
            <p className="text-xs text-gray-500 md:text-base">{board.boardId.slice(0, 8)}</p>
            <p className="text-xs text-gray-500">{formatDate(board.createdAt)}</p>
          </div>

          <div className="shrink-0 ml-3">
            <div className="w-10 h-10 rounded-full bg-yellow-text/10 flex items-center justify-center group-hover:bg-yellow-text/20 transition-colors">
              <BsLightning className="text-yellow-text/90 text-lg" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Min Zap</p>
            <p className="text-sm font-bold text-yellow-text/90">
              {board.minZapAmount.toLocaleString()} sats
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border-purple">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Click to view</span>
            <span className="group-hover:translate-x-1 transition-transform">
              <BiChevronRight className="text-yellow-text/90" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

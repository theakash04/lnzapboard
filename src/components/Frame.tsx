import type { ReactNode } from "react";

interface RetroFrameProps {
  children: ReactNode;
  className?: string;
}

export default function RetroFrame({ children, className = "" }: RetroFrameProps) {
  return (
    <div className=" bg-black p-10">
      <div
        className={`bg-black  border-2 border-dashed border-gray-500 p-6 text-yellow-200 font-mono ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

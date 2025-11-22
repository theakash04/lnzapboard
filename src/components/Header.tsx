import { FaGithub } from "react-icons/fa";
import { useNavigate } from "react-router";

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="bg-blackish border-b-2 border-yellow-500/20 p-4">
      <div className="w-full mx-auto flex items-center justify-between px-8">
        <div onClick={() => navigate("/")} className="flex items-center gap-3 cursor-pointer group">
          <img
            src="/lnzapboard-logo.png"
            alt="lnzapboard logo"
            className="w-10 h-10 proj:w-14 proj:h-14 object-contain group-hover:scale-110 transition-transform duration-200"
          />
          <span className="text-yellow-400 font-bold text-2xl proj:text-4xl tracking-wide group-hover:text-yellow-300 transition-colors flex justify-end items-baseline">
            zapit<span className="text-white/70 text-sm proj:text-lg">.space</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-yellow-300 text-sm">
          <a
            href="https://github.com/mistic0xb"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-2 proj:text-xl"
          >
            <FaGithub size={24} />
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

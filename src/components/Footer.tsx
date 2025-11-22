export default function Footer() {
    return (
        <footer className="bg-blackish border-t-2 border-yellow-500/20 p-6">
            <div className="flex items-center justify-center text-white/60 text-sm proj:text-2xl">
                Made with <span className="mx-1 text-yellow-400">⚡</span>by{" "}
                <a
                    href="/zapme"
                    className="text-yellow-400 hover:text-yellow-300 hover:drop-shadow-[0_0_6px_#facc15] transition-all duration-200 ml-1 proj:text-2xl"
                    target="_blank"
                >
                    mist
                </a>
                <span className="mx-1 proj:text-2xl">for freedom</span>
            </div>
        </footer>
    );
}

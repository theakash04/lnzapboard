import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { resolveSlug } from "../libs/slugService";
import { fetchBoardConfig } from "../libs/nostr";
import BoardDisplay from "./BoardDisplay";
import Loading from "../components/Loading";

export default function SlugBoard() {
  const { slug } = useParams<{ slug: string }>();
  console.log("SLUG: ", slug);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const resolve = async () => {
      if (!slug) {
        setError("Invalid slug");
        setLoading(false);
        return;
      }

      try {
        // Resolve slug to boardId
        const resolvedBoardId = await resolveSlug(slug);

        if (resolvedBoardId) {
          // Verify board exists
          const config = await fetchBoardConfig(resolvedBoardId);
          if (config) {
            setBoardId(resolvedBoardId);
          } else {
            setError("Board not found");
          }
        } else {
          setError("Custom URL not found");
        }
      } catch (err) {
        console.error("Failed to resolve slug:", err);
        setError("Failed to load board");
      } finally {
        setLoading(false);
      }
    };

    resolve();
  }, [slug]);

  if (loading) {
    return <Loading />;
  }

  if (error || !boardId) {
    return (
      <div className="min-h-screen bg-blackish flex items-center justify-center p-4">
        <div className="card-style p-8 max-w-md w-full text-center">
          <h2 className="text-white text-2xl font-bold mb-4">Board Not Found</h2>
          <p className="text-gray-400 mb-6">
            The custom URL <span className="text-violet-300 font-mono">/b/{slug}</span> doesn't
            exist or has been removed.
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-yellow-text/90 hover:bg-yellow-text text-blackish font-bold py-3 px-6 w-full transition-all duration-300"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Render BoardDisplay with the resolved boardId
  return <BoardDisplay boardIdProp={boardId} />;
}

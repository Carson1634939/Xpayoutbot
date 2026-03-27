"use client";

import { useState } from "react";

export default function Home() {
  const [tweetUrl, setTweetUrl] = useState("");
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!tweetUrl.trim()) return;

    setLoading(true);
    setError(null);
    setCardImageUrl(null);

    try {
      const res = await fetch("/api/generate-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetUrl: tweetUrl.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setCardImageUrl(objectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!cardImageUrl) return;
    const a = document.createElement("a");
    a.href = cardImageUrl;
    a.download = "xpayout-card.png";
    a.click();
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-950 font-sans px-4 py-12">
      <main className="flex flex-col items-center gap-8 w-full max-w-2xl">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-3">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="white"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <h1 className="text-3xl font-bold text-white">Payout Card</h1>
          </div>
          <p className="text-zinc-400 text-lg">
            Paste a tweet URL to see the estimated creator earnings
          </p>
        </div>

        {/* Input */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <input
            type="text"
            value={tweetUrl}
            onChange={(e) => setTweetUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            placeholder="https://x.com/username/status/123456789"
            className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !tweetUrl.trim()}
            className="px-6 py-3 rounded-xl bg-white text-black font-semibold text-base hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? "Generating..." : "Generate Card"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="w-full px-4 py-3 rounded-xl bg-red-900/30 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Card Preview */}
        {cardImageUrl && (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="w-full rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
              <img
                src={cardImageUrl}
                alt="Payout card"
                className="w-full h-auto"
              />
            </div>
            <button
              onClick={handleDownload}
              className="px-6 py-3 rounded-xl bg-zinc-800 text-white font-medium text-sm hover:bg-zinc-700 transition-colors border border-zinc-700"
            >
              Download Card
            </button>
          </div>
        )}

        {/* Test URLs hint */}
        {!cardImageUrl && !loading && (
          <div className="text-center text-zinc-600 text-sm mt-4">
            <p>Try a test URL:</p>
            <button
              onClick={() => setTweetUrl("https://x.com/Starplatinum_/status/1234567890")}
              className="text-zinc-400 hover:text-white transition-colors underline underline-offset-4"
            >
              https://x.com/Starplatinum_/status/1234567890
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

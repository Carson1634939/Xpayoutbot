import { NextRequest, NextResponse } from "next/server";
import { extractTweetId, fetchTweetData } from "@/lib/twitter";
import { calculatePayout } from "../../../../mock-data/tweets";
import { generateCardImage } from "@/lib/generate-card";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tweetUrl } = body;

    if (!tweetUrl || typeof tweetUrl !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid tweetUrl" },
        { status: 400 }
      );
    }

    const tweetId = extractTweetId(tweetUrl);
    if (!tweetId) {
      return NextResponse.json(
        { error: "Could not extract tweet ID from URL. Please provide a valid tweet/post URL (e.g. https://x.com/user/status/123456)" },
        { status: 400 }
      );
    }

    const tweetData = await fetchTweetData(tweetId);
    if (!tweetData) {
      return NextResponse.json(
        { error: "Tweet not found. Make sure the tweet exists and is public." },
        { status: 404 }
      );
    }

    const payout = calculatePayout(tweetData.impressions);

    const pngBuffer = await generateCardImage({
      username: tweetData.username,
      avatarUrl: tweetData.avatarUrl,
      payout,
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (err) {
    console.error("Error generating card:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { extractTweetId, fetchTweetData } from "@/lib/twitter";
import { calculatePayout } from "../../../../mock-data/tweets";

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
        { error: "Could not extract tweet ID from URL" },
        { status: 400 }
      );
    }

    const tweetData = await fetchTweetData(tweetId);
    if (!tweetData) {
      return NextResponse.json(
        { error: "Tweet not found" },
        { status: 404 }
      );
    }

    const payout = calculatePayout(tweetData.impressions);

    return NextResponse.json({
      id: tweetData.id,
      username: tweetData.username,
      displayName: tweetData.displayName,
      avatarUrl: tweetData.avatarUrl,
      impressions: tweetData.impressions,
      estimatedPayout: payout,
    });
  } catch (err) {
    console.error("Error fetching tweet:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

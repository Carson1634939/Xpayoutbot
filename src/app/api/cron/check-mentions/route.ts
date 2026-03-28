import { NextRequest, NextResponse } from "next/server";
import { fetchTweetData } from "@/lib/twitter";
import { calculatePayout } from "../../../../../mock-data/tweets";
import { generateCardImage } from "@/lib/generate-card";
import {
  getBotUserId,
  getMentions,
  uploadMedia,
  postTweet,
} from "@/lib/twitter-bot";

// Store the last processed mention ID in memory.
// On Vercel serverless this resets between cold starts, but since_id
// prevents duplicate replies (Twitter ignores duplicate tweets).
let lastMentionId: string | undefined;

// Vercel Cron secret to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // Verify cron secret if set
  if (CRON_SECRET) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Verify bot credentials are configured
  if (
    !process.env.TWITTER_API_KEY ||
    !process.env.TWITTER_ACCESS_TOKEN ||
    !process.env.TWITTER_BEARER_TOKEN
  ) {
    return NextResponse.json(
      { error: "Bot credentials not configured" },
      { status: 500 }
    );
  }

  try {
    // Get bot's user ID
    const botUserId = await getBotUserId();
    console.log("Bot user ID:", botUserId);

    // Fetch new mentions
    const mentions = await getMentions(botUserId, lastMentionId);
    console.log(`Found ${mentions.length} new mentions`);

    if (mentions.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    // Update the last mention ID to the newest one
    lastMentionId = mentions[0].id;

    let processed = 0;
    let errors = 0;

    for (const mention of mentions) {
      try {
        // Find the parent tweet this mention is replying to
        const parentTweet = mention.referenced_tweets?.find(
          (ref) => ref.type === "replied_to"
        );

        if (!parentTweet) {
          console.log(
            `Mention ${mention.id} is not a reply to a tweet, skipping`
          );
          continue;
        }

        const parentTweetId = parentTweet.id;
        console.log(
          `Processing mention ${mention.id} -> parent tweet ${parentTweetId}`
        );

        // Fetch parent tweet data (impressions, author info)
        const tweetData = await fetchTweetData(parentTweetId);
        if (!tweetData) {
          console.log(`Could not fetch data for tweet ${parentTweetId}`);
          continue;
        }

        // Calculate payout
        const payout = calculatePayout(tweetData.impressions);
        console.log(
          `@${tweetData.username}: ${tweetData.impressions} impressions = $${payout.toFixed(2)}`
        );

        // Generate card image
        const imageResponse = await generateCardImage({
          username: tweetData.username,
          avatarUrl: tweetData.avatarUrl,
          payout,
        });

        // Convert ImageResponse to Buffer
        const imageArrayBuffer = await imageResponse.arrayBuffer();
        const imageBuffer = Buffer.from(imageArrayBuffer);

        // Upload image to Twitter
        const mediaId = await uploadMedia(imageBuffer);
        console.log(`Uploaded media: ${mediaId}`);

        // Reply to the mention with the card
        const replyId = await postTweet({
          text: `Estimated earnings for this post 👇`,
          replyToTweetId: mention.id,
          mediaId,
        });
        console.log(`Posted reply: ${replyId}`);

        processed++;
      } catch (err) {
        console.error(`Error processing mention ${mention.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      processed,
      errors,
      total: mentions.length,
    });
  } catch (err) {
    console.error("Cron job error:", err);
    return NextResponse.json(
      { error: "Cron job failed", details: String(err) },
      { status: 500 }
    );
  }
}

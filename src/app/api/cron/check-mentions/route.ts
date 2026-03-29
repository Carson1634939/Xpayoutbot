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
let lastMentionId: string | undefined;

// Vercel Cron secret to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET;

// Bot username for constructing tweet URLs
const BOT_USERNAME = process.env.BOT_USERNAME || "Checkmypayout";

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
    let skipped = 0;

    for (const mention of mentions) {
      try {
        // Skip mentions from the bot itself (prevent reply loops)
        if (mention.author_id === botUserId) {
          console.log(`Mention ${mention.id} is from the bot itself, skipping`);
          skipped++;
          continue;
        }

        // Find the parent tweet this mention is replying to
        const parentTweet = mention.referenced_tweets?.find(
          (ref) => ref.type === "replied_to"
        );

        if (!parentTweet) {
          console.log(
            `Mention ${mention.id} is not a reply to a tweet, skipping`
          );
          skipped++;
          continue;
        }

        const parentTweetId = parentTweet.id;

        // Fetch parent tweet to check if it's from the bot (prevent reply loops)
        const parentData = await fetchTweetData(parentTweetId);
        if (!parentData) {
          console.log(`Could not fetch data for tweet ${parentTweetId}`);
          continue;
        }

        // Skip if the parent tweet is from the bot itself
        // (someone replying to the bot's card reply)
        if (parentData.username.toLowerCase() === BOT_USERNAME.toLowerCase()) {
          console.log(`Mention ${mention.id} is a reply to the bot's own tweet, skipping`);
          skipped++;
          continue;
        }

        console.log(
          `Processing mention ${mention.id} -> parent tweet ${parentTweetId}`
        );

        // Calculate payout
        const payout = calculatePayout(parentData.impressions);
        console.log(
          `@${parentData.username}: ${parentData.impressions} impressions = $${payout.toFixed(2)}`
        );

        // Generate card image
        const imageResponse = await generateCardImage({
          username: parentData.username,
          avatarUrl: parentData.avatarUrl,
          payout,
        });

        // Convert ImageResponse to Buffer
        const imageArrayBuffer = await imageResponse.arrayBuffer();
        const imageBuffer = Buffer.from(imageArrayBuffer);

        // Upload image to Twitter
        const mediaId = await uploadMedia(imageBuffer);
        console.log(`Uploaded media: ${mediaId}`);

        // Step 1: Reply to the PARENT tweet with the card image
        const cardReplyId = await postTweet({
          text: `Estimated earnings for this post \uD83D\uDC47`,
          replyToTweetId: parentTweetId,
          mediaId,
        });
        console.log(`Posted card reply to parent: ${cardReplyId}`);

        // Step 2: Reply to the MENTION with a link to the card reply
        const cardUrl = `https://x.com/${BOT_USERNAME}/status/${cardReplyId}`;
        await postTweet({
          text: `Here\u2019s the estimated payout \uD83D\uDC49 ${cardUrl}`,
          replyToTweetId: mention.id,
        });
        console.log(`Posted link reply to mention: ${mention.id}`);

        processed++;
      } catch (err) {
        console.error(`Error processing mention ${mention.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      processed,
      errors,
      skipped,
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

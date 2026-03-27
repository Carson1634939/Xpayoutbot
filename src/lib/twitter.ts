import { mockTweets, type TweetData } from "../../mock-data/tweets";

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

/**
 * Extract tweet ID from a tweet URL.
 * Supports formats:
 *   https://twitter.com/user/status/123456
 *   https://x.com/user/status/123456
 */
export function extractTweetId(url: string): string | null {
  const match = url.match(
    /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/
  );
  return match ? match[1] : null;
}

/**
 * Fetch tweet data from X API, falling back to mock data in development.
 */
export async function fetchTweetData(tweetId: string): Promise<TweetData | null> {
  // If we have a bearer token, use the real X API
  if (TWITTER_BEARER_TOKEN) {
    try {
      const res = await fetch(
        `https://api.x.com/2/tweets/${tweetId}?tweet.fields=public_metrics,author_id&expansions=author_id&user.fields=profile_image_url,username,name`,
        {
          headers: {
            Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`,
          },
        }
      );

      if (!res.ok) {
        console.error(`X API error: ${res.status} ${res.statusText}`);
        return null;
      }

      const json = await res.json();
      const tweet = json.data;
      const user = json.includes?.users?.[0];

      if (!tweet || !user) return null;

      return {
        id: tweet.id,
        username: user.username,
        displayName: user.name,
        avatarUrl: user.profile_image_url?.replace("_normal", "_400x400") ?? "",
        impressions: tweet.public_metrics?.impression_count ?? 0,
        text: tweet.text ?? "",
      };
    } catch (err) {
      console.error("Failed to fetch from X API:", err);
      return null;
    }
  }

  // Fallback to mock data
  return mockTweets[tweetId] ?? null;
}

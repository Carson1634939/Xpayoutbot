import OAuth from "oauth-1.0a";
import CryptoJS from "crypto-js";

const oauth = new OAuth({
  consumer: {
    key: process.env.TWITTER_API_KEY!,
    secret: process.env.TWITTER_API_SECRET!,
  },
  signature_method: "HMAC-SHA1",
  hash_function(baseString, key) {
    return CryptoJS.HmacSHA1(baseString, key).toString(CryptoJS.enc.Base64);
  },
});

const token = {
  key: process.env.TWITTER_ACCESS_TOKEN!,
  secret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
};

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

/**
 * Upload media (image) to Twitter and return the media_id_string.
 * Uses the v1.1 media upload endpoint.
 */
export async function uploadMedia(imageBuffer: Buffer): Promise<string> {
  const base64 = imageBuffer.toString("base64");

  const url = "https://upload.twitter.com/1.1/media/upload.json";

  const requestData = {
    url,
    method: "POST" as const,
    data: {
      media_data: base64,
      media_category: "tweet_image",
    },
  };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const params = new URLSearchParams();
  params.append("media_data", base64);
  params.append("media_category", "tweet_image");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader.Authorization,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Media upload failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.media_id_string;
}

/**
 * Post a tweet (reply) with an optional media attachment.
 */
export async function postTweet(params: {
  text: string;
  replyToTweetId: string;
  mediaId?: string;
}): Promise<string> {
  const url = "https://api.x.com/2/tweets";

  const body: Record<string, unknown> = {
    text: params.text,
    reply: {
      in_reply_to_tweet_id: params.replyToTweetId,
    },
  };

  if (params.mediaId) {
    body.media = {
      media_ids: [params.mediaId],
    };
  }

  const requestData = { url, method: "POST" as const };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader.Authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Post tweet failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.data.id;
}

/**
 * Get the bot's own user ID (needed for mentions timeline).
 */
export async function getBotUserId(): Promise<string> {
  const url = "https://api.x.com/2/users/me";
  const requestData = { url, method: "GET" as const };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const res = await fetch(url, {
    headers: {
      Authorization: authHeader.Authorization,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Get user failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.data.id;
}

/**
 * Fetch recent mentions of the bot.
 * Returns mentions since the given tweet ID (for pagination).
 */
export async function getMentions(
  userId: string,
  sinceId?: string
): Promise<
  Array<{
    id: string;
    text: string;
    author_id: string;
    conversation_id: string;
    referenced_tweets?: Array<{ type: string; id: string }>;
  }>
> {
  let url = `https://api.x.com/2/users/${userId}/mentions?tweet.fields=conversation_id,referenced_tweets,author_id&max_results=10`;
  if (sinceId) {
    url += `&since_id=${sinceId}`;
  }

  const requestData = { url, method: "GET" as const };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const res = await fetch(url, {
    headers: {
      Authorization: authHeader.Authorization,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Get mentions failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.data ?? [];
}

/**
 * Check if the bot has already replied to a specific tweet.
 * Uses the search/recent endpoint to find bot replies referencing the tweet.
 */
export async function hasAlreadyReplied(
  botUserId: string,
  mentionId: string
): Promise<boolean> {
  // Search for tweets from the bot that are replies to this mention
  const url = `https://api.x.com/2/users/${botUserId}/tweets?tweet.fields=referenced_tweets&max_results=20`;

  const requestData = { url, method: "GET" as const };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const res = await fetch(url, {
    headers: {
      Authorization: authHeader.Authorization,
    },
  });

  if (!res.ok) {
    // If we can't check, err on the side of not replying
    console.log(`Could not check existing replies: ${res.status}`);
    return true;
  }

  const json = await res.json();
  const tweets = json.data ?? [];

  // Check if any of the bot's recent tweets are replies to this mention
  for (const tweet of tweets) {
    const repliedTo = tweet.referenced_tweets?.find(
      (ref: { type: string; id: string }) => ref.type === "replied_to"
    );
    if (repliedTo && repliedTo.id === mentionId) {
      return true;
    }
  }

  return false;
}

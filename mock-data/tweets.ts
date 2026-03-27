export interface TweetData {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  impressions: number;
  text: string;
}

/**
 * Mock tweet data for development/testing.
 * Maps tweet ID to tweet data.
 */
export const mockTweets: Record<string, TweetData> = {
  "1234567890": {
    id: "1234567890",
    username: "Starplatinum_",
    displayName: "Star Platinum",
    avatarUrl: "https://pbs.twimg.com/profile_images/1234567890/avatar_400x400.jpg",
    impressions: 6267300,
    text: "This is a sample tweet with great engagement!",
  },
  "9876543210": {
    id: "9876543210",
    username: "elonmusk",
    displayName: "Elon Musk",
    avatarUrl: "https://pbs.twimg.com/profile_images/9876543210/avatar_400x400.jpg",
    impressions: 45000000,
    text: "Another viral tweet example",
  },
  "5555555555": {
    id: "5555555555",
    username: "jack",
    displayName: "Jack",
    avatarUrl: "https://pbs.twimg.com/profile_images/5555555555/avatar_400x400.jpg",
    impressions: 820000,
    text: "A modest tweet",
  },
};

/**
 * Rate per view for estimated payout calculation.
 * $0.0002 per view = $0.20 per 1,000 views
 */
export const PAYOUT_RATE_PER_VIEW = 0.0002;

/**
 * Calculate estimated payout from impressions.
 */
export function calculatePayout(impressions: number): number {
  return impressions * PAYOUT_RATE_PER_VIEW;
}

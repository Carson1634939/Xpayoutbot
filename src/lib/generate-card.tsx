import { ImageResponse } from "next/og";

interface CardData {
  username: string;
  avatarUrl: string;
  payout: number;
}

/**
 * Format dollar amount with commas and 2 decimal places.
 */
function formatPayout(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Generate the social card as a PNG Response.
 * Replicates the Figma design: dark gradient background, X logo,
 * "Estimated payout" label, large dollar amount, user avatar + handle.
 */
export async function generateCardImage(data: CardData): Promise<ImageResponse> {
  const { username, avatarUrl, payout } = data;
  const payoutFormatted = `+$${formatPayout(payout)}`;

  // Generate a simple avatar fallback with the user's first letter
  const firstLetter = username.charAt(0).toUpperCase();

  // Test if avatar URL is reachable
  let avatarIsValid = false;
  try {
    const res = await fetch(avatarUrl, { method: "HEAD" });
    avatarIsValid = res.ok;
  } catch {
    avatarIsValid = false;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "675px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "radial-gradient(ellipse at center, #2a2a2a 0%, #0a0a0a 70%, #000000 100%)",
          position: "relative",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* X Logo - top right */}
        <div
          style={{
            position: "absolute",
            top: "40px",
            right: "50px",
            display: "flex",
          }}
        >
          <svg
            width="50"
            height="50"
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>

        {/* Estimated payout label */}
        <div
          style={{
            display: "flex",
            fontSize: "28px",
            color: "#a0a0a0",
            marginBottom: "16px",
            fontWeight: 400,
            letterSpacing: "0.5px",
          }}
        >
          Estimated payout
        </div>

        {/* Payout amount */}
        <div
          style={{
            display: "flex",
            fontSize: "120px",
            color: "#ffffff",
            fontWeight: 700,
            letterSpacing: "-2px",
            lineHeight: 1,
          }}
        >
          {payoutFormatted}
        </div>

        {/* User info - bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: "50px",
            left: "60px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          {/* Avatar or fallback */}
          {avatarIsValid ? (
            <img
              src={avatarUrl}
              width="56"
              height="56"
              style={{
                borderRadius: "12px",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "12px",
                background: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                color: "#ffffff",
                fontWeight: 700,
              }}
            >
              {firstLetter}
            </div>
          )}
          {/* Username */}
          <div
            style={{
              display: "flex",
              fontSize: "24px",
              color: "#ffffff",
              fontWeight: 400,
            }}
          >
            @{username}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 675,
    }
  );
}

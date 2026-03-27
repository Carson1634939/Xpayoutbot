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
 * Dynamically scale the payout font so it fits the card width.
 */
function getPayoutFontSize(formatted: string): number {
  const len = formatted.length;
  if (len <= 8) return 200;
  if (len <= 10) return 170;
  if (len <= 12) return 145;
  if (len <= 14) return 125;
  return 105;
}

// Base URL for loading assets — set via env var or fallback for local dev
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Generate the social card as a PNG Response.
 * Matches the Figma design exactly:
 *   - Background: card-bg.png from public/
 *   - "Estimated payout": Inter Extra Light, 50px
 *   - Dollar amount: Inter Regular, 200px
 *   - @username: Inter Extra Light, 50px
 *   - X logo top-right, avatar + handle bottom-left
 */
export async function generateCardImage(data: CardData): Promise<ImageResponse> {
  const { username, avatarUrl, payout } = data;
  const payoutFormatted = `+$${formatPayout(payout)}`;
  const payoutFontSize = getPayoutFontSize(payoutFormatted);
  const firstLetter = username.charAt(0).toUpperCase();
  const baseUrl = getBaseUrl();

  // Load Inter fonts: Extra Light (200 weight) and Regular (400 weight)
  const [interExtraLightRes, interRegularRes] = await Promise.all([
    fetch(
      "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuDyfMZhrib2Bg-4.ttf"
    ),
    fetch(
      "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
    ),
  ]);

  const interExtraLight = await interExtraLightRes.arrayBuffer();
  const interRegular = await interRegularRes.arrayBuffer();

  // Check if avatar URL is reachable
  let avatarIsValid = false;
  try {
    const res = await fetch(avatarUrl, { method: "HEAD" });
    avatarIsValid = res.ok;
  } catch {
    avatarIsValid = false;
  }

  const bgImageUrl = `${baseUrl}/card-bg.png`;

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
          position: "relative",
          fontFamily: "Inter",
          background: "#000000",
        }}
      >
        {/* Background image from Figma */}
        <img
          src={bgImageUrl}
          width="1200"
          height="675"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            height: "675px",
            objectFit: "cover",
          }}
        />

        {/* X Logo — top right */}
        <div
          style={{
            position: "absolute",
            top: "44px",
            right: "56px",
            display: "flex",
          }}
        >
          <svg width="56" height="56" viewBox="0 0 24 24" fill="white">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>

        {/* "Estimated payout" — Inter Extra Light, 50px */}
        <div
          style={{
            display: "flex",
            fontSize: "50px",
            color: "#999999",
            marginBottom: "20px",
            fontWeight: 200,
            letterSpacing: "1px",
            zIndex: 1,
          }}
        >
          Estimated payout
        </div>

        {/* Payout amount — Inter Regular, 200px (scales down for long numbers) */}
        <div
          style={{
            display: "flex",
            fontSize: `${payoutFontSize}px`,
            color: "#ffffff",
            fontWeight: 400,
            letterSpacing: "-3px",
            lineHeight: 1,
            zIndex: 1,
          }}
        >
          {payoutFormatted}
        </div>

        {/* User info — bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: "52px",
            left: "64px",
            display: "flex",
            alignItems: "center",
            gap: "18px",
            zIndex: 1,
          }}
        >
          {/* Avatar or letter fallback */}
          {avatarIsValid ? (
            <img
              src={avatarUrl}
              width="64"
              height="64"
              style={{
                borderRadius: "14px",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                color: "#ffffff",
                fontWeight: 400,
              }}
            >
              {firstLetter}
            </div>
          )}
          {/* @username — Inter Extra Light, 50px */}
          <div
            style={{
              display: "flex",
              fontSize: "50px",
              color: "#ffffff",
              fontWeight: 200,
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
      fonts: [
        {
          name: "Inter",
          data: interExtraLight,
          weight: 200 as const,
          style: "normal" as const,
        },
        {
          name: "Inter",
          data: interRegular,
          weight: 400 as const,
          style: "normal" as const,
        },
      ],
    }
  );
}

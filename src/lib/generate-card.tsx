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
 * Base size is 250px per Figma, scales down for longer amounts.
 */
function getPayoutFontSize(formatted: string): number {
  const len = formatted.length;
  if (len <= 9) return 250;
  if (len <= 11) return 210;
  if (len <= 13) return 175;
  if (len <= 15) return 150;
  return 125;
}

// Base URL for loading assets
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Generate the social card as a PNG Response.
 *
 * Figma specs (1600x900 canvas):
 *   "Estimated payout": X:600, Y:249, Inter Extra Light 50px, #999
 *   Payout amount: centered X+Y, Inter Medium 250px, #fff
 *   Avatar: X:101, Y:726, 108x108, white border 2px, radius 20
 *   @username: next to avatar, Inter Extra Light 50px, #fff
 *   X logo: top-right
 *   Background: card-bg.png
 */
export async function generateCardImage(data: CardData): Promise<ImageResponse> {
  const { username, avatarUrl, payout } = data;
  const payoutFormatted = `+$${formatPayout(payout)}`;
  const payoutFontSize = getPayoutFontSize(payoutFormatted);
  const firstLetter = username.charAt(0).toUpperCase();
  const baseUrl = getBaseUrl();

  // Load Inter fonts: Extra Light (200) and Medium (500)
  const [interExtraLightRes, interMediumRes] = await Promise.all([
    fetch(
      "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuDyfMZhrib2Bg-4.ttf"
    ),
    fetch(
      "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf"
    ),
  ]);

  const interExtraLight = await interExtraLightRes.arrayBuffer();
  const interMedium = await interMediumRes.arrayBuffer();

  // Fetch avatar image and convert to base64 data URL so Satori can render it.
  // Twitter CDN can be picky — try multiple URL variants and add headers.
  let avatarDataUrl: string | null = null;
  if (avatarUrl) {
    // Build list of avatar URLs to try: original, _200x200, _normal
    const urlsToTry = [avatarUrl];
    if (avatarUrl.includes("_400x400")) {
      urlsToTry.push(avatarUrl.replace("_400x400", "_200x200"));
      urlsToTry.push(avatarUrl.replace("_400x400", "_normal"));
    }
    if (avatarUrl.includes("_normal")) {
      urlsToTry.push(avatarUrl.replace("_normal", "_200x200"));
    }

    for (const url of urlsToTry) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; XPayoutBot/1.0)",
            "Accept": "image/*",
          },
          redirect: "follow",
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "image/jpeg";
          const buffer = await res.arrayBuffer();
          if (buffer.byteLength > 0) {
            const base64 = Buffer.from(buffer).toString("base64");
            avatarDataUrl = `data:${contentType};base64,${base64}`;
            console.log(`Avatar loaded from: ${url} (${buffer.byteLength} bytes)`);
            break;
          }
        }
        console.log(`Avatar fetch failed for ${url}: ${res.status}`);
      } catch (err) {
        console.log(`Avatar fetch error for ${url}:`, err);
      }
    }

    if (!avatarDataUrl) {
      console.log("All avatar URLs failed, using letter fallback");
    }
  }

  const bgImageUrl = `${baseUrl}/card-bg.png`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1600px",
          height: "900px",
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
          width="1600"
          height="900"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1600px",
            height: "900px",
            objectFit: "cover",
          }}
        />

        {/* X Logo — top right */}
        <div
          style={{
            position: "absolute",
            top: "48px",
            right: "64px",
            display: "flex",
          }}
        >
          <svg width="64" height="64" viewBox="0 0 24 24" fill="white">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>

        {/* "Estimated payout" — Figma: X:600 Y:249, Inter Extra Light 50px */}
        <div
          style={{
            position: "absolute",
            top: "249px",
            left: "0",
            right: "0",
            display: "flex",
            justifyContent: "center",
            fontSize: "50px",
            color: "#999999",
            fontWeight: 200,
            letterSpacing: "1px",
          }}
        >
          Estimated payout
        </div>

        {/* Payout amount — Figma: centered, Inter Medium 250px */}
        <div
          style={{
            position: "absolute",
            top: "282px",
            left: "0",
            right: "0",
            display: "flex",
            justifyContent: "center",
            fontSize: `${payoutFontSize}px`,
            color: "#ffffff",
            fontWeight: 500,
            letterSpacing: "-4px",
            lineHeight: 1,
          }}
        >
          {payoutFormatted}
        </div>

        {/* Avatar — Figma: X:101 Y:726, 108x108, white border 2px, radius 20 */}
        <div
          style={{
            position: "absolute",
            top: "726px",
            left: "101px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          {avatarDataUrl ? (
            <div
              style={{
                display: "flex",
                width: "112px",
                height: "112px",
                borderRadius: "20px",
                border: "2px solid #ffffff",
                overflow: "hidden",
              }}
            >
              <img
                src={avatarDataUrl}
                width="108"
                height="108"
                style={{
                  borderRadius: "18px",
                  objectFit: "cover",
                }}
              />
            </div>
          ) : (
            <div
              style={{
                width: "108px",
                height: "108px",
                borderRadius: "20px",
                border: "2px solid #ffffff",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "44px",
                color: "#ffffff",
                fontWeight: 500,
              }}
            >
              {firstLetter}
            </div>
          )}
          {/* @username — Inter Extra Light 50px */}
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
      width: 1600,
      height: 900,
      fonts: [
        {
          name: "Inter",
          data: interExtraLight,
          weight: 200 as const,
          style: "normal" as const,
        },
        {
          name: "Inter",
          data: interMedium,
          weight: 500 as const,
          style: "normal" as const,
        },
      ],
    }
  );
}

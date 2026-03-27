import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile } from "fs/promises";
import { join } from "path";

interface CardData {
  username: string;
  avatarUrl: string;
  payout: number;
}

/**
 * Load font file for Satori rendering.
 */
async function loadFont(name: string): Promise<Buffer> {
  const fontPath = join(process.cwd(), "public", "fonts", name);
  return readFile(fontPath);
}

/**
 * Format dollar amount with commas and 2 decimal places.
 * e.g. 1253.46 -> "1,253.46"
 */
function formatPayout(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Generate the social card as a PNG buffer.
 * Replicates the Figma design: dark gradient background, X logo,
 * "Estimated payout" label, large dollar amount, user avatar + handle.
 */
export async function generateCardImage(data: CardData): Promise<Buffer> {
  const { username, avatarUrl, payout } = data;

  // Load Inter font (we'll download it on first run)
  let fontBold: Buffer;
  let fontRegular: Buffer;
  try {
    fontBold = await loadFont("Inter-Bold.ttf");
    fontRegular = await loadFont("Inter-Regular.ttf");
  } catch {
    // Fallback: fetch from Google Fonts CDN
    const boldRes = await fetch(
      "https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcviYwYZ90OhCIk.ttf"
    );
    fontBold = Buffer.from(await boldRes.arrayBuffer());

    const regularRes = await fetch(
      "https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcviYwY.ttf"
    );
    fontRegular = Buffer.from(await regularRes.arrayBuffer());
  }

  const payoutFormatted = `+$${formatPayout(payout)}`;

  const svg = await satori(
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
        fontFamily: "Inter",
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
        {/* Avatar */}
        <img
          src={avatarUrl}
          width="56"
          height="56"
          style={{
            borderRadius: "12px",
            objectFit: "cover",
          }}
        />
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
    </div>,
    {
      width: 1200,
      height: 675,
      fonts: [
        {
          name: "Inter",
          data: fontRegular,
          weight: 400,
          style: "normal",
        },
        {
          name: "Inter",
          data: fontBold,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );

  // Convert SVG to PNG
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: 1200,
    },
  });

  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

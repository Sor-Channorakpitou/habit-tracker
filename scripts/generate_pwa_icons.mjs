import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

const sizes = [
  { name: "pwa-64x64.png", size: 64, maskable: false },
  { name: "pwa-192x192.png", size: 192, maskable: false },
  { name: "pwa-512x512.png", size: 512, maskable: false },
  { name: "maskable-icon-192x192.png", size: 192, maskable: true },
  { name: "maskable-icon-512x512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180, maskable: false },
  { name: "favicon-32x32.png", size: 32, maskable: false },
];

async function generate() {
  console.log("Generating PWA Icons...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const item of sizes) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: ${item.size}px;
            height: ${item.size}px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${item.maskable ? "#0f172a" : "transparent"};
          }
          .icon-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #06b6d4 100%);
            border-radius: ${item.maskable ? "0" : `${Math.round(item.size * 0.22)}px`};
            position: relative;
            box-shadow: ${item.maskable ? "none" : "inset 0 1px 1px rgba(255,255,255,0.3)"};
          }
          .inner-pulse {
            width: ${Math.round(item.size * (item.maskable ? 0.6 : 0.68))}px;
            height: ${Math.round(item.size * (item.maskable ? 0.6 : 0.68))}px;
          }
        </style>
      </head>
      <body>
        <div class="icon-container">
          <svg class="inner-pulse" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="100%" stop-color="#e0e7ff" />
              </linearGradient>
              <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.25" />
              </filter>
            </defs>
            <!-- Checkmark Pulse Wave -->
            <path d="M15 52 L32 52 L42 22 L58 78 L68 45 L76 52 L88 52" 
                  stroke="url(#glowGrad)" 
                  stroke-width="8.5" 
                  stroke-linecap="round" 
                  stroke-linejoin="round" 
                  filter="url(#softGlow)" />
            <!-- Glowing Orbiting Habit Ring -->
            <circle cx="50" cy="50" r="42" stroke="rgba(255, 255, 255, 0.25)" stroke-width="3.5" stroke-dasharray="8 6" />
            <!-- Streak Flame Dot -->
            <circle cx="76" cy="24" r="5" fill="#38bdf8" filter="url(#softGlow)" />
          </svg>
        </div>
      </body>
      </html>
    `;

    await page.setViewportSize({ width: item.size, height: item.size });
    await page.setContent(html);
    const dest = path.join(publicDir, item.name);
    await page.screenshot({ path: dest, omitBackground: !item.maskable });
    console.log(`Generated: ${item.name} (${item.size}x${item.size})`);
  }

  await browser.close();
  console.log("All PWA icons generated successfully!");
}

generate().catch(console.error);
